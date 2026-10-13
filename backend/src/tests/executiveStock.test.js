import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { GodownStock } from "../models/FlowModels.js";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, kitchen, makeCtx, purchaseOrder, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { memo } from "../executive/context.js";
import { loadStockSnapshot, stockSections } from "../executive/sections/stock.js";
import { paginate } from "../executive/paginate.js";

let f;
before(startDb);
after(stopDb);

const ctxFor = async (query = {}, opts) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query }, opts);
  ctx.stock = memo(() => loadStockSnapshot(ctx));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const C = await kitchen("Kitchen C (closed)", false);
  await distribution("2026-10-01T05:00:00Z", [[A, items.Rice, 10, 45], [C, items.Rice, 100, 45]]);
  await purchaseOrder("2026-09-20T05:00:00Z", [[items.Rice, 100, 41]]);
  await stockRow(A, items.Rice, 10, 12);   // priced 45 → 450, low (10 ≤ 12)
  await stockRow(A, items.Oil, 3);         // unpriced
  await stockRow(A, items.Dal, -2, 5);     // out (negative)
  await stockRow(B, items.Rice, 2, 4);     // PO price 41 → 82, low (ratio 0.5)
  await stockRow(B, items.Dal, 5);         // unpriced
  await stockRow(B, items.Oil, 0, 0);      // out, not unpriced
  await stockRow(C, items.Rice, 100);      // inactive kitchen: excluded from "all"
  f = { items, A, B, C };
});

test("mixed priced and unpriced inventory across active kitchens", async () => {
  const { kpis } = await stockSections(await ctxFor());
  assert.equal(kpis.stockValue.value, 532);
  assert.deepEqual(kpis.stockValue.details, { unpricedItemCount: 2, unpricedQty: 8 });
  assert.equal(kpis.lowStock.value, 2);
  assert.equal(kpis.outOfStock.value, 2);
});

test("inactive kitchen is selectable and reported on its own", async () => {
  const { kpis } = await stockSections(await ctxFor({ godownId: String(f.C._id) }));
  assert.equal(kpis.stockValue.value, 4500);
});

test("health list: out-of-stock first, then lowest ratio, then names", async () => {
  const { sections } = await stockSections(await ctxFor());
  assert.deepEqual(sections.stockHealth.rows.map((r) => [r.state, r.kitchen, r.item]), [
    ["out", "Kitchen A", "Dal"],
    ["out", "Kitchen B", "Oil"],
    ["low", "Kitchen B", "Rice"],
    ["low", "Kitchen A", "Rice"]
  ]);
  assert.equal(sections.stockHealth.rows[2].ratio, 0.5);
  assert.equal(sections.stockHealth.outCount, 2);
  assert.equal(sections.stockHealth.lowCount, 2);
});

test("unpriced list sorted by kitchen then item", async () => {
  const { sections } = await stockSections(await ctxFor());
  assert.deepEqual(sections.unpricedStock.rows.map((r) => [r.kitchen, r.item, r.qty]), [["Kitchen A", "Oil", 3], ["Kitchen B", "Dal", 5]]);
  assert.equal(sections.unpricedStock.unpricedQty, 8);
});

test("an inactive kitchen's rows never appear in the all-kitchens lists", async () => {
  await stockRow(f.C, f.items.Oil, 0);        // out
  await stockRow(f.C, f.items.Dal, 1, 5);     // low and unpriced
  const { sections } = await stockSections(await ctxFor());
  for (const list of [sections.stockHealth.rows, sections.unpricedStock.rows]) {
    assert.ok(list.every((r) => r.godownId !== String(f.C._id) && r.kitchen !== "Kitchen C (closed)"));
  }
  assert.equal(sections.stockHealth.total, 4);
  const own = await stockSections(await ctxFor({ godownId: String(f.C._id) }));
  assert.equal(own.sections.stockHealth.total, 2, "still reported when selected on its own");
});

test("a low-stock row without a price is listed as low and as unpriced", async () => {
  const D = await kitchen("Kitchen D");
  await stockRow(D, f.items.Oil, 3, 5);
  const { kpis, sections } = await stockSections(await ctxFor());
  assert.ok(sections.stockHealth.rows.some((r) => r.kitchen === "Kitchen D" && r.item === "Oil" && r.state === "low" && r.ratio === 0.6));
  assert.ok(sections.unpricedStock.rows.some((r) => r.kitchen === "Kitchen D" && r.item === "Oil" && r.qty === 3));
  assert.equal(kpis.stockValue.value, 532, "unpriced stock adds no value");
});

test("stock rows of a deleted item fall back to 'Deleted item'", async () => {
  const gone = new mongoose.Types.ObjectId();
  await GodownStock.collection.insertOne({ godownId: f.A._id, stockItemId: gone, qtyBaseUnit: 2, thresholdBaseUnit: 0, createdAt: new Date(), updatedAt: new Date() });
  const { sections } = await stockSections(await ctxFor());
  const row = sections.unpricedStock.rows.find((r) => r.stockItemId === String(gone));
  assert.equal(row.item, "Deleted item");
  assert.equal(row.unit, "");
  assert.equal(row.kitchen, "Kitchen A");
});

test("low-stock order uses the raw ratio, not the 3 dp display value", async () => {
  await clearDb();
  const { items } = await seedCatalog(["Zucchini", "Apple"]);
  const A = await kitchen("Kitchen A");
  // Ratios 0.33333 (Zucchini) and 0.33349 (Apple) both display as 0.333; the lower raw ratio must come first even though "Apple" sorts first by name.
  await stockRow(A, items.Zucchini, 10, 30);
  await stockRow(A, items.Apple, 3.3349, 10);
  const { sections } = await stockSections(await ctxFor());
  assert.deepEqual(sections.stockHealth.rows.map((r) => [r.item, r.ratio]), [["Zucchini", 0.333], ["Apple", 0.333]]);
});

test("pagination uses the context page and page size", async () => {
  const { sections } = await stockSections(await ctxFor({ healthPage: "2" }, { limits: { listPageSize: 3, comparisonPageSize: 3 } }));
  assert.equal(sections.stockHealth.page, 2);
  assert.equal(sections.stockHealth.rows.length, 1);
  assert.equal(sections.stockHealth.total, 4);
});

test("paginate clamps out-of-range pages", () => {
  assert.deepEqual(paginate([1, 2, 3], 9, 2), { rows: [3], total: 3, page: 2, pageSize: 2, pages: 2 });
  assert.deepEqual(paginate([], 1, 25), { rows: [], total: 0, page: 1, pageSize: 25, pages: 1 });
});

test("empty dataset", async () => {
  await clearDb();
  const { kpis, sections } = await stockSections(await ctxFor());
  assert.equal(kpis.stockValue.value, 0);
  assert.equal(sections.stockHealth.total, 0);
});
