import mongoose from "mongoose";
import { GodownStock } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit, nextProductNo } from "../models/InventoryModels.js";
import { isKitchenRole } from "../utils/roles.js";
import { MAX_PACK_NAME_LENGTH, canonicalPackName } from "./packTypes.js";
import { isAvailable, isValidPrice, missingFields } from "./completeness.js";
import { UNIT_PRESETS, isOfferedSymbol, isPresetSymbol } from "./units.js";
import { ALLERGENS, PRODUCT_FORMS, PRODUCT_KINDS, STORAGE_OPTIONS, VEG_MARKS, foodSafetyMissing } from "./foodSafety.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { sendError, typedErrorPolicy } from "../shared/httpErrors.js";

export class CatalogError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

export const catalogErrorPolicy = typedErrorPolicy({
  isPublic: (error) => error instanceof CatalogError,
  extraFields: ["errors"], includeFallbackCode: false, useErrorMessage: true,
  specials: [{ matches: (error) => !(error instanceof CatalogError) && error?.code === 11000, status: 409, code: "DUPLICATE", message: "Another product already uses that name or product code." }],
});
export const sendCatalogError = (res, error) => sendError(res, error, catalogErrorPolicy);

/** Creates any missing built-in unit (by exact symbol) and returns the units products may use: built-in ones in list order, then those added in Settings A–Z. */
export const ensurePresetUnits = async () => {
  await Promise.all(UNIT_PRESETS.map(({ symbol, name }) =>
    Unit.updateOne({ symbol }, { $setOnInsert: { symbol, name, subUnits: [] } }, { upsert: true })));
  const units = await Unit.find({ $or: [{ symbol: { $in: UNIT_PRESETS.map((u) => u.symbol) } }, { offered: true }] }).lean();
  const bySymbol = new Map(units.map((unit) => [unit.symbol, unit]));
  const added = units.filter((unit) => !isPresetSymbol(unit.symbol)).sort((a, b) => a.name.localeCompare(b.name));
  return [...UNIT_PRESETS.map((preset) => bySymbol.get(preset.symbol)).filter(Boolean), ...added];
};

const toNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
const samePrice = (a, b) => (a ?? null) === (b ?? null) || (isValidPrice(a) && isValidPrice(b) && Math.abs(a - b) < 1e-9);

/**
 * Turns a request body into the fields to save. `canPrice` is true only for a super-admin: anyone else may not
 * change a price, and a pack whose size they change loses its price until a super-admin sets it again.
 */
