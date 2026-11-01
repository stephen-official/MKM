import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption, GodownStock, Notification } from "../models/FlowModels.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { CORRECTION_KINDS, UsageCorrection } from "../models/UsageCorrectionModel.js";
import { isIsoDate } from "../executive/params.js";
import { io, notifyKitchen } from "../realtime.js";
import { requireAvailableProducts, stockRecordItemIds } from "../catalog/productService.js";
import { applyConsumptionEdit, recordConsumption, removeConsumption } from "./operationsRoutes.js";

/**
 * Corrections: a kitchen asks to change what it recorded; nothing changes until an admin approves.
 * "reopen_day": a day marked "no usage" by mistake, with the usage to record once it is open.
 * "edit_usage": a usage record with the wrong lines; the proposed lines replace them (none = cancel the record).
 * Errors are { code, message }.
 */
export const usageCorrectionRoutes = express.Router();

const adminOnly = authorize(["admin"]);
const kitchenOnly = authorize(["user"]);

class CorrectionError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const send = (res, error) => {
  if (error instanceof CorrectionError) return res.status(error.status).json({ code: error.code, message: error.message });
  return res.status(500).json({ code: "CORRECTION_FAILED", message: error.message });
};

const lineProduct = { path: "stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol name" } };
const populated = (query) => query
  .populate("godownId", "name").populate("userId", "name").populate("decidedBy", "name")
  .populate({ path: "items", populate: lineProduct }).populate({ path: "before", populate: lineProduct });
const shapeLine = (line) => ({
  stockItemId: line.stockItemId?._id || line.stockItemId,
  name: line.stockItemId?.name || "",
  unit: line.stockItemId?.unitId?.symbol || line.stockItemId?.unitId?.name || "",
  qtyBaseUnit: line.qtyBaseUnit,
  packName: line.packName || "",
  packQuantity: line.packQuantity ?? null,
});
const shape = (row) => ({
  _id: row._id,
  kind: row.kind,
  date: row.date,
  consumptionId: row.consumptionId,
  items: (row.items || []).map(shapeLine),
  before: (row.before || []).map(shapeLine),
  reason: row.reason,
  note: row.note,
  status: row.status,
  decisionNote: row.decisionNote,
  kitchen: row.godownId ? { _id: row.godownId._id, name: row.godownId.name } : null,
  requestedBy: row.userId?.name || "",
  decidedBy: row.decidedBy?.name || "",
  decidedAt: row.decidedAt,
  createdAt: row.createdAt,
});
const load = async (id) => shape(await populated(UsageCorrection.findById(id)).lean());

/** The proposed lines, each naming a stock row of this kitchen with a positive quantity; packs are kept as a snapshot. */
const readLines = async (godownId, raw) => {
  if (!Array.isArray(raw)) throw new CorrectionError(400, "INVALID_ITEMS", "Add the items that were used");
  const ids = raw.map((line) => line?.stockRecordId).filter((id) => mongoose.isValidObjectId(id));
  const rows = new Map((await GodownStock.find({ _id: { $in: ids }, godownId }).select("stockItemId").lean()).map((row) => [String(row._id), row]));
  const seen = new Set();
  return raw.map((line) => {
    const row = rows.get(String(line?.stockRecordId));
    if (!row) throw new CorrectionError(400, "INVALID_ITEMS", "Choose items from your kitchen stock");
    const qty = Number(line.qtyBaseUnit);
    if (!Number.isFinite(qty) || qty <= 0) throw new CorrectionError(400, "INVALID_QUANTITY", "Enter a quantity for every item");
    const key = String(row.stockItemId);
    if (seen.has(key)) throw new CorrectionError(400, "DUPLICATE_ITEM", "An item is listed twice");
    seen.add(key);
    const packSize = Number(line.packSize);
    const packQuantity = Number(line.packQuantity);
    const pack = line.packId && mongoose.isValidObjectId(line.packId) && packSize > 0 && packQuantity > 0 && Math.abs(packSize * packQuantity - qty) < 1e-6
      ? { packId: line.packId, packName: String(line.packName || ""), packSize, packQuantity }
      : {};
    return { stockItemId: row.stockItemId, stockRecordId: row._id, qtyBaseUnit: qty, ...pack };
  });
};
const snapshot = (consumption) => (consumption.items || []).map((line) => ({
  stockItemId: line.stockItemId, stockRecordId: line.stockRecordId || null, qtyBaseUnit: line.qtyBaseUnit,
  packId: line.packId || null, packName: line.packName || "", packSize: line.packSize ?? null, packQuantity: line.packQuantity ?? null,
}));
const sameLines = (a, b) => {
  const key = (lines) => lines.map((line) => `${line.stockItemId}:${Number(line.qtyBaseUnit)}`).sort().join("|");
  return key(a) === key(b);
};

