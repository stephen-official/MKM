import mongoose from "mongoose";
import { GodownStock } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { isKitchenRole } from "../utils/roles.js";
import { isAvailable, isValidPrice, missingFields } from "./completeness.js";
import { UNIT_PRESETS, isPresetSymbol } from "./units.js";

export class CatalogError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

export const sendCatalogError = (res, error) => {
  if (error instanceof CatalogError) {
    return res.status(error.status).json({ code: error.code, message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
  }
  if (error?.code === 11000) return res.status(409).json({ code: "DUPLICATE", message: "Another product already uses that name or product code." });
  return res.status(500).json({ message: error.message });
};

/** Creates any missing preset unit (by exact symbol) and returns the preset units in list order. */
export const ensurePresetUnits = async () => {
  await Promise.all(UNIT_PRESETS.map(({ symbol, name }) =>
    Unit.updateOne({ symbol }, { $setOnInsert: { symbol, name, subUnits: [] } }, { upsert: true })));
  const units = await Unit.find({ symbol: { $in: UNIT_PRESETS.map((u) => u.symbol) } }).lean();
  const bySymbol = new Map(units.map((unit) => [unit.symbol, unit]));
  return UNIT_PRESETS.map((preset) => bySymbol.get(preset.symbol)).filter(Boolean);
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
const samePrice = (a, b) => (a ?? null) === (b ?? null) || (isValidPrice(a) && isValidPrice(b) && Math.abs(a - b) < 1e-9);

/**
 * Turns a request body into the fields to save. `canPrice` is true only for a super-admin: anyone else may not
 * change a price, and a pack whose size they change loses its price until a super-admin sets it again.
 */
export const buildProductUpdate = async (body, { canPrice, existing = null, userId = null }) => {
  const errors = {};
  const update = {};

  const name = String(body.name ?? existing?.name ?? "").trim();
  if (!name) errors.name = "Enter a product name.";
  else if (name.length > 120) errors.name = "Keep the name under 120 characters.";
  else {
    const clash = await StockItem.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: "i" }, ...(existing ? { _id: { $ne: existing._id } } : {}) }).select("_id").lean();
    if (clash) errors.name = "Another product already has this name.";
  }
  update.name = name;

  const groupId = body.stockGroupId ?? existing?.stockGroupId;
  if (!groupId || !mongoose.isValidObjectId(groupId) || !(await StockGroup.exists({ _id: groupId }))) errors.stockGroupId = "Choose a product group.";
  else update.stockGroupId = groupId;

  const unitId = body.unitId ?? existing?.unitId;
  const unit = unitId && mongoose.isValidObjectId(unitId) ? await Unit.findById(unitId).lean() : null;
  if (!unit || !isPresetSymbol(unit.symbol)) errors.unitId = "Choose a unit from the preset list.";
  else update.unitId = unit._id;

  const itemType = body.itemType ?? existing?.itemType ?? "stock";
  if (!["stock", "daily_use"].includes(itemType)) errors.itemType = "Choose stock or daily use.";
  else update.itemType = itemType;

  const threshold = toNumber(body.defaultThreshold ?? existing?.defaultThreshold ?? 0);
  if (!Number.isFinite(threshold) || threshold < 0) errors.defaultThreshold = "Enter a low-stock level of zero or more.";
  else update.defaultThreshold = threshold;

  const brand = String(body.brand ?? existing?.brand ?? "").trim();
  if (brand.length > 80) errors.brand = "Keep the brand under 80 characters.";
  update.brand = brand;

  const code = String(body.productCode ?? existing?.productCode ?? "").trim();
  if (code.length > 40) errors.productCode = "Keep the product code under 40 characters.";
  else if (code) {
    const clash = await StockItem.findOne({ productCode: { $regex: `^${escapeRegex(code)}$`, $options: "i" }, ...(existing ? { _id: { $ne: existing._id } } : {}) }).select("_id").lean();
    if (clash) errors.productCode = "Another product already uses this code.";
  }
  update.productCode = code || undefined;

  if (body.imageUrl !== undefined) update.imageUrl = String(body.imageUrl || "");

  // --- price per unit ---
  const priceInput = body.pricePerUnit === undefined ? existing?.pricePerUnit ?? null : toNumber(body.pricePerUnit);
  if (canPrice) {
    if (!isValidPrice(priceInput)) errors.pricePerUnit = "Enter a price per unit greater than zero.";
    else update.pricePerUnit = priceInput;
  } else if (!samePrice(priceInput, existing?.pricePerUnit ?? null)) {
    throw new CatalogError(403, "PRICE_SUPER_ADMIN_ONLY", "Only a super-admin can set or change prices.");
  }

  // --- packs ---
  const soldInPacks = Boolean(body.soldInPacks ?? existing?.soldInPacks ?? false);
  update.soldInPacks = soldInPacks;
  const previousPacks = new Map((existing?.packs || []).map((pack) => [String(pack._id), pack]));
  const packsInput = soldInPacks ? (Array.isArray(body.packs) ? body.packs : existing?.packs || []) : [];
  if (soldInPacks && packsInput.length === 0) errors.packs = "Add at least one pack, or untick “Ordered in packs”.";
  const packErrors = [];
  const seenNames = new Set();
  update.packs = packsInput.map((input, index) => {
    const before = input._id ? previousPacks.get(String(input._id)) : null;
    const packName = String(input.name ?? "").trim();
    const size = toNumber(input.size);
    const problems = {};
    if (!packName) problems.name = "Name the pack, e.g. Bag.";
    else if (seenNames.has(packName.toLowerCase())) problems.name = "Each pack needs a different name.";
    seenNames.add(packName.toLowerCase());
    if (!Number.isFinite(size) || size <= 0) problems.size = "Enter how much one pack holds.";
    let price = input.price === undefined ? before?.price ?? null : toNumber(input.price);
    if (canPrice) {
      if (!isValidPrice(price)) problems.price = "Enter the pack price.";
    } else {
      if (!samePrice(price, before?.price ?? null)) throw new CatalogError(403, "PRICE_SUPER_ADMIN_ONLY", "Only a super-admin can set or change prices.");
      if (before && size !== before.size) price = null; // a resized pack must be re-priced by a super-admin
    }
    if (Object.keys(problems).length) packErrors[index] = problems;
    return { ...(before ? { _id: before._id } : {}), name: packName, size, price };
  });
  if (packErrors.length) errors.packList = packErrors;

  if (Object.keys(errors).length) throw new CatalogError(400, "VALIDATION", "Some details need attention.", { errors });

  if (canPrice && !samePrice(update.pricePerUnit, existing?.pricePerUnit ?? null)) {
    update.priceUpdatedAt = new Date();
    update.priceUpdatedBy = userId;
  }
  return update;
};

