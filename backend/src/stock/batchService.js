import mongoose from "mongoose";
import { StockBatch } from "../models/StockBatchModel.js";
import { round2 } from "../utils/money.js";
import { pricesForKitchen } from "../executive/valuation.js";

const EPSILON = 1e-8;
const validPrice = (value) => value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

export const createStockBatch = async ({
  godownId, stockItemId, quantity, unitPrice = null, sourceType, sourceId = null,
  receivedAt = new Date(), expiryDate = null, lotNumber = "", condition = "unchecked",
  notes = "", expectedQtyBaseUnit = null, createdBy = null, session,
  trackingId = null, mfgDate = null, storage = null, photos = null, supplierName = "", supplierFssaiLicence = "",
}) => {
  const qty = Number(quantity);
  if (!(qty > 0)) throw new Error("Batch quantity must be greater than zero");
  const [batch] = await StockBatch.create([{
    godownId, stockItemId, sourceType, sourceId, receivedAt, expiryDate: expiryDate || null,
    lotNumber: String(lotNumber || "").trim(), condition, notes: String(notes || "").trim(),
    expectedQtyBaseUnit: expectedQtyBaseUnit == null ? null : Number(expectedQtyBaseUnit),
    receivedQtyBaseUnit: qty, remainingQtyBaseUnit: qty,
    unitPrice: validPrice(unitPrice) ? Number(unitPrice) : null, createdBy,
    trackingId, mfgDate: mfgDate || null, storage: storage || null,
    photos: { goods: String(photos?.goods || ""), label: String(photos?.label || "") },
    supplierName: String(supplierName || ""), supplierFssaiLicence: String(supplierFssaiLicence || ""),
  }], { session });
  return batch;
};

const ensureOpeningCoverage = async ({ godownId, stockItemId, stock, session }) => {
  // Aggregates skip Mongoose casting, so a string id from a request body would match no batches.
  const itemId = new mongoose.Types.ObjectId(String(stockItemId));
  const totals = await StockBatch.aggregate([
      { $match: { godownId: stock.godownId, stockItemId: itemId, remainingQtyBaseUnit: { $gt: 0 } } },
      { $group: { _id: null, quantity: { $sum: "$remainingQtyBaseUnit" } } },
    ]).session(session);
  const covered = Number(totals[0]?.quantity || 0);
  const missing = Number(stock.qtyBaseUnit || 0) - covered;
  if (missing > EPSILON) {
    let price = null;
    try {
      price = (await pricesForKitchen(godownId, [stockItemId])).get(String(stockItemId))?.price ?? null;
    } catch (error) {
      // Legacy stock can still be consumed when valuation is unavailable; its opening batch stays unpriced.
      console.error(`[consumption] PRICE_LOOKUP_FAILED godown=${godownId}: ${error.message}`);
    }
    await createStockBatch({
      godownId, stockItemId, quantity: missing, unitPrice: price,
      sourceType: "opening_balance", receivedAt: stock.createdAt || new Date(0), session,
    });
  }
};

export const deductFifo = async ({ godownId, stockItemId, quantity, stock, session }) => {
  const qty = Number(quantity);
  if (!(qty > 0)) throw new Error("FIFO deduction quantity must be greater than zero");
  await ensureOpeningCoverage({ godownId, stockItemId, stock, session });
  const batches = await StockBatch.find({
    godownId, stockItemId, remainingQtyBaseUnit: { $gt: 0 },
  }).sort({ receivedAt: 1, _id: 1 }).session(session);
  let needed = qty;
  const allocations = [];
  for (const batch of batches) {
    if (needed <= EPSILON) break;
    const take = Math.min(needed, Number(batch.remainingQtyBaseUnit));
    batch.remainingQtyBaseUnit = Math.max(0, Number(batch.remainingQtyBaseUnit) - take);
    await batch.save({ session });
    allocations.push({
      batchId: batch._id, qtyBaseUnit: take, unitPrice: batch.unitPrice ?? null,
      receivedAt: batch.receivedAt, expiryDate: batch.expiryDate, lotNumber: batch.lotNumber,
      condition: batch.condition, notes: batch.notes,
    });
    needed -= take;
  }
  if (needed > EPSILON) throw new Error("Insufficient batch stock");
  return allocations;
};

export const restoreBatchAllocations = async ({ godownId, stockItemId, allocations = [], quantity, unitPrice, session }) => {
  let restored = 0;
  for (const allocation of allocations) {
    const qty = Number(allocation.qtyBaseUnit || 0);
    if (!(qty > 0)) continue;
    const batch = await StockBatch.findOne({ _id: allocation.batchId, godownId, stockItemId }).session(session);
    if (!batch) continue;
    batch.remainingQtyBaseUnit += qty;
    await batch.save({ session });
    restored += qty;
  }
  const missing = Number(quantity || 0) - restored;
  if (missing > EPSILON) {
    await createStockBatch({ godownId, stockItemId, quantity: missing, unitPrice, sourceType: "return", session });
  }
};

export const valuationFromAllocations = (quantity, allocations) => {
  if (!allocations.length || allocations.some((allocation) => allocation.unitPrice == null)) {
    return { unitPriceAtIssue: null, amountAtIssue: null };
  }
  const amount = round2(allocations.reduce((sum, allocation) =>
    sum + Number(allocation.qtyBaseUnit) * Number(allocation.unitPrice), 0));
  return { unitPriceAtIssue: Number(quantity) ? amount / Number(quantity) : null, amountAtIssue: amount };
};