export const buildProductUpdate = async (body, { canPrice, existing = null, userId = null, allowBlankPrice = false, requirePhoto = false }) => {
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
  if (!unit || !isOfferedSymbol(unit.symbol)) errors.unitId = "Choose a unit from the list.";
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
  // The form must carry a photo (kitchen staff pick by picture). Spreadsheet imports may leave it blank; those are flagged.
  if (requirePhoto && !String(body.imageUrl ?? existing?.imageUrl ?? "").trim()) errors.imageUrl = "Add a photo. Kitchen staff pick products by their picture.";
  // --- food safety (FSSAI) ---
  // A new product must say whether it is food. An older product keeps whatever it had until someone edits it.
  const kind = body.kind ?? existing?.kind ?? null;
  if (kind === null && !existing) errors.kind = "Say whether this is food or not.";
  else if (kind !== null && !PRODUCT_KINDS.includes(kind)) errors.kind = "Choose food or non-food.";
  else update.kind = kind;
  if (kind === "food") {
    const form = body.form ?? existing?.form ?? null;
    if (form !== null && !PRODUCT_FORMS.includes(form)) errors.form = "Choose packaged or loose.";
    else update.form = form;
    const vegMark = body.vegMark ?? existing?.vegMark ?? null;
    if (!VEG_MARKS.includes(vegMark)) errors.vegMark = "Choose veg, non-veg or egg.";
    else update.vegMark = vegMark;
    const storage = body.storage ?? existing?.storage ?? null;
    if (!STORAGE_OPTIONS.includes(storage)) errors.storage = "Say where it is kept.";
    else update.storage = storage;
    const allergens = body.allergens ?? existing?.allergens ?? [];
    if (!Array.isArray(allergens) || allergens.some((code) => !ALLERGENS.includes(code))) errors.allergens = "Pick allergens from the list.";
    else update.allergens = [...new Set(allergens)];
  } else if (kind === "non_food") {
    Object.assign(update, { form: null, vegMark: null, storage: null, allergens: [] });
  }

  // --- price per unit ---
  const priceInput = body.pricePerUnit === undefined ? existing?.pricePerUnit ?? null : toNumber(body.pricePerUnit);
  if (canPrice) {
    if (priceInput !== null && !Number.isFinite(priceInput)) errors.pricePerUnit = "Enter the price as a number.";
    else if (!isValidPrice(priceInput) && !allowBlankPrice) errors.pricePerUnit = "Enter a price per unit greater than zero.";
    else update.pricePerUnit = priceInput;
  } else if (!samePrice(priceInput, existing?.pricePerUnit ?? null)) {
    throw new CatalogError(403, "PRICE_SUPER_ADMIN_ONLY", "Only a super-admin can set or change prices.");
  }

  // --- expiry ---
  // Follows the food answers: packaged food asks the kitchen for an expiry date on receipt; loose/fresh food and non-food do not.
  // A product that has no kind yet (saved before the food facts) keeps whatever it had, or what the body says.
  if (update.kind === "food") update.expiryRequired = update.form !== "loose";
  else if (update.kind === "non_food") update.expiryRequired = false;
  else update.expiryRequired = Boolean(body.expiryRequired ?? existing?.expiryRequired ?? true);
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
    const packName = canonicalPackName(input.name);
    const size = toNumber(input.size);
    const problems = {};
    if (!packName) problems.name = "Name the pack, e.g. Bag.";
    else if (packName.length > MAX_PACK_NAME_LENGTH) problems.name = `Keep the pack name to ${MAX_PACK_NAME_LENGTH} characters or fewer.`;
    else if (seenNames.has(packName.toLowerCase())) problems.name = "Each pack needs a different name.";
    seenNames.add(packName.toLowerCase());
    if (!Number.isFinite(size) || size <= 0) problems.size = "Enter how much one pack holds.";
    let price = input.price === undefined ? before?.price ?? null : toNumber(input.price);
    if (canPrice) {
      if (price !== null && !Number.isFinite(price)) problems.price = "Enter the pack price as a number.";
      else if (!isValidPrice(price) && !allowBlankPrice) problems.price = "Enter the pack price.";
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
/** Gives a Product ID to every product still without one (older products, bulk inserts), oldest first. Safe to run often. */
export const assignMissingProductNos = async () => {
  const missing = await StockItem.find({ productNo: { $not: { $type: "string" } } }).sort({ createdAt: 1, _id: 1 }).select("_id").lean();
  for (const { _id } of missing) {
    await StockItem.updateOne({ _id, productNo: { $not: { $type: "string" } } }, { $set: { productNo: await nextProductNo() } });
  }
  return missing.length;
};

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
    productNo: doc.productNo || "",
    itemType: doc.itemType || "stock",
    defaultThreshold: doc.defaultThreshold || 0,
    group: group ? { _id: group._id, name: group.name } : null,
    unit: unit ? { _id: unit._id, symbol: unit.symbol, name: unit.name, preset: isOfferedSymbol(unit.symbol) } : null,
    pricePerUnit: doc.pricePerUnit ?? null,
    priceUpdatedAt: doc.priceUpdatedAt || null,
    expiryRequired: doc.expiryRequired !== false,
    kind: doc.kind || null,
    form: doc.form || null,
    vegMark: doc.vegMark || null,
    allergens: doc.allergens || [],
    storage: doc.storage || null,
    // True while the food-safety facts are not filled in (an older product, or a food product missing its mark or storage).
    fssaiMissing: !doc.archived && foodSafetyMissing(doc).length > 0,
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
