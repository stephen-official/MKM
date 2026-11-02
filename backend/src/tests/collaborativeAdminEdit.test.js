import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const [kitchenA, kitchenB] = await Promise.all([createGodown("Kitchen A"), createGodown("Kitchen B")]);
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const [rice, dal, oil, oldStock] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Dal", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 80 },
    { name: "Oil", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 120 },
    { name: "Old stock", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 10, archived: true },
  ]);
  ctx = {
    kitchenA, kitchenB, rice, dal, oil, oldStock,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
    owner: await createUser({ role: "super_admin" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const openOrder = async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }, { stockItemId: ctx.dal._id, qtyBaseUnit: 4 }] })).body;
  await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 2 }] });
  return order;
};
const edit = (actor, order, kitchen, items) => call(actor, "put", `/${order._id}/kitchens/${kitchen._id}/items`).send({ items });
const shareOf = (body, kitchen) => body.contributions.find((share) => String(share.godownId?._id || share.godownId) === String(kitchen._id));
const amounts = (share) => Object.fromEntries(share.items.map((line) => [line.stockItemId.name, line.qtyBaseUnit]));

test("a super-admin changes a kitchen's items and the kitchen sees before and after until it taps OK", async () => {
  const order = await openOrder();
  const changed = await edit(ctx.owner, order, ctx.kitchenA, [
    { stockItemId: ctx.rice._id, qtyBaseUnit: 8 }, { stockItemId: ctx.oil._id, qtyBaseUnit: 5 },
  ]);
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.deepEqual(amounts(shareOf(changed.body, ctx.kitchenA)), { Rice: 8, Oil: 5 });

  // A second change before the kitchen looks keeps the first "before": the kitchen sees the overall change.
  await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 12 }, { stockItemId: ctx.oil._id, qtyBaseUnit: 5 }]);
  const seenByA = (await call(ctx.cookA, "get", `/${order._id}`)).body;
  const mine = shareOf(seenByA, ctx.kitchenA);
  assert.deepEqual(Object.fromEntries(mine.adminChange.before.map((line) => [line.stockItemId.name, line.qtyBaseUnit])), { Rice: 10, Dal: 4 });
  assert.equal(mine.adminChange.before[0].stockItemId.unitId.symbol, "kg");

  // Kitchen B is on the order but never sees Kitchen A's change.
  assert.equal(shareOf((await call(ctx.cookB, "get", `/${order._id}`)).body, ctx.kitchenA).adminChange, undefined);
  assert.equal(shareOf((await call(ctx.cookB, "get", `/${order._id}`)).body, ctx.kitchenB).adminChange, null);

  const ok = await call(ctx.cookA, "post", `/${order._id}/contributions/me/change-seen`);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(shareOf(ok.body, ctx.kitchenA).adminChange, null);
});

test("changing it back, or the kitchen editing its own items, leaves nothing to tell", async () => {
  const order = await openOrder();
  await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 9 }]);
  const back = await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }, { stockItemId: ctx.dal._id, qtyBaseUnit: 4 }]);
  assert.equal(shareOf(back.body, ctx.kitchenA).adminChange, null);

  await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 9 }]);
  const own = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 7 }] });
  assert.equal(own.status, 200, JSON.stringify(own.body));
  assert.equal(shareOf(own.body, ctx.kitchenA).adminChange, null);
});

test("allowed while open or closed, refused once approved, for approved lines and for products kitchens cannot order", async () => {
  const order = await openOrder();
  assert.equal((await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "closed" })).status, 200);
  assert.equal((await edit(ctx.owner, order, ctx.kitchenB, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 3 }])).status, 200);

  const archived = await edit(ctx.owner, order, ctx.kitchenB, [{ stockItemId: ctx.oldStock._id, qtyBaseUnit: 1 }]);
  assert.equal(archived.status, 409);
  assert.equal(archived.body.code, "PRODUCT_UNAVAILABLE");

  // Approve Kitchen A's rice line only: it is locked, the rest may still change.
  assert.equal((await call(ctx.admin, "post", `/${order._id}/approve`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] })).status, 200);
  const dropApproved = await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.dal._id, qtyBaseUnit: 4 }]);
  assert.equal(dropApproved.body.code, "LINE_APPROVED");
  assert.equal((await edit(ctx.owner, order, ctx.kitchenA, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }, { stockItemId: ctx.dal._id, qtyBaseUnit: 6 }])).status, 200);

  assert.equal((await call(ctx.admin, "post", `/${order._id}/approve`).send({})).status, 200);
  const late = await edit(ctx.owner, order, ctx.kitchenB, [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }]);
  assert.equal(late.status, 409);
  assert.equal(late.body.code, "ORDER_CLOSED");
});

test("only a super-admin may change a kitchen's items, and only for a kitchen on the order", async () => {
  const order = await openOrder();
  const items = [{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }];
  assert.equal((await edit(ctx.admin, order, ctx.kitchenA, items)).status, 403);
  assert.equal((await edit(ctx.cookA, order, ctx.kitchenA, items)).status, 403);
  assert.equal((await edit(ctx.owner, order, ctx.kitchenA, [])).status, 400);
  const stranger = await createGodown("Kitchen C");
  assert.equal((await edit(ctx.owner, order, stranger, items)).status, 404);
  assert.equal((await call(ctx.owner, "post", `/${order._id}/contributions/me/change-seen`)).status, 403);
});
