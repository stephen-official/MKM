import mongoose from "mongoose";
import { GodownStock } from "../../models/FlowModels.js";
import { Godown, StockItem } from "../../models/InventoryModels.js";
import { StockBatch } from "../../models/StockBatchModel.js";
import { OpeningBalance } from "../../models/OpeningBalanceModel.js";
import { isValidPrice } from "../../catalog/completeness.js";
import { createStockBatch } from "../../stock/batchService.js";
import { parseOpeningDate } from "../../stock/openingDate.js";
import { fail } from "../../shared/httpErrors.js";

export const openingBalanceInput = (input) => {
  const { godownId, stockItemId, quantityBaseUnit, effectiveDate, reason } = input || {};
  const quantity = Number(quantityBaseUnit);
  const cleanReason = String(reason || "").trim();
  const effectiveAt = parseOpeningDate(String(effectiveDate || ""));
  if (!mongoose.isValidObjectId(godownId) || !mongoose.isValidObjectId(stockItemId)) throw fail(400, "Choose a valid kitchen and product");
  if (!Number.isFinite(quantity) || quantity <= 0) throw fail(400, "Opening quantity must be greater than zero");
  if (!effectiveAt) throw fail(400, "Effective date must be today or earlier");
  if (cleanReason.length < 3 || cleanReason.length > 500) throw fail(400, "Reason must be between 3 and 500 characters");
  return { godownId, stockItemId, quantity, cleanReason, effectiveAt };
};

/** Creates the stock row, batch and audit together inside the caller's transaction. */
export const recordOpeningBalance = async ({ input, actor, session }) => {
  const { godownId, stockItemId, quantity, cleanReason, effectiveAt } = input;
  // One operation at a time: MongoDB does not support parallel operations inside a transaction.
  const godown = await Godown.findOne({ _id: godownId, active: true }).session(session);
  const product = await StockItem.findOne({ _id: stockItemId, archived: { $ne: true } }).populate("unitId", "symbol").session(session);
  const stock = await GodownStock.findOne({ godownId, stockItemId }).session(session);
  const priorBatch = await StockBatch.exists({ godownId, stockItemId }).session(session);
  const priorOpening = await OpeningBalance.exists({ godownId, stockItemId }).session(session);
  if (!godown) throw fail(404, "Active kitchen not found");
  if (!product) throw fail(404, "Active product not found");
  if (!isValidPrice(product.pricePerUnit)) throw fail(409, "Set the product price before entering its opening balance");
  if (stock || priorBatch || priorOpening) throw fail(409, "This kitchen and product already has stock history; use a stock adjustment workflow instead");
  const [stockRecord] = await GodownStock.create([{
    godownId, stockItemId, qtyBaseUnit: quantity, thresholdBaseUnit: Number(product.defaultThreshold || 0),
  }], { session });
  const batch = await createStockBatch({
    godownId, stockItemId, quantity, unitPrice: product.pricePerUnit,
    sourceType: "opening_balance", receivedAt: effectiveAt, notes: cleanReason,
    condition: "good", createdBy: actor.sub, session,
  });
  const [openingBalance] = await OpeningBalance.create([{
    godownId, stockItemId, stockRecordId: stockRecord._id, batchId: batch._id,
    quantityBaseUnit: quantity, unitPrice: product.pricePerUnit,
    effectiveAt, reason: cleanReason, createdBy: actor.sub,
  }], { session });
  return { openingBalance, stock: stockRecord, batch };
};

export const changeStockThreshold = ({ stockRecordId, thresholdBaseUnit, session }) => GodownStock.findByIdAndUpdate(
  stockRecordId, { thresholdBaseUnit }, { new: true, session },
);

/** Removes the balance and empties its batches in the same transaction, keeping batch history. */
export const removeStockRecord = async ({ stockRecordId, session }) => {
  const deletedStock = await GodownStock.findByIdAndDelete(stockRecordId, { session });
  if (!deletedStock) return null;
  await StockBatch.updateMany(
    { godownId: deletedStock.godownId, stockItemId: deletedStock.stockItemId, remainingQtyBaseUnit: { $gt: 0 } },
    { $set: { remainingQtyBaseUnit: 0 } },
    { session },
  );
  return deletedStock;
};
