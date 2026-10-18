import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { packQuantityMatchesBase, packSnapshot } from "../catalog/packaging.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

export const collaborativePurchaseOrderRoutes = express.Router();
const everyone = authorize(["admin", "user"]);
const kitchenOnly = authorize(["user"]);
const adminOnly = authorize(["admin"]);
const STATUSES = new Set(["open", "closed", "ordered", "cancelled"]);
const TRANSITIONS = {
  open: new Set(["closed", "cancelled"]),
  closed: new Set(["open", "ordered", "cancelled"]),
  ordered: new Set(),
  cancelled: new Set(),
};

const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max, label) => {
  const result = String(value || "").trim();
  if (result.length > max) throw fail(400, `${label} must be ${max} characters or fewer`);
  return result;
};
const dateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw fail(400, "neededBy must be a valid date");
  return date;
};

export const normalizeCollaborativeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const merged = new Map();
  for (const input of items) {
    const stockItemId = String(input?.stockItemId || "");
    const qtyBaseUnit = Number(input?.qtyBaseUnit ?? input?.quantity);
    if (!mongoose.isValidObjectId(stockItemId) || !Number.isFinite(qtyBaseUnit) || qtyBaseUnit <= 0) return null;
    if (!packQuantityMatchesBase(input, qtyBaseUnit)) return null;
    const snapshot = packSnapshot(input);
    const key = `${stockItemId}:${String(snapshot.packId || "base")}`;
    const current = merged.get(key);
    if (current) {
      current.qtyBaseUnit += qtyBaseUnit;
      if (snapshot.packId) current.packQuantity += Number(snapshot.packQuantity);
    } else merged.set(key, { stockItemId, qtyBaseUnit, ...snapshot });
  }
  return [...merged.values()];
};

const populateOrder = (query) => query
  .populate("createdBy", "name")
  .populate("createdByGodown", "name")
  .populate("statusChangedBy", "name")
  .populate("contributions.userId", "name")
  .populate("contributions.godownId", "name")
  .populate({
    path: "contributions.items.stockItemId",
    select: "name imageUrl unitId stockGroupId brand productCode soldInPacks packs",
    populate: [{ path: "unitId", select: "name symbol" }, { path: "stockGroupId", select: "name" }],
  });

const responseOrder = (order) => {
  const value = order.toObject ? order.toObject() : order;
  const totals = new Map();
  for (const contribution of value.contributions || []) {
    for (const item of contribution.items || []) {
      const product = item.stockItemId;
      const id = String(product?._id || product);
      const current = totals.get(id) || { stockItemId: product, qtyBaseUnit: 0 };
      current.qtyBaseUnit += Number(item.qtyBaseUnit) || 0;
      totals.set(id, current);
    }
  }
  return { ...value, kitchenCount: value.contributions?.length || 0, combinedItems: [...totals.values()] };
};

const loadOrder = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw fail(404, "Collaborative purchase order not found");
  const order = await populateOrder(CollaborativePurchaseOrder.findById(id));
  if (!order) throw fail(404, "Collaborative purchase order not found");
  return order;
};

const contributionFrom = (req) => {
  if (!req.user.godownId) throw fail(403, "Your account is not assigned to a kitchen");
  const items = normalizeCollaborativeItems(req.body.items);
  if (!items) throw fail(400, "Add at least one item with a valid quantity");
  return {
    godownId: req.user.godownId,
    userId: req.user.sub,
    items,
    note: text(req.body.note, 500, "Contribution note"),
    updatedAt: new Date(),
  };
};

collaborativePurchaseOrderRoutes.get("/", everyone, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    if (status && !STATUSES.has(status)) throw fail(400, "Invalid status filter");
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = status ? { status } : {};
    const [orders, total] = await Promise.all([
      populateOrder(CollaborativePurchaseOrder.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)),
      CollaborativePurchaseOrder.countDocuments(filter),
    ]);
    return res.json({ items: orders.map(responseOrder), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.post("/", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const contribution = contributionFrom(req);
    contribution.addedAt = contribution.updatedAt;
    const order = await CollaborativePurchaseOrder.create({
      orderNo: `CPO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase()}`,
      title: text(req.body.title, 120, "Title"),
      note: text(req.body.orderNote, 1000, "Order note"),
      neededBy: dateOrNull(req.body.neededBy),
      createdBy: req.user.sub,
      createdByGodown: req.user.godownId,
      contributions: [contribution],
    });
    return res.status(201).json(responseOrder(await loadOrder(order._id)));
  } catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.get("/:id", everyone, async (req, res) => {
  try { return res.json(responseOrder(await loadOrder(req.params.id))); }
  catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.post("/:id/contributions", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const contribution = contributionFrom(req);
    contribution.addedAt = contribution.updatedAt;
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, status: "open", "contributions.godownId": { $ne: req.user.godownId } },
      { $push: { contributions: contribution }, $set: { updatedAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!order) {
      const existing = await CollaborativePurchaseOrder.findById(req.params.id).lean();
      if (!existing) throw fail(404, "Collaborative purchase order not found");
      if (existing.status !== "open") throw fail(409, "This order is no longer accepting additions");
      throw fail(409, "Your kitchen has already joined this order; edit its contribution instead");
    }
    return res.status(201).json(responseOrder(await loadOrder(order._id)));
  } catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.put("/:id/contributions/me", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const contribution = contributionFrom(req);
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, status: "open", "contributions.godownId": req.user.godownId },
      { $set: { "contributions.$.items": contribution.items, "contributions.$.note": contribution.note, "contributions.$.userId": req.user.sub, "contributions.$.updatedAt": contribution.updatedAt, updatedAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!order) {
      const existing = await CollaborativePurchaseOrder.findById(req.params.id).lean();
      if (!existing) throw fail(404, "Collaborative purchase order not found");
      if (existing.status !== "open") throw fail(409, "This order is no longer accepting changes");
      throw fail(404, "Your kitchen has not joined this order");
    }
    return res.json(responseOrder(await loadOrder(order._id)));
  } catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.delete("/:id/contributions/me", kitchenOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const existing = await CollaborativePurchaseOrder.findById(req.params.id).lean();
    if (!existing) throw fail(404, "Collaborative purchase order not found");
    if (existing.status !== "open") throw fail(409, "This order is no longer accepting changes");
    if (String(existing.createdByGodown) === String(req.user.godownId)) throw fail(409, "The kitchen that opened the order must keep a contribution; edit it instead");
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, status: "open", "contributions.godownId": req.user.godownId },
      { $pull: { contributions: { godownId: req.user.godownId } }, $set: { updatedAt: new Date() } },
      { new: true },
    );
    if (!order) throw fail(404, "Your kitchen has not joined this order");
    return res.json(responseOrder(await loadOrder(order._id)));
  } catch (error) { return res.status(error.status || 500).json({ message: error.message }); }
});

collaborativePurchaseOrderRoutes.patch("/:id/status", adminOnly, async (req, res) => {
  try {
    const next = String(req.body.status || "");
    if (!STATUSES.has(next)) throw fail(400, "Status must be open, closed, ordered or cancelled");
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (next !== order.status && !TRANSITIONS[order.status].has(next)) throw fail(409, `An ${order.status} order cannot move to ${next}`);
    order.status = next;
    order.statusChangedAt = new Date();
    order.statusChangedBy = req.user.sub;
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id)));
  } catch (error) { return res.status(error.status || (error.name === "CastError" ? 404 : 500)).json({ message: error.message }); }
});
