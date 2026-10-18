import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const [kitchenA, kitchenB] = await Promise.all([createGodown("Kitchen A"), createGodown("Kitchen B")]);
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const [rice, dal] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Dal", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 80 },
  ]);
  ctx = {
    kitchenA, kitchenB, rice, dal,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const createOrder = () => call(ctx.cookA, "post", "/").send({
  title: "Weekly staples", neededBy: "2026-10-25", orderNote: "Combine vendor delivery",
  note: "Kitchen A quantities", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 20 }],
});

test("a kitchen opens an order that all kitchens and admins can see", async () => {
  const created = await createOrder();
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.match(created.body.orderNo, /^CPO-/);
  assert.equal(created.body.kitchenCount, 1);
  assert.equal(created.body.combinedItems[0].qtyBaseUnit, 20);

  for (const actor of [ctx.cookA, ctx.cookB, ctx.admin]) {
    const list = await call(actor, "get", "/");
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].createdByGodown.name, "Kitchen A");
  }
  assert.equal((await call(ctx.admin, "post", "/").send({ items: [] })).status, 403);
});

test("another kitchen adds, edits and removes its own contribution", async () => {
  const order = (await createOrder()).body;
  const added = await call(ctx.cookB, "post", `/${order._id}/contributions`).send({
    note: "Kitchen B quantities",
    items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 5 }, { stockItemId: ctx.dal._id, qtyBaseUnit: 8 }],
  });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  assert.equal(added.body.kitchenCount, 2);
  assert.equal(added.body.combinedItems.find((line) => line.stockItemId.name === "Rice").qtyBaseUnit, 25);

  const duplicate = await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }] });
  assert.equal(duplicate.status, 409);

  const edited = await call(ctx.cookB, "put", `/${order._id}/contributions/me`).send({ items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 10 }] });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.combinedItems.find((line) => line.stockItemId.name === "Dal").qtyBaseUnit, 10);

  const removed = await call(ctx.cookB, "delete", `/${order._id}/contributions/me`);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.kitchenCount, 1);
  assert.equal((await call(ctx.cookA, "delete", `/${order._id}/contributions/me`)).status, 409);
});

test("admins control lifecycle and closed orders reject kitchen changes", async () => {
  const order = (await createOrder()).body;
  assert.equal((await call(ctx.cookA, "patch", `/${order._id}/status`).send({ status: "closed" })).status, 403);
  const closed = await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "closed" });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.status, "closed");
  assert.equal((await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 2 }] })).status, 409);
  assert.equal((await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered" })).body.status, "ordered");
  assert.equal((await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "open" })).status, 409);
});

test("invalid products and quantities are rejected", async () => {
  const empty = await call(ctx.cookA, "post", "/").send({ items: [] });
  assert.equal(empty.status, 400);
  const negative = await call(ctx.cookA, "post", "/").send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: -1 }] });
  assert.equal(negative.status, 400);
  assert.equal(await CollaborativePurchaseOrder.countDocuments(), 0);
});
