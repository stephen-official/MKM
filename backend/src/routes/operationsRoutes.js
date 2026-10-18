import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
import { io } from "../realtime.js";
import { bodyItemIds, requireAvailableProducts, stockRecordItemIds } from "../catalog/productService.js";
import { isAvailable, missingFields } from "../catalog/completeness.js";
// CRITICAL: Explicitly import these so Mongoose registers the models for population
import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
import { isAdminRole, isKitchenRole } from "../utils/roles.js";
import { pricesForKitchen } from "../executive/valuation.js";
import { businessDateOf, normalizeBusinessDate } from "../executive/params.js";
import { round2 } from "../utils/money.js";
import { createStockBatch, deductFifo, restoreBatchAllocations, valuationFromAllocations } from "../stock/batchService.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { stripPrices } from "../utils/kitchenSafe.js";

export const operationsRoutes = express.Router();

const removeReturnedStock = async ({ item, godownId, stockItemId, stock, session }) => {
  let remaining = Math.abs(Number(item.qtyBaseUnit || 0));
  if (item.returnBatchId) {
    const batch = await StockBatch.findOne({ _id: item.returnBatchId, godownId, stockItemId }).session(session);
    if (batch) {
      const take = Math.min(remaining, Number(batch.remainingQtyBaseUnit || 0));
      batch.remainingQtyBaseUnit -= take;
      await batch.save({ session });
      remaining -= take;
    }
  }
  if (remaining > 1e-8) await deductFifo({ godownId, stockItemId, quantity: remaining, stock, session });
};

/**
 * SHARED UTILITY: Deep Population Config
 * Using explicit 'model' properties to prevent "General" fallback issues
 */
const deepPopulateItem = {
  path: "items.stockItemId",
  model: "StockItem",
  select: "name imageUrl unitId stockGroupId itemType",
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
};
// --- 1. KITCHEN STOCK FETCH ---
operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

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

  itemType: s.stockItemId?.itemType || "stock"
}));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
/** Adds unitPriceAtIssue/amountAtIssue to lines; `keep` maps stockItemId → an already-captured price. */
const priceLines = async (godownId, lines, keep = new Map()) => {
  let prices = new Map();
  try {
    prices = await pricesForKitchen(godownId, lines.filter((l) => !keep.has(String(l.stockItemId))).map((l) => l.stockItemId));
  } catch (error) {
    // Valuation is a nice-to-have at issue time: recording the consumption must not depend on it.
    // Lines are stored unpriced (null) and show up as unvalued lines in the report.
    console.error(`[consumption] PRICE_LOOKUP_FAILED godown=${godownId}: ${error.message}`);
  }
  return lines.map((line) => {
    const id = String(line.stockItemId);
    const unitPrice = keep.has(id) ? keep.get(id) : prices.get(id)?.price ?? null;
    const qty = Number(line.qtyBaseUnit);
    return {
      ...line,
      unitPriceAtIssue: unitPrice,
      amountAtIssue: unitPrice === null || !Number.isFinite(qty) ? null : round2(qty * unitPrice)
    };
  });
};

const handleStockProcessing = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const { items } = req.body;
      const godownId = isKitchenRole(req.user.role) ? req.user.godownId : req.body.godownId;

      if (!godownId) throw new Error("No godown associated with this request.");

      const orderItems = [];
      for (const item of items) {
        const updatedStock = await GodownStock.findOne({ 
          _id: item.stockRecordId, 
          godownId: godownId 
        }).session(session).populate("stockItemId");

        if (!updatedStock) throw new Error(`Item not found in inventory.`);

        const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
        if (qtyToDeduct > Number(updatedStock.qtyBaseUnit || 0)) {
          throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
        }
        const batchAllocations = await deductFifo({
          godownId, stockItemId: updatedStock.stockItemId._id,
          quantity: qtyToDeduct, stock: updatedStock, session,
        });
        updatedStock.qtyBaseUnit -= qtyToDeduct;
        await updatedStock.save({ session });

        // Low Stock Alert Logic
        if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
          const alert = {
            type: "low_stock_alert",
            severity: "critical",
            payload: {
              message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
              itemName: updatedStock.stockItemId.name,
              currentQty: updatedStock.qtyBaseUnit,
              threshold: updatedStock.thresholdBaseUnit,
              godownId,
              stockItemId: updatedStock.stockItemId._id
            }
          };
          await Notification.create([alert], { session });
          io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
        }

        orderItems.push({ 
          stockItemId: updatedStock.stockItemId._id, 
          qtyBaseUnit: qtyToDeduct,
          stockRecordId: updatedStock._id,
          batchAllocations,
          ...valuationFromAllocations(qtyToDeduct, batchAllocations),
        });
      }

      const consumption = await Consumption.create([{
        godownId,
        userId: req.user.sub, 
        date: req.body.date,
        items: orderItems
      }], { session });

      return consumption[0];
    });

    const populatedResult = await Consumption.findById(result._id)
      .populate("userId", "name")
      .populate("godownId", "name") 
      .populate(deepPopulateItem);

    res.status(201).json(populatedResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};

