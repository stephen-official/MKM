// Moves legacy DailyUsage history into Consumption. Dry-runs unless --apply is passed.
// It never invents stock: missing opening balances for daily-use products are reported for manual entry.
import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { Consumption, GodownStock } from "../models/FlowModels.js";
import { DailyUsage } from "../models/DailyUsageModel.js";
import { Godown, StockItem } from "../models/InventoryModels.js";

export const planUsageLogMigration = async () => {
  const alreadyMoved = new Set((await Consumption.find({ legacyDailyUsageId: { $ne: null } })
    .distinct("legacyDailyUsageId")).map(String));
  const legacyRows = (await DailyUsage.find().lean()).filter((row) => !alreadyMoved.has(String(row._id)));

  const [kitchens, dailyUseItems, stockedPairs] = await Promise.all([
    Godown.find({ active: { $ne: false } }).select("name").lean(),
    StockItem.find({ itemType: "daily_use", archived: { $ne: true } }).select("name").lean(),
    GodownStock.find().select("godownId stockItemId").lean(),
  ]);
  const stocked = new Set(stockedPairs.map((row) => `${row.godownId}:${row.stockItemId}`));
  const missingOpeningBalances = kitchens.flatMap((kitchen) => dailyUseItems
    .filter((item) => !stocked.has(`${kitchen._id}:${item._id}`))
    .map((item) => ({ godownId: kitchen._id, kitchen: kitchen.name, stockItemId: item._id, product: item.name })));

  return { legacyRows, missingOpeningBalances };
};

export const applyUsageLogMigration = async (legacyRows) => {
  if (!legacyRows.length) return 0;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Consumption.insertMany(legacyRows.map((row) => ({
        godownId: row.godownId,
        userId: row.userId,
        date: row.date,
        reason: row.reason || "",
        sourceType: "migrated_daily_usage",
        legacyDailyUsageId: row._id,
        items: (row.items || []).map((item) => ({
          stockItemId: item.stockItemId,
          qtyBaseUnit: item.qtyBaseUnit,
          unitPriceAtIssue: null,
          amountAtIssue: null,
          batchAllocations: [],
        })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })), { session, ordered: false });
      await DailyUsage.deleteMany({ _id: { $in: legacyRows.map((row) => row._id) } }).session(session);
    });
    return legacyRows.length;
  } finally {
    await session.endSession();
  }
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const { connectDB } = await import("../config/db.js");
  await connectDB();
  const plan = await planUsageLogMigration();
  console.log(`Legacy daily-usage records to migrate: ${plan.legacyRows.length}`);
  console.log(`Daily-use kitchen/product pairs needing an opening balance: ${plan.missingOpeningBalances.length}`);
  for (const row of plan.missingOpeningBalances.slice(0, 100)) console.log(`  ${row.kitchen}: ${row.product}`);
  if (plan.missingOpeningBalances.length > 100) console.log(`  …and ${plan.missingOpeningBalances.length - 100} more`);
  if (apply) console.log(`Applied: ${await applyUsageLogMigration(plan.legacyRows)} records migrated.`);
  else console.log("Dry run only. Re-run with --apply after opening balances are prepared.");
  await mongoose.disconnect();
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
