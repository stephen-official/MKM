import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, kitchen, purchaseOrder, seedCatalog } from "./helpers/fixtures.js";
import mongoose from "mongoose";
import {
  PRICE_RANGE, isValidPrice, kitchenDistributionPrices, pricesForKitchen, purchaseOrderPrices, resolvePrice, validPriceExpr
} from "../executive/valuation.js";

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

test("purchaseOrderPrices honours a stockItemIds filter and still takes the latest valid price per item", async () => {
  await purchaseOrder("2026-09-28T05:00:00Z", [[f.items.Dal, 10, 70]]);
  const onlyDal = await purchaseOrderPrices({ stockItemIds: [f.items.Dal._id] });
  assert.deepEqual([...onlyDal.entries()], [[String(f.items.Dal._id), 70]]);
  const onlyRice = await purchaseOrderPrices({ stockItemIds: [String(f.items.Rice._id)] });
  assert.deepEqual([...onlyRice.entries()], [[String(f.items.Rice._id), 41]]);
  assert.equal((await purchaseOrderPrices({ stockItemIds: [f.items.Oil._id] })).size, 0);
});

test("an item whose only purchase-order prices are invalid stays unpriced", async () => {
  await purchaseOrder("2026-09-26T05:00:00Z", [[f.items.Oil, 10, 0]]);
  await purchaseOrder("2026-09-27T05:00:00Z", [[f.items.Oil, 10, -4]]);
  await purchaseOrder("2026-09-28T05:00:00Z", [[f.items.Oil, 10, null]]);
  const map = await purchaseOrderPrices({});
  assert.equal(map.has(String(f.items.Oil._id)), false);
  assert.equal(map.get(String(f.items.Rice._id)), 41, "other items unaffected");
  const filtered = await purchaseOrderPrices({ stockItemIds: [f.items.Oil._id] });
  assert.equal(filtered.size, 0);
  assert.deepEqual(resolvePrice(new Map(), map, f.B._id, f.items.Oil._id), { price: null, source: null });
});

test("the $match range, the aggregation expression and isValidPrice agree on what a valid price is", async () => {
  const values = [0.01, 45, Number.MAX_VALUE, 0, -3, NaN, Infinity, -Infinity, null, "45", true];
  const coll = mongoose.connection.db.collection("price_rule_check");
  await coll.deleteMany({});
  await coll.insertMany(values.map((price, index) => ({ index, price })));
  const ids = async (stage) => (await coll.aggregate([stage]).toArray()).map((row) => row.index).sort((a, b) => a - b);
  const expected = values.map((v, i) => (isValidPrice(v) ? i : null)).filter((i) => i !== null);
  assert.deepEqual(await ids({ $match: { price: PRICE_RANGE } }), expected);
  assert.deepEqual(await ids({ $match: { $expr: validPriceExpr("$price") } }), expected);
  assert.deepEqual(expected, [0, 1, 2]);
  await coll.drop();
});
