import express from "express";
import { notifyKitchen, notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";
import { fail, sendError as sendHttpError } from "../shared/httpErrors.js";
import { presentOrder } from "../modules/collaborative-orders/orderPresenter.js";
import { getOrderDetails, getOrderPage } from "../modules/collaborative-orders/orderReadService.js";
import { createCollaborativeOrder, editOwnContribution, joinCollaborativeOrder, leaveCollaborativeOrder } from "../modules/collaborative-orders/orderContributionService.js";
import {
  adjustCollaborativeOrderQuantity, approveCollaborativeOrder, rejectCollaborativeOrderItems, replaceKitchenItems,
} from "../modules/collaborative-orders/orderReviewService.js";
import { dispatchCollaborativeOrder } from "../modules/collaborative-orders/orderDispatchService.js";
import { receiveCollaborativeOrder } from "../modules/collaborative-orders/orderReceivingService.js";
import { updateOrderPurchaseDetails } from "../modules/collaborative-orders/orderPurchaseService.js";
import { changeOrderClosingTime, closeExpiredOrders, transitionOrderStatus } from "../modules/collaborative-orders/orderLifecycleService.js";
import {
  ORDER_PHOTO_LIMIT_MB, ORDER_VOICE_LIMIT_MB, parseOrderPhoto, parseOrderVoiceNote, uploadOrderPhoto, uploadOrderVoiceNote,
} from "../modules/collaborative-orders/orderUploadService.js";

export const collaborativePurchaseOrderRoutes = express.Router();
const everyone = authorize(["admin", "user"]);
const kitchenOnly = authorize(["user"]);
const adminOnly = authorize(["admin"]);

const sendError = (res, error) => sendHttpError(res, error, {
  versionConflictMessage: "This order was changed by someone else. Reload and try again.",
});

export { closeExpiredOrders } from "../modules/collaborative-orders/orderLifecycleService.js";

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

/** Multer's own errors as { code, message } like every other route error. */
const readUpload = (upload, what, limitMb) => (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  if (error.code === "LIMIT_FILE_SIZE") return sendError(res, fail(400, `The ${what} is too big. Keep it under ${limitMb} MB.`, "PHOTO_TOO_LARGE"));
  return sendError(res, error.status ? error : fail(400, error.message));
});
const readPhoto = readUpload(parseOrderPhoto, "photo", ORDER_PHOTO_LIMIT_MB);
const readVoiceNote = readUpload(parseOrderVoiceNote, "voice note", ORDER_VOICE_LIMIT_MB);

/** Kitchen: upload a voice note for a delivery problem on an order it is on. Returns `{ url }` for `problem.voiceNoteUrl`. */
collaborativePurchaseOrderRoutes.post("/:id/voice-notes", kitchenOnly, readVoiceNote, async (req, res) => {
  try {
    const url = await uploadOrderVoiceNote({ orderId: req.params.id, godownId: req.user.godownId, file: req.file, baseUrl: `${req.protocol}://${req.get("host")}` });
    return res.status(201).json({ url });
  } catch (error) { return sendError(res, error); }
});

/**
 * Kitchen: upload one receiving photo (goods or label) for an order it is on. Returns `{ url }` to put in the
 * receive body. Stored on Cloudinary when configured, else under this API's /uploads.
 */
collaborativePurchaseOrderRoutes.post("/:id/photos", kitchenOnly, readPhoto, async (req, res) => {
  try {
    const url = await uploadOrderPhoto({ orderId: req.params.id, godownId: req.user.godownId, file: req.file, baseUrl: `${req.protocol}://${req.get("host")}` });
    return res.status(201).json({ url });
  } catch (error) { return sendError(res, error); }
});

/**
 * Kitchen: "All received". Adds every line that is on the way to the kitchen's stock and marks it received,
 * in one transaction; lines dispatched later are received later. The body carries receiving details per product
 * (`items: [{ stockItemId, photos: { goods, label }, expiryDate, mfgDate, lotNumber, storage, notes }]`); each
 * arriving product needs one entry, extra entries are ignored. Every line becomes a stock batch with a tracking ID
 * and a copy of the order's supplier. A kitchen with a problem raises a concern instead.
 */
collaborativePurchaseOrderRoutes.post("/:id/receive", kitchenOnly, async (req, res) => {
  try {
    await receiveCollaborativeOrder({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    notifyKitchen(req.user.godownId, "stock");
    return res.json(presentOrder(await getOrderDetails(req.params.id), req.user));
  } catch (error) {
    return sendError(res, error);
  }
});

collaborativePurchaseOrderRoutes.patch("/:id/purchase", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await updateOrderPurchaseDetails({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

collaborativePurchaseOrderRoutes.patch("/:id/status", adminOnly, async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await transitionOrderStatus({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});

/** Super-admin: move an open order's closing time later or earlier. Closing it right now stays PATCH /:id/status. */
collaborativePurchaseOrderRoutes.patch("/:id/closing-time", authorize(["super_admin"]), async (req, res) => {
  try {
    await closeExpiredOrders();
    const order = await changeOrderClosingTime({ orderId: req.params.id, input: req.body, actor: req.user });
    notifyKitchens("orders");
    return res.json(presentOrder(await getOrderDetails(order._id), req.user));
  } catch (error) { return sendError(res, error); }
});
