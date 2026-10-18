import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { authorize } from "../middleware/auth.js";
import { StockItem } from "../models/InventoryModels.js";
import { isSuperAdmin } from "../utils/roles.js";
import {
  CatalogError, buildProductUpdate, ensurePresetUnits, kitchensHolding, sendCatalogError, serializeProduct
} from "../catalog/productService.js";

export const productRoutes = express.Router();

const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);

const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "inventory_management", allowed_formats: ["jpg", "png", "jpeg", "webp"], transformation: [{ width: 500, height: 500, crop: "limit" }] }
  })
});

const STATUSES = ["all", "available", "incomplete", "archived"];

const loadOne = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
  const product = await StockItem.findById(id).populate("unitId", "name symbol").populate("stockGroupId", "name").lean();
  if (!product) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
  return serializeProduct(product, await kitchensHolding([product._id]));
};

productRoutes.get("/units", adminOnly, async (_req, res) => {
  try {
    const units = await ensurePresetUnits();
    res.json(units.map((unit) => ({ _id: unit._id, symbol: unit.symbol, name: unit.name })));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.post("/upload-image", adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose an image to upload." });
  return res.status(201).json({ imageUrl: req.file.path });
});

/** The master list. `status` narrows it; counts always cover the whole catalog so the tabs can show them. */
productRoutes.get("/", adminOnly, async (req, res) => {
  try {
    const status = STATUSES.includes(req.query.status) ? req.query.status : "all";
    const q = String(req.query.q || "").trim().toLowerCase();
    const docs = await StockItem.find().populate("unitId", "name symbol").populate("stockGroupId", "name").sort({ name: 1 }).collation({ locale: "en" }).lean();
    const holding = await kitchensHolding();
    const all = docs.map((doc) => serializeProduct(doc, holding));
    const counts = {
      all: all.length,
      available: all.filter((p) => p.available).length,
      incomplete: all.filter((p) => !p.archived && !p.available).length,
      archived: all.filter((p) => p.archived).length
    };
    const matchesStatus = (p) => status === "all" || (status === "available" && p.available)
      || (status === "incomplete" && !p.archived && !p.available) || (status === "archived" && p.archived);
    const matchesQuery = (p) => !q || [p.name, p.brand, p.productCode, p.group?.name].some((text) => String(text || "").toLowerCase().includes(q));
    res.json({ items: all.filter((p) => matchesStatus(p) && matchesQuery(p)), counts });
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.get("/:id", adminOnly, async (req, res) => {
  try {
    res.json(await loadOne(req.params.id));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.post("/", adminOnly, async (req, res) => {
  try {
    const update = await buildProductUpdate(req.body || {}, { canPrice: isSuperAdmin(req.user.role), userId: req.user.sub });
    const created = await StockItem.create(update);
    res.status(201).json(await loadOne(created._id));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.put("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
    const existing = await StockItem.findById(req.params.id).lean();
    if (!existing) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
    const { productCode, ...update } = await buildProductUpdate(req.body || {}, { canPrice: isSuperAdmin(req.user.role), existing, userId: req.user.sub });
    // An empty code is removed rather than stored, so the unique index ignores it.
    await StockItem.updateOne({ _id: existing._id }, productCode
      ? { $set: { ...update, productCode } }
      : { $set: update, $unset: { productCode: 1 } });
    res.json(await loadOne(existing._id));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

// Archiving is manual and super-admin only, and never while any kitchen still holds the product.
productRoutes.post("/:id/archive", superAdminOnly, async (req, res) => {
  try {
    const product = await loadOne(req.params.id);
    if (product.archived) return res.json(product);
    if (product.kitchensHolding > 0) {
      throw new CatalogError(409, "STOCK_HELD", `${product.kitchensHolding} ${product.kitchensHolding === 1 ? "kitchen still holds" : "kitchens still hold"} this product. It can be archived once no kitchen has any left.`);
    }
    await StockItem.updateOne({ _id: product._id }, { $set: { archived: true, archivedAt: new Date(), archivedBy: req.user.sub } });
    res.json(await loadOne(product._id));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.post("/:id/restore", superAdminOnly, async (req, res) => {
  try {
    const product = await loadOne(req.params.id);
    await StockItem.updateOne({ _id: product._id }, { $set: { archived: false, archivedAt: null, archivedBy: null } });
    res.json(await loadOne(product._id));
  } catch (error) {
    sendCatalogError(res, error);
  }
});
