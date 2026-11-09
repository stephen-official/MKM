import mongoose from "mongoose";
import { GodownStock } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { DeliveryTicket } from "../../models/DeliveryTicketModel.js";
import { orderEvent } from "../../ordering/orderEvents.js";
import { readOrderingSettings } from "../../ordering/settings.js";
import { closesAtFor, neededByFor } from "../../ordering/window.js";
import { fail } from "../../shared/httpErrors.js";
import { createStockBatch } from "../../stock/batchService.js";
import { nextTrackingId } from "../../stock/trackingId.js";
import { supplierSnapshotFor } from "../collaborative-orders/orderReceivingRules.js";

const CONDITION = { damaged: "partial_damage", expired: "unchecked" };

/** Opens a normal shared order for the kitchen and quantity still missing. */
const openFollowUpOrder = async ({ ticket, order: original, shortfall, actor, now, session }) => {
  const { settings } = await readOrderingSettings();
  const neededBy = neededByFor({ neededIn: settings.neededInOptions[0]?.key }, settings, now);
  const product = original.title ? null : await StockItem.findById(ticket.stockItemId).select("name").session(session);
  const [order] = await CollaborativePurchaseOrder.create([{
    orderNo: `CPO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase()}`,
    title: original.title ? `Missing items from "${original.title}"` : `Missing ${product?.name || "items"}`,
    note: `Opened by the central store for the ${shortfall} still missing from ${ticket.orderNo}.`,
    neededBy, emergency: false, closesAt: closesAtFor(now, neededBy, settings),
    createdBy: actor.sub, createdByGodown: ticket.godownId, source: "admin",
    contributions: [{ godownId: ticket.godownId, userId: actor.sub, items: [{ stockItemId: ticket.stockItemId, qtyBaseUnit: shortfall }], addedAt: now, updatedAt: now }],
    events: [orderEvent(actor, "raised", {
      at: now, godownId: ticket.godownId, items: [{ stockItemId: ticket.stockItemId, qtyBaseUnit: shortfall }], toStatus: "open",
      note: `For the shortfall on ${ticket.orderNo}`,
    })],
  }], { session });
  return order;
};

/** Settles one delivery problem and applies all stock, order and follow-up effects in one transaction. */
export const settleDeliveryTicket = async ({ ticketId, input, actor }) => {
  if (!mongoose.isValidObjectId(ticketId)) throw fail(404, "Delivery problem not found");
  const accepted = Number(input?.acceptedQtyBaseUnit ?? 0);
  const reorder = input?.reorderShortfall === true;
  const note = String(input?.note || "").trim();
  if (note.length > 500) throw fail(400, "Keep the note under 500 characters");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const ticket = await DeliveryTicket.findById(ticketId).session(session);
      if (!ticket) throw fail(404, "Delivery problem not found");
      if (ticket.status !== "open") throw fail(409, "This problem has already been settled", "ALREADY_SETTLED");
      if (!Number.isFinite(accepted) || accepted < 0) throw fail(400, "Enter the quantity to accept into stock (0 or more)");
      if (accepted > ticket.receivedQtyBaseUnit) throw fail(400, `Only ${ticket.receivedQtyBaseUnit} usable arrived, so at most that can be accepted`);
      if (ticket.reason === "wrong_item" && accepted !== 0) throw fail(400, "A wrong item cannot be added as the product that was ordered");

      const order = await CollaborativePurchaseOrder.findById(ticket.orderId)
        .populate("supplierId", "name fssaiLicence").populate("supplierByProduct.supplierId", "name fssaiLicence").session(session);
      if (!order) throw fail(404, "The order for this problem no longer exists");
      const share = order.contributions.find((entry) => String(entry.godownId) === String(ticket.godownId));
      const line = share?.items.find((entry) => String(entry.ticketId) === String(ticket._id));
      if (!line) throw fail(409, "The order line for this problem was not found", "CONFLICT");

      const now = new Date();
      let trackingId = null;
      if (accepted > 0) {
        const product = await StockItem.findById(ticket.stockItemId).select("pricePerUnit").session(session);
        await GodownStock.findOneAndUpdate(
          { godownId: ticket.godownId, stockItemId: ticket.stockItemId },
          { $inc: { qtyBaseUnit: accepted }, $setOnInsert: { thresholdBaseUnit: 0 } },
          { upsert: true, new: true, session },
        );
        trackingId = await nextTrackingId({ session, now });
        const details = ticket.details || {};
        await createStockBatch({
          godownId: ticket.godownId, stockItemId: ticket.stockItemId, quantity: accepted, unitPrice: product?.pricePerUnit,
          sourceType: "collaborative_order", sourceId: order._id, receivedAt: now, condition: CONDITION[ticket.reason] || "good",
          expectedQtyBaseUnit: ticket.orderedQtyBaseUnit, createdBy: actor.sub, session, trackingId,
          expiryDate: details.expiryDate, mfgDate: details.mfgDate, lotNumber: details.lotNumber, storage: details.storage, photos: details.photos,
          notes: `${ticket.reason}: ${ticket.note}`.trim(),
          ...supplierSnapshotFor(order, ticket.stockItemId),
        });
      }

      const shortfall = Math.max(0, Number(ticket.orderedQtyBaseUnit) - accepted);
      const followUp = reorder && shortfall > 0
        ? await openFollowUpOrder({ ticket, order, shortfall, actor, now, session })
        : null;
      Object.assign(line, { deliveredAt: now, deliveredBy: actor.sub, trackingId, receivedQtyBaseUnit: accepted });
      order.events.push(orderEvent(actor, "problem_settled", {
        godownId: ticket.godownId,
        items: [{ stockItemId: ticket.stockItemId, packId: ticket.packId || null, qtyBaseUnit: accepted, fromQtyBaseUnit: ticket.orderedQtyBaseUnit }],
        note: `Accepted ${accepted} of ${ticket.orderedQtyBaseUnit}${followUp ? `; follow-up order ${followUp.orderNo}` : ""}`,
      }));
      if (share.items.every((entry) => entry.deliveredAt || entry.rejectedAt)) Object.assign(share, { deliveredAt: now, deliveredBy: actor.sub });
      await order.save({ session });

      ticket.status = "settled";
      ticket.resolution = {
        acceptedQtyBaseUnit: accepted, reorderShortfall: Boolean(followUp), followUpOrderId: followUp?._id || null,
        note, settledBy: actor.sub, settledAt: now,
      };
      await ticket.save({ session });
    });
  } finally {
    await session.endSession();
  }
};
