import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { clearDb, startDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { OpeningBalance } from "../models/OpeningBalanceModel.js";
import { openingBalanceInput, recordOpeningBalance, removeStockRecord } from "../modules/stock-adjustments/stockAdjustmentService.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const kitchen = await createGodown("Kitchen");
  const other = await createGodown("Other");
  ctx = {
    kitchen, other, rice: items.Rice, stock: await stockRow(kitchen, items.Rice, 10),
    admin: await createUser({ role: "admin" }), cook: await createUser({ role: "user", godownId: kitchen._id }),
  };
  await StockBatch.create([
    { godownId: kitchen._id, stockItemId: items.Rice._id, sourceType: "opening_balance", receivedQtyBaseUnit: 10, remainingQtyBaseUnit: 10 },
    { godownId: other._id, stockItemId: items.Rice._id, sourceType: "opening_balance", receivedQtyBaseUnit: 5, remainingQtyBaseUnit: 5 },
  ]);
});
const call = (actor, method, path) => request(app)[method](`/api/procurement/godown-stocks${path}`).set("Authorization", `Bearer ${actor.token}`);

test("threshold changes retain role restrictions, response and stock quantities", async () => {
  assert.equal((await call(ctx.cook, "post", `/${ctx.stock._id}/threshold`).send({ thresholdBaseUnit: 4 })).status, 403);
  const changed = await call(ctx.admin, "post", `/${ctx.stock._id}/threshold`).send({ thresholdBaseUnit: 4 });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.thresholdBaseUnit, 4);
  assert.equal(changed.body.qtyBaseUnit, 10);
  const missing = await call(ctx.admin, "post", `/${new mongoose.Types.ObjectId()}/threshold`).send({ thresholdBaseUnit: 4 });
  assert.equal(missing.status, 200);
  assert.equal(missing.body, null, "legacy missing-row behavior is preserved");
});

test("stock removal empties only its own batches and retains their history", async () => {
  assert.equal((await call(ctx.cook, "delete", `/${ctx.stock._id}`)).status, 403);
  const removed = await call(ctx.admin, "delete", `/${ctx.stock._id}`);
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.body, { success: true, message: "Stock item removed" });
  assert.equal(await GodownStock.countDocuments(), 0);
  const own = await StockBatch.findOne({ godownId: ctx.kitchen._id });
  assert.equal(own.remainingQtyBaseUnit, 0);
  assert.equal(own.receivedQtyBaseUnit, 10);
  assert.equal((await StockBatch.findOne({ godownId: ctx.other._id })).remainingQtyBaseUnit, 5);
  const again = await call(ctx.admin, "delete", `/${ctx.stock._id}`);
  assert.equal(again.status, 404);
  assert.deepEqual(again.body, { message: "Stock item not found" });
});

test("aborting stock removal restores both the row and batch balances", async () => {
  const session = await mongoose.startSession();
  try {
    await assert.rejects(session.withTransaction(async () => {
      await removeStockRecord({ stockRecordId: ctx.stock._id, session });
      throw new Error("Abort after stock removal");
    }), /Abort after stock removal/);
  } finally { await session.endSession(); }
  assert.equal((await GodownStock.findById(ctx.stock._id)).qtyBaseUnit, 10);
  assert.equal((await StockBatch.findOne({ godownId: ctx.kitchen._id })).remainingQtyBaseUnit, 10);
});

test("aborting an opening balance leaves no stock row, batch or audit", async () => {
  const emptyKitchen = await createGodown("New kitchen");
  const input = openingBalanceInput({ godownId: emptyKitchen._id, stockItemId: ctx.rice._id, quantityBaseUnit: 3, effectiveDate: "2020-01-17", reason: "Initial count" });
  const session = await mongoose.startSession();
  try {
    await assert.rejects(session.withTransaction(async () => {
      await recordOpeningBalance({ input, actor: { sub: ctx.admin.user._id }, session });
      throw new Error("Abort after opening balance");
    }), /Abort after opening balance/);
  } finally { await session.endSession(); }
  assert.equal(await GodownStock.countDocuments({ godownId: emptyKitchen._id }), 0);
  assert.equal(await StockBatch.countDocuments({ godownId: emptyKitchen._id }), 0);
  assert.equal(await OpeningBalance.countDocuments({ godownId: emptyKitchen._id }), 0);
});
