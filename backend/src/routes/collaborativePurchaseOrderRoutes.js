import express from "express";
import { notifyKitchen, notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import multer from "multer";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";
import { StockItem } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { Supplier } from "../models/SupplierModel.js";
import { DeliveryTicket, TICKET_REASONS } from "../models/DeliveryTicketModel.js";
import { createStockBatch } from "../stock/batchService.js";
import { nextTrackingId } from "../stock/trackingId.js";
import { isAudioType, isPhotoType, storePhoto, storeVoiceNote } from "../stock/photoStorage.js";
import { businessDateOf, isIsoDate, startOfBusinessDay } from "../executive/params.js";
import { eventItems, orderEvent } from "../ordering/orderEvents.js";
import { fail, sendError as sendHttpError } from "../shared/httpErrors.js";
import { presentOrder } from "../modules/collaborative-orders/orderPresenter.js";
import { getOrderDetails, getOrderPage, ORDER_STATUSES } from "../modules/collaborative-orders/orderReadService.js";
import { liveLines } from "../modules/collaborative-orders/orderContributionRules.js";
import { createCollaborativeOrder, editOwnContribution, joinCollaborativeOrder, leaveCollaborativeOrder } from "../modules/collaborative-orders/orderContributionService.js";
import {
  adjustCollaborativeOrderQuantity, approveCollaborativeOrder, rejectCollaborativeOrderItems, replaceKitchenItems,
} from "../modules/collaborative-orders/orderReviewService.js";
import { isReceived, isSent } from "../modules/collaborative-orders/orderDeliveryRules.js";
import { dispatchCollaborativeOrder } from "../modules/collaborative-orders/orderDispatchService.js";

export const collaborativePurchaseOrderRoutes = express.Router();
const everyone = authorize(["admin", "user"]);
const kitchenOnly = authorize(["user"]);
const adminOnly = authorize(["admin"]);
const STATUSES = ORDER_STATUSES;
// A closed order is never reopened; a kitchen that still needs items starts a new order (or an admin does for it).
// "approved" is reached only through POST /:id/approve, and an order must be approved before it is ordered.
const TRANSITIONS = {
  open: new Set(["closed", "cancelled"]),
  closed: new Set(["cancelled"]),
  approved: new Set(["ordered", "cancelled"]),
  ordered: new Set(),
  cancelled: new Set(),
};

const sendError = (res, error) => sendHttpError(res, error, {
  versionConflictMessage: "This order was changed by someone else. Reload and try again.",
});

/** Orders whose ordering window has passed are closed here, so every read and write sees the current status. */
export const closeExpiredOrders = (now = new Date()) => CollaborativePurchaseOrder.updateMany(
  { status: "open", closesAt: { $ne: null, $lte: now } },
  [{ $set: {
    status: "closed", statusChangedAt: "$closesAt", statusChangedBy: null,
    events: { $concatArrays: [{ $ifNull: ["$events", []] }, [{
      action: "status_changed", at: "$closesAt", actorId: null, actorRole: "system", godownId: null, items: [],
      fromStatus: "open", toStatus: "closed", note: "Ordering window ended",
    }]] },
  } }],
);
const text = (value, max, label) => {
  const result = String(value || "").trim();
  if (result.length > max) throw fail(400, `${label} must be ${max} characters or fewer`);
  return result;
};

/** The reason the kitchen will see for a rejection or cancellation; required. */
const requiredReason = (value) => {
  const reason = text(value, 500, "Reason");
  if (!reason) throw fail(400, "Give a reason the kitchen will see", "REASON_REQUIRED");
  return reason;
};

collaborativePurchaseOrderRoutes.get("/", everyone, async (req, res) => {
  try {
    await closeExpiredOrders();
    const { orders, ...pagination } = await getOrderPage(req.query);
    return res.json({ items: orders.map((order) => presentOrder(order, req.user)), ...pagination });
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.post("/", everyone, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const order = await createCollaborativeOrder({ input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.status(201).json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.get("/:id", everyone, async (req, res) => {
  try {
    await closeExpiredOrders();
    return res.json(presentOrder(await getOrderDetails(req.params.id), req.user));
  }
  catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.post("/:id/contributions", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await joinCollaborativeOrder({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.status(201).json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.put("/:id/contributions/me", kitchenOnly, requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await editOwnContribution({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.delete("/:id/contributions/me", kitchenOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await leaveCollaborativeOrder({ orderId: req.params.id, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Super-admin: replace one kitchen's items until the order is approved (Anand, 2026-11-03). Approved lines stay as they
 * are. The kitchen is shown what changed (adminChange.before → items) until it taps OK.
 */
collaborativePurchaseOrderRoutes.put("/:id/kitchens/:godownId/items", authorize(["super_admin"]), async (req, res) => {
  try {
    await closeExpiredOrders();
    const { order, changed } = await replaceKitchenItems({ orderId: req.params.id, godownId: req.params.godownId, input: req.body, actor: req.user });
    if (changed) notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/** Kitchen: "OK" on the admin's change — the notice goes away for everyone in that kitchen. */
collaborativePurchaseOrderRoutes.post("/:id/contributions/me/change-seen", kitchenOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
    const order = await CollaborativePurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, "contributions.godownId": req.user.godownId },
      { $set: { "contributions.$.adminChange": null } },
      { new: true },
    );
    if (!order) throw fail(404, "Your kitchen is not on this order");
    notifyKitchen(req.user.godownId, "orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Admin approval: {} approves every kitchen and closes the order; { godownId } approves that kitchen's whole
 * share; { godownId, items: [{ stockItemId, packId? }] } approves just those lines. Approved items are locked.
 */
collaborativePurchaseOrderRoutes.post("/:id/approve", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await approveCollaborativeOrder({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Admin rejection, always with a reason the kitchen sees: { godownId, reason } rejects every line of that kitchen's
 * share not yet approved and locks the share; { godownId, items: [{ stockItemId, packId? }], reason } rejects just
 * those lines. A decision is final: approved lines cannot be rejected nor rejected ones approved, and a kitchen that
 * still needs a rejected item asks for it on a new order. The whole order is cancelled through PATCH /:id/status.
 */
collaborativePurchaseOrderRoutes.post("/:id/reject", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await rejectCollaborativeOrderItems({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Admin, while reviewing: { godownId, stockItemId, packId?, quantity } changes one line's quantity (in packs for a
 * pack line, else in the base unit) and approves it. requestedQtyBaseUnit/requestedPackQuantity keep what the kitchen
 * first asked for. Rejected lines cannot be changed; to drop a line, reject it.
 */
collaborativePurchaseOrderRoutes.post("/:id/adjust", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await adjustCollaborativeOrderQuantity({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/**
 * Admin, once the order is placed: {} sends every kitchen's remaining lines; { godownId } sends that kitchen's
 * remaining lines; { godownId, items: [{ stockItemId, packId? }] } sends just those lines (others can follow later).
 */
collaborativePurchaseOrderRoutes.post("/:id/dispatch", adminOnly, async (req, res) => {
  try {
    const order = await dispatchCollaborativeOrder({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

const PHOTO_LIMIT_MB = 8;
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_LIMIT_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => (isPhotoType(file.mimetype) ? done(null, true) : done(fail(400, "Photos must be JPEG, PNG or WebP"))),
}).single("photo");
const VOICE_LIMIT_MB = 5;
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VOICE_LIMIT_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => (isAudioType(file.mimetype) ? done(null, true) : done(fail(400, "Voice notes must be a recording (webm, m4a, mp3, ogg or wav)"))),
}).single("audio");
/** multer's own errors as { code, message } like every other error here. */
const readUpload = (upload, what, limitMb) => (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  if (error.code === "LIMIT_FILE_SIZE") return sendError(res, fail(400, `The ${what} is too big. Keep it under ${limitMb} MB.`, "PHOTO_TOO_LARGE"));
  return sendError(res, error.status ? error : fail(400, error.message));
});
const readPhoto = readUpload(photoUpload, "photo", PHOTO_LIMIT_MB);
const readVoice = readUpload(voiceUpload, "voice note", VOICE_LIMIT_MB);

/** The kitchen must be on the order to attach files to it. */
const assertOnOrder = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Collaborative purchase order not found");
  const order = await CollaborativePurchaseOrder.findById(req.params.id).select("contributions.godownId").lean();
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (!order.contributions.some((entry) => String(entry.godownId) === String(req.user.godownId))) throw fail(404, "Your kitchen is not on this order");
};

/** Kitchen: upload a voice note for a delivery problem on an order it is on. Returns `{ url }` for `problem.voiceNoteUrl`. */
collaborativePurchaseOrderRoutes.post("/:id/voice-notes", kitchenOnly, readVoice, async (req, res) => {
  try {
    await assertOnOrder(req);
    if (!req.file) throw fail(400, "Record a voice note first", "PHOTO_REQUIRED");
    const url = await storeVoiceNote({ buffer: req.file.buffer, mimetype: req.file.mimetype, baseUrl: `${req.protocol}://${req.get("host")}` });
    return res.status(201).json({ url });
  } catch (error) { return sendError(res, error); }
});

/**
 * Kitchen: upload one receiving photo (goods or label) for an order it is on. Returns `{ url }` to put in the
 * receive body. Stored on Cloudinary when configured, else under this API's /uploads.
 */
collaborativePurchaseOrderRoutes.post("/:id/photos", kitchenOnly, readPhoto, async (req, res) => {
  try {
    await assertOnOrder(req);
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
export const receiptDetails = (input, product, today, { labelRequired = true, expiryRequired = product?.expiryRequired !== false } = {}) => {
  const name = product?.name || "This item";
  const photos = { goods: String(input?.photos?.goods || "").trim(), label: String(input?.photos?.label || "").trim() };
  if (!PHOTO_URL.test(photos.goods)) throw fail(400, `${name}: take a photo of the goods`, "PHOTO_REQUIRED");
  if (labelRequired && !PHOTO_URL.test(photos.label)) throw fail(400, `${name}: take a photo of the brand label`, "PHOTO_REQUIRED");
  if (!labelRequired && photos.label && !PHOTO_URL.test(photos.label)) throw fail(400, `${name}: the label photo is not valid`, "PHOTO_REQUIRED");
  const expiryDate = receiptDate(input?.expiryDate, `${name}: expiry date`);
  if (!expiryDate && expiryRequired) throw fail(400, `${name}: enter the expiry date`, "EXPIRY_REQUIRED");
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
 * A problem the kitchen reports on one line instead of receiving it: reason, usable quantity that arrived, note,
 * optional voice note. Short must be less than ordered, excess more; the usable part still needs a goods photo,
 * and an expiry only when something usable arrived.
 */
/** The supplier a product on this order came from: its own override, else the order's supplier (populated). */
export const supplierSnapshotFor = (order, stockItemId) => {
  const override = (order.supplierByProduct || []).find((entry) => String(entry.stockItemId) === String(stockItemId))?.supplierId;
  const supplier = override && typeof override === "object" ? override : order.supplierId;
  return { supplierName: supplier?.name || "", supplierFssaiLicence: supplier?.fssaiLicence || "" };
};

export const problemDetails = (input, line, product, today) => {
  const name = product?.name || "This item";
  const problem = input?.problem || {};
  const reason = String(problem.reason || "");
  if (!TICKET_REASONS.includes(reason)) throw fail(400, `${name}: choose what went wrong (short, excess, damaged, wrong item or expired)`);
  const ordered = Number(line.qtyBaseUnit);
  const received = problem.receivedQtyBaseUnit === undefined || problem.receivedQtyBaseUnit === "" ? 0 : Number(problem.receivedQtyBaseUnit);
  if (!Number.isFinite(received) || received < 0) throw fail(400, `${name}: enter how much usable stock arrived`);
  if (reason === "wrong_item" && received !== 0) throw fail(400, `${name}: a wrong item cannot be added as ${name}; enter 0 usable`);
  if (reason === "short" && received >= ordered) throw fail(400, `${name}: a short delivery means less than ${ordered} arrived`);
  if (reason === "excess" && received <= ordered) throw fail(400, `${name}: an excess delivery means more than ${ordered} arrived`);
  const voiceNoteUrl = String(problem.voiceNoteUrl || "").trim();
  if (voiceNoteUrl && !PHOTO_URL.test(voiceNoteUrl)) throw fail(400, `${name}: the voice note is not valid`);
  const details = receiptDetails(input, product, today, { labelRequired: false, expiryRequired: received > 0 && product?.expiryRequired !== false });
  return { reason, receivedQtyBaseUnit: received, note: text(problem.note, 500, `${name}: note`), voiceNoteUrl, details };
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
    const detailKey = (stockItemId, packId) => `${String(stockItemId)}:${packId ? String(packId) : "base"}`;
    const details = new Map((Array.isArray(req.body?.items) ? req.body.items : [])
      .filter((entry) => mongoose.isValidObjectId(entry?.stockItemId))
      .map((entry) => [detailKey(entry.stockItemId, entry.packId), entry]));
    await session.withTransaction(async () => {
      const order = await CollaborativePurchaseOrder.findById(req.params.id)
        .populate("supplierId", "name fssaiLicence").populate("supplierByProduct.supplierId", "name fssaiLicence").session(session);
      if (!order) throw fail(404, "Collaborative purchase order not found");
      const share = order.contributions.find((entry) => String(entry.godownId) === String(req.user.godownId));
      if (!share) throw fail(404, "Your kitchen is not on this order");
      if (share.deliveredAt) throw fail(409, "Your kitchen has already received these items", "ALREADY_DELIVERED");
      // Lines with an open problem wait for the admin; they are neither on the way nor received.
      const arriving = order.status === "ordered" ? share.items.filter((line) => isSent(line, share) && !isReceived(line, share) && !line.ticketId) : [];
      if (arriving.length === 0) throw fail(409, "Nothing is on the way to your kitchen right now", "NOT_DISPATCHED");
      const lineCountByProduct = arriving.reduce((counts, line) => {
        const key = String(line.stockItemId);
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map());
      const receivedAt = new Date();
      const today = businessDateOf(receivedAt);
      const receivedLines = [];
      const problems = [];
      for (const line of arriving) {
        const supplier = supplierSnapshotFor(order, line.stockItemId);
        const product = await StockItem.findById(line.stockItemId).select("name pricePerUnit expiryRequired").session(session);
        const productId = String(line.stockItemId);
        // Older clients sent details by product only. That remains unambiguous for a single line; when the
        // same product appears in multiple pack lines, each line must identify its pack so quantities cannot
        // be copied onto multiple delivery-problem tickets.
        const input = details.get(detailKey(productId, line.packId))
          || (lineCountByProduct.get(productId) === 1 ? details.get(detailKey(productId, null)) : null);
        if (!input) throw fail(400, `${product?.name || "An item"} is missing its receiving details`, "MISSING_ITEM_DETAILS");
        if (input.problem) {
          const problem = problemDetails(input, line, product, today);
          const [ticket] = await DeliveryTicket.create([{
            orderId: order._id, orderNo: order.orderNo, godownId: share.godownId, stockItemId: line.stockItemId, packId: line.packId || null,
            orderedQtyBaseUnit: line.qtyBaseUnit, raisedBy: req.user.sub, raisedAt: receivedAt, ...problem,
          }], { session });
          line.ticketId = ticket._id;
          problems.push({ line, reason: problem.reason });
          continue;
        }
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
        Object.assign(line, { deliveredAt: receivedAt, deliveredBy: req.user.sub, trackingId, receivedQtyBaseUnit: line.qtyBaseUnit });
        receivedLines.push(line);
      }
      if (liveLines(share).every((line) => isReceived(line, share))) Object.assign(share, { deliveredAt: receivedAt, deliveredBy: req.user.sub });
      if (receivedLines.length) order.events.push(orderEvent(req.user, "received", { godownId: share.godownId, items: eventItems(receivedLines) }));
      if (problems.length) {
        order.events.push(orderEvent(req.user, "problem_raised", {
          godownId: share.godownId, items: eventItems(problems.map((entry) => entry.line)),
          note: [...new Set(problems.map((entry) => entry.reason.replace("_", " ")))].join(", "),
        }));
      }
      await order.save({ session });
    });
    notifyKitchens("orders");
    notifyKitchen(req.user.godownId, "stock");
    return res.json(presentOrder(await getOrderDetails(req.params.id), req.user));
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
  if (body.supplierOverrides !== undefined) {
    if (!Array.isArray(body.supplierOverrides)) throw fail(400, "supplierOverrides must be a list of { stockItemId, supplierId }");
    const onOrder = new Set(order.contributions.flatMap((share) => share.items.map((line) => String(line.stockItemId))));
    const kept = new Map(order.supplierByProduct.map((entry) => [String(entry.stockItemId), entry.supplierId]));
    for (const entry of body.supplierOverrides) {
      const productId = String(entry?.stockItemId || "");
      if (!onOrder.has(productId)) throw fail(400, "A supplier can only be set for products on this order");
      if (entry.supplierId === null || entry.supplierId === "") { kept.delete(productId); continue; }
      const supplier = mongoose.isValidObjectId(entry.supplierId) ? await Supplier.findById(entry.supplierId).select("active") : null;
      if (!supplier || !supplier.active) throw fail(400, "Choose an active supplier for each item");
      kept.set(productId, supplier._id);
    }
    order.supplierByProduct = [...kept].map(([stockItemId, supplierId]) => ({ stockItemId, supplierId }));
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
const purchaseSnapshot = (order) => ({
  supplierId: order.supplierId ? String(order.supplierId) : "",
  invoiceNo: order.invoiceNo || "",
  overrides: JSON.stringify(order.supplierByProduct.map((entry) => [String(entry.stockItemId), String(entry.supplierId)]).sort()),
  expiry: JSON.stringify(order.expiryByProduct.map((entry) => [String(entry.stockItemId), entry.expiryDate]).sort()),
});
/** "Supplier Sri Lakshmi Traders; invoice INV-7; …": what a purchase-details save changed, for the history ("" if nothing). */
const purchaseChanges = async (before, order) => {
  const after = purchaseSnapshot(order);
  const parts = [];
  if (after.supplierId !== before.supplierId) {
    const supplier = after.supplierId ? await Supplier.findById(after.supplierId).select("name").lean() : null;
    parts.push(supplier ? `Supplier ${supplier.name}` : "Supplier removed");
  }
  if (after.invoiceNo !== before.invoiceNo) parts.push(after.invoiceNo ? `Invoice ${after.invoiceNo}` : "Invoice removed");
  if (after.overrides !== before.overrides) parts.push("Per-item suppliers updated");
  if (after.expiry !== before.expiry) parts.push("Bulk expiry dates updated");
  return parts.join("; ");
};

collaborativePurchaseOrderRoutes.patch("/:id/purchase", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await CollaborativePurchaseOrder.findById(req.params.id);
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (!["approved", "ordered"].includes(order.status)) throw fail(409, "Approve the order before adding supplier or invoice details", "NOT_APPROVED");
    const before = purchaseSnapshot(order);
    if ((await applyPurchaseDetails(order, req.body || {})) === 0) throw fail(400, "Send a supplierId, an invoiceNo, supplierOverrides or expiryDates");
    const summary = await purchaseChanges(before, order);
    if (summary) order.events.push(orderEvent(req.user, "purchase_updated", { note: summary }));
    await order.save();
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
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
    // Treat retries as reads: a no-op must not rewrite the status audit fields or append misleading history.
    if (next === order.status) return res.json(presentOrder(await getOrderDetails(order._id), req.user));
    const before = purchaseSnapshot(order);
    // "Mark as ordered" may name the supplier in the same call, and must end up with one: kitchens see the
    // supplier's name and FSSAI licence on every batch they receive.
    if (next === "ordered" && req.body.supplierId !== undefined) await applyPurchaseDetails(order, { supplierId: req.body.supplierId });
    if (next === "ordered" && !order.supplierId) throw fail(400, "Choose a supplier before marking the order as ordered", "SUPPLIER_REQUIRED");
    if (next === "cancelled" && order.status !== "cancelled") order.cancellationReason = requiredReason(req.body.reason);
    if (next !== order.status) {
      const note = next === "cancelled" ? order.cancellationReason : await purchaseChanges(before, order);
      order.events.push(orderEvent(req.user, "status_changed", { fromStatus: order.status, toStatus: next, note }));
    }
    order.status = next;
    order.statusChangedAt = new Date();
    order.statusChangedBy = req.user.sub;
    await order.save();
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

// Kitchens need time to be supplied after joining closes, so a moved closing time stays this far before needed-by (Anand, 2026-11-02).
const CLOSING_LEAD_MS = 48 * 3_600_000;

/** Super-admin: move an open order's closing time later or earlier. Closing it right now stays PATCH /:id/status. */
collaborativePurchaseOrderRoutes.patch("/:id/closing-time", authorize(["super_admin"]), async (req, res) => {
  try {
    await closeExpiredOrders();
    const closesAt = new Date(req.body?.closesAt ?? "");
    if (Number.isNaN(closesAt.getTime())) throw fail(400, "Send closesAt as a date and time");
    const now = new Date();
    if (closesAt <= now) throw fail(400, "The closing time must be in the future. To close the order now, close it instead.");
    const order = await CollaborativePurchaseOrder.findById(req.params.id).select("status neededBy closesAt");
    if (!order) throw fail(404, "Collaborative purchase order not found");
    if (order.status !== "open") throw fail(409, "This order is no longer open", "ORDER_CLOSED");
    if (!order.neededBy || closesAt.getTime() > order.neededBy.getTime() - CLOSING_LEAD_MS) {
      throw fail(400, "The order must close at least 2 days before it is needed", "TOO_CLOSE_TO_NEEDED_BY");
    }
    // Only if it is still open at this moment: a kitchen may not slip in after a close that happened meanwhile.
    const updated = await CollaborativePurchaseOrder.updateOne(
      { _id: order._id, status: "open", $or: [{ closesAt: null }, { closesAt: { $gt: now } }] },
      { $set: { closesAt }, $push: { events: orderEvent(req.user, "closing_time_changed", { fromClosesAt: order.closesAt || null, toClosesAt: closesAt }) } },
    );
    if (updated.matchedCount === 0) throw fail(409, "This order is no longer open", "ORDER_CLOSED");
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});
