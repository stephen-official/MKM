import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { Supplier } from "../models/SupplierModel.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";

// Phase 3: a kitchen raises a problem with one item while receiving; the item waits for the admin.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await createGodown("Kitchen A");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const [rice, dal] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Dal", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 80 },
  ]);
  const supplier = await Supplier.create({ name: "Sri Lakshmi Traders", nameKey: "sri lakshmi traders", fssaiLicence: "12345678901234" });
  ctx = {
    kitchenA, rice, dal, supplier,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    admin: await createUser({ role: "admin" }),
  };
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: rice._id, qtyBaseUnit: 100 }, { stockItemId: dal._id, qtyBaseUnit: 20 }] })).body;
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered", supplierId: supplier._id });
  await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: kitchenA._id });
  ctx.order = order;
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const tickets = (actor, query = "") => request(app).get(`/api/delivery-tickets${query}`).set("Authorization", `Bearer ${actor.token}`);
const photos = { goods: "https://res.cloudinary.com/x/goods.jpg", label: "https://res.cloudinary.com/x/label.jpg" };
const good = (product, extra = {}) => ({ stockItemId: product._id, photos, expiryDate: "2030-01-31", storage: "room", ...extra });
const receive = (items) => call(ctx.cookA, "post", `/${ctx.order._id}/receive`).send({ items });
const stockOf = async (product) => Number((await GodownStock.findOne({ godownId: ctx.kitchenA._id, stockItemId: product._id }).lean())?.qtyBaseUnit || 0);
const lineOf = (body, product) => body.contributions[0].items.find((line) => line.stockItemId.name === product.name);

test("a short delivery becomes a ticket; the good item goes into stock and the short one waits", async () => {
  const res = await receive([
    good(ctx.dal),
    { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "short", receivedQtyBaseUnit: 60, note: "Only 60 kg came" } },
  ]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(await stockOf(ctx.dal), 20);
  assert.equal(await stockOf(ctx.rice), 0, "nothing enters stock until the admin settles");
  assert.equal(await StockBatch.countDocuments({ stockItemId: ctx.rice._id }), 0);

  const rice = lineOf(res.body, ctx.rice);
  assert.equal(rice.deliveredAt, null);
  assert.equal(rice.ticketId.status, "open");
  assert.equal(rice.ticketId.reason, "short");
  assert.equal(rice.ticketId.receivedQtyBaseUnit, 60);
  assert.ok(lineOf(res.body, ctx.dal).deliveredAt);
  assert.equal(res.body.contributions[0].deliveredAt, null, "the share is not delivered while a problem is open");

  const ticket = await DeliveryTicket.findOne({ orderId: ctx.order._id }).lean();
  assert.equal(ticket.orderedQtyBaseUnit, 100);
  assert.equal(ticket.note, "Only 60 kg came");
  assert.equal(ticket.details.photos.goods, photos.goods);
  assert.equal(ticket.details.expiryDate.toISOString().slice(0, 10), "2030-01-30");
  assert.equal(String(ticket.godownId), String(ctx.kitchenA._id));

  const list = await tickets(ctx.admin);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].godownId.name, "Kitchen A");
  assert.equal(list.body[0].stockItemId.name, "Rice");
  assert.equal(list.body[0].orderNo, ctx.order.orderNo);
  assert.deepEqual((await tickets(ctx.admin, "?status=settled")).body, []);
  assert.equal((await tickets(ctx.cookA)).status, 403);
});

test("a line with an open problem is no longer on the way, so it cannot be received twice", async () => {
  await receive([good(ctx.dal), { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, problem: { reason: "damaged" } }]);
  const again = await receive([good(ctx.rice)]);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "NOT_DISPATCHED");
  assert.equal(await DeliveryTicket.countDocuments({}), 1);
});

test("problem details are checked in plain words, and nothing is saved when one is wrong", async () => {
  const bad = async (problem, extra = {}) => receive([good(ctx.dal), { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, ...extra, problem }]);
  assert.match((await bad({ reason: "lost" })).body.message, /choose what went wrong/);
  assert.match((await bad({ reason: "short", receivedQtyBaseUnit: 100 })).body.message, /less than 100 arrived/);
  assert.match((await bad({ reason: "excess", receivedQtyBaseUnit: 100 })).body.message, /more than 100 arrived/);
  assert.match((await bad({ reason: "short", receivedQtyBaseUnit: -1 })).body.message, /how much usable stock arrived/);
  assert.equal((await bad({ reason: "short", receivedQtyBaseUnit: 60 })).body.code, "EXPIRY_REQUIRED", "usable stock still needs its expiry");
  const noPhoto = await receive([good(ctx.dal), { stockItemId: ctx.rice._id, problem: { reason: "damaged" } }]);
  assert.equal(noPhoto.body.code, "PHOTO_REQUIRED");
  assert.equal(await stockOf(ctx.dal), 0, "all or nothing");
  assert.equal(await DeliveryTicket.countDocuments({}), 0);
  // Wholly damaged: no usable stock, so no expiry and no label photo needed.
  const ok = await receive([good(ctx.dal), { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, problem: { reason: "damaged", note: "Bags torn and wet" } }]);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal((await DeliveryTicket.findOne({}).lean()).receivedQtyBaseUnit, 0);
});
