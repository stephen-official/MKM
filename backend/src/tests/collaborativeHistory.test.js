import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { Supplier } from "../models/SupplierModel.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

// Every change to a shared order leaves an event in its history: who did what, when, to which kitchen and items.

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const [kitchenA, kitchenB] = await Promise.all([createGodown("Kitchen A"), createGodown("Kitchen B")]);
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const [rice, dal, oil] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Dal", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 80 },
    { name: "Oil", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 150 },
  ]);
  ctx = {
    kitchenA, kitchenB, rice, dal, oil,
    supplier: await Supplier.create({ name: "Sri Lakshmi Traders", nameKey: "sri lakshmi traders", fssaiLicence: "12345678901234" }),
    cookA: await createUser({ role: "user", godownId: kitchenA._id, name: "Cook A" }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id, name: "Cook B" }),
    admin: await createUser({ role: "admin", name: "Asha" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const line = (product, qtyBaseUnit) => ({ stockItemId: product._id, qtyBaseUnit });
const idOf = (ref) => String(ref?._id || ref);
const actions = (body) => body.events.map((event) => event.action);
const last = (body) => body.events[body.events.length - 1];

test("each step of an order's life is recorded, in order, with who did it", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10), line(ctx.dal, 4)] })).body;
  const id = order._id;
  await call(ctx.cookB, "post", `/${id}/contributions`).send({ items: [line(ctx.rice, 5)] });
  await call(ctx.cookB, "put", `/${id}/contributions/me`).send({ items: [line(ctx.rice, 6), line(ctx.oil, 1)] });
  await call(ctx.admin, "post", `/${id}/approve`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] });
  await call(ctx.admin, "post", `/${id}/reject`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Dal in stock" });
  await call(ctx.admin, "post", `/${id}/adjust`).send({ godownId: ctx.kitchenB._id, stockItemId: ctx.rice._id, quantity: 4 });
  await call(ctx.admin, "post", `/${id}/approve`).send({});
  await call(ctx.admin, "patch", `/${id}/purchase`).send({ invoiceNo: "INV-7" });
  await call(ctx.admin, "patch", `/${id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  await call(ctx.admin, "post", `/${id}/dispatch`).send({ godownId: ctx.kitchenA._id });
  const receipt = { items: [{ stockItemId: ctx.rice._id, expiryDate: "2030-01-01", photos: { goods: "/uploads/receipts/g.jpg", label: "/uploads/receipts/l.jpg" } }] };
  assert.equal((await call(ctx.cookA, "post", `/${id}/receive`).send(receipt)).status, 200);

  const res = await call(ctx.admin, "get", `/${id}`);
  assert.deepEqual(actions(res.body), [
    "raised", "joined", "edited", "approved", "rejected", "quantity_changed", "approved",
    "purchase_updated", "status_changed", "dispatched", "received",
  ]);
  const [raised, joined, edited, approvedLine, rejected, changed, approvedAll, purchase, ordered, dispatched, received] = res.body.events;

  assert.equal(raised.actorRole, "kitchen");
  assert.equal(raised.actorId.name, "Cook A", "the actor's name comes with the event");
  assert.equal(raised.godownId.name, "Kitchen A");
  assert.equal(raised.toStatus, "open");
  assert.deepEqual(raised.items.map((item) => [item.stockItemId.name, item.qtyBaseUnit]), [["Rice", 10], ["Dal", 4]]);
  assert.ok(raised.at);

  assert.equal(joined.godownId.name, "Kitchen B");
  assert.deepEqual(edited.items.map((item) => [item.stockItemId.name, item.qtyBaseUnit]), [["Rice", 6], ["Oil", 1]], "an edit records the new list");

  assert.equal(approvedLine.actorRole, "admin");
  assert.equal(approvedLine.actorId.name, "Asha");
  assert.deepEqual(approvedLine.items.map((item) => item.stockItemId.name), ["Rice"]);
  assert.equal(rejected.note, "Dal in stock");
  assert.deepEqual(rejected.items.map((item) => item.stockItemId.name), ["Dal"]);
  assert.deepEqual([changed.godownId.name, changed.items[0].fromQtyBaseUnit, changed.items[0].qtyBaseUnit], ["Kitchen B", 6, 4]);
  assert.equal(approvedAll.godownId, null, "approve all is order-wide");
  assert.deepEqual([approvedAll.fromStatus, approvedAll.toStatus], ["open", "approved"]);
  assert.match(purchase.note, /INV-7/);
  assert.deepEqual([ordered.fromStatus, ordered.toStatus], ["approved", "ordered"]);
  assert.equal(dispatched.godownId.name, "Kitchen A");
  assert.equal(received.actorRole, "kitchen");
  assert.deepEqual(received.items.map((item) => [item.stockItemId.name, item.qtyBaseUnit]), [["Rice", 10]]);
});

test("approve and send records the raise and the approval", async () => {
  const res = await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenA._id, neededIn: "1w", approve: true, items: [line(ctx.rice, 20)] });
  assert.deepEqual(actions(res.body), ["raised", "approved"]);
  assert.ok(res.body.events.every((event) => event.actorRole === "admin" && event.godownId.name === "Kitchen A"));
});

test("an order that closes when its ordering window ends records that the system closed it", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] })).body;
  await CollaborativePurchaseOrder.updateOne({ _id: order._id }, { $set: { closesAt: new Date(Date.now() - 60_000) } });
  const res = await call(ctx.admin, "get", `/${order._id}`);
  assert.equal(res.body.status, "closed");
  const closed = last(res.body);
  assert.deepEqual([closed.action, closed.actorRole, closed.actorId, closed.fromStatus, closed.toStatus], ["status_changed", "system", null, "open", "closed"]);
});

test("cancelling records the reason, and a kitchen leaving is recorded", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] })).body;
  await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [line(ctx.dal, 2)] });
  await call(ctx.cookB, "delete", `/${order._id}/contributions/me`);
  const res = await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "cancelled", reason: "Supplier closed" });
  assert.deepEqual(actions(res.body), ["raised", "joined", "left", "status_changed"]);
  assert.equal(res.body.events[2].godownId.name, "Kitchen B");
  assert.deepEqual([last(res.body).toStatus, last(res.body).note], ["cancelled", "Supplier closed"]);
});

test("a kitchen sees its own and order-wide events, not other kitchens'", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] })).body;
  await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [line(ctx.dal, 2)] });
  await call(ctx.admin, "post", `/${order._id}/reject`).send({ godownId: ctx.kitchenB._id, reason: "Kitchen B is closed" });
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});

  const seenByA = await call(ctx.cookA, "get", `/${order._id}`);
  assert.deepEqual(actions(seenByA.body), ["raised", "approved"]);
  assert.ok(seenByA.body.events.every((event) => !event.godownId || idOf(event.godownId) === String(ctx.kitchenA._id)));
  const seenByB = await call(ctx.cookB, "get", `/${order._id}`);
  assert.deepEqual(actions(seenByB.body), ["joined", "rejected", "approved"]);
  const list = await call(ctx.cookA, "get", "/");
  assert.deepEqual(actions(list.body.items[0]), ["raised", "approved"], "the list filters the same way");
  assert.equal((await call(ctx.admin, "get", `/${order._id}`)).body.events.length, 4);
});

test("orders from before the history was kept read as an empty history", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] })).body;
  await CollaborativePurchaseOrder.collection.updateOne({ _id: CollaborativePurchaseOrder.castObject({ _id: order._id })._id }, { $unset: { events: "" } });
  const res = await call(ctx.admin, "get", `/${order._id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.events, []);
});
