import express from "express";
import { notifyKitchen, notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";
import { settleDeliveryTicket } from "../modules/delivery-tickets/deliveryTicketSettlementService.js";
import { asyncRoute, fail } from "../shared/httpErrors.js";

// Admin view of delivery problems kitchens raised while receiving shared orders (raised through
// POST /api/procurement/collaborative-purchase-orders/:id/receive with a `problem` on the item).
export const deliveryTicketRoutes = express.Router();
const adminOnly = authorize(["admin"]);

const route = (handler) => asyncRoute(handler, { serverErrorMessage: "Delivery problems are unavailable" });

const populate = (query) => query
  .populate("godownId", "name")
  .populate({ path: "stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol" } })
  .populate("raisedBy", "name")
  .populate("resolution.settledBy", "name");

deliveryTicketRoutes.get("/", adminOnly, route(async (req, res) => {
    const status = String(req.query.status || "open");
    const filter = status === "all" ? {} : { status };
    if (req.query.godownId && mongoose.isValidObjectId(req.query.godownId)) filter.godownId = req.query.godownId;
    const rows = await populate(DeliveryTicket.find(filter).sort({ status: 1, raisedAt: -1 }).limit(200)).lean();
    return res.json(rows);
}));

/**
 * Admin settles a problem: `acceptedQtyBaseUnit` (0 up to what usably arrived) enters the kitchen's stock as a
 * batch built from the ticket's own receiving details; the order line is then delivered. With
 * `reorderShortfall: true` a follow-up order is opened for the ordered quantity not accepted. One transaction.
 */
deliveryTicketRoutes.post("/:id/settle", adminOnly, route(async (req, res) => {
    await settleDeliveryTicket({ ticketId: req.params.id, input: req.body, actor: req.user });
    const settled = await populate(DeliveryTicket.findById(req.params.id)).lean();
    notifyKitchen(settled?.godownId?._id || settled?.godownId, "stock");
    notifyKitchens("orders");
    return res.json(settled);
}));

deliveryTicketRoutes.get("/:id", adminOnly, route(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Delivery problem not found");
    const ticket = await populate(DeliveryTicket.findById(req.params.id)).lean();
    if (!ticket) throw fail(404, "Delivery problem not found");
    return res.json(ticket);
}));
