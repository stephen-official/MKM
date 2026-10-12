import mongoose from "mongoose";
import { Distribution, PurchaseOrder } from "../models/FlowModels.js";

// Excludes null, strings, NaN (Mongo sorts NaN below every number), zero, negatives and Infinity.
export const PRICE_RANGE = Object.freeze({ $gt: 0, $lte: Number.MAX_VALUE });
export const isValidPrice = (price) => typeof price === "number" && Number.isFinite(price) && price > 0;

const toIds = (ids) => ids?.map((id) => new mongoose.Types.ObjectId(String(id)));

export const kitchenDistributionPrices = async ({ godownIds = null, stockItemIds = null, options = {} } = {}) => {
  const docMatch = {};
  const lineMatch = { "allocations.unitPrice": PRICE_RANGE, "allocations.qtyBaseUnit": { $gt: 0 } };
  if (godownIds) {
    docMatch["allocations.godownId"] = { $in: toIds(godownIds) };
    lineMatch["allocations.godownId"] = { $in: toIds(godownIds) };
  }
  if (stockItemIds) {
    docMatch["allocations.stockItemId"] = { $in: toIds(stockItemIds) };
    lineMatch["allocations.stockItemId"] = { $in: toIds(stockItemIds) };
  }
  const rows = await Distribution.aggregate([
    { $match: docMatch },
    { $sort: { createdAt: -1, _id: -1 } },
    { $unwind: "$allocations" },
    { $match: lineMatch },
    { $group: { _id: { g: "$allocations.godownId", i: "$allocations.stockItemId" }, price: { $first: "$allocations.unitPrice" } } }
  ]).allowDiskUse(true).option(options);
  const map = new Map();
  for (const row of rows) if (isValidPrice(row.price)) map.set(`${row._id.g}:${row._id.i}`, row.price);
  return map;
};

export const purchaseOrderPrices = async ({ stockItemIds = null, options = {} } = {}) => {
  const docMatch = stockItemIds ? { "items.stockItemId": { $in: toIds(stockItemIds) } } : {};
  const lineMatch = { "items.unitPrice": PRICE_RANGE, ...(stockItemIds ? { "items.stockItemId": { $in: toIds(stockItemIds) } } : {}) };
  const rows = await PurchaseOrder.aggregate([
    { $match: docMatch },
    { $sort: { receivedAt: -1, createdAt: -1, _id: -1 } },
    { $unwind: "$items" },
    { $match: lineMatch },
    { $group: { _id: "$items.stockItemId", price: { $first: "$items.unitPrice" } } }
  ]).allowDiskUse(true).option(options);
  const map = new Map();
  for (const row of rows) if (isValidPrice(row.price)) map.set(String(row._id), row.price);
  return map;
};

export const resolvePrice = (kitchenMap, poMap, godownId, stockItemId) => {
  const own = kitchenMap.get(`${godownId}:${stockItemId}`);
  if (own !== undefined) return { price: own, source: "kitchen-distribution" };
  const po = poMap.get(String(stockItemId));
  if (po !== undefined) return { price: po, source: "purchase-order" };
  return { price: null, source: null };
};

/** Price now for each item in one kitchen — used when recording consumption. */
export const pricesForKitchen = async (godownId, stockItemIds) => {
  const ids = [...new Set(stockItemIds.map(String))];
  if (!ids.length) return new Map();
  const [kitchenMap, poMap] = await Promise.all([
    kitchenDistributionPrices({ godownIds: [godownId], stockItemIds: ids }),
    purchaseOrderPrices({ stockItemIds: ids })
  ]);
  return new Map(ids.map((id) => [id, resolvePrice(kitchenMap, poMap, String(godownId), id)]));
};
