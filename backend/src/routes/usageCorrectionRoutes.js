import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Notification } from "../models/FlowModels.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { CORRECTION_KINDS, REOPEN_REASONS, UsageCorrection } from "../models/UsageCorrectionModel.js";
import { isIsoDate } from "../executive/params.js";
import { io, notifyKitchen } from "../realtime.js";

/**
 * Corrections: a kitchen reports a mistake in what it recorded; nothing changes until an admin approves.
 * Today only "reopen_day" exists (a "no usage" mark made by mistake). Errors are { code, message }.
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

const populated = (query) => query.populate("godownId", "name").populate("userId", "name").populate("decidedBy", "name");
const shape = (row) => ({
  _id: row._id,
  kind: row.kind,
  date: row.date,
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

// POST / { kind: "reopen_day", date, reason, note } → the kitchen asks for a "no usage" day to be opened again.
usageCorrectionRoutes.post("/", kitchenOnly, async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) throw new CorrectionError(400, "NO_KITCHEN", "Your account is not linked to a kitchen");
    const { kind, date, reason, note = "" } = req.body || {};
    if (!CORRECTION_KINDS.includes(kind)) throw new CorrectionError(400, "INVALID_KIND", "Choose what went wrong");
    if (!isIsoDate(date)) throw new CorrectionError(400, "INVALID_DATE", "Choose a date");
    if (!REOPEN_REASONS.includes(reason)) throw new CorrectionError(400, "INVALID_REASON", "Choose a reason");
    if (reason === "other" && !String(note).trim()) throw new CorrectionError(400, "NOTE_REQUIRED", "Say what happened");
    if (!(await NoUsageDay.exists({ godownId, date }))) throw new CorrectionError(409, "NOT_MARKED", "That day is not marked as no usage");
    if (await UsageCorrection.exists({ godownId, kind, date, status: "pending" })) throw new CorrectionError(409, "ALREADY_PENDING", "The admin has already been asked about this day");
    const created = await UsageCorrection.create({ godownId, userId: req.user.sub, kind, date, reason, note: String(note).trim().slice(0, 200) });
    const notification = await Notification.create({
      type: "usage_correction_created",
      severity: "info",
      payload: { message: `A kitchen asks to reopen ${date} (marked no usage)`, usageCorrectionId: created._id, godownId },
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
};

// POST /:id/approve { note? } → the mark is removed and the kitchen can record that day again.
usageCorrectionRoutes.post("/:id/approve", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let row;
    await session.withTransaction(async () => {
      row = await loadPending(req.params.id, session);
      if (row.kind === "reopen_day") await NoUsageDay.deleteOne({ godownId: row.godownId, date: row.date }).session(session);
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
