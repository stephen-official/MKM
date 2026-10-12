import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, kitchen, purchaseOrder, seedCatalog } from "./helpers/fixtures.js";
import { kitchenDistributionPrices, pricesForKitchen, purchaseOrderPrices, resolvePrice } from "../executive/valuation.js";

let f;
before(startDb);
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  // Kitchen A rice: 40 then 45 (latest valid wins); later invalid prices ignored.
  await distribution("2026-09-01T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await distribution("2026-10-01T05:00:00Z", [[A, items.Rice, 10, 45], [B, items.Oil, 5, 90]]);
  await distribution("2026-10-05T05:00:00Z", [[A, items.Rice, 10, 0]]);
  await distribution("2026-10-06T05:00:00Z", [[A, items.Rice, 10, null]]);
  await distribution("2026-10-07T05:00:00Z", [[A, items.Rice, 10, -3]]);
  await distribution("2026-10-08T05:00:00Z", [[A, items.Rice, 0, 99]]);
  // PO fallback for rice: latest by receivedAt (not createdAt); negative ignored.
  await purchaseOrder("2026-09-10T05:00:00Z", [[items.Rice, 100, 38]], { createdAt: "2026-09-25T05:00:00Z" });
  await purchaseOrder("2026-09-20T05:00:00Z", [[items.Rice, 100, 41]], { createdAt: "2026-09-21T05:00:00Z" });
  await purchaseOrder("2026-09-25T05:00:00Z", [[items.Rice, 100, -5]]);
  f = { items, A, B };
});

test("latest valid distribution price to that kitchen wins", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.A._id, f.items.Rice._id), { price: 45, source: "kitchen-distribution" });
});

test("falls back to latest valid PO price by receivedAt", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Rice._id), { price: 41, source: "purchase-order" });
});

test("another kitchen's distribution price is not used; no price → unpriced", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.A._id, f.items.Oil._id), { price: null, source: null });
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Oil._id), { price: 90, source: "kitchen-distribution" });
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Dal._id), { price: null, source: null });
});

test("filters by kitchen and item", async () => {
  const kMap = await kitchenDistributionPrices({ godownIds: [f.B._id] });
  assert.equal(kMap.size, 1);
  const prices = await pricesForKitchen(String(f.A._id), [f.items.Rice._id, f.items.Dal._id]);
  assert.deepEqual(prices.get(String(f.items.Rice._id)), { price: 45, source: "kitchen-distribution" });
  assert.deepEqual(prices.get(String(f.items.Dal._id)), { price: null, source: null });
});
