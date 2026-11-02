import express from "express";
import { notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import multer from "multer";
import { storePhoto } from "../stock/photoStorage.js";
import { authorize } from "../middleware/auth.js";
import { PackName, StockItem, Unit } from "../models/InventoryModels.js";
import { isPresetSymbol, presetFor, refreshOfferedUnits } from "../catalog/units.js";
import { StockGroup } from "../models/InventoryModels.js";
import { isSuperAdmin } from "../utils/roles.js";
import {
  CatalogError, assignMissingProductNos, buildProductUpdate, ensurePresetUnits, kitchensHolding, sendCatalogError, serializeProduct
} from "../catalog/productService.js";
import { MAX_PACK_NAME_LENGTH, PRESET_PACK_TYPES, canonicalPackName, isPresetPackType, packNameMatch, summarizePackTypeUsage } from "../catalog/packTypes.js";
import { spellingHints } from "../catalog/spellcheck.js";
import { PACK_SLOTS, createProductWorkbook, headersMatch, isBlankRow, isNotesRow, rowToProduct } from "../catalog/productWorkbook.js";
import { ensureOtherGroup, sortGroups } from "../catalog/groups.js";
import { renderProductsPdf } from "../catalog/productPdf.js";

export const productRoutes = express.Router();
// Any successful catalogue write (create, edit, archive, restore, import, pack types, image) changes the kitchens' stock lists.
productRoutes.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => { if (res.statusCode < 300) notifyKitchens("stock"); });
  next();
});

const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);

// Product photos go where kitchen receiving photos go: Cloudinary when its keys are set, else the backend's uploads folder.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const workbookUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const STATUSES = ["all", "available", "incomplete", "fssai", "nophoto", "archived"];

const loadOne = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
  const product = await StockItem.findById(id).populate("unitId", "name symbol").populate("stockGroupId", "name").lean();
  if (!product) throw new CatalogError(404, "NOT_FOUND", "Product not found.");
  return serializeProduct(product, await kitchensHolding([product._id]));
};

productRoutes.get("/units", adminOnly, async (_req, res) => {
  try {
    const units = await ensurePresetUnits();
    const used = new Map((await StockItem.aggregate([{ $group: { _id: "$unitId", n: { $sum: 1 } } }])).map((row) => [String(row._id), row.n]));
    res.json(units.map((unit) => ({ _id: unit._id, symbol: unit.symbol, name: unit.name, builtIn: isPresetSymbol(unit.symbol), productCount: used.get(String(unit._id)) || 0 })));
  } catch (error) {
    sendCatalogError(res, error);
  }
});

