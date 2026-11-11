import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { notifyKitchen } from "../realtime.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
import { createDistribution, getDistributionDetails, listDistributionLeftovers, listDistributionLogs, validateDistribution } from "../modules/distributions/distributionService.js";

export const distributionRoutes = express.Router();
const adminOnly = authorize(["admin"]);

distributionRoutes.post("/distributions", adminOnly, asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  const { allocations } = req.body;
  try {
    validateDistribution(allocations);
    const distribution = await stockTransaction(req, session, () => createDistribution({ input: req.body, actor: req.user, session }));
    if (!req.stockCommandReplayed) {
      for (const id of new Set((allocations || []).map((item) => String(item.godownId)))) notifyKitchen(id, "stock");
    }
    res.status(201).json(distribution);
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({ status: 500, field: "message", message: "Distribution failed", includeError: true, publicMessageOnly: true })));

distributionRoutes.get("/distributions/logs", adminOnly, asyncRoute(async (_req, res) => {
   res.json(await listDistributionLogs());
}, legacyErrorPolicy({ status: 500, field: "message", message: "Fetch logs failed", includeError: true })));

distributionRoutes.get("/distributions/:id/details", adminOnly, asyncRoute(async (req, res) => {

    const details = await getDistributionDetails(req.params.id);
    if (!details) return res.status(404).json({ message: "Log not found" });
    res.json(details);

}, legacyErrorPolicy({ status: 500, field: "message", message: "Failed to fetch details", includeError: true })));

distributionRoutes.get("/distributions/leftovers", adminOnly, asyncRoute(async (_req, res) => {
   res.json(await listDistributionLeftovers());
}, legacyErrorPolicy({ status: 500, field: "message", message: "Fetch leftovers failed", includeError: true })));
