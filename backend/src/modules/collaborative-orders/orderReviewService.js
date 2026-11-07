import mongoose from "mongoose";
import { assertKitchenCanUse } from "../../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { eventItems, orderEvent } from "../../ordering/orderEvents.js";
import { fail } from "../../shared/httpErrors.js";
import {
  isRejected, keepApprovedLines, lineKey, liveLines, normalizeCollaborativeItems, pickLines, productOf,
} from "./orderContributionRules.js";

const reviewableOrder = async (orderId, message = "This order can no longer be changed") => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const order = await CollaborativePurchaseOrder.findById(orderId);
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (!["open", "closed"].includes(order.status)) throw fail(409, message, "ORDER_CLOSED");
  return order;
};

const shareOf = (order, godownId) => {
  const share = order.contributions.find((entry) => String(entry.godownId) === String(godownId));
  if (!share) throw fail(404, "That kitchen is not on this order");
  return share;
};

const sameLines = (a, b) => a.length === b.length && a.every((line) => {
  const match = b.find((other) => lineKey(other) === lineKey(line));
  return match && Number(match.qtyBaseUnit) === Number(line.qtyBaseUnit)
    && Number(match.packQuantity || 0) === Number(line.packQuantity || 0);
});

const snapshotOf = (items) => items.map((line) => ({
  stockItemId: line.stockItemId,
  qtyBaseUnit: line.qtyBaseUnit,
  packId: line.packId || null,
  packName: line.packName || "",
  packQuantity: line.packQuantity ?? null,
}));

/**
 * After an admin changed a kitchen's items (from `previous`, a snapshot taken before the change), tell the kitchen:
 * adminChange.before keeps what it last saw until it taps OK. Both the super-admin items popup and Change & approve
 * (POST /:id/adjust) go through here, so the kitchen gets one notice for either.
 */
const noteAdminChange = (share, previous, actor) => {
  const before = share.adminChange?.before?.length ? share.adminChange.before : previous;
  // Changed back to what the kitchen last saw: nothing to tell it.
  share.adminChange = sameLines(before, share.items) ? null : { before, changedAt: new Date(), changedBy: actor.sub };
};

/** The lines that differ between two item lists, as event items: fromQtyBaseUnit null = added, qtyBaseUnit null = removed. */
const changedEventItems = (beforeLines, afterLines) => {
  const live = (lines) => new Map(lines.filter((line) => !isRejected(line)).map((line) => [lineKey(line), line]));
  const was = live(beforeLines);
  const now = live(afterLines);
  const item = (line, fromQtyBaseUnit, qtyBaseUnit) => ({
    stockItemId: line.stockItemId?._id || line.stockItemId,
    packId: line.packId || null,
    fromQtyBaseUnit,
    qtyBaseUnit,
  });
  const changes = [];
  for (const [key, old] of was) {
    const next = now.get(key);
    if (!next) changes.push(item(old, old.qtyBaseUnit, null));
    else if (Number(next.qtyBaseUnit) !== Number(old.qtyBaseUnit)) changes.push(item(old, old.qtyBaseUnit, next.qtyBaseUnit));
  }
  for (const [key, line] of now) if (!was.has(key)) changes.push(item(line, null, line.qtyBaseUnit));
  return changes;
};

export const replaceKitchenItems = async ({ orderId, godownId, input, actor }) => {
  const items = normalizeCollaborativeItems(input.items);
  if (!items) throw fail(400, "Add at least one item with a valid quantity");
  const order = await reviewableOrder(orderId, "Items can only be changed until the order is approved");
  const share = shareOf(order, godownId);
  if (share.approvedAt) throw fail(409, "This kitchen's items have been approved and can no longer be changed", "SHARE_APPROVED");
  // Products new to this kitchen's list must be ones a kitchen may order; lines it already had may stay.
  const had = new Set(share.items.map(productOf));
  await assertKitchenCanUse({ role: "user" }, items.map((line) => line.stockItemId).filter((id) => !had.has(String(id))));
  const next = keepApprovedLines(share.items, items);
  if (sameLines(share.items, next)) return { order, changed: false };
  const previous = snapshotOf(share.items);
  share.items = next;
  share.updatedAt = new Date();
  noteAdminChange(share, previous, actor);
  order.events.push(orderEvent(actor, "items_changed", { godownId: share.godownId, items: changedEventItems(previous, share.items) }));
  await order.save();
  return { order, changed: true };
};