// POST / { kind, date, items, consumptionId? } → the kitchen asks for a day to be reopened with this usage, or for a record's lines to be replaced.
usageCorrectionRoutes.post("/", kitchenOnly, requireAvailableProducts(stockRecordItemIds), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) throw new CorrectionError(400, "NO_KITCHEN", "Your account is not linked to a kitchen");
    const { kind, date, consumptionId = null, items = [] } = req.body || {};
    if (!CORRECTION_KINDS.includes(kind)) throw new CorrectionError(400, "INVALID_KIND", "Choose what went wrong");
    const lines = await readLines(godownId, items);
    const doc = { godownId, userId: req.user.sub, kind, date, items: lines };
    let message;
    if (kind === "reopen_day") {
      if (!isIsoDate(date)) throw new CorrectionError(400, "INVALID_DATE", "Choose a date");
      if (lines.length === 0) throw new CorrectionError(400, "INVALID_ITEMS", "Add what was used that day");
      if (!(await NoUsageDay.exists({ godownId, date }))) throw new CorrectionError(409, "NOT_MARKED", "That day is not marked as no usage");
      if (await UsageCorrection.exists({ godownId, kind, date, status: "pending" })) throw new CorrectionError(409, "ALREADY_PENDING", "The admin has already been asked about this day");
      message = `A kitchen asks to record usage on ${date} (marked no usage)`;
    } else {
      if (!mongoose.isValidObjectId(consumptionId)) throw new CorrectionError(404, "NOT_FOUND", "Usage record not found");
      const consumption = await Consumption.findOne({ _id: consumptionId, godownId });
      if (!consumption) throw new CorrectionError(404, "NOT_FOUND", "Usage record not found");
      if (await UsageCorrection.exists({ godownId, consumptionId, status: "pending" })) throw new CorrectionError(409, "ALREADY_PENDING", "The admin has already been asked about this record");
      doc.before = snapshot(consumption);
      if (sameLines(doc.before, lines)) throw new CorrectionError(400, "NO_CHANGE", "Nothing was changed");
      doc.date = consumption.date;
      doc.consumptionId = consumption._id;
      doc.recordUpdatedAt = consumption.updatedAt;
      message = lines.length === 0 ? `A kitchen asks to cancel its usage record of ${doc.date}` : `A kitchen asks to change its usage record of ${doc.date}`;
    }
    const created = await UsageCorrection.create(doc);
    const notification = await Notification.create({
      type: "usage_correction_created",
      severity: "info",
      payload: { message, usageCorrectionId: created._id, godownId },
    });
    io.to("admins").emit("usage_correction_created", { id: created._id, notification });
    notifyKitchen(godownId, "usage");
    return res.status(201).json(await load(created._id));
  } catch (error) {
    return send(res, error);
  }
});

// GET /me → this kitchen's corrections, newest first.
usageCorrectionRoutes.get("/me", kitchenOnly, async (req, res) => {
  try {
    const rows = await populated(UsageCorrection.find({ godownId: req.user.godownId }).sort({ createdAt: -1 }).limit(100)).lean();
    return res.json(rows.map(shape));
  } catch (error) {
    return send(res, error);
  }
});

// DELETE /:id → the kitchen takes back its own ask while the admin has not decided.
usageCorrectionRoutes.delete("/:id", kitchenOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new CorrectionError(404, "NOT_FOUND", "Correction not found");
    const row = await UsageCorrection.findOne({ _id: req.params.id, godownId: req.user.godownId });
    if (!row) throw new CorrectionError(404, "NOT_FOUND", "Correction not found");
    if (row.status !== "pending") throw new CorrectionError(409, "ALREADY_DECIDED", "The admin has already decided on this");
    await UsageCorrection.deleteOne({ _id: row._id, status: "pending" });
    io.to("admins").emit("usage_correction_withdrawn", { id: row._id });
    notifyKitchen(req.user.godownId, "usage");
    return res.json({ ok: true });
  } catch (error) {
    return send(res, error);
  }
});

