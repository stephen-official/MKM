import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { io, notifyKitchen } from "../realtime.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
import { listStockRequests, createStockRequest, approveStockRequest, rejectStockRequest } from "../modules/stock-requests/stockRequestService.js";

export const stockRequestRoutes = express.Router();

// --- 4. REQUESTS (WORKFLOW) ---
stockRequestRoutes.get("/requests", authorize(["admin", "user"]), asyncRoute(async (req, res) => {

    const requests = await listStockRequests(req.user);
    res.json(requests);

}, legacyErrorPolicy({ status: 500, field: "error" })));

stockRequestRoutes.post("/requests", authorize(["user"]), requireAvailableProducts(bodyItemIds), asyncRoute(async (req, res) => {

    const { created, notification } = await createStockRequest({ input: req.body, actor: req.user });

    io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
    res.status(201).json(created);

}, legacyErrorPolicy({ status: 400, field: "error" })));

stockRequestRoutes.post("/requests/:id/approve", authorize(["admin"]), asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const approvedRequest = await stockTransaction(req, session, () => approveStockRequest({ requestId: req.params.id, input: req.body, actor: req.user, session }));
    if (!req.stockCommandReplayed) {
    io.to(approvedRequest.godownId.toString()).emit("request_approved", { requestId: approvedRequest._id });
    notifyKitchen(approvedRequest.godownId, "requests");
    notifyKitchen(approvedRequest.godownId, "stock");
    }
    res.json({ message: "Status updated and Godown stock synced" });
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({ status: 400, field: "error" })));

stockRequestRoutes.post("/requests/:id/reject", authorize(["admin"]), asyncRoute(async (req, res) => {

    const request = await rejectStockRequest({ requestId: req.params.id, input: req.body });

    io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
    notifyKitchen(request.godownId, "requests");
    res.json(request);

}, legacyErrorPolicy({ status: 500, respectStatus: true, field: "error" })));
