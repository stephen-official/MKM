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
  const [rice, dal, oil] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Dal", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 80 },
    { name: "Oil", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 150 },
  ]);
  ctx = {
    kitchenA, kitchenB, rice, dal, oil,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
  // Kitchen A asks for 10 kg rice; Kitchen B joins with 5 kg rice.
  ctx.order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] })).body;
  await call(ctx.cookB, "post", `/${ctx.order._id}/contributions`).send({ items: [line(ctx.rice, 5)] });
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const line = (product, qtyBaseUnit) => ({ stockItemId: product._id, qtyBaseUnit });
const approve = (body = {}) => call(ctx.admin, "post", `/${ctx.order._id}/approve`).send(body);
const editA = (items) => call(ctx.cookA, "put", `/${ctx.order._id}/contributions/me`).send({ items });
const share = (body, kitchen) => body.contributions.find((c) => String(c.godownId._id) === String(kitchen._id));

test("an approved line is locked but the rest of the kitchen's share stays editable", async () => {
  const res = await approve({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(share(res.body, ctx.kitchenA).items[0].approvedAt);
  assert.equal(share(res.body, ctx.kitchenA).approvedAt, null);
  assert.equal(res.body.status, "open");

  for (const items of [[line(ctx.rice, 12)], [line(ctx.dal, 3)], [line(ctx.rice, 10), line(ctx.rice, 2)]]) {
    const refused = await editA(items);
    assert.equal(refused.status, 409, JSON.stringify(items));
    assert.equal(refused.body.code, "LINE_APPROVED");
  }
  const added = await editA([line(ctx.rice, 10), line(ctx.dal, 3)]);
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const mine = share(added.body, ctx.kitchenA);
  assert.ok(mine.items.find((item) => item.stockItemId.name === "Rice").approvedAt, "approval kept after the edit");
  assert.equal(mine.items.find((item) => item.stockItemId.name === "Dal").approvedAt, null);

  assert.equal((await call(ctx.cookB, "put", `/${ctx.order._id}/contributions/me`).send({ items: [line(ctx.rice, 8)] })).status, 200);
});

test("a fully approved share is locked while other kitchens carry on", async () => {
  const res = await approve({ godownId: ctx.kitchenA._id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(share(res.body, ctx.kitchenA).approvedAt);
  assert.ok(share(res.body, ctx.kitchenA).items.every((item) => item.approvedAt));

  const refused = await editA([line(ctx.rice, 10), line(ctx.dal, 1)]);
  assert.equal(refused.body.code, "SHARE_APPROVED");
  assert.equal((await call(ctx.cookB, "put", `/${ctx.order._id}/contributions/me`).send({ items: [line(ctx.rice, 6)] })).status, 200);
});

test("approve all approves every share and closes the order to everyone", async () => {
  const res = await approve();
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.status, "approved");
  assert.ok(res.body.contributions.every((c) => c.approvedAt && c.items.every((item) => item.approvedAt)));

  const kitchenC = await createGodown("Kitchen C");
  const cookC = await createUser({ role: "user", godownId: kitchenC._id });
  assert.equal((await call(cookC, "post", `/${ctx.order._id}/contributions`).send({ items: [line(ctx.oil, 1)] })).body.code, "ORDER_CLOSED");
  assert.equal((await editA([line(ctx.rice, 10)])).body.code, "ORDER_CLOSED");
  assert.equal((await call(ctx.cookB, "delete", `/${ctx.order._id}/contributions/me`)).body.code, "ORDER_CLOSED");
});

test("a kitchen with an approved line cannot leave the order", async () => {
  await approve({ godownId: ctx.kitchenB._id, items: [{ stockItemId: ctx.rice._id }] });
  const res = await call(ctx.cookB, "delete", `/${ctx.order._id}/contributions/me`);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "LINE_APPROVED");
});

test("only admins approve, and only lines and kitchens that are on the order", async () => {
  assert.equal((await call(ctx.cookA, "post", `/${ctx.order._id}/approve`).send({})).status, 403);
  const kitchenC = await createGodown("Kitchen C");
  assert.equal((await approve({ godownId: kitchenC._id })).status, 404);
  assert.equal((await approve({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }] })).status, 404);
  assert.equal((await approve({ godownId: "not-an-id" })).status, 400);
});

test("ordering needs approval first, and finished orders cannot be approved", async () => {
  await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "closed" });
  assert.equal((await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" })).status, 409);
  assert.equal((await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "approved" })).status, 409);
  assert.equal((await approve()).body.status, "approved");
  assert.equal((await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" })).body.status, "ordered");
  const again = await approve();
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "ORDER_CLOSED");
});

test("an edit based on an older copy of the order cannot wipe out an approval", async () => {
  const stale = await CollaborativePurchaseOrder.findById(ctx.order._id);
  await approve({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] });
  stale.contributions[0].items[0].qtyBaseUnit = 99;
  await assert.rejects(stale.save(), { name: "VersionError" });
  const fresh = await CollaborativePurchaseOrder.findById(ctx.order._id).lean();
  assert.equal(fresh.contributions[0].items[0].qtyBaseUnit, 10);
  assert.ok(fresh.contributions[0].items[0].approvedAt);
});

const dispatch = (godownId, actor = ctx.admin) => call(actor, "post", `/${ctx.order._id}/dispatch`).send({ godownId });
const placeOrder = async () => {
  await approve();
  await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" });
};

test("each kitchen's share is dispatched separately once the order is placed", async () => {
  await placeOrder();
  const res = await dispatch(ctx.kitchenA._id);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(share(res.body, ctx.kitchenA).dispatchedAt);
  assert.equal(share(res.body, ctx.kitchenB).dispatchedAt, null);
  assert.equal(res.body.status, "ordered");

  const again = await dispatch(ctx.kitchenA._id);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "ALREADY_DISPATCHED");
  assert.equal((await dispatch(ctx.kitchenB._id)).status, 200);
});

test("dispatch needs a placed order, an admin and a kitchen on the order", async () => {
  await approve();
  const early = await dispatch(ctx.kitchenA._id);
  assert.equal(early.status, 409);
  assert.equal(early.body.code, "NOT_ORDERED");
  await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" });
  assert.equal((await dispatch(ctx.kitchenA._id, ctx.cookA)).status, 403);
  assert.equal((await dispatch((await createGodown("Kitchen C"))._id)).status, 404);
  assert.equal((await dispatch("nope")).status, 400);
});
