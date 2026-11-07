import mongoose from "mongoose";
import { businessDateOf } from "../../executive/params.js";
import { DeliveryTicket } from "../../models/DeliveryTicketModel.js";
import { GodownStock } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { eventItems, orderEvent } from "../../ordering/orderEvents.js";
import { createStockBatch } from "../../stock/batchService.js";
import { nextTrackingId } from "../../stock/trackingId.js";
import { fail } from "../../shared/httpErrors.js";
import { liveLines } from "./orderContributionRules.js";
import { isReceived, isSent } from "./orderDeliveryRules.js";
import { problemDetails, receiptDetails, supplierSnapshotFor } from "./orderReceivingRules.js";

const detailKey = (stockItemId, packId) => `${String(stockItemId)}:${packId ? String(packId) : "base"}`;

export const receiveCollaborativeOrder = async ({ orderId, input, actor }) => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const details = new Map((Array.isArray(input?.items) ? input.items : [])
    .filter((entry) => mongoose.isValidObjectId(entry?.stockItemId))
    .map((entry) => [detailKey(entry.stockItemId, entry.packId), entry]));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await CollaborativePurchaseOrder.findById(orderId)
        .populate("supplierId", "name fssaiLicence").populate("supplierByProduct.supplierId", "name fssaiLicence").session(session);
      if (!order) throw fail(404, "Collaborative purchase order not found");
      const share = order.contributions.find((entry) => String(entry.godownId) === String(actor.godownId));
      if (!share) throw fail(404, "Your kitchen is not on this order");
      if (share.deliveredAt) throw fail(409, "Your kitchen has already received these items", "ALREADY_DELIVERED");
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
        const detail = details.get(detailKey(productId, line.packId))
          || (lineCountByProduct.get(productId) === 1 ? details.get(detailKey(productId, null)) : null);
        if (!detail) throw fail(400, `${product?.name || "An item"} is missing its receiving details`, "MISSING_ITEM_DETAILS");
        if (detail.problem) {
          const problem = problemDetails(detail, line, product, today);
          const [ticket] = await DeliveryTicket.create([{
            orderId: order._id, orderNo: order.orderNo, godownId: share.godownId, stockItemId: line.stockItemId, packId: line.packId || null,
            orderedQtyBaseUnit: line.qtyBaseUnit, raisedBy: actor.sub, raisedAt: receivedAt, ...problem,
          }], { session });
          line.ticketId = ticket._id;
          problems.push({ line, reason: problem.reason });
          continue;
        }
        const checked = receiptDetails(detail, product, today);
        await GodownStock.findOneAndUpdate(
          { godownId: share.godownId, stockItemId: line.stockItemId },
          { $inc: { qtyBaseUnit: line.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } },
          { upsert: true, new: true, session },
        );
        const trackingId = await nextTrackingId({ session, now: receivedAt });
        await createStockBatch({
          godownId: share.godownId, stockItemId: line.stockItemId, quantity: line.qtyBaseUnit,
          unitPrice: product?.pricePerUnit, sourceType: "collaborative_order", sourceId: order._id,
          receivedAt, condition: "good", expectedQtyBaseUnit: line.qtyBaseUnit, createdBy: actor.sub, session,
          trackingId, ...checked, ...supplier,
        });
        Object.assign(line, { deliveredAt: receivedAt, deliveredBy: actor.sub, trackingId, receivedQtyBaseUnit: line.qtyBaseUnit });
        receivedLines.push(line);
      }
      if (liveLines(share).every((line) => isReceived(line, share))) Object.assign(share, { deliveredAt: receivedAt, deliveredBy: actor.sub });
      if (receivedLines.length) order.events.push(orderEvent(actor, "received", { godownId: share.godownId, items: eventItems(receivedLines) }));
      if (problems.length) order.events.push(orderEvent(actor, "problem_raised", {
        godownId: share.godownId, items: eventItems(problems.map((entry) => entry.line)),
        note: [...new Set(problems.map((entry) => entry.reason.replace("_", " ")))].join(", "),
      }));
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
};
