import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
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
