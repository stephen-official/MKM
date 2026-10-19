import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { authorize } from "../middleware/auth.js";
import { packQuantityMatchesBase, packSnapshot } from "../catalog/packaging.js";
import { assertKitchenCanUse, bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";
import { Godown, StockItem } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { Supplier } from "../models/SupplierModel.js";
import { createStockBatch } from "../stock/batchService.js";
import { nextTrackingId } from "../stock/trackingId.js";
import { isPhotoType, storePhoto } from "../stock/photoStorage.js";
import { businessDateOf, isIsoDate, startOfBusinessDay } from "../executive/params.js";
import { isKitchenRole } from "../utils/roles.js";
import { closesAtFor, neededByFor } from "../ordering/window.js";
import { readOrderingSettings } from "../ordering/settings.js";

export const collaborativePurchaseOrderRoutes = express.Router();
const everyone = authorize(["admin", "user"]);
const kitchenOnly = authorize(["user"]);
const adminOnly = authorize(["admin"]);
const STATUSES = new Set(["open", "closed", "approved", "ordered", "cancelled"]);
// A closed order is never reopened; a kitchen that still needs items starts a new order (or an admin does for it).
// "approved" is reached only through POST /:id/approve, and an order must be approved before it is ordered.
const TRANSITIONS = {
  open: new Set(["closed", "cancelled"]),
  closed: new Set(["cancelled"]),
  approved: new Set(["ordered", "cancelled"]),
  ordered: new Set(),
  cancelled: new Set(),
};

const CODES = { 400: "INVALID_INPUT", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT" };
const fail = (status, message, code = CODES[status]) => Object.assign(new Error(message), { status, code });
const sendError = (res, error) => {
  if (error.name === "VersionError") {
    return res.status(409).json({ code: "VERSION_CONFLICT", message: "This order was changed by someone else. Reload and try again." });
  }
  const status = error.status || (error.name === "CastError" ? 404 : 500);
  return res.status(status).json({ code: error.code || CODES[status] || "SERVER_ERROR", message: error.message });
};

/** Orders whose ordering window has passed are closed here, so every read and write sees the current status. */
export const closeExpiredOrders = (now = new Date()) => CollaborativePurchaseOrder.updateMany(
  { status: "open", closesAt: { $ne: null, $lte: now } },
  [{ $set: { status: "closed", statusChangedAt: "$closesAt", statusChangedBy: null } }],
);
const text = (value, max, label) => {
  const result = String(value || "").trim();
  if (result.length > max) throw fail(400, `${label} must be ${max} characters or fewer`);
  return result;
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

const lineKey = (line) => `${String(line.stockItemId?._id || line.stockItemId)}:${String(line.packId || "base")}`;
const productOf = (line) => String(line.stockItemId?._id || line.stockItemId);

/**
 * A kitchen's new item list, keeping its approved lines: each must come back unchanged (its approval is
 * carried over) and no other line may name an approved product. Throws LINE_APPROVED otherwise.
 */
export const keepApprovedLines = (currentItems, nextItems) => {
  const approved = currentItems.filter((line) => line.approvedAt);
  const approvedProducts = new Set(approved.map(productOf));
  const byKey = new Map(nextItems.map((line) => [lineKey(line), line]));
  const locked = () => fail(409, "Approved items cannot be changed or added to", "LINE_APPROVED");
  for (const line of approved) {
    const next = byKey.get(lineKey(line));
    if (!next || Number(next.qtyBaseUnit) !== Number(line.qtyBaseUnit) || Number(next.packQuantity || 0) !== Number(line.packQuantity || 0)) throw locked();
    Object.assign(next, { approvedAt: line.approvedAt, approvedBy: line.approvedBy });
  }
  if (nextItems.some((line) => approvedProducts.has(productOf(line)) && !line.approvedAt)) throw locked();
  return nextItems;
};

const populateOrder = (query) => query
  .populate("createdBy", "name")
  .populate("createdByGodown", "name")
  .populate("statusChangedBy", "name")
  .populate("supplierId", "name fssaiLicence")
  .populate("contributions.userId", "name")
  .populate("contributions.godownId", "name")
  .populate({
    path: "contributions.items.stockItemId",
    select: "name imageUrl unitId stockGroupId brand productCode soldInPacks packs expiryRequired",
    populate: [{ path: "unitId", select: "name symbol" }, { path: "stockGroupId", select: "name" }],
  });

const idOf = (ref) => String(ref?._id || ref);

/** A kitchen sees which items other kitchens asked for, but not how much or their notes. */
const otherKitchensHidden = (value, viewer) => ({
  ...value,
  contributions: (value.contributions || []).map((contribution) => (idOf(contribution.godownId) === String(viewer.godownId)
    ? contribution
    : { ...contribution, note: undefined, items: contribution.items.map((item) => ({ stockItemId: item.stockItemId })) })),
  combinedItems: value.combinedItems.map((line) => ({ stockItemId: line.stockItemId })),
});

const responseOrder = (order, viewer) => {
  const value = order.toObject ? order.toObject() : order;
  const totals = new Map();
  for (const contribution of value.contributions || []) {
    for (const item of contribution.items || []) {
      const product = item.stockItemId;
      const id = idOf(product);
      const current = totals.get(id) || { stockItemId: product, qtyBaseUnit: 0 };
      current.qtyBaseUnit += Number(item.qtyBaseUnit) || 0;
      totals.set(id, current);
    }
  }
  // The populated supplier moves to `supplier`; admins also keep the raw id for their picker.
  const supplier = value.supplierId && typeof value.supplierId === "object" ? value.supplierId : null;
  const full = {
    ...value, supplierId: supplier ? supplier._id : value.supplierId, supplier,
    kitchenCount: value.contributions?.length || 0, combinedItems: [...totals.values()],
  };
  if (!isKitchenRole(viewer?.role)) return full;
  return otherKitchensHidden({ ...full, supplierId: undefined }, viewer);
};

const loadOrder = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw fail(404, "Collaborative purchase order not found");
  const order = await populateOrder(CollaborativePurchaseOrder.findById(id));
  if (!order) throw fail(404, "Collaborative purchase order not found");
  return order;
};

const contributionFrom = (req, godownId = req.user.godownId) => {
  if (!godownId) throw fail(403, "Your account is not assigned to a kitchen");
  const items = normalizeCollaborativeItems(req.body.items);
  if (!items) throw fail(400, "Add at least one item with a valid quantity");
  return {
    godownId,
    userId: req.user.sub,
    items,
    note: text(req.body.note, 500, "Contribution note"),
    updatedAt: new Date(),
  };
};

collaborativePurchaseOrderRoutes.get("/", everyone, async (req, res) => {
  try {
    await closeExpiredOrders();
    const status = req.query.status ? String(req.query.status) : null;
    if (status && !STATUSES.has(status)) throw fail(400, "Invalid status filter");
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = status ? { status } : {};
    const [orders, total] = await Promise.all([
      populateOrder(CollaborativePurchaseOrder.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)),
      CollaborativePurchaseOrder.countDocuments(filter),
    ]);
    return res.json({ items: orders.map((order) => responseOrder(order, req.user)), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) { return sendError(res, error); }
});

/** The kitchen an order is opened for: the cook's own, or the one an admin names when opening it on its behalf. */
const openingKitchen = async (req) => {
  if (isKitchenRole(req.user.role)) return req.user.godownId;
  const godownId = String(req.body.godownId || "");
  if (!mongoose.isValidObjectId(godownId) || !(await Godown.exists({ _id: godownId, active: { $ne: false } }))) {
    throw fail(400, "Choose the kitchen this order is for");
  }
  await assertKitchenCanUse({ role: "user" }, bodyItemIds(req));
  return godownId;
};

collaborativePurchaseOrderRoutes.post("/", everyone, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const { settings } = await readOrderingSettings();
    const openedAt = new Date();
    const emergency = req.body.emergency === true;
    const neededBy = neededByFor({ neededIn: req.body.neededIn, emergency }, settings, openedAt);
    if (!neededBy) throw fail(400, "Choose when the items are needed");
    const godownId = await openingKitchen(req);
    const contribution = contributionFrom(req, godownId);
    contribution.addedAt = contribution.updatedAt;
    const order = await CollaborativePurchaseOrder.create({
      orderNo: `CPO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase()}`,
      title: text(req.body.title, 120, "Title"),
      note: text(req.body.orderNote, 1000, "Order note"),
      neededBy,
      emergency,
      closesAt: closesAtFor(openedAt, neededBy, settings),
      createdBy: req.user.sub,
      createdByGodown: godownId,
      contributions: [contribution],
    });
    return res.status(201).json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.get("/:id", everyone, async (req, res) => {
  try {
    await closeExpiredOrders();
    return res.json(responseOrder(await loadOrder(req.params.id), req.user));
  }
  catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.post("/:id/contributions", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    await closeExpiredOrders();
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const contribution = contributionFrom(req);
    contribution.addedAt = contribution.updatedAt;
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, status: "open", "contributions.godownId": { $ne: req.user.godownId } },
      { $push: { contributions: contribution }, $set: { updatedAt: new Date() }, $inc: { __v: 1 } },
      { new: true, runValidators: true },
    );
    if (!order) {
      const existing = await CollaborativePurchaseOrder.findById(req.params.id).lean();
      if (!existing) throw fail(404, "Collaborative purchase order not found");
      if (existing.status !== "open") throw fail(409, "This order is no longer accepting additions", "ORDER_CLOSED");
      throw fail(409, "Your kitchen has already joined this order; edit its contribution instead", "ALREADY_JOINED");
    }
    return res.status(201).json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.put("/:id/contributions/me", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    await closeExpiredOrders();
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const contribution = contributionFrom(req);
    // Load, check and save with the version check, so an approval made meanwhile is never overwritten.
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (order.status !== "open") throw fail(409, "This order is no longer accepting changes", "ORDER_CLOSED");
    const mine = order.contributions.find((entry) => String(entry.godownId) === String(req.user.godownId));
    if (!mine) throw fail(404, "Your kitchen has not joined this order");
    if (mine.approvedAt) throw fail(409, "Your kitchen's items have been approved and can no longer be changed", "SHARE_APPROVED");
    mine.items = keepApprovedLines(mine.items, contribution.items);
    Object.assign(mine, { note: contribution.note, userId: req.user.sub, updatedAt: contribution.updatedAt });
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.delete("/:id/contributions/me", kitchenOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const existing = await CollaborativePurchaseOrder.findById(req.params.id).lean();
    if (!existing) throw fail(404, "Collaborative purchase order not found");
    if (existing.status !== "open") throw fail(409, "This order is no longer accepting changes", "ORDER_CLOSED");
    if (String(existing.createdByGodown) === String(req.user.godownId)) throw fail(409, "The kitchen that opened the order must keep a contribution; edit it instead");
    const mine = existing.contributions.find((entry) => String(entry.godownId) === String(req.user.godownId));
    if (mine && (mine.approvedAt || mine.items.some((line) => line.approvedAt))) {
      throw fail(409, "Your kitchen has approved items on this order, so it cannot leave", "LINE_APPROVED");
    }
    // Matching the version read above means no approval landed in between.
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, status: "open", __v: existing.__v, "contributions.godownId": req.user.godownId },
      { $pull: { contributions: { godownId: req.user.godownId } }, $set: { updatedAt: new Date() }, $inc: { __v: 1 } },
      { new: true },
    );
    if (!order && mine && (await CollaborativePurchaseOrder.exists({ _id: req.params.id, "contributions.godownId": req.user.godownId }))) {
      throw fail(409, "This order was changed by someone else. Reload and try again.", "VERSION_CONFLICT");
    }
    if (!order) throw fail(404, "Your kitchen has not joined this order");
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Admin approval: {} approves every kitchen and closes the order; { godownId } approves that kitchen's whole
 * share; { godownId, items: [{ stockItemId, packId? }] } approves just those lines. Approved items are locked.
 */
collaborativePurchaseOrderRoutes.post("/:id/approve", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const { godownId, items } = req.body || {};
    if (godownId !== undefined && !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
    if (items !== undefined && (!godownId || !Array.isArray(items) || items.length === 0)) throw fail(400, "Choose the kitchen and the items to approve");
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (!["open", "closed"].includes(order.status)) throw fail(409, "This order can no longer be approved", "ORDER_CLOSED");

    const stamp = { approvedAt: new Date(), approvedBy: req.user.sub };
    const approveLines = (lines) => lines.filter((line) => !line.approvedAt).forEach((line) => Object.assign(line, stamp));
    const approveShare = (share) => { approveLines(share.items); if (!share.approvedAt) Object.assign(share, stamp); };

    if (!godownId) {
      order.contributions.forEach(approveShare);
      Object.assign(order, { status: "approved", statusChangedAt: stamp.approvedAt, statusChangedBy: req.user.sub });
    } else {
      const share = order.contributions.find((entry) => String(entry.godownId) === String(godownId));
      if (!share) throw fail(404, "That kitchen is not on this order");
      if (!items) approveShare(share);
      else {
        const chosen = share.items.filter((line) => items.some((pick) => String(pick?.stockItemId) === productOf(line)
          && (!pick.packId || String(pick.packId) === String(line.packId))));
        if (chosen.length === 0) throw fail(404, "Those items are not in this kitchen's share");
        approveLines(chosen);
      }
    }
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

const isSent = (line, share) => Boolean(line.dispatchedAt || share.dispatchedAt);
const isReceived = (line, share) => Boolean(line.deliveredAt || share.deliveredAt);

/**
 * Admin, once the order is placed: {} sends every kitchen's remaining lines; { godownId } sends that kitchen's
 * remaining lines; { godownId, items: [{ stockItemId, packId? }] } sends just those lines (others can follow later).
 */
collaborativePurchaseOrderRoutes.post("/:id/dispatch", adminOnly, async (req, res) => {
  try {
    const { godownId, items } = req.body || {};
    if (godownId !== undefined && !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
    if (items !== undefined && (!godownId || !Array.isArray(items) || items.length === 0)) throw fail(400, "Choose the kitchen and the items to dispatch");
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (order.status !== "ordered") throw fail(409, "Mark the order as ordered before dispatching it", "NOT_ORDERED");

    const shares = godownId ? order.contributions.filter((entry) => String(entry.godownId) === String(godownId)) : order.contributions;
    if (shares.length === 0) throw fail(404, "That kitchen is not on this order");
    const stamp = { dispatchedAt: new Date(), dispatchedBy: req.user.sub };
    let sent = 0;
    for (const share of shares) {
      let lines = share.items;
      if (items) {
        lines = share.items.filter((line) => items.some((pick) => String(pick?.stockItemId) === productOf(line)
          && (!pick.packId || String(pick.packId) === String(line.packId))));
        if (lines.length === 0) throw fail(404, "Those items are not in this kitchen's share");
      }
      for (const line of lines.filter((candidate) => !isSent(candidate, share))) { Object.assign(line, stamp); sent += 1; }
      if (!share.dispatchedAt && share.items.every((line) => isSent(line, share))) Object.assign(share, stamp);
    }
    if (sent === 0) throw fail(409, "These items have already been dispatched", "ALREADY_DISPATCHED");
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

const PHOTO_LIMIT_MB = 8;
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_LIMIT_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => (isPhotoType(file.mimetype) ? done(null, true) : done(fail(400, "Photos must be JPEG, PNG or WebP"))),
}).single("photo");
/** multer's own errors as { code, message } like every other error here. */
const readPhoto = (req, res, next) => photoUpload(req, res, (error) => {
  if (!error) return next();
  if (error.code === "LIMIT_FILE_SIZE") return sendError(res, fail(400, `The photo is too big. Keep it under ${PHOTO_LIMIT_MB} MB.`, "PHOTO_TOO_LARGE"));
  return sendError(res, error.status ? error : fail(400, error.message));
});

/**
 * Kitchen: upload one receiving photo (goods or label) for an order it is on. Returns `{ url }` to put in the
 * receive body. Stored on Cloudinary when configured, else under this API's /uploads.
 */
collaborativePurchaseOrderRoutes.post("/:id/photos", kitchenOnly, readPhoto, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const order = await CollaborativePurchaseOrder.findById(req.params.id).select("contributions.godownId").lean();
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (!order.contributions.some((entry) => String(entry.godownId) === String(req.user.godownId))) throw fail(404, "Your kitchen is not on this order");
    if (!req.file) throw fail(400, "Choose a photo to upload", "PHOTO_REQUIRED");
    const url = await storePhoto({ buffer: req.file.buffer, mimetype: req.file.mimetype, baseUrl: `${req.protocol}://${req.get("host")}` });
    return res.status(201).json({ url });
  } catch (error) { return sendError(res, error); }
});

const STORAGE = new Set(["room", "fridge", "freezer"]);
const PHOTO_URL = /^(https?:\/\/|\/uploads\/)\S{1,500}$/;

/** A YYYY-MM-DD from the receive form as the start of that business day, or null when blank. */
const receiptDate = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  if (!isIsoDate(String(value))) throw fail(400, `${label} must be a date like 2026-12-31`);
  return startOfBusinessDay(String(value));
};

/**
 * Validates one product's receiving details against the product's rules. `today` is the business date.
 * Photos of the goods and the label are always required; expiry is required unless the product says otherwise.
 */
export const receiptDetails = (input, product, today) => {
  const name = product?.name || "This item";
  const photos = { goods: String(input?.photos?.goods || "").trim(), label: String(input?.photos?.label || "").trim() };
  if (!PHOTO_URL.test(photos.goods)) throw fail(400, `${name}: take a photo of the goods`, "PHOTO_REQUIRED");
  if (!PHOTO_URL.test(photos.label)) throw fail(400, `${name}: take a photo of the brand label`, "PHOTO_REQUIRED");
  const expiryDate = receiptDate(input?.expiryDate, `${name}: expiry date`);
  if (!expiryDate && product?.expiryRequired !== false) throw fail(400, `${name}: enter the expiry date`, "EXPIRY_REQUIRED");
  if (expiryDate && String(input.expiryDate) < today) {
    throw fail(400, `${name}: the expiry date has already passed. Do not accept it; call the central store.`, "EXPIRED_GOODS");
  }
  const mfgDate = receiptDate(input?.mfgDate, `${name}: manufacture date`);
  if (mfgDate && String(input.mfgDate) > today) throw fail(400, `${name}: the manufacture date cannot be in the future`);
  const storage = input?.storage === undefined || input?.storage === null || input?.storage === "" ? null : String(input.storage);
  if (storage !== null && !STORAGE.has(storage)) throw fail(400, `${name}: storage must be room, fridge or freezer`);
  return {
    photos, expiryDate, mfgDate, storage,
    lotNumber: text(input?.lotNumber, 60, `${name}: batch number`),
    notes: text(input?.notes, 500, `${name}: notes`),
  };
};

/**
 * Kitchen: "All received". Adds every line that is on the way to the kitchen's stock and marks it received,
 * in one transaction; lines dispatched later are received later. The body carries receiving details per product
 * (`items: [{ stockItemId, photos: { goods, label }, expiryDate, mfgDate, lotNumber, storage, notes }]`); each
 * arriving product needs one entry, extra entries are ignored. Every line becomes a stock batch with a tracking ID
 * and a copy of the order's supplier. A kitchen with a problem raises a concern instead.
 */
collaborativePurchaseOrderRoutes.post("/:id/receive", kitchenOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const details = new Map((Array.isArray(req.body?.items) ? req.body.items : [])
      .filter((entry) => mongoose.isValidObjectId(entry?.stockItemId)).map((entry) => [String(entry.stockItemId), entry]));
    await session.withTransaction(async () => {
      const order = await CollaborativePurchaseOrder.findById(req.params.id).populate("supplierId", "name fssaiLicence").session(session);
      if (!order) throw fail(404, "Collaborative purchase order not found");
      const share = order.contributions.find((entry) => String(entry.godownId) === String(req.user.godownId));
      if (!share) throw fail(404, "Your kitchen is not on this order");
      if (share.deliveredAt) throw fail(409, "Your kitchen has already received these items", "ALREADY_DELIVERED");
      const arriving = order.status === "ordered" ? share.items.filter((line) => isSent(line, share) && !isReceived(line, share)) : [];
      if (arriving.length === 0) throw fail(409, "Nothing is on the way to your kitchen right now", "NOT_DISPATCHED");
      const receivedAt = new Date();
      const today = businessDateOf(receivedAt);
      const supplier = { supplierName: order.supplierId?.name || "", supplierFssaiLicence: order.supplierId?.fssaiLicence || "" };
      for (const line of arriving) {
        const product = await StockItem.findById(line.stockItemId).select("name pricePerUnit expiryRequired").session(session);
        const input = details.get(String(line.stockItemId));
        if (!input) throw fail(400, `${product?.name || "An item"} is missing its receiving details`, "MISSING_ITEM_DETAILS");
        const checked = receiptDetails(input, product, today);
        await GodownStock.findOneAndUpdate(
          { godownId: share.godownId, stockItemId: line.stockItemId },
          { $inc: { qtyBaseUnit: line.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } },
          { upsert: true, new: true, session },
        );
        const trackingId = await nextTrackingId({ session, now: receivedAt });
        await createStockBatch({
          godownId: share.godownId, stockItemId: line.stockItemId, quantity: line.qtyBaseUnit,
          unitPrice: product?.pricePerUnit, sourceType: "collaborative_order", sourceId: order._id,
          receivedAt, condition: "good", expectedQtyBaseUnit: line.qtyBaseUnit, createdBy: req.user.sub, session,
          trackingId, ...checked, ...supplier,
        });
        Object.assign(line, { deliveredAt: receivedAt, deliveredBy: req.user.sub, trackingId });
      }
      if (share.items.every((line) => isReceived(line, share))) Object.assign(share, { deliveredAt: receivedAt, deliveredBy: req.user.sub });
      await order.save({ session });
    });
    return res.json(responseOrder(await loadOrder(req.params.id), req.user));
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
});

/**
 * Applies the admin's purchase details (`supplierId`, `invoiceNo`) from `body` to `order` without saving.
 * Only keys present in `body` change. Returns how many changed.
 */
const applyPurchaseDetails = async (order, body) => {
  let changed = 0;
  if (body.supplierId !== undefined) {
    if (body.supplierId === null || body.supplierId === "") {
      if (order.status === "ordered") throw fail(400, "An ordered order must keep a supplier", "SUPPLIER_REQUIRED");
      order.supplierId = null;
    } else {
      const supplier = mongoose.isValidObjectId(body.supplierId) ? await Supplier.findById(body.supplierId).select("active") : null;
      if (!supplier || !supplier.active) throw fail(400, "Choose an active supplier");
      order.supplierId = supplier._id;
    }
    changed += 1;
  }
  if (body.invoiceNo !== undefined) {
    order.invoiceNo = text(body.invoiceNo, 60, "Invoice number");
    changed += 1;
  }
  if (body.expiryDates !== undefined) {
    if (!Array.isArray(body.expiryDates)) throw fail(400, "expiryDates must be a list of { stockItemId, expiryDate }");
    const onOrder = new Set(order.contributions.flatMap((share) => share.items.map((line) => String(line.stockItemId))));
    const today = businessDateOf(new Date());
    const kept = new Map(order.expiryByProduct.map((entry) => [String(entry.stockItemId), entry.expiryDate]));
    for (const entry of body.expiryDates) {
      const productId = String(entry?.stockItemId || "");
      if (!onOrder.has(productId)) throw fail(400, "Expiry dates can only be set for products on this order");
      if (entry.expiryDate === null || entry.expiryDate === "") { kept.delete(productId); continue; }
      if (!isIsoDate(String(entry.expiryDate))) throw fail(400, "Expiry date must be a date like 2026-12-31");
      if (String(entry.expiryDate) < today) throw fail(400, "The expiry date has already passed", "EXPIRED_GOODS");
      kept.set(productId, String(entry.expiryDate));
    }
    order.expiryByProduct = [...kept].map(([stockItemId, expiryDate]) => ({ stockItemId, expiryDate }));
    changed += 1;
  }
  return changed;
};

/** Admin: supplier and invoice number for an approved or ordered order. Kitchens see both read-only. */
collaborativePurchaseOrderRoutes.patch("/:id/purchase", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (!["approved", "ordered"].includes(order.status)) throw fail(409, "Approve the order before adding supplier or invoice details", "NOT_APPROVED");
    if ((await applyPurchaseDetails(order, req.body || {})) === 0) throw fail(400, "Send a supplierId, an invoiceNo or expiryDates");
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.patch("/:id/status", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const next = String(req.body.status || "");
    if (!STATUSES.has(next)) throw fail(400, "Status must be open, closed, approved, ordered or cancelled");
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (next !== order.status && !TRANSITIONS[order.status].has(next)) throw fail(409, `An ${order.status} order cannot move to ${next}`);
    // "Mark as ordered" may name the supplier in the same call, and must end up with one: kitchens see the
    // supplier's name and FSSAI licence on every batch they receive.
    if (next === "ordered" && req.body.supplierId !== undefined) await applyPurchaseDetails(order, { supplierId: req.body.supplierId });
    if (next === "ordered" && !order.supplierId) throw fail(400, "Choose a supplier before marking the order as ordered", "SUPPLIER_REQUIRED");
    order.status = next;
    order.statusChangedAt = new Date();
    order.statusChangedBy = req.user.sub;
    await order.save();
    return res.json(responseOrder(await loadOrder(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});
