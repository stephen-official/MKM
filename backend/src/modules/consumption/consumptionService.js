import mongoose from "mongoose";
import { Consumption, GodownStock, Notification } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { StockBatch } from "../../models/StockBatchModel.js";
import { io } from "../../realtime.js";
import { createStockBatch, deductFefo, restoreBatchAllocations, valuationFromAllocations } from "../../stock/batchService.js";
import { round2 } from "../../utils/money.js";
import { priceLines } from "./consumptionValuation.js";

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
  if (remaining > 1e-8) await deductFefo({ godownId, stockItemId, quantity: remaining, stock, session });
};

/** Sends low-stock alerts collected by recordConsumption; call only after the transaction commits. */
export const emitLowStockAlerts = (alerts) => {
  for (const alert of alerts) io.to(alert.payload.godownId.toString()).to("admins").emit("low_stock_alert", alert);
};

/**
 * Records usage inside `session`: deducts stock (FEFO), saves low-stock notifications and the record. Shared with
 * correction approvals. Alerts are pushed onto `alerts` for the caller to emit after commit (emitLowStockAlerts),
 * so a rolled-back or retried transaction sends nothing.
 */
export const recordConsumption = async ({ godownId, userId, date, items, session, alerts }) => {
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
        const batchAllocations = await deductFefo({
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
          alerts.push(alert);
        }

        // The pack the cook counted in, kept as a snapshot when it agrees with the base quantity.
        const packSize = Number(item.packSize);
        const packQuantity = Number(item.packQuantity);
        const pack = item.packId && packSize > 0 && packQuantity > 0 && Math.abs(packSize * packQuantity - qtyToDeduct) < 1e-6
          ? { packId: item.packId, packName: String(item.packName || ""), packSize, packQuantity }
          : {};
        orderItems.push({
          stockItemId: updatedStock.stockItemId._id,
          qtyBaseUnit: qtyToDeduct,
          stockRecordId: updatedStock._id,
          ...pack,
          batchAllocations,
          ...valuationFromAllocations(qtyToDeduct, batchAllocations),
        });
      }

      const consumption = await Consumption.create([{
        godownId,
        userId,
        date,
        items: orderItems
      }], { session });

      return consumption[0];
};

/** Replaces a usage record's lines inside `session` and moves stock by the difference. Shared with correction approvals. */
export const applyConsumptionEdit = async ({ consumption, items, userId, session }) => {
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
        // Restore the original batch allocations, then apply the edited lines through FEFO again.
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
            batchAllocations = await deductFefo({ godownId, stockItemId: item.stockItemId, quantity, stock, session });
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
              unitPrice: valuation.unitPriceAtIssue, sourceType: "return", createdBy: userId, session,
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
};

/** Deletes a usage record inside `session`, returning every consumed quantity to stock. Shared with correction approvals. */
export const removeConsumption = async ({ consumption, session }) => {
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
        const deleted = {
          stockRestored: linesToReturn.length > 0,
          _id: consumption._id,
          godownId: consumption.godownId,
          userId: consumption.userId
        };

        await Consumption.deleteOne({
          _id: consumption._id
        }).session(session);
        return deleted;
};
