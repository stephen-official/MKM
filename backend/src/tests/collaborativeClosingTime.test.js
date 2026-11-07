import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

const HOUR = 3_600_000;
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 });
  ctx = {
    rice,
    cook: await createUser({ role: "user", godownId: kitchen._id }),
    admin: await createUser({ role: "admin" }),
    owner: await createUser({ role: "super_admin" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const openOrder = async (neededIn = "1w") => (await call(ctx.cook, "post", "/").send({
  neededIn, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 20 }],
})).body;
const setClosing = (actor, order, closesAt) => call(actor, "patch", `/${order._id}/closing-time`).send({ closesAt });

test("a super-admin moves the closing time later or earlier, up to 2 days before needed-by", async () => {
  const order = await openOrder("1w");
  const neededBy = new Date(order.neededBy).getTime();

  const latest = new Date(neededBy - 48 * HOUR).toISOString();
  const extended = await setClosing(ctx.owner, order, latest);
  assert.equal(extended.status, 200, JSON.stringify(extended.body));
  assert.equal(new Date(extended.body.closesAt).toISOString(), latest);
  assert.equal(extended.body.status, "open");

  const earlier = new Date(Date.now() + 2 * HOUR).toISOString();
  const shortened = await setClosing(ctx.owner, order, earlier);
  assert.equal(shortened.status, 200, JSON.stringify(shortened.body));
  assert.equal(new Date(shortened.body.closesAt).toISOString(), earlier);
});

test("the closing time must be in the future and at least 2 days before needed-by", async () => {
  const order = await openOrder("1w");
  const neededBy = new Date(order.neededBy).getTime();

  const tooLate = await setClosing(ctx.owner, order, new Date(neededBy - 47 * HOUR).toISOString());
  assert.equal(tooLate.status, 400);
  assert.equal(tooLate.body.code, "TOO_CLOSE_TO_NEEDED_BY");

  const past = await setClosing(ctx.owner, order, new Date(Date.now() - HOUR).toISOString());
  assert.equal(past.status, 400);
  assert.equal(past.body.code, "INVALID_INPUT");

  assert.equal((await setClosing(ctx.owner, order, "not a date")).status, 400);
  assert.equal((await setClosing(ctx.owner, order, undefined)).status, 400);

  // Needed in 1 day: there is no time left to keep it open longer.
  const soon = await openOrder("1d");
  const refused = await setClosing(ctx.owner, soon, new Date(Date.now() + HOUR).toISOString());
  assert.equal(refused.body.code, "TOO_CLOSE_TO_NEEDED_BY");
});

test("only a super-admin may change it, and only while the order is open", async () => {
  const order = await openOrder("1w");
  const when = new Date(Date.now() + 24 * HOUR).toISOString();
  assert.equal((await setClosing(ctx.admin, order, when)).status, 403);
  assert.equal((await setClosing(ctx.cook, order, when)).status, 403);

  assert.equal((await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "closed" })).status, 200);
  const closed = await setClosing(ctx.owner, order, when);
  assert.equal(closed.status, 409);
  assert.equal(closed.body.code, "ORDER_CLOSED");

  // An order whose window already ran out is closed, not extended.
  const lapsed = await openOrder("1w");
  await CollaborativePurchaseOrder.updateOne({ _id: lapsed._id }, { closesAt: new Date(Date.now() - 1000) });
  assert.equal((await setClosing(ctx.owner, lapsed, when)).body.code, "ORDER_CLOSED");

  assert.equal((await setClosing(ctx.owner, { _id: "64b000000000000000000000" }, when)).status, 404);
});

test("moving the closing time is recorded in the history, from and to, for every kitchen to see", async () => {
  const order = await openOrder("1w");
  const to = new Date(new Date(order.neededBy).getTime() - 48 * HOUR).toISOString();
  assert.equal((await setClosing(ctx.owner, order, to)).status, 200);
  const seen = (await call(ctx.cook, "get", `/${order._id}`)).body;
  const event = seen.events[seen.events.length - 1];
  assert.equal(event.action, "closing_time_changed");
  assert.equal(event.godownId, null, "order-wide");
  assert.equal(new Date(event.fromClosesAt).toISOString(), new Date(order.closesAt).toISOString());
  assert.equal(new Date(event.toClosesAt).toISOString(), to);

  // A refused change leaves no entry.
  await setClosing(ctx.owner, order, new Date(Date.now() - HOUR).toISOString());
  assert.equal((await call(ctx.cook, "get", `/${order._id}`)).body.events.length, seen.events.length);
});