/** godownId count per stockItemId for kitchens holding more than zero of it. */
export const kitchensHolding = async (stockItemIds) => {
  const match = { qtyBaseUnit: { $gt: 0 }, ...(stockItemIds ? { stockItemId: { $in: stockItemIds } } : {}) };
  const rows = await GodownStock.aggregate([{ $match: match }, { $group: { _id: "$stockItemId", kitchens: { $addToSet: "$godownId" } } }]);
  return new Map(rows.map((row) => [String(row._id), row.kitchens.length]));
};

export const serializeProduct = (doc, holding = new Map()) => {
  const unit = doc.unitId && typeof doc.unitId === "object" && "symbol" in doc.unitId ? doc.unitId : null;
  const group = doc.stockGroupId && typeof doc.stockGroupId === "object" && "name" in doc.stockGroupId ? doc.stockGroupId : null;
  const missing = missingFields({ ...doc, stockGroupId: group ? group._id : doc.stockGroupId }, unit);
  return {
    _id: doc._id,
    name: doc.name,
    imageUrl: doc.imageUrl || "",
    brand: doc.brand || "",
    productCode: doc.productCode || "",
    itemType: doc.itemType || "stock",
    defaultThreshold: doc.defaultThreshold || 0,
    group: group ? { _id: group._id, name: group.name } : null,
    unit: unit ? { _id: unit._id, symbol: unit.symbol, name: unit.name, preset: isPresetSymbol(unit.symbol) } : null,
    pricePerUnit: doc.pricePerUnit ?? null,
    priceUpdatedAt: doc.priceUpdatedAt || null,
    soldInPacks: Boolean(doc.soldInPacks),
    packs: (doc.packs || []).map((pack) => ({ _id: pack._id, name: pack.name, size: pack.size, price: pack.price ?? null })),
    archived: Boolean(doc.archived),
    archivedAt: doc.archivedAt || null,
    missing,
    available: !doc.archived && missing.length === 0,
    kitchensHolding: holding.get(String(doc._id)) || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

/** Kitchen users may only use complete, unarchived products; admins are never blocked here. */
export const assertKitchenCanUse = async (user, stockItemIds) => {
  if (!isKitchenRole(user?.role)) return;
  const ids = [...new Set(stockItemIds.filter(Boolean).map(String))];
  if (ids.length === 0) return;
  const products = await StockItem.find({ _id: { $in: ids.filter((id) => mongoose.isValidObjectId(id)) } }).populate("unitId", "symbol").lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const blocked = ids.filter((id) => !byId.has(id) || !isAvailable(byId.get(id), byId.get(id).unitId));
  if (blocked.length === 0) return;
  const names = blocked.map((id) => byId.get(id)?.name || "An unknown product");
  throw new CatalogError(409, "PRODUCT_UNAVAILABLE",
    `${names.join(", ")} ${names.length === 1 ? "is" : "are"} not available to kitchens yet: the product details are incomplete or it has been archived.`,
    { products: blocked });
};

/** For kitchen screens: availability of each product id. */
export const availabilityById = async (stockItemIds) => {
  const products = await StockItem.find({ _id: { $in: stockItemIds } }).populate("unitId", "symbol").lean();
  return new Map(products.map((product) => [String(product._id), { available: isAvailable(product, product.unitId), missing: missingFields(product, product.unitId), archived: Boolean(product.archived) }]));
};

/**
 * Route guard: rejects a kitchen user's write that names an unavailable product. `getIds(req)` may be async.
 * Replies with both `message` and `error`, as the kitchen app reads either depending on the screen.
 */
export const requireAvailableProducts = (getIds) => async (req, res, next) => {
  try {
    if (isKitchenRole(req.user?.role)) await assertKitchenCanUse(req.user, (await getIds(req)) || []);
    return next();
  } catch (error) {
    if (error instanceof CatalogError) return res.status(error.status).json({ code: error.code, message: error.message, error: error.message, products: error.products });
    return next(error);
  }
};

export const bodyItemIds = (req) => (Array.isArray(req.body?.items) ? req.body.items.map((item) => item?.stockItemId) : []);

/** Usage lines name kitchen stock rows (stockRecordId); this resolves them to their products. */
export const stockRecordItemIds = async (req) => {
  const ids = (Array.isArray(req.body?.items) ? req.body.items : []).map((item) => item?.stockRecordId).filter((id) => mongoose.isValidObjectId(id));
  const rows = await GodownStock.find({ _id: { $in: ids } }).select("stockItemId").lean();
  return rows.map((row) => row.stockItemId);
};
