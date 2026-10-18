import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { Consumption } from "../models/FlowModels.js";
import { DailyUsage } from "../models/DailyUsageModel.js";
import { applyUsageLogMigration, planUsageLogMigration } from "../jobs/migrate-usage-log.js";

let godown;
let milk;
let user;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  godown = await kitchen("Migration Kitchen");
  ({ items: { Milk: milk } } = await seedCatalog(["Milk"]));
  milk.itemType = "daily_use";
  await milk.save();
  ({ user } = await createUser({ role: "user", godownId: godown._id }));
  await DailyUsage.create({
    godownId: godown._id,
    userId: user._id,
    date: "2026-10-01",
    items: [{ stockItemId: milk._id, qtyBaseUnit: 2 }],
  });
});

test("usage-log migration is dry-plan friendly, idempotent, and reports opening-balance gaps", async () => {
  const plan = await planUsageLogMigration();
  assert.equal(plan.legacyRows.length, 1);
  assert.deepEqual(plan.missingOpeningBalances.map((row) => [row.kitchen, row.product]), [["Migration Kitchen", "Milk"]]);

  assert.equal(await applyUsageLogMigration(plan.legacyRows), 1);
  assert.equal(await DailyUsage.countDocuments(), 0);
  const migrated = await Consumption.findOne().lean();
  assert.equal(migrated.sourceType, "migrated_daily_usage");
  assert.equal(migrated.items[0].qtyBaseUnit, 2);
  assert.equal(migrated.items[0].amountAtIssue, null);

  await stockRow(godown, milk, 10);
  const secondPlan = await planUsageLogMigration();
  assert.equal(secondPlan.legacyRows.length, 0);
  assert.equal(secondPlan.missingOpeningBalances.length, 0);
});
