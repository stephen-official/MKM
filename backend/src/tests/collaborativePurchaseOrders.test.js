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
  title: "Weekly staples", neededIn: "1w", orderNote: "Combine vendor delivery",
  note: "Kitchen A quantities", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 20 }],
});

test("a kitchen opens an order that all kitchens and admins can see", async () => {
  const created = await createOrder();
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.match(created.body.orderNo, /^CPO-/);
  assert.equal(created.body.kitchenCount, 1);
  assert.equal(created.body.contributions[0].items[0].qtyBaseUnit, 20);
  assert.equal((await call(ctx.admin, "get", `/${created.body._id}`)).body.combinedItems[0].qtyBaseUnit, 20);

  for (const actor of [ctx.cookA, ctx.cookB, ctx.admin]) {
    const list = await call(actor, "get", "/");
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].createdByGodown.name, "Kitchen A");
  }
  assert.equal((await call(ctx.admin, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }] })).status, 400);
});

test("another kitchen adds, edits and removes its own contribution", async () => {
  const order = (await createOrder()).body;
  const added = await call(ctx.cookB, "post", `/${order._id}/contributions`).send({
    note: "Kitchen B quantities",
    items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 5 }, { stockItemId: ctx.dal._id, qtyBaseUnit: 8 }],
  });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  assert.equal(added.body.kitchenCount, 2);
  const own = (body, name) => body.contributions.find((c) => c.godownId.name === name);
  assert.equal(own(added.body, "Kitchen B").items.length, 2);
  assert.equal((await call(ctx.admin, "get", `/${order._id}`)).body.combinedItems.find((line) => line.stockItemId.name === "Rice").qtyBaseUnit, 25);

  const duplicate = await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }] });
  assert.equal(duplicate.status, 409);

  const edited = await call(ctx.cookB, "put", `/${order._id}/contributions/me`).send({ items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 10 }] });
  assert.equal(edited.status, 200);
  assert.equal(own(edited.body, "Kitchen B").items.find((line) => line.stockItemId.name === "Dal").qtyBaseUnit, 10);

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
  const empty = await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [] });
  assert.equal(empty.status, 400);
  const negative = await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: -1 }] });
  assert.equal(negative.status, 400);
  assert.equal(await CollaborativePurchaseOrder.countDocuments(), 0);
});

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const near = (actual, expectedMs) => assert.ok(Math.abs(new Date(actual).getTime() - expectedMs) < 60_000, `${actual} is not near ${new Date(expectedMs).toISOString()}`);

test("the server sets needed-by and the ordering window from the chosen option", async () => {
  const before = Date.now();
  const order = (await createOrder()).body;
  assert.equal(order.emergency, false);
  near(order.neededBy, before + 7 * DAY);
  near(order.closesAt, before + 4 * DAY);

  const urgent = await call(ctx.cookB, "post", "/").send({ emergency: true, items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 2 }] });
  assert.equal(urgent.status, 201, JSON.stringify(urgent.body));
  assert.equal(urgent.body.emergency, true);
  near(urgent.body.neededBy, before + HOUR);
  near(urgent.body.closesAt, before + 15 * 60_000);
});

test("an order needs a known needed-by option", async () => {
  for (const body of [{}, { neededIn: "5y" }, { neededBy: "2026-10-25" }]) {
    const res = await call(ctx.cookA, "post", "/").send({ ...body, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }] });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "INVALID_INPUT");
  }
  assert.equal(await CollaborativePurchaseOrder.countDocuments(), 0);
});

test("once the ordering window passes the order is closed and refuses changes", async () => {
  const order = (await createOrder()).body;
  await CollaborativePurchaseOrder.updateOne({ _id: order._id }, { closesAt: new Date(Date.now() - 1000) });

  const join = await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 2 }] });
  assert.equal(join.status, 409);
  assert.equal(join.body.code, "ORDER_CLOSED");
  const edit = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 3 }] });
  assert.equal(edit.body.code, "ORDER_CLOSED");

  const read = await call(ctx.cookA, "get", `/${order._id}`);
  assert.equal(read.body.status, "closed");
  assert.equal(read.body.statusChangedBy, null);
  assert.equal((await call(ctx.admin, "get", "/?status=open")).body.total, 0);
});

test("a closed order is never reopened", async () => {
  const order = (await createOrder()).body;
  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "closed" });
  const reopen = await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "open" });
  assert.equal(reopen.status, 409);
  assert.equal(reopen.body.code, "CONFLICT");
});

test("an admin opens an order on a kitchen's behalf with the same window rules", async () => {
  const before = Date.now();
  const res = await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenB._id, neededIn: "3d", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 40 }] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.createdByGodown.name, "Kitchen B");
  assert.equal(res.body.contributions[0].godownId.name, "Kitchen B");
  near(res.body.closesAt, before + 18 * HOUR);

  // Kitchen B's share is its own: it can edit it, and cannot join the order a second time.
  assert.equal((await call(ctx.cookB, "put", `/${res.body._id}/contributions/me`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 30 }] })).status, 200);
  assert.equal((await call(ctx.cookB, "post", `/${res.body._id}/contributions`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }] })).body.code, "ALREADY_JOINED");
});

test("an admin cannot order a product kitchens are not allowed to use", async () => {
  await StockItem.updateOne({ _id: ctx.dal._id }, { archived: true });
  const res = await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenB._id, neededIn: "1w", items: [{ stockItemId: ctx.dal._id, qtyBaseUnit: 5 }] });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "PRODUCT_UNAVAILABLE");
});
