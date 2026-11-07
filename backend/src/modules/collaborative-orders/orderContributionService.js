import mongoose from "mongoose";
import { assertKitchenCanUse } from "../../catalog/productService.js";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { Godown } from "../../models/InventoryModels.js";
import { eventItems, orderEvent } from "../../ordering/orderEvents.js";
import { readOrderingSettings } from "../../ordering/settings.js";
import { closesAtFor, neededByFor } from "../../ordering/window.js";
import { fail } from "../../shared/httpErrors.js";
import { text } from "../../shared/text.js";
import { isKitchenRole } from "../../utils/roles.js";
import { keepApprovedLines, liveLines, normalizeCollaborativeItems } from "./orderContributionRules.js";

const contributionFrom = (input, actor, godownId = actor.godownId) => {
  if (!godownId) throw fail(403, "Your account is not assigned to a kitchen");
  const items = normalizeCollaborativeItems(input.items);
  if (!items) throw fail(400, "Add at least one item with a valid quantity");
  return { godownId, userId: actor.sub, items, note: text(input.note, 500, "Contribution note"), updatedAt: new Date() };
};

/** The kitchen an order is opened for: the cook's own, or the one an admin names when opening it on its behalf. */
const openingKitchen = async (input, actor) => {
  if (isKitchenRole(actor.role)) return actor.godownId;
  const godownId = String(input.godownId || "");
  if (!mongoose.isValidObjectId(godownId) || !(await Godown.exists({ _id: godownId, active: { $ne: false } }))) {
    throw fail(400, "Choose the kitchen this order is for");
  }
  await assertKitchenCanUse({ role: "user" }, Array.isArray(input.items) ? input.items.map((item) => item?.stockItemId) : []);
  return godownId;
};

export const createCollaborativeOrder = async ({ input, actor }) => {
  const kitchen = isKitchenRole(actor.role);
  // "Approve and send": the central store approves the kitchen's items as it raises the order. Other kitchens
  // can still join until the order closes, and their items wait for review as usual.
  const approveNow = input.approve === true;
  if (approveNow && kitchen) throw fail(403, "Only the central store can approve an order");
  const { settings } = await readOrderingSettings();
  const openedAt = new Date();
  const emergency = input.emergency === true;
  const neededBy = neededByFor({ neededIn: input.neededIn, emergency }, settings, openedAt);
  if (!neededBy) throw fail(400, "Choose when the items are needed");
  const godownId = await openingKitchen(input, actor);
  const contribution = contributionFrom(input, actor, godownId);
  contribution.addedAt = contribution.updatedAt;
  if (approveNow) {
    const stamp = { approvedAt: openedAt, approvedBy: actor.sub };
    contribution.items.forEach((line) => Object.assign(line, stamp));
    Object.assign(contribution, stamp);
  }
  return CollaborativePurchaseOrder.create({
    source: kitchen ? "kitchen" : "admin",
    orderNo: `CPO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase()}`,
    title: text(input.title, 120, "Title"), note: text(input.orderNote, 1000, "Order note"), neededBy, emergency,
    closesAt: closesAtFor(openedAt, neededBy, settings), createdBy: actor.sub, createdByGodown: godownId,
    contributions: [contribution],
    events: [
      orderEvent(actor, "raised", { godownId, items: eventItems(contribution.items), toStatus: "open" }),
      ...(approveNow ? [orderEvent(actor, "approved", { godownId, items: eventItems(contribution.items) })] : []),
    ],
  });
};

export const joinCollaborativeOrder = async ({ orderId, input, actor }) => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const contribution = contributionFrom(input, actor);
  contribution.addedAt = contribution.updatedAt;
  const order = await CollaborativePurchaseOrder.findOneAndUpdate(
    { _id: orderId, status: "open", "contributions.godownId": { $ne: actor.godownId } },
    { $push: { contributions: contribution, events: orderEvent(actor, "joined", { godownId: actor.godownId, items: eventItems(contribution.items) }) }, $set: { updatedAt: new Date() }, $inc: { __v: 1 } },
    { new: true, runValidators: true },
  );
  if (order) return order;
  const existing = await CollaborativePurchaseOrder.findById(orderId).lean();
  if (!existing) throw fail(404, "Collaborative purchase order not found");
  if (existing.status !== "open") throw fail(409, "This order is no longer accepting additions", "ORDER_CLOSED");
  throw fail(409, "Your kitchen has already joined this order; edit its contribution instead", "ALREADY_JOINED");
};

export const editOwnContribution = async ({ orderId, input, actor }) => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const contribution = contributionFrom(input, actor);
  // Load, check and save with the version check, so an approval made meanwhile is never overwritten.
  const order = await CollaborativePurchaseOrder.findById(orderId);
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (order.status !== "open") throw fail(409, "This order is no longer accepting changes", "ORDER_CLOSED");
  const mine = order.contributions.find((entry) => String(entry.godownId) === String(actor.godownId));
  if (!mine) throw fail(404, "Your kitchen has not joined this order");
  if (mine.approvedAt) throw fail(409, "Your kitchen's items have been approved and can no longer be changed", "SHARE_APPROVED");
  if (mine.rejectedAt) throw fail(409, "The central store has closed your kitchen's items on this order", "SHARE_REJECTED");
  mine.items = keepApprovedLines(mine.items, contribution.items);
  Object.assign(mine, { note: contribution.note, userId: actor.sub, updatedAt: contribution.updatedAt, adminChange: null });
  order.events.push(orderEvent(actor, "edited", { godownId: actor.godownId, items: eventItems(liveLines(mine)) }));
  await order.save();
  return order;
};

export const leaveCollaborativeOrder = async ({ orderId, actor }) => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const existing = await CollaborativePurchaseOrder.findById(orderId).lean();
  if (!existing) throw fail(404, "Collaborative purchase order not found");
  if (existing.status !== "open") throw fail(409, "This order is no longer accepting changes", "ORDER_CLOSED");
  if (String(existing.createdByGodown) === String(actor.godownId)) throw fail(409, "The kitchen that opened the order must keep a contribution; edit it instead");
  const mine = existing.contributions.find((entry) => String(entry.godownId) === String(actor.godownId));
  if (mine && (mine.approvedAt || mine.items.some((line) => line.approvedAt))) {
    throw fail(409, "Your kitchen has approved items on this order, so it cannot leave", "LINE_APPROVED");
  }
  // Matching the version read above means no approval landed in between.
  const order = await CollaborativePurchaseOrder.findOneAndUpdate(
    { _id: orderId, status: "open", __v: existing.__v, "contributions.godownId": actor.godownId },
    { $pull: { contributions: { godownId: actor.godownId } }, $push: { events: orderEvent(actor, "left", { godownId: actor.godownId, items: eventItems(mine?.items || []) }) }, $set: { updatedAt: new Date() }, $inc: { __v: 1 } },
    { new: true },
  );
  if (!order && mine && (await CollaborativePurchaseOrder.exists({ _id: orderId, "contributions.godownId": actor.godownId }))) {
    throw fail(409, "This order was changed by someone else. Reload and try again.", "VERSION_CONFLICT");
  }
  if (!order) throw fail(404, "Your kitchen has not joined this order");
  return order;
};