export const approveCollaborativeOrder = async ({ orderId, input, actor }) => {
  const { godownId, items } = input || {};
  if (godownId !== undefined && !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
  if (items !== undefined && (!godownId || !Array.isArray(items) || items.length === 0)) throw fail(400, "Choose the kitchen and the items to approve");
  const order = await reviewableOrder(orderId, "This order can no longer be approved");
  const stamp = { approvedAt: new Date(), approvedBy: actor.sub };
  // Rejected lines stay rejected; a share whose remaining items were rejected is not approved.
  const approved = [];
  const approveLines = (lines) => lines.filter((line) => !line.approvedAt && !isRejected(line))
    .forEach((line) => { Object.assign(line, stamp); approved.push(line); });
  const approveShare = (share) => {
    approveLines(share.items);
    if (!share.approvedAt && !share.rejectedAt && liveLines(share).length > 0) Object.assign(share, stamp);
  };

  if (!godownId) {
    if (!order.contributions.some((share) => liveLines(share).length > 0)) {
      throw fail(409, "This order has no approved items left; cancel it instead", "NO_ITEMS_TO_APPROVE");
    }
    order.contributions.forEach(approveShare);
    order.events.push(orderEvent(actor, "approved", { fromStatus: order.status, toStatus: "approved" }));
    Object.assign(order, { status: "approved", statusChangedAt: stamp.approvedAt, statusChangedBy: actor.sub });
  } else {
    const share = shareOf(order, godownId);
    if (!items) {
      if (share.rejectedAt) throw fail(409, "This kitchen's items have been rejected", "SHARE_REJECTED");
      if (share.approvedAt) throw fail(409, "This kitchen's items have already been approved", "SHARE_APPROVED");
      approveShare(share);
    } else {
      const chosen = pickLines(share, items);
      if (chosen.length === 0) throw fail(404, "Those items are not in this kitchen's share");
      if (chosen.some(isRejected)) throw fail(409, "Rejected items cannot be approved; the kitchen can ask for them on a new order", "LINE_REJECTED");
      if (chosen.some((line) => line.approvedAt)) throw fail(409, "Approved items cannot be approved again", "LINE_APPROVED");
      approveLines(chosen);
    }
    order.events.push(orderEvent(actor, "approved", { godownId, items: eventItems(approved) }));
  }
  await order.save();
  return order;
};

export const rejectCollaborativeOrderItems = async ({ orderId, input, actor }) => {
  const { godownId, items } = input || {};
  if (!godownId || !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
  if (items !== undefined && (!Array.isArray(items) || items.length === 0)) throw fail(400, "Choose the items to reject");
  const reason = String(input.reason || "").trim();
  if (!reason) throw fail(400, "Give a reason the kitchen will see", "REASON_REQUIRED");
  if (reason.length > 500) throw fail(400, "Reason must be 500 characters or fewer");
  const order = await reviewableOrder(orderId);
  const share = shareOf(order, godownId);
  if (share.rejectedAt) throw fail(409, "This kitchen's items have already been rejected", "SHARE_REJECTED");
  if (share.approvedAt) throw fail(409, "This kitchen's items have been approved", "SHARE_APPROVED");
  const stamp = { rejectedAt: new Date(), rejectedBy: actor.sub, rejectionReason: reason };
  if (!items) {
    const rest = share.items.filter((line) => !line.approvedAt && !isRejected(line));
    rest.forEach((line) => Object.assign(line, stamp));
    Object.assign(share, stamp);
    order.events.push(orderEvent(actor, "rejected", { godownId, items: eventItems(rest), note: reason }));
  } else {
    const chosen = pickLines(share, items);
    if (chosen.length === 0) throw fail(404, "Those items are not in this kitchen's share");
    if (chosen.some((line) => line.approvedAt)) throw fail(409, "Approved items cannot be rejected", "LINE_APPROVED");
    if (chosen.some(isRejected)) throw fail(409, "These items have already been rejected", "LINE_REJECTED");
    chosen.forEach((line) => Object.assign(line, stamp));
    order.events.push(orderEvent(actor, "rejected", { godownId, items: eventItems(chosen), note: reason }));
  }
  await order.save();
  return order;
};

export const adjustCollaborativeOrderQuantity = async ({ orderId, input, actor }) => {
  const { godownId, stockItemId, packId } = input || {};
  if (!godownId || !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
  if (!mongoose.isValidObjectId(stockItemId)) throw fail(400, "Choose the item to change");
  const quantity = Number(input?.quantity);
  if (input?.quantity === undefined || input?.quantity === null || input?.quantity === ""
    || !Number.isFinite(quantity) || quantity <= 0) throw fail(400, "Enter a quantity above zero; to drop the item, reject it");
  const order = await reviewableOrder(orderId);
  const share = shareOf(order, godownId);
  const [line, other] = pickLines(share, [{ stockItemId, packId }]);
  if (!line) throw fail(404, "That item is not in this kitchen's share");
  if (other) throw fail(400, "This item is ordered in more than one unit; choose the pack");
  if (isRejected(line)) throw fail(409, "Rejected items cannot be changed", "LINE_REJECTED");
  const amount = Number(quantity.toFixed(3));
  const next = line.packId ? { packQuantity: amount, qtyBaseUnit: Number((amount * Number(line.packSize)).toFixed(3)) } : { qtyBaseUnit: amount };
  if (next.qtyBaseUnit === Number(line.qtyBaseUnit)) throw fail(400, "That is the quantity already asked for; approve the item instead");
  const now = new Date();
  const fromQtyBaseUnit = Number(line.qtyBaseUnit);
  const previous = snapshotOf(share.items);
  if (line.requestedQtyBaseUnit == null) Object.assign(line, { requestedQtyBaseUnit: line.qtyBaseUnit, requestedPackQuantity: line.packQuantity ?? null });
  Object.assign(line, next, { adjustedAt: now, adjustedBy: actor.sub });
  if (!line.approvedAt) Object.assign(line, { approvedAt: now, approvedBy: actor.sub });
  noteAdminChange(share, previous, actor);
  order.events.push(orderEvent(actor, "quantity_changed", { godownId, items: [{ ...eventItems([line])[0], fromQtyBaseUnit }] }));
  await order.save();
  return order;
};
