import express from "express";
import { DailyUsage } from "../models/DailyUsageModel.js";
import { authorize } from "../middleware/auth.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";

const dailyUsageRoutes = express.Router();



dailyUsageRoutes.get(
  "/me",
  authorize(["user", "admin"]),
  async (req, res) => {

    const rows = await DailyUsage.find({
      userId: req.user.sub
    })
      .populate("items.stockItemId")
      .sort({ createdAt: -1 });

    res.json(rows);
  }
);




dailyUsageRoutes.get(
"/",
authorize(["admin"]),
async (req, res) => {

  const rows = await DailyUsage.find()
    .populate("godownId")
    .populate("userId")
    .populate("items.stockItemId")
    .sort({ createdAt: -1 });

  res.json(rows);
});




dailyUsageRoutes.post(
  "/",
  authorize(["user", "admin"]),
  requireAvailableProducts(bodyItemIds),
  async (req, res) => {
    try {
      console.log("=== DAILY USAGE ===");
      console.log("USER:", req.user);
      console.log("BODY:", req.body);
      console.log(req.user);

const row = await DailyUsage.create({
  godownId: req.user.godownId,
  userId: req.user.sub,
 date: req.body.date,
  items: req.body.items
});  
     

      res.status(201).json(row);
    } catch (err) {
      console.log("DAILY USAGE ERROR:", err);

      res.status(500).json({
        message: err.message
      });
    }
  }
);


export { dailyUsageRoutes };