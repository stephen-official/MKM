import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Notification } from "../models/FlowModels.js";
import { StockItem } from "../models/InventoryModels.js";
import { ProductRequest } from "../models/ProductRequestModel.js";
import { io } from "../realtime.js";
import { isSuperAdmin } from "../utils/roles.js";
import { CatalogError, buildProductUpdate, sendCatalogError } from "../catalog/productService.js";

export const productRequestRoutes = express.Router();

const adminOnly = authorize(["admin"]);
const kitchenOnly = authorize(["user"]);

const text = (value, max) => String(value ?? "").trim().slice(0, max);

const populated = (query) => query.populate("godownId", "name").populate("userId", "name").populate("decidedBy", "name").populate("productId", "name");

const shape = (row) => ({
  _id: row._id,
  name: row.name,
  unitSymbol: row.unitSymbol,
  brand: row.brand,
  note: row.note,
  status: row.status,
  decisionNote: row.decisionNote,
  kitchen: row.godownId ? { _id: row.godownId._id, name: row.godownId.name } : null,
  requestedBy: row.userId?.name || "",
  decidedBy: row.decidedBy?.name || "",
  decidedAt: row.decidedAt,
  product: row.productId ? { _id: row.productId._id, name: row.productId.name } : null,
  createdAt: row.createdAt
});

productRequestRoutes.post("/", kitchenOnly, async (req, res) => {
  try {
    const name = text(req.body?.name, 120);
    if (!name) throw new CatalogError(400, "VALIDATION", "Enter the product you need.", { errors: { name: "Enter the product you need." } });
    if (!req.user.godownId) throw new CatalogError(400, "NO_KITCHEN", "Your account is not linked to a kitchen.");
    const created = await ProductRequest.create({
      godownId: req.user.godownId,
      userId: req.user.sub,
      name,
      unitSymbol: text(req.body?.unitSymbol, 20),
      brand: text(req.body?.brand, 80),
      note: text(req.body?.note, 500)
    });
    const notification = await Notification.create({
      type: "product_request_created",
      severity: "info",
      payload: { message: `New product requested: ${name}`, productRequestId: created._id, godownId: req.user.godownId }
    });
    io.to("admins").emit("product_request_created", { id: created._id, notification });
    res.status(201).json(shape(await populated(ProductRequest.findById(created._id)).lean()));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRequestRoutes.get("/me", kitchenOnly, async (req, res) => {
  try {
    const rows = await populated(ProductRequest.find({ godownId: req.user.godownId }).sort({ createdAt: -1 }).limit(100)).lean();
    res.json(rows.map(shape));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRequestRoutes.get("/", adminOnly, async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : null;
    const rows = await populated(ProductRequest.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200)).lean();
    res.json(rows.map(shape));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

const loadPending = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new CatalogError(404, "NOT_FOUND", "Request not found.");
  const row = await ProductRequest.findById(id);
  if (!row) throw new CatalogError(404, "NOT_FOUND", "Request not found.");
  if (row.status !== "pending") throw new CatalogError(409, "ALREADY_DECIDED", "This request has already been decided.");
  return row;
};

const decide = async (row, user, patch) => {
  // Conditional on still pending, so two admins deciding at once cannot both win.
  const saved = await ProductRequest.findOneAndUpdate(
    { _id: row._id, status: "pending" },
    { $set: { ...patch, decidedBy: user.sub, decidedAt: new Date() } },
    { new: true }
  );
  if (!saved) throw new CatalogError(409, "ALREADY_DECIDED", "This request has already been decided.");
  io.to(String(row.godownId)).emit("product_request_decided", { id: row._id, status: saved.status });
  return shape(await populated(ProductRequest.findById(row._id)).lean());
};

/** Approve by creating the product from the popup (`product`), or by pointing at an existing one (`existingProductId`). */
productRequestRoutes.post("/:id/approve", adminOnly, async (req, res) => {
  try {
    const row = await loadPending(req.params.id);
    let productId = req.body?.existingProductId;
    let created = null;
    if (productId) {
      if (!mongoose.isValidObjectId(productId) || !(await StockItem.exists({ _id: productId }))) throw new CatalogError(404, "NOT_FOUND", "That product does not exist.");
    } else {
      const update = await buildProductUpdate(req.body?.product || {}, { canPrice: isSuperAdmin(req.user.role), userId: req.user.sub });
      created = await StockItem.create(update);
      productId = created._id;
    }
    try {
      res.json(await decide(row, req.user, { status: "approved", productId, decisionNote: text(req.body?.note, 300) }));
    } catch (error) {
      // Someone else decided first: do not leave behind the product this attempt created.
      if (created) await StockItem.deleteOne({ _id: created._id });
      throw error;
    }
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRequestRoutes.post("/:id/reject", adminOnly, async (req, res) => {
  try {
    const row = await loadPending(req.params.id);
    const note = text(req.body?.note, 300);
    if (!note) throw new CatalogError(400, "VALIDATION", "Tell the kitchen why.", { errors: { note: "Tell the kitchen why." } });
    res.json(await decide(row, req.user, { status: "rejected", decisionNote: note }));
  } catch (error) {
    sendCatalogError(res, error);
  }
});
