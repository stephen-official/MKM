import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { notifyKitchen } from "../realtime.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
import { createDistribution, getDistributionDetails, listDistributionLeftovers, listDistributionLogs, validateDistribution } from "../modules/distributions/distributionService.js";

export const distributionRoutes = express.Router();
const adminOnly = authorize(["admin"]);

distributionRoutes.post("/distributions", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  const { allocations } = req.body;
  try {
    try { validateDistribution(allocations); }
    catch (error) {
      if (error.status === 400) return res.status(400).json({ message: error.message });
      throw error;
    }
    const distribution = await stockTransaction(req, session, () => createDistribution({ input: req.body, actor: req.user, session }));
    if (!req.stockCommandReplayed) {
      for (const id of new Set((allocations || []).map((item) => String(item.godownId)))) notifyKitchen(id, "stock");
    }
    res.status(201).json(distribution);
  } catch (error) {
    if (error.stockCommandError) throw error;
    res.status(500).json({ message: "Distribution failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

distributionRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
  try { res.json(await listDistributionLogs()); }
  catch (error) { res.status(500).json({ message: "Fetch logs failed", error: error.message }); }
});

distributionRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
  try {
    const details = await getDistributionDetails(req.params.id);
    if (!details) return res.status(404).json({ message: "Log not found" });
    res.json(details);
  } catch (error) { res.status(500).json({ message: "Failed to fetch details", error: error.message }); }
});

distributionRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
  try { res.json(await listDistributionLeftovers()); }
  catch (error) { res.status(500).json({ message: "Fetch leftovers failed", error: error.message }); }
});
