import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";

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

deliveryTicketRoutes.get("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Delivery problem not found");
    const ticket = await populate(DeliveryTicket.findById(req.params.id)).lean();
    if (!ticket) throw fail(404, "Delivery problem not found");
    return res.json(ticket);
  } catch (error) { return sendError(res, error); }
});
