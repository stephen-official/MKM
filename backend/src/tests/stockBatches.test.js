import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let kitchen;
let cook;
let rice;
let stock;

before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  kitchen = await createGodown("FIFO Kitchen");
  ({ items: { Rice: rice } } = await seedCatalog(["Rice"]));
  stock = await stockRow(kitchen, rice, 20);
  cook = await createUser({ role: "user", godownId: kitchen._id });
  await StockBatch.create([
    { godownId: kitchen._id, stockItemId: rice._id, sourceType: "opening_balance", receivedAt: new Date("2026-01-01"), receivedQtyBaseUnit: 8, remainingQtyBaseUnit: 8, unitPrice: 10 },
    { godownId: kitchen._id, stockItemId: rice._id, sourceType: "distribution", receivedAt: new Date("2026-02-01"), receivedQtyBaseUnit: 12, remainingQtyBaseUnit: 12, unitPrice: 20 },
  ]);
});

test("consumption deducts oldest received batches first and captures weighted value", async () => {
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [0, 10]);
  assert.equal(response.body.items[0].amountAtIssue, 120);
  assert.equal(response.body.items[0].unitPriceAtIssue, 12);
  assert.deepEqual(response.body.items[0].batchAllocations.map((line) => line.qtyBaseUnit), [8, 2]);
});

test("deleting a consumption restores its exact batch allocations", async () => {
  const created = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const admin = await createUser({ role: "admin" });
  const deleted = await request(app).delete(`/api/consumptions/${created.body._id}`)
    .set("Authorization", `Bearer ${admin.token}`);
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));

  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [8, 12]);
});
