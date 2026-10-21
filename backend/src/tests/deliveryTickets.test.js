import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { Supplier } from "../models/SupplierModel.js";
import { DeliveryTicket } from "../models/DeliveryTicketModel.js";
import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

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
  assert.match((await bad({ reason: "wrong_item", receivedQtyBaseUnit: 1 })).body.message, /wrong item cannot be added as Rice/);
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

test("problem quantities stay attached to their own pack line", async () => {
  const small = new mongoose.Types.ObjectId();
  const large = new mongoose.Types.ObjectId();
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [
    { stockItemId: ctx.rice._id, qtyBaseUnit: 25, packId: small, packName: "25 kg bag", packSize: 25, packQuantity: 1 },
    { stockItemId: ctx.rice._id, qtyBaseUnit: 50, packId: large, packName: "50 kg bag", packSize: 50, packQuantity: 1 },
  ] })).body;
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: ctx.kitchenA._id });

  const ambiguous = await call(ctx.cookA, "post", `/${order._id}/receive`).send({ items: [
    { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "short", receivedQtyBaseUnit: 20 } },
  ] });
  assert.equal(ambiguous.status, 400);
  assert.equal(ambiguous.body.code, "MISSING_ITEM_DETAILS");

  const res = await call(ctx.cookA, "post", `/${order._id}/receive`).send({ items: [
    { stockItemId: ctx.rice._id, packId: small, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "short", receivedQtyBaseUnit: 20 } },
    { stockItemId: ctx.rice._id, packId: large, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "short", receivedQtyBaseUnit: 40 } },
  ] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const rows = await DeliveryTicket.find({ orderId: order._id }).sort({ orderedQtyBaseUnit: 1 }).lean();
  assert.deepEqual(rows.map((row) => [row.orderedQtyBaseUnit, row.receivedQtyBaseUnit]), [[25, 20], [50, 40]]);
  assert.equal(String(rows[0].packId), String(small));
  assert.equal(String(rows[1].packId), String(large));
});

