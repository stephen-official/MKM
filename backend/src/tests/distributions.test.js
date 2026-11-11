import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { clearDb, startDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { purchaseOrder, seedCatalog } from "./helpers/fixtures.js";
import { Distribution, GodownStock, PurchaseOrder } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const kitchen = await createGodown("Destination");
  ctx = {
    kitchen, items,
    po: await purchaseOrder("2026-10-01T05:00:00Z", [[items.Rice, 20, 12]]),
    admin: await createUser({ role: "admin" }), cook: await createUser({ role: "user", godownId: kitchen._id }),
  };
});
const call = (actor, method, path) => request(app)[method](`/api/procurement/distributions${path}`).set("Authorization", `Bearer ${actor.token}`);
const allocation = (quantity = 5) => ({ godownId: ctx.kitchen._id, stockItemId: ctx.items.Rice._id, qtyBaseUnit: quantity, unitPrice: 12 });

test("distribution creation updates stock, batch provenance, PO status and populated history", async () => {
  const created = await call(ctx.admin, "post", "").send({ purchaseOrderId: ctx.po._id, allocations: [allocation()], leftovers: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 15 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((await GodownStock.findOne()).qtyBaseUnit, 5);
  const batch = await StockBatch.findOne();
  assert.equal(batch.unitPrice, 12);
  assert.equal(batch.receivedAt.toISOString(), "2026-10-01T05:00:00.000Z");
  assert.equal(String(batch.sourceId), created.body._id);
  assert.equal((await PurchaseOrder.findById(ctx.po._id)).status, "distributed");
  const logs = await call(ctx.admin, "get", "/logs");
  assert.equal(logs.status, 200);
  assert.equal(logs.body[0]._id, created.body._id);
  const details = await call(ctx.admin, "get", `/${created.body._id}/details`);
  assert.deepEqual(details.body, { distributionId: created.body._id, logs: [{ itemId: String(ctx.items.Rice._id), itemName: "Rice", destination: "Destination", quantity: 5 }] });
});

test("redistribution consumes source leftovers and exposes only remaining positive quantities", async () => {
  const source = await Distribution.create({ leftovers: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 15 }] });
  const created = await call(ctx.admin, "post", "").send({ purchaseOrderId: "", leftoverSourceId: source._id, allocations: [allocation(10)], leftovers: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 5 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.purchaseOrderId, null);
  assert.equal((await Distribution.findById(source._id)).leftovers[0].qtyBaseUnit, 0);
  const leftovers = await call(ctx.admin, "get", "/leftovers");
  assert.equal(leftovers.body.length, 1);
  assert.equal(leftovers.body[0].qtyBaseUnit, 5);
  assert.equal(leftovers.body[0].distributionId, created.body._id);
});

test("invalid allocation validation retains the response and makes no writes", async () => {
  const invalid = await call(ctx.admin, "post", "").send({ allocations: [allocation(0)] });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { message: "Enter valid base-unit or pack allocation quantities" });
  assert.equal(await Distribution.countDocuments(), 0);
  assert.equal(await GodownStock.countDocuments(), 0);
});

test("a batch validation failure rolls back the distribution and earlier stock allocations", async () => {
  const invalid = await call(ctx.admin, "post", "").send({ purchaseOrderId: ctx.po._id, allocations: [allocation(), { stockItemId: ctx.items.Dal._id, qtyBaseUnit: 2 }] });
  assert.equal(invalid.status, 500);
  assert.equal(invalid.body.message, "Distribution failed");
  assert.equal(await Distribution.countDocuments(), 0);
  assert.equal(await GodownStock.countDocuments(), 0);
  assert.equal(await StockBatch.countDocuments(), 0);
  assert.equal((await PurchaseOrder.findById(ctx.po._id)).status, "pending");
});

test("distribution endpoints remain admin-only and missing details retain their 404 shape", async () => {
  for (const path of ["/logs", "/leftovers", `/${new mongoose.Types.ObjectId()}/details`]) {
    assert.equal((await call(ctx.cook, "get", path)).status, 403);
  }
  assert.equal((await call(ctx.cook, "post", "").send({ allocations: [allocation()] })).status, 403);
  const missing = await call(ctx.admin, "get", `/${new mongoose.Types.ObjectId()}/details`);
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { message: "Log not found" });
});
