import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { GodownStock, Transfer } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const a = await createGodown("Source");
  const b = await createGodown("Destination");
  const c = await createGodown("Other");
  ctx = {
    a, b, c, items,
    rice: await stockRow(a, items.Rice, 20), dal: await stockRow(a, items.Dal, 10),
    cookA: await createUser({ role: "user", godownId: a._id }),
    cookB: await createUser({ role: "user", godownId: b._id }),
    cookC: await createUser({ role: "user", godownId: c._id }),
    admin: await createUser({ role: "admin" }),
  };
  await StockBatch.create({ godownId: a._id, stockItemId: items.Rice._id, sourceType: "opening_balance", receivedQtyBaseUnit: 20, remainingQtyBaseUnit: 20, unitPrice: 12, expiryDate: new Date("2030-01-31"), lotNumber: "R-1" });
});
const call = (actor, method, path, base = "/api") => request(app)[method](`${base}${path}`).set("Authorization", `Bearer ${actor.token}`);
const body = () => ({ toGodownId: ctx.b._id, items: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 5 }] });
const create = () => call(ctx.cookA, "post", "/user-transfers").send(body());

test("transfer acceptance preserves balances, batch provenance, visibility and both URL aliases", async () => {
  const created = await create();
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 20, "pending transfers do not reserve stock");
  const id = created.body._id;
  for (const base of ["/api", "/api/operations"]) {
    const incoming = await call(ctx.cookB, "get", "/user-transfers/incoming", base);
    assert.equal(incoming.status, 200);
    assert.equal(incoming.body[0].fromGodownId.name, "Source");
    assert.equal(incoming.body[0].items[0].stockItemId.name, "Rice");
    assert.equal((await call(ctx.cookC, "get", "/transfers", base)).body.length, 0);
    assert.equal((await call(ctx.admin, "get", "/transfers", base)).body.length, 1);
  }
  assert.equal((await call(ctx.cookC, "post", `/user-transfers/${id}/accept`)).status, 400);
  const accepted = await call(ctx.cookB, "post", `/user-transfers/${id}/accept`, "/api/operations");
  assert.deepEqual(accepted.body, { message: "Transfer Accepted" });
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 15);
  assert.equal((await GodownStock.findOne({ godownId: ctx.b._id, stockItemId: ctx.items.Rice._id })).qtyBaseUnit, 5);
  const batch = await StockBatch.findOne({ sourceType: "transfer" });
  assert.equal(batch.unitPrice, 12);
  assert.equal(batch.lotNumber, "R-1");
  assert.equal(batch.expiryDate.toISOString(), "2030-01-31T00:00:00.000Z");
  assert.equal(String(batch.sourceId), id);
  assert.equal((await call(ctx.cookB, "post", `/user-transfers/${id}/accept`)).status, 400);
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 15);
  assert.equal((await call(ctx.cookA, "get", "/user-transfers/history")).body[0].status, "accepted");
});

test("rejecting a transfer retains the legacy authorization, response and unchanged stock", async () => {
  const id = (await create()).body._id;
  assert.equal((await call(ctx.cookC, "post", `/user-transfers/${id}/reject`)).status, 403);
  const rejected = await call(ctx.cookB, "post", `/user-transfers/${id}/reject`, "/api/operations");
  assert.deepEqual(rejected.body, { message: "Rejected" });
  assert.equal((await Transfer.findById(id)).status, "rejected");
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 20);
  assert.equal((await call(ctx.cookB, "get", "/user-transfers/incoming")).body.length, 0);
});

test("a later insufficient line rolls back earlier stock and batch changes", async () => {
  const created = await call(ctx.cookA, "post", "/user-transfers").send({ ...body(), items: [...body().items, { stockItemId: ctx.items.Dal._id, qtyBaseUnit: 5 }] });
  await GodownStock.findByIdAndUpdate(ctx.dal._id, { qtyBaseUnit: 1 });
  const accepted = await call(ctx.cookB, "post", `/user-transfers/${created.body._id}/accept`);
  assert.equal(accepted.status, 400);
  assert.equal((await GodownStock.findById(ctx.rice._id)).qtyBaseUnit, 20);
  assert.equal((await StockBatch.findOne({ stockItemId: ctx.items.Rice._id })).remainingQtyBaseUnit, 20);
  assert.equal(await StockBatch.countDocuments({ sourceType: "transfer" }), 0);
  assert.equal(await GodownStock.countDocuments({ godownId: ctx.b._id }), 0);
  assert.equal((await Transfer.findById(created.body._id)).status, "pending");
});

test("admin transfer creation and kitchen validation retain their distinct contracts", async () => {
  const created = await call(ctx.admin, "post", "/transfers", "/api/operations").send({ ...body(), fromGodownId: ctx.a._id });
  assert.equal(created.status, 201);
  assert.deepEqual((await call(ctx.admin, "post", "/transfers").send(body())).body, { error: "Source and Destination required" });
  const invalid = await call(ctx.cookA, "post", "/user-transfers").send({ ...body(), items: [{ stockItemId: ctx.items.Rice._id, qtyBaseUnit: 0 }] });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { error: "Transfer quantity must be greater than zero" });
  assert.equal((await call(ctx.admin, "post", "/user-transfers").send(body())).status, 403);
});

test("an accepted transfer cannot be rejected afterwards", async () => {
  const id = (await call(ctx.cookA, "post", "/user-transfers").send(body())).body._id;
  assert.equal((await call(ctx.cookB, "post", `/user-transfers/${id}/accept`)).status, 200);
  const rejected = await call(ctx.cookB, "post", `/user-transfers/${id}/reject`);
  assert.equal(rejected.status, 409);
  assert.deepEqual(rejected.body, { error: "Already processed" });
  assert.equal((await Transfer.findById(id)).status, "accepted");
});
