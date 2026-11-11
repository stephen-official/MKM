import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { GodownStock, Notification } from "../models/FlowModels.js";
import { isAvailable, missingFields } from "../catalog/completeness.js";
// CRITICAL: Explicitly import these so Mongoose registers the models for population
import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
import { isAdminRole, isKitchenRole } from "../utils/roles.js";
import { businessDateOf } from "../executive/params.js";
import { StockBatch } from "../models/StockBatchModel.js";

import { transferRoutes } from "./transferRoutes.js";
import { consumptionRoutes } from "./consumptionRoutes.js";
import { stockRequestRoutes } from "./stockRequestRoutes.js";

export const operationsRoutes = express.Router();

/**
 * Dated stock a kitchen holds, per product: Map stockItemId → [{ date: "YYYY-MM-DD", qtyBaseUnit }], soonest first.
 * Lots are grouped by expiry date (no batch ids, no prices), which is all the kitchen app needs for its
 * "use first" banners. Undated batches are left out.
 */
const expiryLotsFor = async (godownId) => {
  const rows = await StockBatch.aggregate([
    { $match: { godownId: new mongoose.Types.ObjectId(String(godownId)), remainingQtyBaseUnit: { $gt: 0 }, expiryDate: { $ne: null } } },
    { $group: { _id: { stockItemId: "$stockItemId", expiryDate: "$expiryDate" }, qtyBaseUnit: { $sum: "$remainingQtyBaseUnit" } } },
    { $sort: { "_id.expiryDate": 1 } },
  ]);
  const lots = new Map();
  for (const row of rows) {
    const key = String(row._id.stockItemId);
    if (!lots.has(key)) lots.set(key, []);
    lots.get(key).push({ date: businessDateOf(row._id.expiryDate), qtyBaseUnit: row.qtyBaseUnit });
  }
  return lots;
};

/** Supplier names behind the stock a kitchen still holds, per product: Map stockItemId → ["Name", …] (A–Z, no blanks). */
const suppliersFor = async (godownId) => {
  const rows = await StockBatch.aggregate([
    { $match: { godownId: new mongoose.Types.ObjectId(String(godownId)), remainingQtyBaseUnit: { $gt: 0 }, supplierName: { $nin: [null, ""] } } },
    { $group: { _id: "$stockItemId", names: { $addToSet: "$supplierName" } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), [...row.names].sort((a, b) => a.localeCompare(b))]));
};

// --- 1. KITCHEN STOCK FETCH ---
operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });
    const [expiryLots, suppliers] = await Promise.all([expiryLotsFor(godownId), suppliersFor(godownId)]);

    const stock = await GodownStock.find({ godownId })
      .populate({
        path: "stockItemId",
        model: "StockItem",
        populate: [
  { path: "stockGroupId", model: "StockGroup", select: "name" },
  { path: "unitId", model: "Unit", select: "name symbol" }
],
select: "name stockGroupId unitId imageUrl itemType pricePerUnit soldInPacks packs archived"
      });

    const formatted = stock.map(s => ({
  // Kitchens keep seeing stock they hold, but cannot use a product until its details are complete.
  available: Boolean(s.stockItemId) && isAvailable(s.stockItemId, s.stockItemId.unitId),
  missing: s.stockItemId ? missingFields(s.stockItemId, s.stockItemId.unitId) : [],
  archived: Boolean(s.stockItemId?.archived),
  stockRecordId: s._id,
  stockItemId: s.stockItemId?._id,
  stockGroupId: s.stockItemId?.stockGroupId?._id,
  groupName: s.stockItemId?.stockGroupId?.name || "General",
  name: s.stockItemId?.name || "Unknown Item",
  currentQty: s.qtyBaseUnit || 0,
  thresholdBaseUnit: s.thresholdBaseUnit || 0,
  unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
  image: s.stockItemId?.imageUrl || "",
  soldInPacks: Boolean(s.stockItemId?.soldInPacks),
  packs: s.stockItemId?.packs || [],
  expiries: expiryLots.get(String(s.stockItemId?._id)) || [],
  suppliers: suppliers.get(String(s.stockItemId?._id)) || [],

  itemType: s.stockItemId?.itemType || "stock"
}));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Keep both /api and /api/operations aliases through this router.
operationsRoutes.use(consumptionRoutes);

operationsRoutes.use(stockRequestRoutes);

operationsRoutes.use(transferRoutes);

operationsRoutes.get(
  "/godown-stocks",
  authorize(["admin", "user"]),
  async (req, res) => {
    try {
     let filter = {};

if (isKitchenRole(req.user.role)) {
  filter = { godownId: req.user.godownId };
}

const stocks = await GodownStock.find(filter)
        .populate({
          path: "godownId",
          model: "Godown",
          select: "name"
        })
        .populate({
          path: "stockItemId",
          model: "StockItem",
          select: "name imageUrl unitId stockGroupId itemType soldInPacks packs",
          populate: [
            {
              path: "unitId",
              model: "Unit",
              select: "name symbol"
            },
            {
              path: "stockGroupId",
              model: "StockGroup",
              select: "name"
            }
          ]
        })
        .sort({ createdAt: -1 });

      res.json(stocks);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);
// --- 6. NOTIFICATIONS ---
operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = isAdminRole(req.user.role) ? {} : { "payload.godownId": req.user.godownId };
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

