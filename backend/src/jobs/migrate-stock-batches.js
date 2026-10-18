// Creates one opening-balance batch for the part of each GodownStock balance not already covered.
// Dry-runs by default. Use --apply explicitly to write; never run --apply without checking the target DB.
import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { StockItem } from "../models/InventoryModels.js";

export const planStockBatchMigration = async () => {
  const stocks = await GodownStock.find({ qtyBaseUnit: { $gt: 0 } }).lean();
  const coverage = await StockBatch.aggregate([
    { $match: { remainingQtyBaseUnit: { $gt: 0 } } },
    { $group: { _id: { godownId: "$godownId", stockItemId: "$stockItemId" }, quantity: { $sum: "$remainingQtyBaseUnit" } } },
  ]);
  const covered = new Map(coverage.map((row) => [`${row._id.godownId}:${row._id.stockItemId}`, Number(row.quantity)]));
  const productIds = [...new Set(stocks.map((stock) => String(stock.stockItemId)))];
  const products = await StockItem.find({ _id: { $in: productIds } }).select("name pricePerUnit").lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return stocks.map((stock) => {
    const existing = covered.get(`${stock.godownId}:${stock.stockItemId}`) || 0;
    const quantity = Math.max(0, Number(stock.qtyBaseUnit) - existing);
    return {
      godownId: stock.godownId, stockItemId: stock.stockItemId,
      productName: byId.get(String(stock.stockItemId))?.name || "Deleted product",
      quantity, unitPrice: byId.get(String(stock.stockItemId))?.pricePerUnit ?? null,
      receivedAt: stock.createdAt || new Date(0),
    };
  }).filter((row) => row.quantity > 1e-8);
};

export const applyStockBatchMigration = async (plan) => {
  if (!plan.length) return 0;
  await StockBatch.insertMany(plan.map((row) => ({
    godownId: row.godownId, stockItemId: row.stockItemId,
    sourceType: "opening_balance", receivedAt: row.receivedAt,
    receivedQtyBaseUnit: row.quantity, remainingQtyBaseUnit: row.quantity,
    unitPrice: row.unitPrice,
  })));
  return plan.length;
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const { connectDB } = await import("../config/db.js");
  await connectDB();
  const plan = await planStockBatchMigration();
  console.log(`Opening batches to create: ${plan.length}`);
  for (const row of plan.slice(0, 100)) console.log(`  ${row.productName}: ${row.quantity} @ ${row.unitPrice ?? "unpriced"}`);
  if (plan.length > 100) console.log(`  …and ${plan.length - 100} more`);
  if (apply) console.log(`Applied: ${await applyStockBatchMigration(plan)} opening batches created.`);
  else console.log("Dry run only. Re-run with --apply to make these changes.");
  await mongoose.disconnect();
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
