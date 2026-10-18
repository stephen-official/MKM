import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { OpeningBalance } from "../models/OpeningBalanceModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const group = await StockGroup.create({ name: "Fresh food" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  ctx = {
    kitchen: await createGodown("Opening Kitchen"),
    root: await createUser({ role: "super_admin" }),
    admin: await createUser({ role: "admin" }),
    product: await StockItem.create({ name: "Tomatoes", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 40, defaultThreshold: 3 }),
  };
});

const post = (who, body) => request(app).post("/api/procurement/opening-balances")
  .set("Authorization", `Bearer ${ctx[who].token}`).send(body);
const valid = (extra = {}) => ({
  godownId: ctx.kitchen._id, stockItemId: ctx.product._id, quantityBaseUnit: 12,
  effectiveDate: "2020-01-17", reason: "Counted during go-live", ...extra,
});

test("a super-admin records one priced and audited opening balance atomically", async () => {
  const response = await post("root", valid());
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const stock = await GodownStock.findOne({ godownId: ctx.kitchen._id, stockItemId: ctx.product._id });
  const batch = await StockBatch.findOne({ godownId: ctx.kitchen._id, stockItemId: ctx.product._id });
  const audit = await OpeningBalance.findOne({ godownId: ctx.kitchen._id, stockItemId: ctx.product._id });
  assert.equal(stock.qtyBaseUnit, 12);
  assert.equal(stock.thresholdBaseUnit, 3);
  assert.equal(batch.remainingQtyBaseUnit, 12);
  assert.equal(batch.unitPrice, 40);
  assert.equal(batch.sourceType, "opening_balance");
  assert.equal(batch.notes, "Counted during go-live");
  assert.equal(String(audit.createdBy), String(ctx.root.user._id));
  assert.equal(String(audit.batchId), String(batch._id));
});

test("admins cannot record opening balances and invalid entries make no writes", async () => {
  assert.equal((await post("admin", valid())).status, 403);
  ctx.product.pricePerUnit = null;
  await ctx.product.save();
  const unpriced = await post("root", valid());
  assert.equal(unpriced.status, 409);
  assert.match(unpriced.body.message, /price/i);
  assert.equal(await GodownStock.countDocuments(), 0);
  assert.equal(await StockBatch.countDocuments(), 0);
  assert.equal(await OpeningBalance.countDocuments(), 0);
});

test("stock or batch history prevents an opening balance", async () => {
  await GodownStock.create({ godownId: ctx.kitchen._id, stockItemId: ctx.product._id, qtyBaseUnit: 0 });
  const response = await post("root", valid());
  assert.equal(response.status, 409);
  assert.match(response.body.message, /stock history/i);
  assert.equal(await OpeningBalance.countDocuments(), 0);
  assert.equal(await StockBatch.countDocuments(), 0);
});

test("the one-time constraint rejects a repeat without changing stock", async () => {
  assert.equal((await post("root", valid())).status, 201);
  const repeated = await post("root", valid({ quantityBaseUnit: 99 }));
  assert.equal(repeated.status, 409);
  assert.equal((await GodownStock.findOne()).qtyBaseUnit, 12);
  assert.equal(await OpeningBalance.countDocuments(), 1);
  assert.equal(await StockBatch.countDocuments(), 1);
});
