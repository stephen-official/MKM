import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { Consumption, GodownStock, Notification, Request } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const kitchen = await createGodown("Kitchen");
  ctx = {
    kitchen, items, rice: await stockRow(kitchen, items.Rice, 20), dal: await stockRow(kitchen, items.Dal, 1),
    cook: await createUser({ role: "user", godownId: kitchen._id }),
    other: await createUser({ role: "user", godownId: kitchen._id }), admin: await createUser({ role: "admin" }),
  };
  await StockBatch.create({ godownId: kitchen._id, stockItemId: items.Rice._id, sourceType: "opening_balance", receivedQtyBaseUnit: 20, remainingQtyBaseUnit: 20, unitPrice: 10 });
});
const call = (actor, method, path, base = "/api") => request(app)[method](`${base}/requests${path}`).set("Authorization", `Bearer ${actor.token}`);
const body = () => ({ targetDate: "2026-10-12", reason: "Daily usage", items: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 3 }] });

test("request creation keeps user ownership, notification and list privacy through both mounts", async () => {
  const created = await call(ctx.cook, "post", "", "/api/operations").send({ ...body(), userId: ctx.other.user._id, status: "approved", requestType: "daily_usage" });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.userId, String(ctx.cook.user._id));
  assert.equal(created.body.status, "pending");
  assert.equal(created.body.requestType, "usage");
  assert.equal(await Notification.countDocuments({ type: "request_created" }), 1);
  for (const base of ["/api", "/api/operations"]) {
    const list = await call(ctx.cook, "get", "", base);
    assert.equal(list.body[0].items[0].stockItemId.name, "Rice");
    assert.equal((await call(ctx.other, "get", "", base)).body.length, 0);
    assert.equal((await call(ctx.admin, "get", "", base)).body.length, 1);
  }
  assert.equal((await call(ctx.admin, "post", "").send(body())).status, 403);
});

test("approval moves stock and valuation once while retaining authorization and response", async () => {
  const id = (await call(ctx.cook, "post", "").send(body())).body._id;
  assert.equal((await call(ctx.cook, "post", `/${id}/approve`).send({})).status, 403);
  const approved = await call(ctx.admin, "post", `/${id}/approve`, "/api/operations").send({ note: "Checked" });
  assert.equal(approved.status, 200);
  assert.deepEqual(approved.body, { message: "Status updated and Godown stock synced" });
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 17);
  assert.equal((await Consumption.findOne()).items[0].amountAtIssue, 30);
  assert.equal((await Request.findById(id)).adminDecision, "Checked");
  const twice = await call(ctx.admin, "post", `/${id}/approve`).send({});
  assert.equal(twice.status, 400);
  assert.deepEqual(twice.body, { error: "Request already processed" });
  assert.equal(await Consumption.countDocuments(), 1);
});

test("request approval rolls back earlier lines if a later line has insufficient stock", async () => {
  const created = await call(ctx.cook, "post", "").send({ ...body(), items: [...body().items, { stockItemId: ctx.items.Dal._id, qtyBaseUnit: 5 }] });
  const approved = await call(ctx.admin, "post", `/${created.body._id}/approve`).send({});
  assert.equal(approved.status, 400);
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 20);
  assert.equal((await StockBatch.findOne({ stockItemId: ctx.items.Rice._id })).remainingQtyBaseUnit, 20);
  assert.equal(await Consumption.countDocuments(), 0);
  assert.equal((await Request.findById(created.body._id)).status, "pending");
});

test("rejection preserves the decision and leaves stock unchanged", async () => {
  const id = (await call(ctx.cook, "post", "").send(body())).body._id;
  const rejected = await call(ctx.admin, "post", `/${id}/reject`, "/api/operations").send({ note: "Use existing allocation" });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "rejected");
  assert.equal(rejected.body.adminDecision, "Use existing allocation");
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 20);
  assert.equal(await Consumption.countDocuments(), 0);
});

test("an approved request cannot be rejected afterwards, and an unknown one is a 404", async () => {
  const id = (await call(ctx.cook, "post", "").send(body())).body._id;
  assert.equal((await call(ctx.admin, "post", `/${id}/approve`).send({})).status, 200);
  const rejected = await call(ctx.admin, "post", `/${id}/reject`).send({ note: "Too late" });
  assert.equal(rejected.status, 409);
  assert.deepEqual(rejected.body, { error: "Request already processed" });
  const saved = await Request.findById(id).lean();
  assert.deepEqual([saved.status, saved.adminDecision], ["approved", "Approved"]);

  const missing = await call(ctx.admin, "post", "/000000000000000000000000/reject").send({});
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { error: "Request not found" });
});