// GET /?status=pending → every kitchen's corrections for the admin.
usageCorrectionRoutes.get("/", adminOnly, async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : null;
    const rows = await populated(UsageCorrection.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200)).lean();
    return res.json(rows.map(shape));
  } catch (error) {
    return send(res, error);
  }
});

const loadPending = async (id, session) => {
  if (!mongoose.isValidObjectId(id)) throw new CorrectionError(404, "NOT_FOUND", "Correction not found");
  const row = await UsageCorrection.findById(id).session(session);
  if (!row) throw new CorrectionError(404, "NOT_FOUND", "Correction not found");
  if (row.status !== "pending") throw new CorrectionError(409, "ALREADY_DECIDED", "This correction has already been decided");
  return row;
};

// Conditional on still pending, so two admins deciding at once cannot both win.
const decide = async (row, user, patch, session) => {
  const saved = await UsageCorrection.findOneAndUpdate(
    { _id: row._id, status: "pending" },
    { $set: { ...patch, decidedBy: user.sub, decidedAt: new Date() } },
    { new: true, session },
  );
  if (!saved) throw new CorrectionError(409, "ALREADY_DECIDED", "This correction has already been decided");
  return saved;
};

const tellKitchen = (row) => {
  io.to(String(row.godownId)).emit("usage_correction_decided", { id: row._id, status: row.status });
  notifyKitchen(row.godownId, "usage");
  notifyKitchen(row.godownId, "stock");
};

/** Makes the change the kitchen asked for, inside the approval's transaction. Stock problems surface as CANNOT_APPLY. */
const apply = async (row, user, session) => {
  const lines = row.items.map((line) => ({
    stockItemId: line.stockItemId, stockRecordId: line.stockRecordId, qtyBaseUnit: line.qtyBaseUnit,
    packId: line.packId, packName: line.packName, packSize: line.packSize, packQuantity: line.packQuantity,
  }));
  try {
    if (row.kind === "reopen_day") {
      await NoUsageDay.deleteOne({ godownId: row.godownId, date: row.date }).session(session);
      await recordConsumption({ godownId: row.godownId, userId: row.userId, date: row.date, items: lines, session });
      return;
    }
    const consumption = await Consumption.findOne({ _id: row.consumptionId, godownId: row.godownId }).session(session);
    if (!consumption) throw new CorrectionError(409, "RECORD_GONE", "This usage record no longer exists");
    if (row.recordUpdatedAt && consumption.updatedAt && consumption.updatedAt.getTime() !== row.recordUpdatedAt.getTime()) {
      throw new CorrectionError(409, "RECORD_CHANGED", "This record was changed after the kitchen asked. Reject this and ask the kitchen to check it again.");
    }
    if (lines.length === 0) await removeConsumption({ consumption, session });
    else await applyConsumptionEdit({ consumption, items: lines, userId: user.sub, session });
  } catch (error) {
    if (error instanceof CorrectionError) throw error;
    throw new CorrectionError(409, "CANNOT_APPLY", error.message);
  }
};

// POST /:id/approve { note? } → the change is made (day reopened and usage recorded, or the record's lines replaced).
usageCorrectionRoutes.post("/:id/approve", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let row;
    await session.withTransaction(async () => {
      row = await loadPending(req.params.id, session);
      await apply(row, req.user, session);
      row = await decide(row, req.user, { status: "approved", decisionNote: String(req.body?.note || "").trim().slice(0, 300) }, session);
    });
    tellKitchen(row);
    return res.json(await load(row._id));
  } catch (error) {
    return send(res, error);
  } finally {
    await session.endSession();
  }
});

// POST /:id/reject { note } → nothing changes; the kitchen sees the note.
usageCorrectionRoutes.post("/:id/reject", adminOnly, async (req, res) => {
  try {
    const row = await loadPending(req.params.id);
    const note = String(req.body?.note || "").trim().slice(0, 300);
    if (!note) throw new CorrectionError(400, "NOTE_REQUIRED", "Tell the kitchen why");
    const saved = await decide(row, req.user, { status: "rejected", decisionNote: note });
    tellKitchen(saved);
    return res.json(await load(saved._id));
  } catch (error) {
    return send(res, error);
  }
});