operationsRoutes.post("/orders", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);
operationsRoutes.post("/consumptions", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);




// ============================================================
// ADMIN - EDIT CONSUMPTION
// ============================================================
// Admin can change quantities or remove individual items.
//
// Stock synchronization:
// OLD 20 -> NEW 15  => +5 returned to GodownStock
// OLD 20 -> NEW 25  => -5 deducted from GodownStock
// OLD 20 -> DELETE  => +20 returned to GodownStock
// ============================================================

operationsRoutes.patch(
  "/consumptions/:id",
  authorize(["admin"]),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const { id } = req.params;
        const { items } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid consumption ID");
        }

        if (!Array.isArray(items)) {
          throw new Error("Items must be an array");
        }

        // ----------------------------------------------------
        // Find original consumption
        // ----------------------------------------------------
        const consumption = await Consumption.findById(id).session(session);

        if (!consumption) {
          throw new Error("Consumption record not found");
        }

        const godownId = consumption.godownId;

        // ----------------------------------------------------
        // Build OLD quantities
        // ----------------------------------------------------
        const oldItems = consumption.items || [];

        const oldMap = new Map();

        for (const oldItem of oldItems) {
          const stockItemId = oldItem.stockItemId?.toString();

          if (!stockItemId) continue;

          const oldQty = Number(oldItem.qtyBaseUnit || 0);

          oldMap.set(stockItemId, {
            qty: oldQty,
            stockRecordId: oldItem.stockRecordId || null
          });
        }

        // ----------------------------------------------------
        // Build NEW quantities
        // ----------------------------------------------------
        const newMap = new Map();

        for (const item of items) {
          if (!item.stockItemId) {
            throw new Error("Invalid stock item");
          }

          const stockItemId = item.stockItemId.toString();
          const qty = Number(item.qtyBaseUnit);

          if (!Number.isFinite(qty) || qty < 0) {
            throw new Error(
              `Invalid quantity for stock item ${stockItemId}`
            );
          }

          if (newMap.has(stockItemId)) {
            throw new Error(
              "The same stock item cannot appear more than once."
            );
          }

          newMap.set(stockItemId, {
            qty,
            stockRecordId: item.stockRecordId || null
          });
        }

        // ----------------------------------------------------
        // Get every affected stock item
        // ----------------------------------------------------
        // Migrated daily usage never deducted stock, so correcting it only rewrites history.
        if (consumption.sourceType === "migrated_daily_usage") {
          consumption.items = [...newMap].filter(([, data]) => data.qty > 0).map(([stockItemId, data]) => ({
            stockItemId, qtyBaseUnit: data.qty, unitPriceAtIssue: null, amountAtIssue: null, batchAllocations: [],
          }));
          await consumption.save({ session });
          return;
        }

        const affectedIds = new Set([
          ...oldMap.keys(),
          ...newMap.keys()
        ]);

        // ----------------------------------------------------
        // Synchronize Godown Stock
        // ----------------------------------------------------
        for (const stockItemId of affectedIds) {
          const oldData = oldMap.get(stockItemId);
          const newData = newMap.get(stockItemId);

          const oldQty = oldData?.qty || 0;
          const newQty = newData?.qty || 0;

          /*
            Consumption means stock was deducted.

            Example:

            Old consumption = 20
            New consumption = 15

            Difference = 20 - 15 = +5

            So 5 must be returned to stock.

            Old consumption = 20
            New consumption = 25

            Difference = 20 - 25 = -5

            So 5 must be deducted from stock.
          */

          const stockChange = oldQty - newQty;

          if (stockChange === 0) {
            continue;
          }

          let stock = null;

          // First try stockRecordId
          const stockRecordId =
            oldData?.stockRecordId ||
            newData?.stockRecordId;

          if (
            stockRecordId &&
            mongoose.Types.ObjectId.isValid(stockRecordId.toString())
          ) {
            stock = await GodownStock.findOne({
              _id: stockRecordId,
              godownId
            }).session(session);
          }

          // Fallback: godown + stock item
          if (!stock) {
            stock = await GodownStock.findOne({
              godownId,
              stockItemId
            }).session(session);
          }

          // --------------------------------------------------
          // Stock record should exist
          // --------------------------------------------------
          if (!stock) {
            throw new Error(
              `Stock record not found for stock item ${stockItemId}`
            );
          }

          // stockChange can be positive or negative
          const newStockQty =
            Number(stock.qtyBaseUnit || 0) + stockChange;

          // Never allow negative stock
          if (newStockQty < 0) {
            const stockItem = await StockItem.findById(stockItemId)
              .select("name")
              .session(session);

            throw new Error(
              `Insufficient stock for ${
                stockItem?.name || "selected item"
              }. Available: ${
                stock.qtyBaseUnit
              }, additional required: ${
                Math.abs(stockChange)
              }`
            );
          }

          stock.qtyBaseUnit = newStockQty;

          await stock.save({ session });
        }

        // ----------------------------------------------------
        // Save new consumption items
        // ----------------------------------------------------
        // Restore the original batch allocations, then apply the edited lines through FIFO again.
        const originalPrices = new Map();
        for (const old of oldItems) {
          const key = String(old.stockItemId);
          if (!originalPrices.has(key) || (originalPrices.get(key) === null && old.unitPriceAtIssue != null)) {
            originalPrices.set(key, old.unitPriceAtIssue ?? null);
          }
        }
        // Lines whose quantity did not change keep their recorded allocations and never touch stock,
        // so an edit still works when another line's stock row has since been removed.
        // Legacy records can hold several lines for one item; those are merged, so they never count as unchanged.
        const oldLineCount = new Map();
        for (const old of oldItems) oldLineCount.set(String(old.stockItemId), (oldLineCount.get(String(old.stockItemId)) || 0) + 1);
        const unchanged = new Map(oldItems
          .filter((old) => oldLineCount.get(String(old.stockItemId)) === 1
            && newMap.get(String(old.stockItemId))?.qty === Number(old.qtyBaseUnit || 0))
          .map((old) => [String(old.stockItemId), old]));
        for (const old of oldItems) {
          const oldQuantity = Number(old.qtyBaseUnit || 0);
          if (unchanged.has(String(old.stockItemId))) continue;
          if (oldQuantity > 0) {
            await restoreBatchAllocations({
              godownId, stockItemId: old.stockItemId,
              allocations: old.batchAllocations, quantity: oldQuantity,
              unitPrice: old.unitPriceAtIssue, session,
            });
          } else if (oldQuantity < 0) {
            const stock = await GodownStock.findOne({ godownId, stockItemId: old.stockItemId }).session(session);
            await removeReturnedStock({ item: old, godownId, stockItemId: old.stockItemId, stock, session });
          }
        }
        const replacementLines = [];
        for (const item of items.filter((entry) => Number(entry.qtyBaseUnit) !== 0)) {
          const kept = unchanged.get(String(item.stockItemId));
          if (kept) {
            replacementLines.push(kept.toObject());
            continue;
          }
          const stock = await GodownStock.findOne({ godownId, stockItemId: item.stockItemId }).session(session);
          const quantity = Number(item.qtyBaseUnit);
          const existingPrice = originalPrices.get(String(item.stockItemId));
          let batchAllocations = [];
          let valuation;
          if (quantity > 0) {
            batchAllocations = await deductFifo({ godownId, stockItemId: item.stockItemId, quantity, stock, session });
            const batchValuation = valuationFromAllocations(quantity, batchAllocations);
            valuation = originalPrices.has(String(item.stockItemId))
              ? { unitPriceAtIssue: existingPrice, amountAtIssue: existingPrice == null ? null : round2(quantity * existingPrice) }
              : batchValuation;
          } else {
            const [priced] = originalPrices.has(String(item.stockItemId))
              ? [{ unitPriceAtIssue: existingPrice, amountAtIssue: existingPrice == null ? null : round2(quantity * existingPrice) }]
              : await priceLines(godownId, [{ stockItemId: item.stockItemId, qtyBaseUnit: quantity }]);
            valuation = { unitPriceAtIssue: priced.unitPriceAtIssue, amountAtIssue: priced.amountAtIssue };
            const returnBatch = await createStockBatch({
              godownId, stockItemId: item.stockItemId, quantity: Math.abs(quantity),
              unitPrice: valuation.unitPriceAtIssue, sourceType: "return", createdBy: req.user.sub, session,
            });
            item.returnBatchId = returnBatch._id;
          }
          replacementLines.push({
            stockItemId: item.stockItemId, qtyBaseUnit: quantity,
            stockRecordId: item.stockRecordId || undefined, batchAllocations,
            returnBatchId: item.returnBatchId || undefined,
            ...valuation,
          });
        }
        consumption.items = replacementLines;

        await consumption.save({ session });
      });

      // ------------------------------------------------------
      // Get updated/populated record
      // ------------------------------------------------------
      const updatedConsumption = await Consumption.findById(req.params.id)
        .populate("userId", "name")
        .populate("godownId", "name")
        .populate(deepPopulateItem);

      // ------------------------------------------------------
      // Notify client applications
      // ------------------------------------------------------
      io.to(updatedConsumption.godownId._id.toString()).emit(
        "consumption_updated",
        stripPrices(updatedConsumption)
      );

      io.to("admins").emit(
        "consumption_updated",
        updatedConsumption
      );

      res.json(updatedConsumption);

    } catch (error) {
      console.error("UPDATE CONSUMPTION ERROR:");
      console.error(error);

      res.status(400).json({
        error: error.message || "Failed to update consumption"
      });

    } finally {
      await session.endSession();
    }
  }
);


