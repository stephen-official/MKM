import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { notifyKitchen } from "../realtime.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";
import { changeStockThreshold, openingBalanceInput, recordOpeningBalance, removeStockRecord } from "../modules/stock-adjustments/stockAdjustmentService.js";

export const stockAdjustmentRoutes = express.Router();
const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);

stockAdjustmentRoutes.post("/opening-balances", superAdminOnly, asyncRoute(async (req, res) => {
  const input = openingBalanceInput(req.body);
  const session = await mongoose.startSession();
  try {
    const result = await stockTransaction(req, session, () => recordOpeningBalance({ input, actor: req.user, session }));
    if (!req.stockCommandReplayed) notifyKitchen(input.godownId, "stock");
    return res.status(201).json(result);
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({ field: "message", message: "Opening balance failed", includeError: true, respectStatus: true, publicMessageOnly: true, specials: [{ matches: (error) => error?.code === 11000, status: 409, body: { message: "An opening balance already exists for this kitchen and product" } }] })));

stockAdjustmentRoutes.post("/godown-stocks/:id/threshold", adminOnly, asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const stock = await stockTransaction(req, session, () => changeStockThreshold({ stockRecordId: req.params.id, thresholdBaseUnit: req.body.thresholdBaseUnit, session }));
    if (!req.stockCommandReplayed) notifyKitchen(stock?.godownId, "stock");
    res.json(stock);
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({ status: 500, field: "message", message: "Threshold update failed", includeError: true })));

stockAdjustmentRoutes.delete("/godown-stocks/:id", adminOnly, asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const deletedStock = await stockTransaction(req, session, () => removeStockRecord({ stockRecordId: req.params.id, session }));
    if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
    if (!req.stockCommandReplayed) notifyKitchen(deletedStock.godownId, "stock");
    res.json({ success: true, message: "Stock item removed" });
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({ status: 500, field: "message" })));
