import express from "express";
import { notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { authorize } from "../middleware/auth.js";
import { StockItem } from "../models/InventoryModels.js";
import { StockGroup } from "../models/InventoryModels.js";
import { isSuperAdmin } from "../utils/roles.js";
import {
  CatalogError, buildProductUpdate, ensurePresetUnits, kitchensHolding, sendCatalogError, serializeProduct
} from "../catalog/productService.js";
import { canonicalPackName, isPresetPackType, packNameMatch, summarizePackTypeUsage } from "../catalog/packTypes.js";
import { spellingHints } from "../catalog/spellcheck.js";
import { createProductWorkbook, PRODUCT_COLUMNS, rowToProduct } from "../catalog/productWorkbook.js";

export const productRoutes = express.Router();
// Any successful catalogue write (create, edit, archive, restore, import, pack types, image) changes the kitchens' stock lists.
productRoutes.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => { if (res.statusCode < 300) notifyKitchens("stock"); });
  next();
});

const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);

const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "inventory_management", allowed_formats: ["jpg", "png", "jpeg", "webp"], transformation: [{ width: 500, height: 500, crop: "limit" }] }
  })
});
const workbookUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

productRoutes.get("/export/excel", adminOnly, async (_req, res) => {
  try {
    const docs = await StockItem.find().populate("unitId", "name symbol").populate("stockGroupId", "name").sort({ name: 1 }).lean();
    const workbook = await createProductWorkbook(docs.map((doc) => serializeProduct(doc)));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="products-export.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.get("/import-template", adminOnly, async (_req, res) => {
  const workbook = await createProductWorkbook([], { template: true });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="products-import-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

productRoutes.post("/import", adminOnly, workbookUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new CatalogError(400, "IMPORT_FILE_REQUIRED", "Choose an Excel (.xlsx) file to import.");
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet("Products");
    if (!sheet) throw new CatalogError(400, "INVALID_IMPORT", "The workbook needs a sheet named Products.");
    const headersMatch = PRODUCT_COLUMNS.every(([header], index) => String(sheet.getRow(1).getCell(index + 1).value || "").trim() === header);
    if (!headersMatch) throw new CatalogError(400, "INVALID_IMPORT", "Use the current Products import template; its column headings must not be changed.");
    const units = await ensurePresetUnits();
    const unitBySymbol = new Map(units.map((unit) => [unit.symbol, unit]));
    const groups = await StockGroup.find().lean();
    const groupByName = new Map(groups.map((group) => [group.name.trim().toLowerCase(), group]));
    const results = [];
    for (let index = 2; index <= sheet.rowCount; index += 1) {
      const row = rowToProduct(sheet.getRow(index));
      if (!Object.values(row).some((value) => value !== "" && value !== false && (!Array.isArray(value) || value.length))) continue;
      try {
        const existing = row.id ? await StockItem.findById(row.id).lean() : null;
        if (row.id && !existing) throw new CatalogError(404, "NOT_FOUND", "Product ID was not found.");
        const group = groupByName.get(row.groupName.toLowerCase());
        const unit = unitBySymbol.get(row.unitSymbol);
        if ((row.archived || (existing && Boolean(row.archived) !== Boolean(existing.archived))) && !isSuperAdmin(req.user.role)) throw new CatalogError(403, "ARCHIVE_SUPER_ADMIN_ONLY", "Only a super-admin can archive or restore products.");
        if (existing && row.archived && !existing.archived) {
          const held = await kitchensHolding([existing._id]);
          if ((held.get(String(existing._id)) || 0) > 0) throw new CatalogError(409, "STOCK_HELD", "This product cannot be archived while a kitchen still holds it.");
        }
        const body = {
          ...row, stockGroupId: group?._id, unitId: unit?._id,
          ...(isSuperAdmin(req.user.role) ? { pricePerUnit: row.pricePerUnit, packs: row.packs } : {
            packs: row.packs.map(({ price, ...pack }) => pack)
          })
        };
        const update = await buildProductUpdate(body, { canPrice: isSuperAdmin(req.user.role), existing, userId: req.user.sub, allowBlankPrice: true });
        if (existing) {
          await StockItem.updateOne({ _id: existing._id }, { $set: { ...update, archived: row.archived, archivedAt: row.archived ? new Date() : null, archivedBy: row.archived ? req.user.sub : null } });
          results.push({ row: index, action: "updated", name: update.name });
        } else {
          const created = await StockItem.create({ ...update, archived: row.archived, ...(row.archived ? { archivedAt: new Date(), archivedBy: req.user.sub } : {}) });
          results.push({ row: index, action: "created", name: created.name });
        }
      } catch (error) {
        results.push({ row: index, action: "error", message: error.message || "Could not import this row." });
      }
    }
    const failed = results.filter((result) => result.action === "error");
    res.json({ imported: results.length - failed.length, failed: failed.length, results });
  } catch (error) { sendCatalogError(res, error); }
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

// Custom pack types. Presets are fixed and can never be retired.
const packTypeName = (raw) => {
  const name = canonicalPackName(raw);
  if (!name) throw new CatalogError(400, "VALIDATION", "Say which pack type.");
  if (isPresetPackType(name)) throw new CatalogError(400, "PRESET_PACK_TYPE", `${name} is a built-in pack type and cannot be deleted.`);
  return name;
};
const packTypeUsage = async (name) => {
  const products = await StockItem.find({ "packs.name": packNameMatch(name) }).select("name soldInPacks packs.name").sort({ name: 1 }).lean();
  return summarizePackTypeUsage(products, name);
};

// Advisory only: never blocks a save. Presets are skipped.
productRoutes.get("/pack-types/spellcheck", adminOnly, async (req, res) => {
  try {
    const name = canonicalPackName(req.query.name);
    res.json({ name, hints: !name || isPresetPackType(name) ? [] : await spellingHints(name) });
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.get("/pack-types/usage", adminOnly, async (req, res) => {
  try {
    const name = packTypeName(req.query.name);
    res.json({ name, products: await packTypeUsage(name) });
  } catch (error) {
    sendCatalogError(res, error);
  }
});

// Retires a custom pack type: its packs are removed from every product. A product left with bulk ordering on and
// no pack becomes incomplete ("needs a pack"), which keeps it away from kitchens until a pack is added.
// Past orders keep their own copy of the pack name, size and price, so history is unaffected.
productRoutes.post("/pack-types/remove", adminOnly, async (req, res) => {
  try {
    const name = packTypeName(req.body?.name);
    const products = await packTypeUsage(name);
    await StockItem.updateMany({ _id: { $in: products.map((p) => p._id) } }, { $pull: { packs: { name: packNameMatch(name) } } });
    res.json({ name, updated: products.length, disabled: products.filter((p) => p.disabled).length, products });
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