const settle = (id, body, actor = ctx.admin) => request(app).post(`/api/delivery-tickets/${id}/settle`).set("Authorization", `Bearer ${actor.token}`).send(body);
const raiseShort = async () => {
  const res = await receive([good(ctx.dal), { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", lotNumber: "B-9", storage: "fridge", problem: { reason: "short", receivedQtyBaseUnit: 60, note: "Only 60 kg came" } }]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return lineOf(res.body, ctx.rice).ticketId._id;
};

test("settling a short delivery puts the accepted quantity into stock and opens a follow-up order for the rest", async () => {
  const ticketId = await raiseShort();
  assert.equal((await settle(ticketId, { acceptedQtyBaseUnit: 60 }, ctx.cookA)).status, 403);
  const res = await settle(ticketId, { acceptedQtyBaseUnit: 60, reorderShortfall: true, note: "Vendor will send 40 kg next week" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.status, "settled");
  assert.equal(res.body.resolution.acceptedQtyBaseUnit, 60);
  assert.equal(res.body.resolution.settledBy.name, ctx.admin.user.name);
  assert.equal(await stockOf(ctx.rice), 60);

  const batch = await StockBatch.findOne({ stockItemId: ctx.rice._id }).lean();
  assert.match(batch.trackingId, /^MKM-\d{4}-\d{4}$/);
  assert.equal(batch.receivedQtyBaseUnit, 60);
  assert.equal(batch.expectedQtyBaseUnit, 100);
  assert.equal(batch.lotNumber, "B-9");
  assert.equal(batch.storage, "fridge");
  assert.equal(batch.photos.goods, photos.goods);
  assert.equal(batch.supplierName, "Sri Lakshmi Traders");
  assert.equal(batch.condition, "good");
  assert.match(batch.notes, /short: Only 60 kg came/);

  const order = (await call(ctx.admin, "get", `/${ctx.order._id}`)).body;
  const rice = lineOf(order, ctx.rice);
  assert.ok(rice.deliveredAt);
  assert.equal(rice.trackingId, batch.trackingId);
  assert.equal(rice.receivedQtyBaseUnit, 60);
  assert.equal(rice.ticketId.status, "settled");
  assert.ok(order.contributions[0].deliveredAt, "every line is now delivered");

  const followUp = (await call(ctx.cookA, "get", `/${res.body.resolution.followUpOrderId}`)).body;
  assert.equal(followUp.status, "open");
  assert.equal(followUp.title, "Missing Rice", "an untitled order falls back to the product name");
  assert.equal(followUp.createdByGodown.name, "Kitchen A");
  assert.deepEqual(followUp.contributions[0].items.map((l) => [l.stockItemId.name, l.qtyBaseUnit]), [["Rice", 40]]);
  assert.ok(followUp.neededBy && followUp.closesAt);

  const ledger = await request(app).get(`/api/product-ledger/${ctx.rice._id}`).query({ godownId: String(ctx.kitchenA._id) }).set("Authorization", `Bearer ${ctx.admin.token}`);
  assert.deepEqual(ledger.body.ledger.map((row) => [row.type, row.qtyIn, row.balance]), [["RECEIVED", 60, 60]]);

  const twice = await settle(ticketId, { acceptedQtyBaseUnit: 60 });
  assert.equal(twice.status, 409);
  assert.equal(twice.body.code, "ALREADY_SETTLED");
  assert.equal(await stockOf(ctx.rice), 60);
});

test("the admin cannot accept more than usably arrived; accepting nothing closes the line without stock or reorder", async () => {
  const ticketId = await raiseShort();
  const tooMuch = await settle(ticketId, { acceptedQtyBaseUnit: 61 });
  assert.equal(tooMuch.status, 400);
  assert.match(tooMuch.body.message, /Only 60 usable arrived/);
  const none = await settle(ticketId, { acceptedQtyBaseUnit: 0, note: "Returned to vendor" });
  assert.equal(none.status, 200, JSON.stringify(none.body));
  assert.equal(none.body.resolution.followUpOrderId, null);
  assert.equal(await stockOf(ctx.rice), 0);
  assert.equal(await StockBatch.countDocuments({ stockItemId: ctx.rice._id }), 0);
  assert.equal(await CollaborativePurchaseOrder.countDocuments({}), 1, "no follow-up order");
  const line = lineOf((await call(ctx.admin, "get", `/${ctx.order._id}`)).body, ctx.rice);
  assert.ok(line.deliveredAt);
  assert.equal(line.trackingId, null);
  assert.equal(line.receivedQtyBaseUnit, 0);
  const ledger = await request(app).get(`/api/product-ledger/${ctx.rice._id}`).query({ godownId: String(ctx.kitchenA._id) }).set("Authorization", `Bearer ${ctx.admin.token}`);
  assert.deepEqual(ledger.body.ledger, [], "nothing received, nothing in the ledger");
});

test("an excess delivery can be accepted in full, and a damaged one partly", async () => {
  const res = await receive([
    { stockItemId: ctx.dal._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "excess", receivedQtyBaseUnit: 25 } },
    { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "damaged", receivedQtyBaseUnit: 90, note: "One bag torn" } },
  ]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const dalTicket = lineOf(res.body, ctx.dal).ticketId._id;
  const riceTicket = lineOf(res.body, ctx.rice).ticketId._id;
  assert.equal((await settle(dalTicket, { acceptedQtyBaseUnit: 25 })).status, 200);
  assert.equal(await stockOf(ctx.dal), 25);
  assert.equal((await settle(riceTicket, { acceptedQtyBaseUnit: 90, reorderShortfall: true })).status, 200);
  assert.equal(await stockOf(ctx.rice), 90);
  assert.equal((await StockBatch.findOne({ stockItemId: ctx.rice._id }).lean()).condition, "partial_damage");
  const followUps = await CollaborativePurchaseOrder.find({ title: /^Missing/ }).lean();
  assert.equal(followUps.length, 1);
  assert.equal(followUps[0].contributions[0].items[0].qtyBaseUnit, 10);
});

test("follow-up order is named after the kitchen's own order title", async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ title: "B — Short delivery", neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 50 }] })).body;
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: ctx.kitchenA._id });
  const res = await call(ctx.cookA, "post", `/${order._id}/receive`).send({ items: [
    { stockItemId: ctx.rice._id, photos: { goods: photos.goods }, expiryDate: "2030-01-31", problem: { reason: "short", receivedQtyBaseUnit: 30, note: "20 kg missing" } },
  ] });
  assert.equal(res.status, 200);
  const settled = await settle(lineOf(res.body, ctx.rice).ticketId._id, { acceptedQtyBaseUnit: 30, reorderShortfall: true });
  assert.equal(settled.status, 200);
  const followUp = await CollaborativePurchaseOrder.findById(settled.body.resolution.followUpOrderId).lean();
  assert.equal(followUp.title, 'Missing items from "B — Short delivery"');
  assert.equal(followUp.contributions[0].items[0].qtyBaseUnit, 20);
});
