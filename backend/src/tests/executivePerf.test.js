import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { PRODUCTION_SIZE, seedProductionSized } from "./helpers/perfFixture.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { parseReportParams } from "../executive/params.js";
import { EXPORT_LIMITS } from "../executive/context.js";
import { Consumption, Indent } from "../models/FlowModels.js";

const enabled = process.env.PERF === "1";
const NOW = new Date("2026-10-13T06:00:00Z");
const TARGET_KITCHEN_MS = 1500;
const TARGET_ALL_MS = 3000;
const TARGET_EXPORT_MS = 10_000;
let seeded;

before(async () => {
  if (!enabled) return;
  await startDb();
  await syncAllIndexes();
  seeded = await seedProductionSized(PRODUCTION_SIZE, NOW);
}, { timeout: 600_000 });
after(async () => { if (enabled) await stopDb(); });

const p95 = async (fn, runs = 7) => {
  const times = [];
  await fn(); // warm-up
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.ceil(0.95 * times.length) - 1];
};

// Sections swallow their own errors into `failures` and return fast, so a broken section would
// make timings look better. Every timed call therefore asserts that nothing failed.
const run = async (query, limits) => {
  const report = await buildExecutiveReport(parseReportParams(query, { now: NOW }), { now: NOW, limits });
  assert.deepEqual(report.failures, [], `report sections failed: ${JSON.stringify(report.failures)}`);
  return report;
};

test("fixture is production-sized and the report returns real data", { skip: !enabled, timeout: 120_000 }, async () => {
  const { days, previousPeriodDays, kitchens, consumptionsPerKitchenPerDay, dailyUseRecordsPerKitchenPerDay, indents } = PRODUCTION_SIZE;
  assert.equal(await Consumption.countDocuments(), (days + previousPeriodDays) * kitchens * (consumptionsPerKitchenPerDay + dailyUseRecordsPerKitchenPerDay));
  assert.equal(await Indent.countDocuments(), indents);
  const report = await run({ from: "2025-10-13", to: "2026-10-13" });
  const consumptionValue = report.kpis.find((k) => k.id === "consumptionValue");
  assert.ok(consumptionValue.value > 0, `consumptionValue KPI is ${consumptionValue.value}`);
  assert.ok(consumptionValue.details.previousValue > 0, "previous period has no data to compare with");
  assert.notEqual(consumptionValue.details.deltaPct, null);
  assert.ok(report.kpis.find((k) => k.id === "dailyUseLines").value > 0, "no daily-use lines in the period");
  const indentsSeen = report.sections.procurement.data.indents.reduce((sum, row) => sum + row.count, 0);
  assert.ok(indentsSeen > 0, "no indents in the period");
  assert.ok(report.sections.stockHealth.data.outCount > 0, "no out-of-stock rows in the report");
});

test("summary for one kitchen meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ godownId: String(seeded.godownIds[0]), from: "2025-10-13", to: "2026-10-13" }));
  console.log(`one kitchen, 366 days: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_KITCHEN_MS, `${ms} ms > ${TARGET_KITCHEN_MS} ms`);
});

test("summary for all kitchens meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ from: "2025-10-13", to: "2026-10-13" }));
  console.log(`all kitchens, 366 days: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_ALL_MS, `${ms} ms > ${TARGET_ALL_MS} ms`);
});

test("export-sized report meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ from: "2025-10-13", to: "2026-10-13" }, EXPORT_LIMITS), 3);
  console.log(`export data, all kitchens: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_EXPORT_MS);
});
