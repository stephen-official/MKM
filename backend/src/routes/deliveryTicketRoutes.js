import express from "express";
import { notifyKitchen, notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";
import { StockItem } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { createStockBatch } from "../stock/batchService.js";
import { nextTrackingId } from "../stock/trackingId.js";
import { readOrderingSettings } from "../ordering/settings.js";
import { closesAtFor, neededByFor } from "../ordering/window.js";
import { supplierSnapshotFor } from "./collaborativePurchaseOrderRoutes.js";

// Admin view of delivery problems kitchens raised while receiving shared orders (raised through
// POST /api/procurement/collaborative-purchase-orders/:id/receive with a `problem` on the item).
export const deliveryTicketRoutes = express.Router();
const adminOnly = authorize(["admin"]);

const CODES = { 400: "INVALID_INPUT", 404: "NOT_FOUND", 409: "CONFLICT" };
export const fail = (status, message, code = CODES[status]) => Object.assign(new Error(message), { status, code });
const sendError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({ code: error.code || CODES[status] || "SERVER_ERROR", message: status === 500 ? "Delivery problems are unavailable" : error.message });
};

const populate = (query) => query
  .populate("godownId", "name")
  .populate({ path: "stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol" } })
  .populate("raisedBy", "name")
  .populate("resolution.settledBy", "name");

deliveryTicketRoutes.get("/", adminOnly, async (req, res) => {
  try {
    const status = String(req.query.status || "open");
    const filter = status === "all" ? {} : { status };
    if (req.query.godownId && mongoose.isValidObjectId(req.query.godownId)) filter.godownId = req.query.godownId;
    const rows = await populate(DeliveryTicket.find(filter).sort({ status: 1, raisedAt: -1 }).limit(200)).lean();
    return res.json(rows);
  } catch (error) { return sendError(res, error); }
});

const CONDITION = { damaged: "partial_damage", expired: "unchecked" };

/**
 * Opens a normal shared order for the kitchen with the quantity still missing, using the first "needed by" option.
 * Other kitchens can join it like any order.
 */
const openFollowUpOrder = async ({ ticket, order: original, shortfall, actor, now, session }) => {
  const { settings } = await readOrderingSettings();
  const neededBy = neededByFor({ neededIn: settings.neededInOptions[0]?.key }, settings, now);
  // Cooks know their order by its title, not by the CPO number.
  const product = original.title ? null : await StockItem.findById(ticket.stockItemId).select("name").session(session);
  const [order] = await CollaborativePurchaseOrder.create([{
    orderNo: `CPO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase()}`,
    title: original.title ? `Missing items from "${original.title}"` : `Missing ${product?.name || "items"}`,
    note: `Opened by the central store for the ${shortfall} still missing from ${ticket.orderNo}.`,
    neededBy, emergency: false, closesAt: closesAtFor(now, neededBy, settings),
    createdBy: actor, createdByGodown: ticket.godownId,
    contributions: [{ godownId: ticket.godownId, userId: actor, items: [{ stockItemId: ticket.stockItemId, qtyBaseUnit: shortfall }], addedAt: now, updatedAt: now }],
  }], { session });
  return order;
};

/**
 * Admin settles a problem: `acceptedQtyBaseUnit` (0 up to what usably arrived) enters the kitchen's stock as a
 * batch built from the ticket's own receiving details; the order line is then delivered. With
 * `reorderShortfall: true` a follow-up order is opened for the ordered quantity not accepted. One transaction.
 */
deliveryTicketRoutes.post("/:id/settle", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Delivery problem not found");
    const accepted = Number(req.body?.acceptedQtyBaseUnit ?? 0);
    const reorder = req.body?.reorderShortfall === true;
    const note = String(req.body?.note || "").trim();
    if (note.length > 500) throw fail(400, "Keep the note under 500 characters");
    await session.withTransaction(async () => {
      const ticket = await DeliveryTicket.findById(req.params.id).session(session);
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
        const d = ticket.details || {};
        await createStockBatch({
          godownId: ticket.godownId, stockItemId: ticket.stockItemId, quantity: accepted, unitPrice: product?.pricePerUnit,
          sourceType: "collaborative_order", sourceId: order._id, receivedAt: now, condition: CONDITION[ticket.reason] || "good",
          expectedQtyBaseUnit: ticket.orderedQtyBaseUnit, createdBy: req.user.sub, session, trackingId,
          expiryDate: d.expiryDate, mfgDate: d.mfgDate, lotNumber: d.lotNumber, storage: d.storage, photos: d.photos,
          notes: `${ticket.reason}: ${ticket.note}`.trim(),
          ...supplierSnapshotFor(order, ticket.stockItemId),
        });
      }
      const shortfall = Math.max(0, Number(ticket.orderedQtyBaseUnit) - accepted);
      const followUp = reorder && shortfall > 0 ? await openFollowUpOrder({ ticket, order, shortfall, actor: req.user.sub, now, session }) : null;
      Object.assign(line, { deliveredAt: now, deliveredBy: req.user.sub, trackingId, receivedQtyBaseUnit: accepted });
      if (share.items.every((entry) => entry.deliveredAt)) Object.assign(share, { deliveredAt: now, deliveredBy: req.user.sub });
      await order.save({ session });
      ticket.status = "settled";
      ticket.resolution = { acceptedQtyBaseUnit: accepted, reorderShortfall: Boolean(followUp), followUpOrderId: followUp?._id || null, note, settledBy: req.user.sub, settledAt: now };
      await ticket.save({ session });
    });
    const settled = await populate(DeliveryTicket.findById(req.params.id)).lean();
    notifyKitchen(settled?.godownId?._id || settled?.godownId, "stock");
    notifyKitchens("orders");
    return res.json(settled);
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
});

deliveryTicketRoutes.get("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Delivery problem not found");
    const ticket = await populate(DeliveryTicket.findById(req.params.id)).lean();
    if (!ticket) throw fail(404, "Delivery problem not found");
    return res.json(ticket);
  } catch (error) { return sendError(res, error); }
});
