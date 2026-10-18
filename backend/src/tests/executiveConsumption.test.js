import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { consumption, kitchen, makeCtx, seedCatalog } from "./helpers/fixtures.js";
import { Consumption } from "../models/FlowModels.js";
import { memo } from "../executive/context.js";
import { aggregateConsumption, consumptionSection, rankTopItems } from "../executive/sections/consumption.js";

let f;
before(startDb);
after(stopDb);

const ctxFor = async (query) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query });
  ctx.consumption = memo(() => aggregateConsumption({ scopeIds: ctx.scopeIds, from: ctx.params.from, to: ctx.params.to, window: ctx.params.window, tz: ctx.tz }));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const { Rice, Dal, Oil } = items;
  Dal.itemType = "daily_use";
  await Dal.save();
  await consumption(A, { date: "2026-10-01", createdAt: "2026-10-01T05:00:00Z", lines: [[Rice, 2, 100], [Dal, 1, 50]] });
  await consumption(A, { date: "2026-10-10", createdAt: "2026-10-10T05:00:00Z", lines: [[Rice, 1, 50.25]] });
  await consumption(A, { date: "2026-10-11", createdAt: "2026-10-11T05:00:00Z", lines: [[Rice, 5, 999]] });
  await consumption(A, { date: "2026-09-30", createdAt: "2026-09-30T05:00:00Z", lines: [[Rice, 1, 40]] });
  await consumption(B, { date: "Mon Oct 05 2026 00:00:00 GMT+0530", createdAt: "2026-10-04T20:00:00Z", lines: [[Oil, 3, 30]] });
  await consumption(B, { date: "Thu Oct 01 2026", createdAt: "2026-09-30T19:00:00Z", lines: [[Dal, 4]] });
  await consumption(B, { date: "2026-10-03", createdAt: "2026-10-03T05:00:00Z", lines: [[Oil, -1, -10]] });
  await consumption(B, { date: "garbage", createdAt: "2026-10-10T18:29:59Z", lines: [[Rice, 1, 7]] });
  await consumption(B, { date: "garbage", createdAt: "2026-10-10T18:30:00Z", lines: [[Rice, 1, 1000]] });
  f = { items, A, B };
});

test("all kitchens: value from amountAtIssue, returns net off, unvalued lines counted not priced", async () => {
  const { kpis } = await consumptionSection(await ctxFor({}));
  assert.equal(kpis.consumptionValue.value, 227.25);
  assert.equal(kpis.consumptionValue.details.unvaluedLineCount, 1);
  assert.equal(kpis.consumptionValue.details.unvaluedQty, 4);
  assert.equal(kpis.consumptionValue.details.previousValue, 40);
  assert.equal(kpis.consumptionValue.details.deltaPct, 468.13);
  assert.equal(kpis.dailyUseLines.value, 2);
});

test("non-ISO consumption dates fall back to createdAt business date (IST boundaries)", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  const byDate = Object.fromEntries(sections.consumptionTrend.points.map((p) => [p.date, p]));
  assert.equal(byDate["2026-10-05"].value, 30);
  assert.equal(byDate["2026-10-01"].value, 150);
  assert.equal(byDate["2026-10-01"].unvaluedLines, 1);
  assert.equal(byDate["2026-10-10"].value, 57.25, "23:59:59 IST counted, 00:00 IST next day excluded");
});

test("trend is zero-filled and covers every day in range", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  assert.equal(sections.consumptionTrend.points.length, 10);
  assert.equal(sections.consumptionTrend.points[1].date, "2026-10-02");
  assert.equal(sections.consumptionTrend.points[1].value, 0);
  assert.equal(sections.consumptionTrend.total, 227.25);
});

