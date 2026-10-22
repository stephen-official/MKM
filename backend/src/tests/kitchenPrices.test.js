import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { Consumption, GodownStock, IndentRequest, Request, Transfer } from "../models/FlowModels.js";
import { PRICE_FIELDS, stripPrices } from "../utils/kitchenSafe.js";
import { setIo } from "../realtime.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const [kitchen, other] = await Promise.all([createGodown("Kitchen A"), createGodown("Kitchen B")]);
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const rice = await StockItem.create({
    name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50, priceUpdatedAt: new Date(),
    soldInPacks: true, packs: [{ name: "25 kg bag", size: 25, price: 1200 }],
  });
  const cook = await createUser({ role: "user", godownId: kitchen._id });
  const admin = await createUser({ role: "admin" });
  await GodownStock.create({ godownId: kitchen._id, stockItemId: rice._id, qtyBaseUnit: 60 });
  const line = { stockItemId: rice._id, qtyBaseUnit: 5, unitPriceAtIssue: 50, amountAtIssue: 250, batchAllocations: [] };
  await Consumption.create({ godownId: kitchen._id, userId: cook.user._id, date: "2026-10-17", items: [line] });
  await Request.create({ godownId: kitchen._id, userId: cook.user._id, requestType: "usage", targetDate: "2026-10-18", reason: "Extra lunch", items: [{ stockItemId: rice._id, qtyBaseUnit: 2 }] });
  await IndentRequest.create({ godownId: kitchen._id, userId: cook.user._id, items: [{ stockItemId: rice._id, qtyBaseUnit: 25, packId: rice.packs[0]._id, packName: "25 kg bag", packSize: 25, packQuantity: 1 }] });
  await Transfer.create({ fromGodownId: other._id, toGodownId: kitchen._id, createdBy: admin.user._id, items: [{ stockItemId: rice._id, qtyBaseUnit: 3, batchAllocations: [{ qtyBaseUnit: 3, unitPrice: 50 }] }] });
  ctx = { rice, cook, admin, otherCook: await createUser({ role: "user", godownId: other._id }) };
});

const get = (actor, path) => request(app).get(path).set("Authorization", `Bearer ${actor.token}`);
const priceKeysIn = (body) => {
  const found = new Set();
  JSON.stringify(body, (key, value) => { if (PRICE_FIELDS.has(key)) found.add(key); return value; });
  return [...found];
};

// Every read a kitchen screen makes (client-web/src), plus the shared order endpoints.
const KITCHEN_READS = [
  "/api/auth/me", "/api/inventory/stock-items", "/api/inventory/godowns", "/api/inventory/stock-groups",
  "/api/godown-stocks", "/api/my-kitchen-stock", "/api/operations/my-kitchen-stock", "/api/consumptions/me",
  "/api/requests", "/api/indent-requests/me", "/api/product-requests/me", "/api/user-transfers/history",
  "/api/user-transfers/incoming", "/api/procurement/my-stock", "/api/procurement/collaborative-purchase-orders",
];

test("no price reaches a kitchen login on any screen it reads", async () => {
  const order = await request(app).post("/api/procurement/collaborative-purchase-orders").set("Authorization", `Bearer ${ctx.cook.token}`)
    .send({ neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 25, packId: ctx.rice.packs[0]._id, packName: "25 kg bag", packSize: 25, packQuantity: 1, packPrice: 1200 }] });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  for (const path of [...KITCHEN_READS, `/api/procurement/collaborative-purchase-orders/${order.body._id}`]) {
    const res = await get(ctx.cook, path);
    assert.ok(res.status < 500, `${path} -> ${res.status}`);
    assert.deepEqual(priceKeysIn(res.body), [], `${path} sent prices to a kitchen`);
  }
});

test("admins still receive prices", async () => {
  const res = await get(ctx.admin, "/api/inventory/stock-items");
  assert.equal(res.body[0].pricePerUnit, 50);
  assert.equal(res.body[0].packs[0].price, 1200);
});

test("other kitchens on a shared order show their items but not their quantities or notes", async () => {
  const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
  const order = (await call(ctx.cook, "post", "/").send({ neededIn: "1w", note: "for the festival lunch", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 100 }] })).body;
  await call(ctx.otherCook, "post", `/${order._id}/contributions`).send({ note: "only 40", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 40 }] });

  const seen = (await call(ctx.cook, "get", `/${order._id}`)).body;
  const mine = seen.contributions.find((c) => c.godownId.name === "Kitchen A");
  const theirs = seen.contributions.find((c) => c.godownId.name === "Kitchen B");
  assert.equal(mine.items[0].qtyBaseUnit, 100);
  assert.equal(mine.note, "for the festival lunch");
  assert.equal(theirs.items[0].stockItemId.name, "Rice");
  assert.equal(theirs.items[0].qtyBaseUnit, undefined);
  assert.equal(theirs.note, undefined);
  assert.equal(seen.kitchenCount, 2);
  assert.deepEqual(seen.combinedItems.map((line) => [line.stockItemId.name, line.qtyBaseUnit]), [["Rice", undefined]]);
  assert.equal((await call(ctx.cook, "get", "/")).body.items[0].contributions.find((c) => c.godownId.name === "Kitchen B").items[0].qtyBaseUnit, undefined);

  const adminView = (await call(ctx.admin, "get", `/${order._id}`)).body;
  assert.equal(adminView.combinedItems[0].qtyBaseUnit, 140);
});

test("stripPrices removes money fields at any depth and leaves everything else", () => {
  const out = stripPrices({ name: "Rice", qty: 5, when: new Date("2026-10-18T00:00:00Z"), packs: [{ name: "bag", price: 9 }], items: [{ unitPriceAtIssue: 1, batchAllocations: [{ unitPrice: 2, qtyBaseUnit: 3 }] }] });
  assert.deepEqual(out, { name: "Rice", qty: 5, when: "2026-10-18T00:00:00.000Z", packs: [{ name: "bag" }], items: [{ batchAllocations: [{ qtyBaseUnit: 3 }] }] });
});

test("live transfer messages to kitchens carry no prices", async () => {
  const otherKitchen = ctx.otherCook.user.godownId;
  await GodownStock.create({ godownId: otherKitchen, stockItemId: ctx.rice._id, qtyBaseUnit: 10 });
  const sent = [];
  const fake = { to: (room) => ({ to: () => fake.to(room), emit: (event, payload) => sent.push({ room, event, payload }) }) };
  setIo(fake);
  try {
    const created = await request(app).post("/api/user-transfers").set("Authorization", `Bearer ${ctx.otherCook.token}`)
      .send({ toGodownId: ctx.cook.user.godownId, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 4 }] });
    assert.ok(created.status < 300, JSON.stringify(created.body));
    const accepted = await request(app).post(`/api/user-transfers/${created.body._id}/accept`).set("Authorization", `Bearer ${ctx.cook.token}`);
    assert.ok(accepted.status < 300, JSON.stringify(accepted.body));
  } finally {
    setIo(null);
  }
  const toKitchens = sent.filter((message) => message.room !== "admins");
  // "kitchen:changed" re-fetch pings ride along with every change; they carry only a topic.
  assert.deepEqual(toKitchens.map((message) => message.event).filter((event) => event !== "kitchen:changed").sort(), ["new_transfer", "transfer_accepted"]);
  for (const message of toKitchens) assert.deepEqual(priceKeysIn(message.payload), [], `${message.event} sent prices`);
});