// ============================================================
// ADMIN - DELETE CONSUMPTION
// ============================================================
// Deletes the consumption record and returns ALL consumed
// quantities back to GodownStock.
// ============================================================

operationsRoutes.delete(
  "/consumptions/:id",
  authorize(["admin"]),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let deletedConsumption;

      await session.withTransaction(async () => {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid consumption ID");
        }

        // ----------------------------------------------------
        // Find consumption
        // ----------------------------------------------------
        const consumption = await Consumption.findById(id)
          .session(session);

        if (!consumption) {
          throw new Error("Consumption record not found");
        }

        const godownId = consumption.godownId;

        // ----------------------------------------------------
        // Return every consumed quantity to stock
        // (migrated daily usage never deducted any, so it returns nothing)
        // ----------------------------------------------------
        const linesToReturn = consumption.sourceType === "migrated_daily_usage" ? [] : consumption.items || [];
        for (const item of linesToReturn) {
          const stockItemId = item.stockItemId;
          const qtyToReturn = Number(item.qtyBaseUnit || 0);

          if (!stockItemId || qtyToReturn === 0) {
            continue;
          }

          let stock = null;

          // Try stored stockRecordId first
          if (
            item.stockRecordId &&
            mongoose.Types.ObjectId.isValid(
              item.stockRecordId.toString()
            )
          ) {
            stock = await GodownStock.findOne({
              _id: item.stockRecordId,
              godownId
            }).session(session);
          }

          // Fallback
          if (!stock) {
            stock = await GodownStock.findOne({
              godownId,
              stockItemId
            }).session(session);
          }

          if (!stock) {
            throw new Error(
              `Stock record not found for stock item ${stockItemId}`
            );
          }

          const nextQuantity = Number(stock.qtyBaseUnit || 0) + qtyToReturn;
          if (nextQuantity < 0) throw new Error("Insufficient stock to reverse this return");
          stock.qtyBaseUnit = nextQuantity;

          await stock.save({ session });
          if (qtyToReturn > 0) {
            await restoreBatchAllocations({
              godownId, stockItemId, allocations: item.batchAllocations,
              quantity: qtyToReturn, unitPrice: item.unitPriceAtIssue, session,
            });
          } else {
            await removeReturnedStock({ item, godownId, stockItemId, stock, session });
          }
        }

        // ----------------------------------------------------
        // Delete consumption
        // ----------------------------------------------------
        deletedConsumption = {
          stockRestored: linesToReturn.length > 0,
          _id: consumption._id,
          godownId: consumption.godownId,
          userId: consumption.userId
        };

        await Consumption.deleteOne({
          _id: consumption._id
        }).session(session);
      });

      // ------------------------------------------------------
      // Notify clients immediately
      // ------------------------------------------------------
      io.to(deletedConsumption.godownId.toString()).emit(
        "consumption_deleted",
        {
          consumptionId: deletedConsumption._id,
          godownId: deletedConsumption.godownId
        }
      );

      io.to("admins").emit(
        "consumption_deleted",
        {
          consumptionId: deletedConsumption._id,
          godownId: deletedConsumption.godownId
        }
      );

      res.json({
        message: deletedConsumption.stockRestored ? "Consumption deleted and stock restored" : "Consumption deleted",
        consumptionId: deletedConsumption._id
      });

    } catch (error) {
      console.error("DELETE CONSUMPTION ERROR:");
      console.error(error);

      res.status(400).json({
        error: error.message || "Failed to delete consumption"
      });

    } finally {
      await session.endSession();
    }
  }
);


operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
  try {
    const consumptions = await Consumption.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });
    res.json(consumptions);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
  try {
    const data = await Consumption.find({ userId: req.user.sub })
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem) 
      .sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. REQUESTS (WORKFLOW) ---
operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = isAdminRole(req.user.role) ? {} : { userId: req.user.sub };
    const requests = await Request.find(filter)
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem) 
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

operationsRoutes.post("/requests", authorize(["user"]), requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const created = await Request.create({ 
      ...req.body, 
      requestType: "usage",
      userId: req.user.sub, 
      godownId: req.user.godownId, 
      status: "pending" 
    });
    
    const notification = await Notification.create({ 
      type: "request_created", 
      severity: "info", 
      payload: { 
        message: `New consumption request created`,
        requestId: created._id,
        godownId: req.user.godownId 
      } 
    });

    io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let approvedRequest;
    await session.withTransaction(async () => {
      const request = await Request.findById(req.params.id).session(session);
      if (!request) throw new Error("Request not found");
      if (request.status !== "pending") throw new Error("Request already processed");

      const batchLines = [];
      for (const item of request.items) {
        const quantity = Number(item.qtyBaseUnit);
        if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Invalid request quantity");
        let stock = await GodownStock.findOne({ godownId: request.godownId, stockItemId: item.stockItemId }).session(session);
        if (!stock && quantity > 0) throw new Error("Insufficient kitchen stock for one or more items");
        if (!stock) stock = new GodownStock({ godownId: request.godownId, stockItemId: item.stockItemId, qtyBaseUnit: 0, thresholdBaseUnit: 0 });
        if (quantity > 0) {
          if (Number(stock.qtyBaseUnit) < quantity) throw new Error("Insufficient kitchen stock for one or more items");
          const batchAllocations = await deductFifo({ godownId: request.godownId, stockItemId: item.stockItemId, quantity, stock, session });
          stock.qtyBaseUnit -= quantity;
          batchLines.push({ stockItemId: item.stockItemId, qtyBaseUnit: quantity, batchAllocations, ...valuationFromAllocations(quantity, batchAllocations) });
        } else {
          const returned = Math.abs(quantity);
          const [pricedReturn] = await priceLines(request.godownId, [{ stockItemId: item.stockItemId, qtyBaseUnit: quantity }]);
          stock.qtyBaseUnit += returned;
          const returnBatch = await createStockBatch({ godownId: request.godownId, stockItemId: item.stockItemId, quantity: returned, unitPrice: pricedReturn.unitPriceAtIssue, sourceType: "return", createdBy: req.user.sub, session });
          batchLines.push({ ...pricedReturn, returnBatchId: returnBatch._id, batchAllocations: [] });
        }
        await stock.save({ session });
      }

      // A future target date would fall outside every valid report range; the stock moves today.
      const approvedAt = new Date();
      const today = businessDateOf(approvedAt);
      const target = normalizeBusinessDate(request.targetDate, approvedAt);
      const date = target > today ? today : target;
      const record = {
        godownId: request.godownId,
        userId: request.userId,
        date,
        reason: request.reason,
        sourceType: "request",
        items: batchLines,
      };
      await Consumption.create([record], { session });

      request.status = "approved";
      request.adminDecision = req.body.note || "Approved";
      approvedRequest = await request.save({ session });
    });
    io.to(approvedRequest.godownId.toString()).emit("request_approved", { requestId: approvedRequest._id });
    res.json({ message: "Status updated and Godown stock synced" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
  try {
    const request = await Request.findByIdAndUpdate(req.params.id, { 
      status: "rejected", 
      adminDecision: req.body.note || "Rejected" 
    }, { new: true });
    
    io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



operationsRoutes.get(
"/user-transfers/incoming",
authorize(["user"]),
async(req,res)=>{

const transfers = await Transfer.find({
  toGodownId: req.user.godownId,
  status: "pending"
})
.populate("fromGodownId","name")
.populate("toGodownId","name")
.populate(deepPopulateItem)
.sort({createdAt:-1});

res.json(transfers);

});


operationsRoutes.post(
"/user-transfers/:id/accept",
authorize(["user"]),
async(req,res)=>{

const session=await mongoose.startSession();

try{

await session.withTransaction(async()=>{

const transfer=await Transfer.findById(req.params.id)
.session(session);

if(!transfer)
throw new Error("Transfer not found");

if(transfer.status!=="pending")
throw new Error("Already processed");

if(
transfer.toGodownId.toString()!==req.user.godownId.toString()
){
throw new Error("Not allowed");
}

for(const item of transfer.items){
if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
    throw new Error("Invalid transfer quantity");
}
const source=await GodownStock.findOne({

godownId:transfer.fromGodownId,

stockItemId:item.stockItemId

}).session(session);

if(!source)
throw new Error("Source stock missing");

if(source.qtyBaseUnit<item.qtyBaseUnit)
throw new Error("Insufficient stock");

const batchAllocations = await deductFifo({
  godownId: transfer.fromGodownId,
  stockItemId: item.stockItemId,
  quantity: item.qtyBaseUnit,
  stock: source,
  session
});
source.qtyBaseUnit-=item.qtyBaseUnit;

await source.save({session});

await GodownStock.findOneAndUpdate(
{
    godownId: transfer.toGodownId,
    stockItemId: item.stockItemId
},
{
    $inc:{
        qtyBaseUnit:item.qtyBaseUnit
    },
    $setOnInsert:{
        godownId: transfer.toGodownId,
        stockItemId: item.stockItemId,
        thresholdBaseUnit:0
    }
},
{
    upsert:true,
    new:true,
    session
}
);

for (const allocation of batchAllocations) {
  await createStockBatch({
    godownId: transfer.toGodownId,
    stockItemId: item.stockItemId,
    quantity: allocation.qtyBaseUnit,
    unitPrice: allocation.unitPrice,
    sourceType: "transfer",
    sourceId: transfer._id,
    receivedAt: new Date(),
    expiryDate: allocation.expiryDate,
    lotNumber: allocation.lotNumber,
    condition: allocation.condition,
    notes: allocation.notes,
    createdBy: req.user.sub,
    session
  });
}
item.batchAllocations = batchAllocations;

}

transfer.status="accepted";

transfer.acceptedBy=req.user.sub;

transfer.acceptedAt=new Date();

await transfer.save({session});
io.to(transfer.fromGodownId.toString()).emit(
    "transfer_accepted",
    stripPrices(transfer)
);

});

res.json({
message:"Transfer Accepted"
});

}catch(err){

res.status(400).json({
error:err.message
});

}finally{

session.endSession();

}

});





operationsRoutes.get("/transfers", authorize(["admin", "user"]), async (req, res) => {
  try {
    let filter = {};

if (isKitchenRole(req.user.role)) {
  filter = {
    $or: [
      { fromGodownId: req.user.godownId },
      { toGodownId: req.user.godownId }
    ]
  };
}

const transfers = await Transfer.find(filter)
      .populate("fromGodownId", "name")
      .populate("toGodownId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



operationsRoutes.post(
  "/transfers",
  authorize(["admin", "user"]),
  requireAvailableProducts(bodyItemIds),
  async (req, res) => {
    try {

      const {
        fromGodownId,
        toGodownId,
        items
      } = req.body;

      const sourceGodownId =
  isAdminRole(req.user.role)
    ? fromGodownId
    : req.user.godownId;

      if (!fromGodownId || !toGodownId)
        return res.status(400).json({
          error: "Source and Destination required"
        });

      if (sourceGodownId.toString() === toGodownId.toString())
        return res.status(400).json({
          error: "Cannot transfer to same godown"
        });

      if (!items || items.length === 0)
        return res.status(400).json({
          error: "No items selected"
        });

      for (const item of items) {

       const stock = await GodownStock.findOne({
  godownId: sourceGodownId,
  stockItemId: item.stockItemId
});

        if (!stock)
          return res.status(400).json({
            error: "Stock not found"
          });

        if (stock.qtyBaseUnit < item.qtyBaseUnit)
          return res.status(400).json({
            error: "Insufficient stock"
          });

      }

      const transfer = await Transfer.create({

  fromGodownId: sourceGodownId,

  toGodownId,

  createdBy: req.user.sub,

  items,

  status: "pending"

});

      io.to(toGodownId.toString()).emit(
        "new_transfer",
        stripPrices(transfer)
      );

      res.status(201).json(transfer);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
  }
);



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


operationsRoutes.post(
"/user-transfers/:id/reject",
authorize(["user"]),
async(req,res)=>{

const transfer=await Transfer.findById(req.params.id);

if(!transfer)
return res.status(404).json({error:"Not found"});

if (
    transfer.toGodownId.toString() !== req.user.godownId.toString()
) {
    return res.status(403).json({
        error: "Not allowed"
    });
}

transfer.status = "rejected";
transfer.rejectedAt = new Date();

await transfer.save();

io.to(transfer.fromGodownId.toString()).emit(
    "transfer_rejected",
    stripPrices(transfer)
);

res.json({
message:"Rejected"
});

});





operationsRoutes.get(
"/user-transfers/history",
authorize(["user"]),
async(req,res)=>{

const transfers=await Transfer.find({

$or:[

{fromGodownId:req.user.godownId},

{toGodownId:req.user.godownId}

]

})
.populate("fromGodownId","name")
.populate("toGodownId","name")
.populate(deepPopulateItem)
.sort({createdAt:-1});

res.json(transfers);

});




operationsRoutes.post(
"/user-transfers",
authorize(["user"]),
requireAvailableProducts(bodyItemIds),
async (req,res)=>{

console.log("BODY");
console.log(req.body);

console.log("USER");
console.log(req.user);

// Validation
if (!req.body.toGodownId) {
    return res.status(400).json({
        error: "Destination godown is required"
    });
}

if (
    req.user.godownId.toString() ===
    req.body.toGodownId.toString()
) {
    return res.status(400).json({
        error: "Cannot transfer to the same godown"
    });
}

if (!req.body.items || req.body.items.length === 0) {
    return res.status(400).json({
        error: "Transfer cart is empty"
    });
}

for (const item of req.body.items) {

    if (!item.stockItemId) {
        return res.status(400).json({
            error: "Invalid stock item"
        });
    }

    if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
        return res.status(400).json({
            error: "Transfer quantity must be greater than zero"
        });
    }

    const stock = await GodownStock.findOne({
        godownId: req.user.godownId,
        stockItemId: item.stockItemId
    });

    if (!stock) {
        return res.status(400).json({
            error: "Stock record not found"
        });
    }

    if (stock.qtyBaseUnit < item.qtyBaseUnit) {
        return res.status(400).json({
          error: "Insufficient stock available for one of the selected items."  
        });
    }
}

const transfer = await Transfer.create({

    fromGodownId: req.user.godownId,

    toGodownId: req.body.toGodownId,

    createdBy: req.user.sub,

    items: req.body.items,

    status: "pending"

});
io.to(req.body.toGodownId.toString()).emit(
    "new_transfer",
    stripPrices(transfer)
);
console.log("TRANSFER SAVED");
console.log(transfer);

res.status(201).json(transfer);

});

