import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { notifyKitchen } from "../realtime.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
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
    const result = await stockTransaction(req, session, () => recordOpeningBalance({ input, actor: req.user, session }));
    if (!req.stockCommandReplayed) notifyKitchen(input.godownId, "stock");
    return res.status(201).json(result);
  } catch (error) {
    if (error.stockCommandError) throw error;
    if (error?.code === 11000) return res.status(409).json({ message: "An opening balance already exists for this kitchen and product" });
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Opening balance failed", ...(error.status ? {} : { error: error.message }) });
  } finally {
    await session.endSession();
  }
});

stockAdjustmentRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const stock = await stockTransaction(req, session, () => changeStockThreshold({ stockRecordId: req.params.id, thresholdBaseUnit: req.body.thresholdBaseUnit, session }));
    if (!req.stockCommandReplayed) notifyKitchen(stock?.godownId, "stock");
    res.json(stock);
  } catch (error) {
    if (error.stockCommandError) throw error;
    res.status(500).json({ message: "Threshold update failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

stockAdjustmentRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const deletedStock = await stockTransaction(req, session, () => removeStockRecord({ stockRecordId: req.params.id, session }));
    if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
    if (!req.stockCommandReplayed) notifyKitchen(deletedStock.godownId, "stock");
    res.json({ success: true, message: "Stock item removed" });
  } catch (error) {
    if (error.stockCommandError) throw error;
    console.error(error);
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
});