test("all-kitchen trend includes an overall total and a zero-filled series for every kitchen", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  const trends = sections.consumptionTrend.kitchens;
  assert.deepEqual(trends.map((row) => [row.kitchen, row.total]), [["Kitchen A", 200.25], ["Kitchen B", 27]]);
  assert.equal(trends[0].points.length, 10);
  assert.equal(trends[0].points[1].date, "2026-10-02");
  assert.equal(trends[0].points[1].value, 0);
  assert.equal(trends[1].points.find((point) => point.date === "2026-10-05").value, 30);
  assert.equal(trends[1].unvaluedLines, 1);
});

test("single kitchen scope", async () => {
  const { kpis, sections } = await consumptionSection(await ctxFor({ godownId: String(f.A._id) }));
  assert.equal(kpis.consumptionValue.value, 200.25);
  assert.equal(kpis.consumptionValue.details.unvaluedLineCount, 0);
  assert.equal(sections.consumptionTrend.kitchens, undefined);
  const b = await consumptionSection(await ctxFor({ godownId: String(f.B._id) }));
  assert.equal(b.kpis.consumptionValue.value, 27);
  assert.equal(b.kpis.dailyUseLines.value, 1);
});

test("top items ranked by value, then qty, then name", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  assert.deepEqual(sections.topItems.items.map((i) => [i.rank, i.name, i.value, i.qty]), [
    [1, "Rice", 157.25, 4], [2, "Dal", 50, 5], [3, "Oil", 20, 2]
  ]);
  assert.equal(sections.topItems.unvaluedItemCount, 1);
  assert.equal(sections.topItems.tiedBeyondLimit, 0);
});

test("previous period with zero value gives deltaPct null", async () => {
  const { kpis } = await consumptionSection(await ctxFor({ from: "2026-10-05", to: "2026-10-10" }));
  // current 05..10 Oct = Oil 30 (B, 05 Oct) + 50.25 (A, 10 Oct) + 7 (B, garbage date, 23:59:59 IST 10 Oct) = 87.25
  // previous 29 Sep..04 Oct = A 40 (30 Sep) + A 150 (01 Oct) + B Dal unvalued + B -10 (03 Oct) = 180
  assert.equal(kpis.consumptionValue.value, 87.25);
  assert.equal(kpis.consumptionValue.details.previousValue, 180);
  assert.equal(kpis.consumptionValue.details.deltaPct, -51.53, "(87.25 - 180) / 180 × 100");
  const empty = await consumptionSection(await ctxFor({ from: "2026-08-01", to: "2026-08-02" }));
  assert.equal(empty.kpis.consumptionValue.value, 0);
  assert.equal(empty.kpis.consumptionValue.details.deltaPct, null);
  assert.equal(empty.sections.topItems.items.length, 0);
});

test("a previous period that rounds to zero gives deltaPct null instead of an absurd percentage", async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Kitchen A");
  await consumption(A, { date: "2026-09-29", createdAt: "2026-09-29T05:00:00Z", lines: [[items.Rice, 1, 0.004]] });
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 10]] });
  const { kpis } = await consumptionSection(await ctxFor({ from: "2026-10-05", to: "2026-10-10" }));
  assert.equal(kpis.consumptionValue.value, 10);
  assert.equal(kpis.consumptionValue.details.previousValue, 0);
  assert.equal(kpis.consumptionValue.details.deltaPct, null);
});

test("the recorded ISO date wins over createdAt: backdated lines count on their date, forward-dated lines are excluded", async () => {
  // Entered on 12 Oct (outside the 1-10 Oct window) but dated 2 Oct → counted on 2 Oct.
  await consumption(f.A, { date: "2026-10-02", createdAt: "2026-10-12T05:00:00Z", lines: [[f.items.Dal, 1, 11]] });
  // Entered on 4 Oct (inside the window) but dated 20 Oct → excluded.
  await consumption(f.A, { date: "2026-10-20", createdAt: "2026-10-04T05:00:00Z", lines: [[f.items.Dal, 1, 13]] });
  const { kpis, sections } = await consumptionSection(await ctxFor({}));
  assert.equal(kpis.consumptionValue.value, 238.25, "227.25 + 11, without the forward-dated 13");
  const byDate = Object.fromEntries(sections.consumptionTrend.points.map((p) => [p.date, p.value]));
  assert.equal(byDate["2026-10-02"], 11);
  assert.equal(byDate["2026-10-04"], 0);
});

