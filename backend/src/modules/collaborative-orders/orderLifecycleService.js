import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { orderEvent } from "../../ordering/orderEvents.js";
import { fail } from "../../shared/httpErrors.js";
import { text } from "../../shared/text.js";
import { isOrderStatus } from "./orderReadService.js";
import { applyPurchaseDetails, purchaseChanges, purchaseSnapshot } from "./orderPurchaseService.js";

const TRANSITIONS = {
  open: new Set(["closed", "cancelled"]),
  closed: new Set(["cancelled"]),
  approved: new Set(["ordered", "cancelled"]),
  ordered: new Set(),
  cancelled: new Set(),
};

const CLOSING_LEAD_MS = 48 * 3_600_000;

const requiredReason = (value) => {
  const reason = text(value, 500, "Reason");
  if (!reason) throw fail(400, "Give a reason the kitchen will see", "REASON_REQUIRED");
  return reason;
};

/** Closes every open order whose ordering window has passed. */
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

export const transitionOrderStatus = async ({ orderId, input, actor }) => {
  const next = String(input.status || "");
  if (!isOrderStatus(next)) throw fail(400, "Status must be open, closed, approved, ordered or cancelled");
  const order = await CollaborativePurchaseOrder.findById(orderId);
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (next !== order.status && !TRANSITIONS[order.status].has(next)) throw fail(409, `An ${order.status} order cannot move to ${next}`);
  const before = purchaseSnapshot(order);
  // "Mark as ordered" may name the supplier in the same call, and must end up with one: kitchens see the
  // supplier's name and FSSAI licence on every batch they receive.
  if (next === "ordered" && input.supplierId !== undefined) await applyPurchaseDetails(order, { supplierId: input.supplierId });
  if (next === "ordered" && !order.supplierId) throw fail(400, "Choose a supplier before marking the order as ordered", "SUPPLIER_REQUIRED");
  // Retrying the current status keeps its audit fields; only a supplier named with it is applied.
  if (next === order.status) {
    const note = await purchaseChanges(before, order);
    if (!note) return { order, changed: false };
    order.events.push(orderEvent(actor, "purchase_updated", { note }));
    await order.save();
    return { order, changed: true };
  }
  if (next === "cancelled") order.cancellationReason = requiredReason(input.reason);
  const note = next === "cancelled" ? order.cancellationReason : await purchaseChanges(before, order);
  order.events.push(orderEvent(actor, "status_changed", { fromStatus: order.status, toStatus: next, note }));
  order.status = next;
  order.statusChangedAt = new Date();
  order.statusChangedBy = actor.sub;
  await order.save();
  return { order, changed: true };
};

export const changeOrderClosingTime = async ({ orderId, input, actor }) => {
  const closesAt = new Date(input?.closesAt ?? "");
  if (Number.isNaN(closesAt.getTime())) throw fail(400, "Send closesAt as a date and time");
  const now = new Date();
  if (closesAt <= now) throw fail(400, "The closing time must be in the future. To close the order now, close it instead.");
  const order = await CollaborativePurchaseOrder.findById(orderId).select("status neededBy closesAt");
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (order.status !== "open") throw fail(409, "This order is no longer open", "ORDER_CLOSED");
  if (!order.neededBy || closesAt.getTime() > order.neededBy.getTime() - CLOSING_LEAD_MS) {
    throw fail(400, "The order must close at least 2 days before it is needed", "TOO_CLOSE_TO_NEEDED_BY");
  }
  const updated = await CollaborativePurchaseOrder.updateOne(
    { _id: order._id, status: "open", $or: [{ closesAt: null }, { closesAt: { $gt: now } }] },
    { $set: { closesAt }, $push: { events: orderEvent(actor, "closing_time_changed", { fromClosesAt: order.closesAt || null, toClosesAt: closesAt }) } },
  );
  if (updated.matchedCount === 0) throw fail(409, "This order is no longer open", "ORDER_CLOSED");
  return order;
};
