import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { PRODUCTION_SIZE, seedProductionSized } from "./helpers/perfFixture.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { parseReportParams } from "../executive/params.js";
import { EXPORT_LIMITS } from "../executive/context.js";

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

const run = (query, limits) => buildExecutiveReport(parseReportParams(query, { now: NOW }), { now: NOW, limits });

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
