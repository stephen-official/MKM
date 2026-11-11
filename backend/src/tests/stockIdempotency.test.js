import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { Consumption, Distribution, GodownStock, PurchaseOrder, Request } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { StockCommand } from "../models/StockCommandModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await StockCommand.init(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const a = await createGodown("Source");
  const b = await createGodown("Destination");
  ctx = {
    a, b, rice: items.Rice, stock: await stockRow(a, items.Rice, 20),
    cook: await createUser({ role: "user", godownId: a._id }),
    receiver: await createUser({ role: "user", godownId: b._id }),
    admin: await createUser({ role: "admin" }), root: await createUser({ role: "super_admin" }),
  };
});
const call = (actor, method, path, key) => {
  const result = request(app)[method](path).set("Authorization", `Bearer ${actor.token}`);
  return key === undefined ? result : result.set("Idempotency-Key", key);
};
const usage = () => ({ date: "2026-10-12", items: [{ stockRecordId: ctx.stock._id, qtyBaseUnit: 3 }] });
const stock = async () => (await GodownStock.findById(ctx.stock._id)).qtyBaseUnit;

test("simultaneous retries create one usage record and deduct stock once", async () => {
  const responses = await Promise.all(Array.from({ length: 4 }, () => call(ctx.cook, "post", "/api/consumptions", "same-usage").send(usage())));
  for (const response of responses) {
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.deepEqual(response.body, responses[0].body);
    assert.equal(response.body.items[0].amountAtIssue, undefined, "cached outcomes still pass through kitchen price filtering");
  }
  assert.equal(await Consumption.countDocuments(), 1);
  assert.equal(await stock(), 17);
  assert.equal(await StockCommand.countDocuments(), 1);
});

test("retry keys normalize operations and orders aliases, and object-key ordering", async () => {
  const first = await call(ctx.cook, "post", "/api/orders", "alias").send(usage());
  const second = await call(ctx.cook, "post", "/api/operations/consumptions", "alias").send({ items: usage().items, date: usage().date });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.deepEqual(second.body, first.body);
  const caseAlias = await call(ctx.cook, "post", "/api/Operations/Orders/", "alias").send(usage());
  assert.deepEqual(caseAlias.body, first.body);
  assert.equal(await stock(), 17);
});

test("changed input conflicts and invalid keys fail without moving stock", async () => {
  await call(ctx.cook, "post", "/api/consumptions", "conflict").send(usage());
  const changed = await call(ctx.cook, "post", "/api/consumptions", "conflict").send({ ...usage(), items: [{ stockRecordId: ctx.stock._id, qtyBaseUnit: 4 }] });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.code, "IDEMPOTENCY_CONFLICT");
  const invalid = await call(ctx.cook, "post", "/api/consumptions", "bad key").send(usage());
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_IDEMPOTENCY_KEY");
  assert.equal(await stock(), 17);
});

test("a failed transaction leaves its key available for a later successful retry", async () => {
  const body = { ...usage(), items: [{ stockRecordId: ctx.stock._id, qtyBaseUnit: 25 }] };
  const refused = await call(ctx.cook, "post", "/api/consumptions", "retry-failure").send(body);
  assert.equal(refused.status, 400);
  assert.equal(await StockCommand.countDocuments(), 0);
  await GodownStock.findByIdAndUpdate(ctx.stock._id, { qtyBaseUnit: 30 });
  assert.equal((await call(ctx.cook, "post", "/api/consumptions", "retry-failure").send(body)).status, 201);
  assert.equal(await stock(), 5);
});

test("keys are actor-scoped and requests without a key keep their original behavior", async () => {
  const other = await createUser({ role: "user", godownId: ctx.a._id });
  assert.equal((await call(ctx.cook, "post", "/api/consumptions", "actor").send(usage())).status, 201);
  assert.equal((await call(other, "post", "/api/consumptions", "actor").send(usage())).status, 201);
  for (let i = 0; i < 2; i++) assert.equal((await call(ctx.cook, "post", "/api/consumptions").send(usage())).status, 201);
  assert.equal(await Consumption.countDocuments(), 4);
  assert.equal(await stock(), 8);
});

test("retrying an edit returns its committed outcome even after a later edit", async () => {
  const created = await call(ctx.cook, "post", "/api/consumptions").send(usage());
  const path = `/api/consumptions/${created.body._id}`;
  const edit = (qty) => ({ items: [{ stockItemId: ctx.rice._id, stockRecordId: ctx.stock._id, qtyBaseUnit: qty }] });
  const first = await call(ctx.admin, "patch", path, "edit").send(edit(5));
  assert.equal(first.status, 200, JSON.stringify(first.body));
  await call(ctx.admin, "patch", path).send(edit(6));
  const replay = await call(ctx.admin, "patch", path, "edit").send(edit(5));
  assert.deepEqual(replay.body, first.body);
  assert.equal(await stock(), 14);
});