// Settings › Units: a super-admin adds a unit products may use. Kitchens count in it exactly, with no conversion.
productRoutes.post("/units", superAdminOnly, async (req, res) => {
  try {
    const symbol = String(req.body?.symbol ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    if (!symbol || symbol.length > 12 || /\s/.test(symbol)) throw new CatalogError(400, "UNIT_SYMBOL", "Give a short unit, up to 12 letters with no spaces, e.g. bunch.");
    if (!name || name.length > 30) throw new CatalogError(400, "UNIT_NAME", "Give the unit's full name, up to 30 characters, e.g. Bunch.");
    const units = await ensurePresetUnits();
    const clash = units.find((unit) => unit.symbol.toLowerCase() === symbol.toLowerCase() || unit.name.toLowerCase() === name.toLowerCase());
    if (clash) throw new CatalogError(409, "UNIT_EXISTS", `“${clash.name} (${clash.symbol})” is already in the list.`);
    const sameAs = presetFor({ symbol, name });
    if (sameAs) throw new CatalogError(409, "UNIT_EXISTS", `That means the same as “${sameAs.name} (${sameAs.symbol})”, which is already in the list.`);
    // An old unit with this exact symbol (from before the presets) comes back into use, so its products become usable again.
    const unit = await Unit.findOneAndUpdate({ symbol }, { $set: { name, offered: true }, $setOnInsert: { subUnits: [] } }, { new: true, upsert: true }).lean();
    await refreshOfferedUnits();
    res.status(201).json({ _id: unit._id, symbol: unit.symbol, name: unit.name, builtIn: false, productCount: await StockItem.countDocuments({ unitId: unit._id }) });
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.delete("/units/:id", superAdminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new CatalogError(404, "NOT_FOUND", "Unit not found.");
    const unit = await Unit.findById(req.params.id).lean();
    if (!unit || (!unit.offered && !isPresetSymbol(unit.symbol))) throw new CatalogError(404, "NOT_FOUND", "Unit not found.");
    if (isPresetSymbol(unit.symbol)) throw new CatalogError(409, "UNIT_BUILT_IN", `“${unit.name}” is built in and cannot be removed.`);
    const used = await StockItem.countDocuments({ unitId: unit._id });
    if (used) throw new CatalogError(409, "UNIT_IN_USE", `${used === 1 ? "1 product counts" : `${used} products count`} in ${unit.symbol}. Move ${used === 1 ? "it" : "them"} to another unit first.`);
    await Unit.deleteOne({ _id: unit._id });
    await refreshOfferedUnits();
    res.json({ message: "Removed" });
  } catch (error) { sendCatalogError(res, error); }
});

// Download names read Section_Date_MKM, e.g. Products_02-Nov-2026_MKM.xlsx (today in business time). Keep in step with admin-web businessTime.js downloadName.
const fileDate = (now = new Date()) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(now).replace(/ /g, "-");
export const downloadName = (section, ext, now) => `${section}_${fileDate(now)}_MKM.${ext}`;

/** Custom pack names: those added in Settings and those typed on products, once each (A–Z), with how many products use each. */
const customPackNames = async () => {
  const byKey = new Map();
  (await PackName.find().lean()).forEach((row) => byKey.set(row.key, { name: row.name, productCount: 0, stored: true }));
  (await StockItem.find({ "packs.0": { $exists: true } }).select("packs.name").lean()).forEach((product) => {
    new Set(product.packs.map((pack) => canonicalPackName(pack.name)).filter((name) => name && !isPresetPackType(name))).forEach((name) => {
      const row = byKey.get(name.toLowerCase()) || { name, productCount: 0, stored: false };
      row.productCount += 1;
      byKey.set(name.toLowerCase(), row);
    });
  });
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
};

// The dropdown sources for the workbook, read at download time: every group, and the custom pack names in use.
const workbookLists = async () => {
  await ensureOtherGroup();
  const groups = sortGroups(await StockGroup.find().lean()).map((group) => group.name);
  const packNames = (await customPackNames()).map((row) => row.name);
  const units = (await ensurePresetUnits()).map((unit) => unit.symbol);
  return { groups, packNames, units };
};
const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

// Export and template are the same workbook: export it, edit it, upload it back through Bulk add.
productRoutes.get("/export/excel", adminOnly, async (_req, res) => {
  try {
    await assignMissingProductNos();
    const docs = await StockItem.find().populate("unitId", "name symbol").populate("stockGroupId", "name").sort({ name: 1 }).lean();
    await sendWorkbook(res, await createProductWorkbook(docs.map((doc) => serializeProduct(doc)), await workbookLists()), downloadName("Products", "xlsx"));
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.get("/export/pdf", adminOnly, async (_req, res) => {
  try {
    await assignMissingProductNos();
    const docs = await StockItem.find().populate("unitId", "name symbol").populate("stockGroupId", "name").lean();
    const products = docs.map((doc) => serializeProduct(doc))
      .sort((a, b) => String(a.group?.name || "").localeCompare(String(b.group?.name || "")) || a.name.localeCompare(b.name));
    const pdf = await renderProductsPdf(products);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName("Products", "pdf")}"`);
    res.send(pdf);
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.get("/import-template", adminOnly, async (_req, res) => {
  try {
    await sendWorkbook(res, await createProductWorkbook([], await workbookLists()), downloadName("Products-template", "xlsx"));
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.post("/import", adminOnly, workbookUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new CatalogError(400, "IMPORT_FILE_REQUIRED", "Choose an Excel (.xlsx) file to upload.");
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(req.file.buffer); } catch { throw new CatalogError(400, "INVALID_IMPORT", "This is not an Excel (.xlsx) file the app can read."); }
    const sheet = workbook.getWorksheet("Products");
    if (!sheet) throw new CatalogError(400, "INVALID_IMPORT", "The workbook needs a sheet named Products. Download a new template.");
    if (!headersMatch(sheet)) throw new CatalogError(400, "INVALID_IMPORT", "This file has an older or changed layout. Download a new template (or export again) and copy your rows into it.");
    await assignMissingProductNos();
    const superAdmin = isSuperAdmin(req.user.role);
    const units = await ensurePresetUnits();
    const unitBySymbol = new Map(units.map((unit) => [unit.symbol, unit]));
    const groupByName = new Map((await StockGroup.find().lean()).map((group) => [group.name.trim().toLowerCase(), group]));
    const newGroups = []; // groups typed in this file; removed again at the end if no row ended up in them
    const results = [];
    for (let index = 2; index <= sheet.rowCount; index += 1) {
      const sheetRow = sheet.getRow(index);
      if (isBlankRow(sheetRow) || (index === 2 && isNotesRow(sheetRow))) continue;
      const row = rowToProduct(sheetRow);
      try {
        const existing = row.productNo ? await StockItem.findOne({ productNo: row.productNo }).lean() : null;
        if (row.productNo && !existing) throw new CatalogError(404, "NOT_FOUND", `Product ID ${row.productNo} was not found. Leave Product ID blank to add a new product.`);
        let group = groupByName.get(row.groupName.toLowerCase());
        if (!group && row.groupName) {
          group = await StockGroup.create({ name: row.groupName });
          groupByName.set(row.groupName.toLowerCase(), group);
          newGroups.push(group);
        }
        const unitText = row.unitSymbol.toLowerCase();
        const unit = unitBySymbol.get(row.unitSymbol) || units.find((u) => u.symbol.toLowerCase() === unitText || u.name.toLowerCase() === unitText);
        if ((row.archived || (existing && Boolean(row.archived) !== Boolean(existing.archived))) && !superAdmin) throw new CatalogError(403, "ARCHIVE_SUPER_ADMIN_ONLY", "Only a super-admin can archive or restore products.");
        if (existing && row.archived && !existing.archived) {
          const held = await kitchensHolding([existing._id]);
          if ((held.get(String(existing._id)) || 0) > 0) throw new CatalogError(409, "STOCK_HELD", "This product cannot be archived while a kitchen still holds it.");
        }
        // A pack is the same pack when its name matches, so it keeps its price (a resized pack waits for a new one).
        // The file has PACK_SLOTS pack columns; a product's further packs are edited in the app, so they are kept as they are.
        const samePack = (a, b) => canonicalPackName(a.name).toLowerCase() === canonicalPackName(b.name).toLowerCase();
        const packs = row.packs.map((pack) => {
          const before = (existing?.packs || []).find((p) => samePack(p, pack));
          return { ...(before ? { _id: before._id } : {}), name: pack.name, size: pack.size };
        });
        if (row.soldInPacks) packs.push(...(existing?.packs || []).slice(PACK_SLOTS).filter((p) => !packs.some((pack) => samePack(p, pack))));
        const { productNo, ...fields } = row;
        // Prices are not in the file and an upload never changes them, whoever sends it (canPrice: false keeps them as they are).
        const body = { ...fields, stockGroupId: group?._id, unitId: unit?._id, packs };
        const update = await buildProductUpdate(body, { canPrice: false, existing, userId: req.user.sub, allowBlankPrice: true });
        if (existing) {
          await StockItem.updateOne({ _id: existing._id }, { $set: { ...update, archived: row.archived, archivedAt: row.archived ? existing.archivedAt || new Date() : null, archivedBy: row.archived ? existing.archivedBy || req.user.sub : null } });
          results.push({ row: index, action: "updated", name: update.name, productNo });
        } else {
          const created = await StockItem.create({ ...update, archived: row.archived, ...(row.archived ? { archivedAt: new Date(), archivedBy: req.user.sub } : {}) });
          results.push({ row: index, action: "created", name: created.name, productNo: created.productNo });
        }
      } catch (error) {
        // Name the fields that failed ("Pack 1: Enter how much one pack holds."), not just "Some details need attention."
        const fields = error.errors ? Object.entries(error.errors).flatMap(([key, value]) => (key === "packList"
          ? (value || []).flatMap((problems, i) => Object.values(problems || {}).map((text) => `Pack ${i + 1}: ${text}`))
          : [value])) : [];
        results.push({ row: index, action: "error", name: row.name, message: fields.length ? fields.join(" ") : error.message || "Could not add this row." });
      }
    }
    for (const group of newGroups) {
      if (!(await StockItem.exists({ stockGroupId: group._id }))) await StockGroup.deleteOne({ _id: group._id });
    }
    const failed = results.filter((result) => result.action === "error");
    res.json({ imported: results.length - failed.length, failed: failed.length, results });
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.post("/upload-image", adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) throw new CatalogError(400, "IMAGE_REQUIRED", "Choose an image to upload.");
    const imageUrl = await storePhoto({ buffer: req.file.buffer, mimetype: req.file.mimetype, folder: "products", baseUrl: `${req.protocol}://${req.get("host")}` });
    return res.status(201).json({ imageUrl });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ code: error.code || "INVALID_INPUT", message: error.message });
    return sendCatalogError(res, error);
  }
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
      archived: all.filter((p) => p.archived).length,
      // Waiting on a super-admin: the only thing (or one of the things) missing is a price.
      needsPrice: all.filter((p) => !p.archived && p.missing.some((code) => code === "price" || code === "packPrice")).length,
      // Food-safety facts not filled in yet (older products, or a food product without its mark or storage).
      fssai: all.filter((p) => p.fssaiMissing).length,
      // Kitchen staff pick products by their picture; these have none yet.
      noPhoto: all.filter((p) => !p.archived && !p.imageUrl).length
    };
    const matchesStatus = (p) => status === "all" || (status === "available" && p.available)
      || (status === "incomplete" && !p.archived && !p.available) || (status === "fssai" && p.fssaiMissing) || (status === "nophoto" && !p.archived && !p.imageUrl) || (status === "archived" && p.archived);
    const matchesQuery = (p) => !q || [p.name, p.brand, p.productCode, p.group?.name].some((text) => String(text || "").toLowerCase().includes(q));
    res.json({ items: all.filter((p) => matchesStatus(p) && matchesQuery(p)), counts });
  } catch (error) {
    sendCatalogError(res, error);
  }
});

// Settings › Pack names: the built-in names, then the custom ones (added here or typed on a product).
productRoutes.get("/pack-names", adminOnly, async (_req, res) => {
  try {
    res.json([...PRESET_PACK_TYPES.map((name) => ({ name, builtIn: true })), ...(await customPackNames()).map(({ name, productCount }) => ({ name, builtIn: false, productCount }))]);
  } catch (error) { sendCatalogError(res, error); }
});

productRoutes.post("/pack-names", superAdminOnly, async (req, res) => {
  try {
    const name = canonicalPackName(req.body?.name);
    if (!name || name.length > MAX_PACK_NAME_LENGTH) throw new CatalogError(400, "PACK_NAME", `Give a pack name of up to ${MAX_PACK_NAME_LENGTH} characters, e.g. Sack.`);
    if (isPresetPackType(name) || (await customPackNames()).some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      throw new CatalogError(409, "PACK_NAME_EXISTS", `“${name}” is already in the list.`);
    }
    await PackName.create({ name, key: name.toLowerCase() });
    res.status(201).json({ name, builtIn: false, productCount: 0 });
  } catch (error) { sendCatalogError(res, error); }
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
    await PackName.deleteOne({ key: name.toLowerCase() }); // a name added in Settings leaves the list too
    res.json({ name, updated: products.length, disabled: products.filter((p) => p.disabled).length, products });
  } catch (error) {
    sendCatalogError(res, error);
  }
});

productRoutes.post("/", adminOnly, async (req, res) => {
  try {
    const update = await buildProductUpdate(req.body || {}, { canPrice: isSuperAdmin(req.user.role), userId: req.user.sub, requirePhoto: true });
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
    const { productCode, ...update } = await buildProductUpdate(req.body || {}, { canPrice: isSuperAdmin(req.user.role), existing, userId: req.user.sub, requirePhoto: true });
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