test("NaN and infinite amounts are unvalued lines, never added to the value", async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Kitchen A");
  // Raw insert: Mongoose would refuse to cast NaN.
  await Consumption.collection.insertOne({
    godownId: A._id, userId: A._id, date: "2026-10-05", createdAt: new Date("2026-10-05T05:00:00Z"), updatedAt: new Date("2026-10-05T05:00:00Z"),
    items: [
      { stockItemId: items.Rice._id, qtyBaseUnit: 1, amountAtIssue: NaN },
      { stockItemId: items.Rice._id, qtyBaseUnit: 2, amountAtIssue: Infinity },
      { stockItemId: items.Rice._id, qtyBaseUnit: 4, amountAtIssue: -Infinity },
      { stockItemId: items.Rice._id, qtyBaseUnit: 8, amountAtIssue: 25 }
    ]
  });
  const { kpis, sections } = await consumptionSection(await ctxFor({}));
  assert.equal(kpis.consumptionValue.value, 25);
  assert.equal(kpis.consumptionValue.details.unvaluedLineCount, 3);
  assert.equal(kpis.consumptionValue.details.unvaluedQty, 7);
  assert.equal(sections.consumptionTrend.total, 25);
});

test("lines without a stock item are grouped as one 'Unknown item', not 'Deleted item'", async () => {
  await Consumption.collection.insertOne({
    godownId: f.A._id, userId: f.A._id, date: "2026-10-04", createdAt: new Date("2026-10-04T05:00:00Z"), updatedAt: new Date("2026-10-04T05:00:00Z"),
    items: [{ qtyBaseUnit: 1, amountAtIssue: 500 }, { qtyBaseUnit: 2, amountAtIssue: 100 }]
  });
  const { sections } = await consumptionSection(await ctxFor({}));
  const unknown = sections.topItems.items.filter((i) => i.name === "Unknown item");
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].rank, 1);
  assert.equal(unknown[0].value, 600);
  assert.equal(unknown[0].qty, 3);
  assert.equal(unknown[0].stockItemId, null);
  assert.ok(!sections.topItems.items.some((i) => i.name === "Deleted item"));
});

test("rankTopItems: exactly ten, deterministic ties, tiedBeyondLimit", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    _id: `65f0c0ffee00000000000${String(i).padStart(3, "0")}`, value: 10, qty: 1, unvaluedLines: 0,
    name: `Item ${String(12 - i).padStart(2, "0")}`, unit: "kg"
  }));
  const ranked = rankTopItems(rows);
  assert.equal(ranked.items.length, 10);
  assert.deepEqual(ranked.items.map((r) => r.name), ["Item 01", "Item 02", "Item 03", "Item 04", "Item 05", "Item 06", "Item 07", "Item 08", "Item 09", "Item 10"]);
  assert.equal(ranked.tiedBeyondLimit, 2);
  const byQty = rankTopItems([
    { _id: "a", value: 10, qty: 5, unvaluedLines: 0, name: "X", unit: "" },
    { _id: "b", value: 10, qty: 7, unvaluedLines: 0, name: "Y", unit: "" },
    { _id: "c", value: 10.004, qty: 1, unvaluedLines: 0, name: "Z", unit: "" }
  ]);
  assert.deepEqual(byQty.items.map((r) => r.name), ["Y", "X", "Z"], "values equal at 2 dp tie-break on qty");
  const byRoundedQty = rankTopItems([
    { _id: "a", value: 10, qty: 5.0004, unvaluedLines: 0, name: "Alpha", unit: "" },
    { _id: "b", value: 10, qty: 5.0001, unvaluedLines: 0, name: "Beta", unit: "" }
  ]);
  assert.deepEqual(byRoundedQty.items.map((r) => r.name), ["Alpha", "Beta"], "quantities equal at 3 dp fall through to the name");
});