test("retrying a deletion restores stock only once and keeps the success response", async () => {
  const created = await call(ctx.cook, "post", "/api/consumptions").send(usage());
  const path = `/api/consumptions/${created.body._id}`;
  const first = await call(ctx.admin, "delete", path, "delete");
  const second = await call(ctx.admin, "delete", path, "delete");
  assert.equal(first.status, 200);
  assert.deepEqual(second.body, first.body);
  assert.equal(await stock(), 20);
});

test("distribution and stock-removal retries do not recreate stock or batches", async () => {
  const body = { allocations: [{ godownId: ctx.b._id, stockItemId: ctx.rice._id, qtyBaseUnit: 5, unitPrice: 10 }] };
  const path = "/api/procurement/distributions";
  const first = await call(ctx.admin, "post", path, "distribution").send(body);
  const second = await call(ctx.admin, "post", path, "distribution").send(body);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.deepEqual(second.body, first.body);
  assert.equal(await Distribution.countDocuments(), 1);
  assert.equal(await StockBatch.countDocuments({ sourceType: "distribution" }), 1);
  const target = await GodownStock.findOne({ godownId: ctx.b._id });
  const remove = `/api/procurement/godown-stocks/${target._id}`;
  const deleted = await call(ctx.admin, "delete", remove, "remove");
  const replay = await call(ctx.admin, "delete", remove, "remove");
  assert.equal(deleted.status, 200);
  assert.deepEqual(replay.body, deleted.body);
  assert.equal((await StockBatch.findOne({ godownId: ctx.b._id })).remainingQtyBaseUnit, 0);
});

test("request approval and transfer acceptance retries preserve successful responses", async () => {
  const asked = await Request.create({ godownId: ctx.a._id, userId: ctx.cook.user._id, targetDate: "2026-10-12", reason: "Usage", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 2 }] });
  for (let i = 0; i < 2; i++) {
    const response = await call(ctx.admin, "post", `/api/requests/${asked._id}/approve`, "approve").send({});
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
  const transfer = await call(ctx.cook, "post", "/api/user-transfers").send({ toGodownId: ctx.b._id, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 3 }] });
  for (let i = 0; i < 2; i++) {
    const response = await call(ctx.receiver, "post", `/api/user-transfers/${transfer.body._id}/accept`, "accept").send({});
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
  assert.equal(await stock(), 15);
  assert.equal((await GodownStock.findOne({ godownId: ctx.b._id })).qtyBaseUnit, 3);
});

test("opening-balance and threshold retries retain original outcomes", async () => {
  const body = { godownId: ctx.b._id, stockItemId: ctx.rice._id, quantityBaseUnit: 5, effectiveDate: "2020-01-17", reason: "Initial count" };
  const first = await call(ctx.root, "post", "/api/procurement/opening-balances", "opening").send(body);
  const second = await call(ctx.root, "post", "/api/procurement/opening-balances", "opening").send(body);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.deepEqual(second.body, first.body);
  const path = `/api/procurement/godown-stocks/${ctx.stock._id}/threshold`;
  const threshold = await call(ctx.admin, "post", path, "threshold").send({ thresholdBaseUnit: 4 });
  await call(ctx.admin, "post", path).send({ thresholdBaseUnit: 7 });
  const replay = await call(ctx.admin, "post", path, "threshold").send({ thresholdBaseUnit: 4 });
  assert.deepEqual(replay.body, threshold.body);
  assert.equal((await GodownStock.findById(ctx.stock._id)).thresholdBaseUnit, 7);
});

test("partial supply receipts do not add the same received quantity twice", async () => {
  const asked = await call(ctx.cook, "post", "/api/indent-requests").send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }] });
  assert.equal(asked.status, 201, JSON.stringify(asked.body));
  await call(ctx.admin, "patch", `/api/indent-requests/${asked.body._id}/confirm`).send({ items: [{ stockItemId: ctx.rice._id }] });
  const path = `/api/indent-requests/${asked.body._id}/receive`;
  const body = { items: [{ stockItemId: ctx.rice._id, receivedQty: 3 }] };
  const first = await call(ctx.cook, "post", path, "partial-receive").send(body);
  const retry = await call(ctx.cook, "post", path, "partial-receive").send(body);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.deepEqual(retry.body, first.body);
  assert.equal(first.body.request.status, "partially_received");
  assert.equal(await stock(), 23);
  assert.equal(await StockBatch.countDocuments({ sourceType: "indent_receipt" }), 1);
});

test("purchase-order retries create one intake and preserve the creation response", async () => {
  const indent = await call(ctx.admin, "post", "/api/procurement/indents").send({ items: [{ stockItemId: ctx.rice._id, orderedQty: 10, unitPrice: 12 }] });
  const body = { indentId: indent.body._id, items: [{ stockItemId: ctx.rice._id, orderedQty: 10, receivedQty: 10, unitPrice: 12 }] };
  const path = "/api/procurement/purchase-orders";
  const first = await call(ctx.admin, "post", path, "intake").send(body);
  const retry = await call(ctx.admin, "post", path, "intake").send(body);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.deepEqual(retry.body, first.body);
  assert.equal(await PurchaseOrder.countDocuments(), 1);
});
