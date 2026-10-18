import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { GodownStock, IndentRequest, Notification, Request, Transfer } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { User } from "../models/User.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let ctx;
before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  const a = await createGodown("Kitchen A");
  const b = await createGodown("Kitchen B");
  const c = await createGodown("Kitchen C");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id });
  const stockA = await GodownStock.create({ godownId: a._id, stockItemId: rice._id, qtyBaseUnit: 50 });
  await GodownStock.create({ godownId: b._id, stockItemId: rice._id, qtyBaseUnit: 20 });
  const userA = await createUser({ role: "user", godownId: a._id });
  const userB = await createUser({ role: "user", godownId: b._id });
  const admin = await createUser({ role: "admin" });
  const superAdmin = await createUser({ role: "super_admin" });
  ctx = { a, b, c, rice, stockA, userA, userB, admin, superAdmin };
});

const as = (who) => (method, url) =>
  request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);

test("GET /requests: super_admin sees every kitchen's requests, like admin", async () => {
  await Request.create([
    { godownId: ctx.a._id, userId: ctx.userA.user._id, targetDate: "2026-10-01", reason: "r", items: [] },
    { godownId: ctx.b._id, userId: ctx.userB.user._id, targetDate: "2026-10-01", reason: "r", items: [] }
  ]);
  assert.equal((await as("superAdmin")("get", "/api/requests")).body.length, 2);
  assert.equal((await as("admin")("get", "/api/requests")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/requests")).body.length, 1);
});

test("GET /transfers, /godown-stocks, /notifications are unfiltered for super_admin", async () => {
  await Transfer.create([
    { fromGodownId: ctx.a._id, toGodownId: ctx.b._id, createdBy: ctx.admin.user._id, items: [] },
    { fromGodownId: ctx.c._id, toGodownId: ctx.b._id, createdBy: ctx.admin.user._id, items: [] }
  ]);
  await Notification.create([
    { type: "t", payload: { godownId: String(ctx.a._id) } },
    { type: "t", payload: { godownId: String(ctx.b._id) } }
  ]);
  assert.equal((await as("superAdmin")("get", "/api/transfers")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/transfers")).body.length, 1);
  assert.equal((await as("superAdmin")("get", "/api/godown-stocks")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/godown-stocks")).body.length, 1);
  assert.equal((await as("superAdmin")("get", "/api/notifications")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/notifications")).body.length, 1);
});

test("the /api/operations alias behaves the same", async () => {
  await Request.create({ godownId: ctx.b._id, userId: ctx.userB.user._id, targetDate: "2026-10-01", reason: "r", items: [] });
  assert.equal((await as("superAdmin")("get", "/api/operations/requests")).body.length, 1);
});

test("POST /transfers: super_admin chooses the source kitchen, like admin", async () => {
  const res = await as("superAdmin")("post", "/api/transfers").send({
    fromGodownId: ctx.a._id, toGodownId: ctx.b._id, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 5 }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(String(res.body.fromGodownId), String(ctx.a._id));
});

test("POST /consumptions: super_admin records against the kitchen in the body", async () => {
  const res = await as("superAdmin")("post", "/api/consumptions").send({
    godownId: ctx.a._id, date: "2026-10-12", items: [{ stockRecordId: ctx.stockA._id, qtyBaseUnit: 2 }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(String(res.body.godownId._id), String(ctx.a._id));
});

test("indent requests: super_admin is not subject to kitchen ownership rules", async () => {
  const supply = await IndentRequest.create({
    godownId: ctx.a._id, userId: ctx.userA.user._id, status: "confirmed",
    items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 4, status: "approved" }]
  });
  const received = await as("superAdmin")("post", `/api/indent-requests/${supply._id}/receive`)
    .send({ items: [{
      stockItemId: ctx.rice._id,
      receivedQty: 4,
      expiryDate: "2027-01-31",
      lotNumber: "RICE-31",
      condition: "partial_damage",
      notes: "One outer sack torn",
    }] });
  assert.equal(received.status, 200, JSON.stringify(received.body));
  const batch = await StockBatch.findOne({ sourceType: "indent_receipt", sourceId: supply._id });
  assert.equal(batch.expiryDate.toISOString().slice(0, 10), "2027-01-31");
  assert.equal(batch.lotNumber, "RICE-31");
  assert.equal(batch.condition, "partial_damage");
  assert.equal(batch.notes, "One outer sack torn");
  const deleted = await as("superAdmin")("delete", `/api/indent-requests/${supply._id}`);
  assert.equal(deleted.status, 200);
});

test("indent requests: a kitchen user who does not own the request is still forbidden (ownership rules stay guarded)", async () => {
  const supply = await IndentRequest.create({
    godownId: ctx.a._id, userId: ctx.userA.user._id, status: "confirmed",
    items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 4, status: "approved" }]
  });
  const received = await as("userB")("post", `/api/indent-requests/${supply._id}/receive`)
    .send({ items: [{ stockItemId: ctx.rice._id, receivedQty: 4 }] });
  assert.equal(received.status, 403, JSON.stringify(received.body));
  const deleted = await as("userB")("delete", `/api/indent-requests/${supply._id}`);
  assert.equal(deleted.status, 403, JSON.stringify(deleted.body));
  assert.ok(await IndentRequest.exists({ _id: supply._id }));
});

test("admin-only routes admit super_admin; user-only routes reject it exactly like admin", async () => {
  for (const url of ["/api/consumptions", "/api/procurement/indents", "/api/reports/indents", "/api/product-ledger/godowns"]) {
    assert.equal((await as("superAdmin")("get", url)).status, 200, url);
  }
  const create = await as("superAdmin")("post", "/api/requests").send({ targetDate: "2026-10-01", reason: "x", items: [] });
  assert.equal(create.status, 403);
  const adminCreate = await as("admin")("post", "/api/requests").send({ targetDate: "2026-10-01", reason: "x", items: [] });
  assert.equal(adminCreate.status, 403);
});

test("demoted super-admin is forbidden on next request; deactivated is unauthorised", async () => {
  await User.updateOne({ _id: ctx.superAdmin.user._id }, { role: "user" });
  assert.equal((await as("superAdmin")("get", "/api/consumptions")).status, 403);
  await User.updateOne({ _id: ctx.superAdmin.user._id }, { role: "super_admin", active: false });
  assert.equal((await as("superAdmin")("get", "/api/consumptions")).status, 401);
});
