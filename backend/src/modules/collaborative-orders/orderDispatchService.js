import mongoose from "mongoose";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { eventItems, orderEvent } from "../../ordering/orderEvents.js";
import { fail } from "../../shared/httpErrors.js";
import { isRejected, liveLines, productOf } from "./orderContributionRules.js";
import { isSent } from "./orderDeliveryRules.js";

const pickLines = (share, picks) => share.items.filter((line) => picks.some((pick) => String(pick?.stockItemId) === productOf(line)
  && (!pick.packId || String(pick.packId) === String(line.packId))));

export const dispatchCollaborativeOrder = async ({ orderId, input, actor }) => {
  const { godownId, items } = input || {};
  if (godownId !== undefined && !mongoose.isValidObjectId(godownId)) throw fail(400, "Choose a kitchen on this order");
  if (items !== undefined && (!godownId || !Array.isArray(items) || items.length === 0)) {
    throw fail(400, "Choose the kitchen and the items to dispatch");
  }
  const order = await CollaborativePurchaseOrder.findById(orderId);
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (order.status !== "ordered") throw fail(409, "Mark the order as ordered before dispatching it", "NOT_ORDERED");

  const shares = godownId
    ? order.contributions.filter((entry) => String(entry.godownId) === String(godownId))
    : order.contributions;
  if (shares.length === 0) throw fail(404, "That kitchen is not on this order");
  const stamp = { dispatchedAt: new Date(), dispatchedBy: actor.sub };
  let sent = 0;
  for (const share of shares) {
    let lines = share.items;
    if (items) {
      lines = pickLines(share, items);
      if (lines.length === 0) throw fail(404, "Those items are not in this kitchen's share");
    }
    const sending = lines.filter((line) => !isRejected(line) && !isSent(line, share));
    for (const line of sending) { Object.assign(line, stamp); sent += 1; }
    if (sending.length) order.events.push(orderEvent(actor, "dispatched", { godownId: share.godownId, items: eventItems(sending) }));
    const live = liveLines(share);
    if (!share.dispatchedAt && live.length > 0 && live.every((line) => isSent(line, share))) Object.assign(share, stamp);
  }
  if (sent === 0) throw fail(409, "These items have already been dispatched", "ALREADY_DISPATCHED");
  await order.save();
  return order;
};
