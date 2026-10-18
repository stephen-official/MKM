import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { 
  Distribution, 
  GodownStock, 
  Indent, 
  Notification, 
  PurchaseOrder 
} from "../models/FlowModels.js";
import { packQuantityMatchesBase, packSnapshot } from "../catalog/packaging.js";
import { createStockBatch } from "../stock/batchService.js";
import { Godown, StockItem } from "../models/InventoryModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { OpeningBalance } from "../models/OpeningBalanceModel.js";
import { isValidPrice } from "../catalog/completeness.js";

export const procurementRoutes = express.Router();
const adminOnly = authorize(["admin"]);
const superAdminOnly = authorize(["super_admin"]);
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
      for (const item of items.filter((line) => Number(line.receivedQty) > 0 && Number(line.unitPrice) >= 0)) {
        const update = {
          $set: {
            pricePerUnit: Number(item.unitPrice),
            priceUpdatedAt: new Date(),
            priceUpdatedBy: req.user.sub,
          },
        };
        if (item.packId && Number(item.packPrice) >= 0) {
          update.$set["packs.$[pack].price"] = Number(item.packPrice);
        }
        await StockItem.updateOne(
          { _id: item.stockItemId }, update,
          { session, ...(item.packId ? { arrayFilters: [{ "pack._id": item.packId }] } : {}) },
        );
      }
      
      res.status(201).json(po[0]);
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: "PO Creation failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

// --- DISTRIBUTION & STOCK ROUTES ---

procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
  const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
  const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

  try {
    if ((allocations || []).some((item) => !(Number(item.qtyBaseUnit) > 0) || !packQuantityMatchesBase(item, item.qtyBaseUnit))) {
      return res.status(400).json({ message: "Enter valid base-unit or pack allocation quantities" });
    }
    await session.withTransaction(async () => {
      const distribution = await Distribution.create(
        [{ 
          purchaseOrderId: cleanPOId, 
          leftoverSourceId: cleanLeftoverId, 
          allocations: (allocations || []).map((item) => ({ ...item, ...packSnapshot(item) })),
          leftovers: leftovers || [] 
        }], 
        { session }
      );

      const po = cleanPOId ? await PurchaseOrder.findById(cleanPOId).session(session) : null;

      for (const item of (allocations || [])) {
        await GodownStock.findOneAndUpdate(
          { godownId: item.godownId, stockItemId: item.stockItemId },
          { 
            $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
            $setOnInsert: { thresholdBaseUnit: 0 } 
          },
          { upsert: true, session }
        );
        await createStockBatch({
          godownId: item.godownId,
          stockItemId: item.stockItemId,
          quantity: item.qtyBaseUnit,
          unitPrice: item.unitPrice,
          sourceType: "distribution",
          sourceId: distribution[0]._id,
          receivedAt: po?.receivedAt || new Date(),
          createdBy: req.user.sub,
          session,
        });
      }

      if (cleanPOId) {
        await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
      }

      if (cleanLeftoverId) {
        await Distribution.findOneAndUpdate(
          { _id: cleanLeftoverId },
          { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
          { session }
        );
      }

      res.status(201).json(distribution[0]);
    });
  } catch (error) {
    res.status(500).json({ message: "Distribution failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

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

procurementRoutes.post("/opening-balances", superAdminOnly, async (req, res) => {
  const { godownId, stockItemId, quantityBaseUnit, effectiveDate, reason } = req.body || {};
  const quantity = Number(quantityBaseUnit);
  const cleanReason = String(reason || "").trim();
  const effectiveAt = /^\d{4}-\d{2}-\d{2}$/.test(String(effectiveDate || ""))
    ? new Date(`${effectiveDate}T00:00:00.000Z`)
    : null;
  const validEffectiveDate = effectiveAt && !Number.isNaN(effectiveAt.getTime())
    && effectiveAt.toISOString().slice(0, 10) === effectiveDate;

  if (!mongoose.isValidObjectId(godownId) || !mongoose.isValidObjectId(stockItemId)) {
    return res.status(400).json({ message: "Choose a valid kitchen and product" });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Opening quantity must be greater than zero" });
  }
  if (!validEffectiveDate || effectiveAt > new Date()) {
    return res.status(400).json({ message: "Effective date must be today or earlier" });
  }
  if (cleanReason.length < 3 || cleanReason.length > 500) {
    return res.status(400).json({ message: "Reason must be between 3 and 500 characters" });
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const [godown, product, stock, priorBatch, priorOpening] = await Promise.all([
        Godown.findOne({ _id: godownId, active: true }).session(session),
        StockItem.findOne({ _id: stockItemId, archived: { $ne: true } }).populate("unitId", "symbol").session(session),
        GodownStock.findOne({ godownId, stockItemId }).session(session),
        StockBatch.exists({ godownId, stockItemId }).session(session),
        OpeningBalance.exists({ godownId, stockItemId }).session(session),
      ]);
      if (!godown) throw Object.assign(new Error("Active kitchen not found"), { status: 404 });
      if (!product) throw Object.assign(new Error("Active product not found"), { status: 404 });
      if (!isValidPrice(product.pricePerUnit)) {
        throw Object.assign(new Error("Set the product price before entering its opening balance"), { status: 409 });
      }
      if (stock || priorBatch || priorOpening) {
        throw Object.assign(new Error("This kitchen and product already has stock history; use a stock adjustment workflow instead"), { status: 409 });
      }

      const [stockRecord] = await GodownStock.create([{
        godownId, stockItemId, qtyBaseUnit: quantity,
        thresholdBaseUnit: Number(product.defaultThreshold || 0),
      }], { session });
      const batch = await createStockBatch({
        godownId, stockItemId, quantity, unitPrice: product.pricePerUnit,
        sourceType: "opening_balance", receivedAt: effectiveAt,
        notes: cleanReason, condition: "good", createdBy: req.user.sub, session,
      });
      const [openingBalance] = await OpeningBalance.create([{
        godownId, stockItemId, stockRecordId: stockRecord._id, batchId: batch._id,
        quantityBaseUnit: quantity, unitPrice: product.pricePerUnit,
        effectiveAt, reason: cleanReason, createdBy: req.user.sub,
      }], { session });
      result = { openingBalance, stock: stockRecord, batch };
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "An opening balance already exists for this kitchen and product" });
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Opening balance failed", ...(error.status ? {} : { error: error.message }) });
  } finally {
    await session.endSession();
  }
});

// --- LOGS & ANALYTICS ---

procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
  try {
    const logs = await Distribution.find()
      .populate({
        path: "purchaseOrderId",
        populate: { path: "indentId", select: "indentNo" }
      })
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Fetch logs failed", error: error.message });
  }
});

procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
  try {
    const distribution = await Distribution.findById(req.params.id)
      .populate({ path: "allocations.stockItemId", select: "name" })
      .populate({ path: "allocations.godownId", select: "name" });

    if (!distribution) return res.status(404).json({ message: "Log not found" });

    const logs = distribution.allocations.map((item) => ({
      itemId: item.stockItemId?._id,
      itemName: item.stockItemId?.name || "Unknown Item",
      destination: item.godownId?.name || "Direct Delivery",
      quantity: item.qtyBaseUnit,
    }));

    res.json({ distributionId: distribution._id, logs });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch details", error: error.message });
  }
});

procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
  try {
    const docs = await Distribution.find().sort({ createdAt: -1 });
    const leftovers = docs.flatMap((d) => 
      d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
    );
    res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
  } catch (error) {
    res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
  }
});

// --- SETTINGS & DELETION ---

procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
  try {
    const stock = await GodownStock.findByIdAndUpdate(
      req.params.id, 
      { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
      { new: true }
    );
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Threshold update failed", error: error.message });
  }
});

procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
  console.log("DELETE route hit:", req.params.id);

  try {
    const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);

    if (!deletedStock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    res.json({
      success: true,
      message: "Stock item removed"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message
    });
  }
});





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
