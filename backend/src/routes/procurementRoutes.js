import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { 
  GodownStock, 
  Indent, 
  Notification, 
  PurchaseOrder 
} from "../models/FlowModels.js";
import { packQuantityMatchesBase, packSnapshot } from "../catalog/packaging.js";
import { StockItem } from "../models/InventoryModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { isValidPrice } from "../catalog/completeness.js";
import { isSuperAdmin } from "../utils/roles.js";

import { stockAdjustmentRoutes } from "./stockAdjustmentRoutes.js";
import { distributionRoutes } from "./distributionRoutes.js";

export const procurementRoutes = express.Router();
const adminOnly = authorize(["admin"]);
const anyUser = authorize(["admin", "user"]);

// --- STOCK UTILITY & VALIDATION ROUTES ---

/**
 * @route   GET /api/procurement/stock-balance
 * @desc    Checks available quantity in a specific godown.
 */
procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
  try {
    const { godownId, stockItemId } = req.query;
    
    if (!godownId || !stockItemId) {
      return res.status(400).json({ message: "Missing godownId or stockItemId" });
    }

    const stock = await GodownStock.findOne({ godownId, stockItemId });
    
    res.json({ 
      availableQty: stock ? stock.qtyBaseUnit : 0 
    });
  } catch (error) {
    res.status(500).json({ message: "Balance check failed", error: error.message });
  }
});

/**
 * @route   GET /api/procurement/my-stock
 * @desc    Fetch user-specific godown stock with full item details.
 */
procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
  try {
    const userGodownId = req.user.godownId; 
    if (!userGodownId) {
      return res.status(403).json({ message: "No Godown assigned to this user." });
    }

    const docs = await GodownStock.find({ godownId: userGodownId })
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Integrated Group for Client Web
        ]
      });
      
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// --- INDENT ROUTES ---

procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
  try {
    const indents = await Indent.find().sort({ createdAt: -1 });
    res.json(indents);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
  try {
    const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
    if (!indent) return res.status(404).json({ message: "Indent not found" });
    return res.json(indent);
  } catch (error) {
    res.status(500).json({ message: "Preview failed", error: error.message });
  }
});

procurementRoutes.post("/indents", adminOnly, async (req, res) => {
  try {
    const items = (req.body.items || []).map((item) => ({ ...item, ...packSnapshot(item) }));
    if (!items.length || items.some((item) => !(Number(item.orderedQty) > 0) || !packQuantityMatchesBase(item, item.orderedQty))) {
      return res.status(400).json({ message: "Add valid base-unit or pack quantities" });
    }
    const totalAmount = items.reduce(
      (sum, it) => sum + (Number(it.amount) || Number(it.orderedQty) * Number(it.unitPrice) || 0),
      0
    );
    const indent = await Indent.create({
      indentNo: `IND-${Date.now()}`,
      createdBy: req.user.sub,
      items,
      totalAmount
    });
    res.status(201).json(indent);
  } catch (error) {
    res.status(500).json({ message: "Indent creation failed", error: error.message });
  }
});

procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
  try {
    const indent = await Indent.findByIdAndUpdate(
      req.params.id, 
      { status: "purchased" }, 
      { new: true }
    );
    res.json(indent);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

// --- PURCHASE ORDER ROUTES ---

procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate({
        path: 'indentId',
        select: 'indentNo createdAt' 
      }) 
      .sort({ updatedAt: -1 }); 
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const items = (req.body.items || []).map((item) => ({ ...item, ...packSnapshot(item) }));
      if (!items.length || items.some((item) => Number(item.receivedQty) < 0 || !packQuantityMatchesBase(item, item.receivedQty))) {
        throw Object.assign(new Error("Enter valid base-unit or pack quantities"), { status: 400 });
      }
      const totalAmount = items.reduce(
        (sum, it) => sum + (Number(it.receivedQty) * Number(it.unitPrice) || 0),
        0
      );
      
      const po = await PurchaseOrder.create(
        [{ 
          indentId: req.body.indentId, 
          items,
          totalAmount,
          receivedAt: req.body.receivedAt || new Date(),
          status: "pending" 
        }], 
        { session }
      );

      await Indent.findByIdAndUpdate(
        req.body.indentId, 
        { status: "stock_received" }, 
        { session }
      );
      // Catalog prices are super-admin only (see catalog/productService.js); an admin's PO keeps its price on the PO and batches.
      const pricedLines = isSuperAdmin(req.user.role)
        ? items.filter((line) => Number(line.receivedQty) > 0 && isValidPrice(Number(line.unitPrice)))
        : [];
      for (const item of pricedLines) {
        const update = {
          $set: {
            pricePerUnit: Number(item.unitPrice),
            priceUpdatedAt: new Date(),
            priceUpdatedBy: req.user.sub,
          },
        };
        if (item.packId && isValidPrice(Number(item.packPrice))) {
          update.$set["packs.$[pack].price"] = Number(item.packPrice);
        }
        await StockItem.updateOne(
          { _id: item.stockItemId }, update,
          { session, ...(item.packId ? { arrayFilters: [{ "pack._id": item.packId }] } : {}) },
        );
      }
      created = po[0];
    });
    // Reply only after the commit, so a failed commit is never reported as created.
    res.status(201).json(created);
  } catch (error) {
    res.status(error.status || 500).json({ message: "PO Creation failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

// --- DISTRIBUTION & STOCK ROUTES ---

procurementRoutes.use(distributionRoutes);

/**
 * @route   GET /api/procurement/godown-stocks
 * @desc    Get all stocks across all godowns.
 * CRITICAL UPDATE: Multi-level population for Stock Group.
 */
procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
  try {
    const docs = await GodownStock.find()
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
        ]
      })
      .populate("godownId")
      .sort({ updatedAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch stocks failed", error: error.message });
  }
});

/**
 * @route   GET /api/procurement/godown-stocks/:godownId
 * @desc    Get stock for a specific godown.
 * CRITICAL UPDATE: Multi-level population for Stock Group.
 */
procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
  try {
    const docs = await GodownStock.find({ godownId: req.params.godownId })
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
        ]
      });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

procurementRoutes.get("/stock-batches", adminOnly, async (req, res) => {
  try {
    const filter = { remainingQtyBaseUnit: { $gt: 0 } };
    if (req.query.godownId) filter.godownId = req.query.godownId;
    if (req.query.stockItemId) filter.stockItemId = req.query.stockItemId;
    const batches = await StockBatch.find(filter)
      .populate("godownId", "name")
      .populate({ path: "stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol" } })
      .sort({ receivedAt: 1, _id: 1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: "Fetch batches failed", error: error.message });
  }
});

procurementRoutes.use(stockAdjustmentRoutes);

/**
 * @route   GET /api/procurement/purchase-orders/purchased-indents
 * @desc    Fetches all indents with a status of 'purchased'
 */
procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
  try {
    const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
    res.json(indents);
  } catch (error) {
    res.status(500).json({ message: "Fetch purchased indents failed", error: error.message });
  }
});
