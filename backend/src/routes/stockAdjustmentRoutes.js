import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { notifyKitchen } from "../realtime.js";
import { changeStockThreshold, openingBalanceInput, recordOpeningBalance, removeStockRecord } from "../modules/stock-adjustments/stockAdjustmentService.js";

export const stockAdjustmentRoutes = express.Router();
const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);

stockAdjustmentRoutes.post("/opening-balances", superAdminOnly, async (req, res) => {
  let input;
  try { input = openingBalanceInput(req.body); }
  catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    throw error;
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await recordOpeningBalance({ input, actor: req.user, session });
    });
    notifyKitchen(input.godownId, "stock");
    return res.status(201).json(result);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "An opening balance already exists for this kitchen and product" });
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Opening balance failed", ...(error.status ? {} : { error: error.message }) });
  } finally {
    await session.endSession();
  }
});

stockAdjustmentRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
  try {
    const stock = await changeStockThreshold({ stockRecordId: req.params.id, thresholdBaseUnit: req.body.thresholdBaseUnit });
    notifyKitchen(stock?.godownId, "stock");
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Threshold update failed", error: error.message });
  }
});

stockAdjustmentRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let deletedStock;
    await session.withTransaction(async () => {
      deletedStock = await removeStockRecord({ stockRecordId: req.params.id, session });
    });
    if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
    notifyKitchen(deletedStock.godownId, "stock");
    res.json({ success: true, message: "Stock item removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
});
