import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { Supplier } from "../models/SupplierModel.js";
import { GodownStock } from "../models/FlowModels.js";

// Admin-raised orders, and rejecting lines, kitchens' shares or the whole order with a reason.

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
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    cookA2: await createUser({ role: "user", godownId: kitchenA._id }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const line = (product, qtyBaseUnit) => ({ stockItemId: product._id, qtyBaseUnit });
const share = (body, kitchen) => body.contributions.find((c) => String(c.godownId._id || c.godownId) === String(kitchen._id));
const lineOf = (body, kitchen, product) => share(body, kitchen).items.find((item) => String(item.stockItemId._id || item.stockItemId) === String(product._id));
const stockOf = async (kitchen, product) => Number((await GodownStock.findOne({ godownId: kitchen._id, stockItemId: product._id }).lean())?.qtyBaseUnit || 0);

/** Kitchen A asks for rice and dal; Kitchen B joins with rice. */
const kitchenOrder = async () => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10), line(ctx.dal, 4)] })).body;
  await call(ctx.cookB, "post", `/${order._id}/contributions`).send({ items: [line(ctx.rice, 5)] });
  return order;
};
const reject = (order, body, actor = ctx.admin) => call(actor, "post", `/${order._id}/reject`).send(body);

// ---------- Who raised the order ----------

test("an order records whether a kitchen or the central store raised it", async () => {
  const mine = await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [line(ctx.rice, 10)] });
  assert.equal(mine.status, 201, JSON.stringify(mine.body));
  assert.equal(mine.body.source, "kitchen");

  const forB = await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenB._id, neededIn: "1w", items: [line(ctx.dal, 3)] });
  assert.equal(forB.status, 201, JSON.stringify(forB.body));
  assert.equal(forB.body.source, "admin");
  assert.equal(String(forB.body.createdByGodown._id), String(ctx.kitchenB._id));

  const seen = await call(ctx.cookB, "get", `/${forB.body._id}`);
  assert.equal(seen.body.source, "admin", "the kitchen sees it was sent by the central store");
});

test("any cook of the kitchen sees and can edit an order the central store raised for it", async () => {
  const forA = (await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenA._id, neededIn: "1w", items: [line(ctx.dal, 3)] })).body;
  const list = await call(ctx.cookA2, "get", "/");
  assert.ok(list.body.items.some((order) => order._id === forA._id));
  const edited = await call(ctx.cookA2, "put", `/${forA._id}/contributions/me`).send({ items: [line(ctx.dal, 6)] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(lineOf(edited.body, ctx.kitchenA, ctx.dal).qtyBaseUnit, 6);
});

test("approve and send: the central store's order for a kitchen is approved at once and stays open to other kitchens", async () => {
  const res = await call(ctx.admin, "post", "/").send({ godownId: ctx.kitchenA._id, neededIn: "1w", approve: true, items: [line(ctx.rice, 20)] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.status, "open");
  const mine = share(res.body, ctx.kitchenA);
  assert.ok(mine.approvedAt, "the kitchen's share is approved");
  assert.ok(mine.items.every((item) => item.approvedAt && String(item.approvedBy) === String(ctx.admin.user._id)));
  assert.equal(await stockOf(ctx.kitchenA, ctx.rice), 0, "approval never adds stock");

  const joined = await call(ctx.cookB, "post", `/${res.body._id}/contributions`).send({ items: [line(ctx.oil, 2)] });
  assert.equal(joined.status, 201, JSON.stringify(joined.body));
  assert.equal(share(joined.body, ctx.kitchenB).approvedAt, null, "a kitchen that joins still waits for review");
});

test("only the central store can approve an order as it raises it", async () => {
  const res = await call(ctx.cookA, "post", "/").send({ neededIn: "1w", approve: true, items: [line(ctx.rice, 10)] });
  assert.equal(res.status, 403);
});

// ---------- Rejecting lines and shares ----------

test("the central store rejects one line with a reason and the kitchen sees why", async () => {
  const order = await kitchenOrder();
  const res = await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Dal is coming from last week's order" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const dal = lineOf(res.body, ctx.kitchenA, ctx.dal);
  assert.ok(dal.rejectedAt);
  assert.equal(String(dal.rejectedBy), String(ctx.admin.user._id));
  assert.equal(dal.rejectionReason, "Dal is coming from last week's order");
  assert.equal(lineOf(res.body, ctx.kitchenA, ctx.rice).rejectedAt, null, "the rest of the share is untouched");
  assert.equal(share(res.body, ctx.kitchenA).rejectedAt, null);
  assert.ok(!res.body.combinedItems.some((item) => String(item.stockItemId._id) === String(ctx.dal._id)), "a rejected line is not bought");

  const seen = await call(ctx.cookA, "get", `/${order._id}`);
  assert.equal(lineOf(seen.body, ctx.kitchenA, ctx.dal).rejectionReason, "Dal is coming from last week's order");
});

test("a rejection needs a reason, an admin, and a line or kitchen on the order", async () => {
  const order = await kitchenOrder();
  const noReason = await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "  " });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.code, "REASON_REQUIRED");
  assert.equal((await reject(order, { godownId: ctx.kitchenA._id, reason: "No" }, ctx.cookA)).status, 403);
  assert.equal((await reject(order, { reason: "No" })).status, 400, "rejecting needs a kitchen; the whole order is cancelled instead");
  assert.equal((await reject(order, { godownId: (await createGodown("Kitchen C"))._id, reason: "No" })).status, 404);
  assert.equal((await reject(order, { godownId: ctx.kitchenB._id, items: [{ stockItemId: ctx.dal._id }], reason: "No" })).status, 404);
  assert.equal((await reject(order, { godownId: ctx.kitchenA._id, reason: "x".repeat(501) })).status, 400);
});

test("a decision is final: approved lines cannot be rejected and rejected lines cannot be approved", async () => {
  const order = await kitchenOrder();
  await call(ctx.admin, "post", `/${order._id}/approve`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] });
  const approvedLine = await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }], reason: "Too much" });
  assert.equal(approvedLine.status, 409);
  assert.equal(approvedLine.body.code, "LINE_APPROVED");

  await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Not this week" });
  const again = await call(ctx.admin, "post", `/${order._id}/approve`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }] });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "LINE_REJECTED");
  const twice = await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Still no" });
  assert.equal(twice.status, 409);
  assert.equal(twice.body.code, "LINE_REJECTED");
});

test("rejecting a kitchen rejects what is not yet approved, keeps its approved lines and locks the share", async () => {
  const order = await kitchenOrder();
  await call(ctx.admin, "post", `/${order._id}/approve`).send({ godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.rice._id }] });
  const res = await reject(order, { godownId: ctx.kitchenA._id, reason: "Rest is not needed this week" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const mine = share(res.body, ctx.kitchenA);
  assert.ok(mine.rejectedAt);
  assert.equal(mine.rejectionReason, "Rest is not needed this week");
  assert.ok(lineOf(res.body, ctx.kitchenA, ctx.rice).approvedAt, "the approved rice stays approved");
  assert.equal(lineOf(res.body, ctx.kitchenA, ctx.rice).rejectedAt, null);
  assert.equal(lineOf(res.body, ctx.kitchenA, ctx.dal).rejectionReason, "Rest is not needed this week");
  assert.equal(share(res.body, ctx.kitchenB).rejectedAt, null, "other kitchens carry on");

  const edit = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [line(ctx.rice, 10), line(ctx.oil, 1)] });
  assert.equal(edit.status, 409);
  assert.equal(edit.body.code, "SHARE_REJECTED");
  assert.equal((await reject(order, { godownId: ctx.kitchenA._id, reason: "Again" })).body.code, "SHARE_REJECTED");
});

test("a kitchen edit keeps rejected lines and cannot ask for a rejected product again", async () => {
  const order = await kitchenOrder();
  await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Not this week" });

  const without = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [line(ctx.rice, 12)] });
  assert.equal(without.status, 200, JSON.stringify(without.body));
  assert.equal(lineOf(without.body, ctx.kitchenA, ctx.rice).qtyBaseUnit, 12);
  assert.equal(lineOf(without.body, ctx.kitchenA, ctx.dal).rejectionReason, "Not this week", "the rejected line stays on record");

  const unchanged = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [line(ctx.rice, 12), line(ctx.dal, 4)] });
  assert.equal(unchanged.status, 200, "sending the rejected line back unchanged is allowed");
  assert.equal(share(unchanged.body, ctx.kitchenA).items.filter((item) => String(item.stockItemId._id) === String(ctx.dal._id)).length, 1);

  const again = await call(ctx.cookA, "put", `/${order._id}/contributions/me`).send({ items: [line(ctx.rice, 12), line(ctx.dal, 8)] });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "LINE_REJECTED");
});

test("other kitchens do not see a kitchen's rejection reasons", async () => {
  const order = await kitchenOrder();
  await reject(order, { godownId: ctx.kitchenA._id, reason: "Not needed" });
  const seen = await call(ctx.cookB, "get", `/${order._id}`);
  const theirs = share(seen.body, ctx.kitchenA);
  assert.equal(theirs.rejectionReason, undefined);
  assert.ok(theirs.items.every((item) => item.rejectionReason === undefined));
});

test("rejecting is only possible while the order is still being reviewed", async () => {
  const order = await kitchenOrder();
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  const res = await reject(order, { godownId: ctx.kitchenA._id, reason: "Late" });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "ORDER_CLOSED");
});

// ---------- Rejected lines through approval, dispatch and receipt ----------

test("approve all leaves rejected lines rejected, and they are never dispatched or received", async () => {
  const order = await kitchenOrder();
  await reject(order, { godownId: ctx.kitchenA._id, items: [{ stockItemId: ctx.dal._id }], reason: "Not this week" });
  const approved = await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  assert.equal(approved.body.status, "approved");
  assert.equal(lineOf(approved.body, ctx.kitchenA, ctx.dal).approvedAt, null);
  assert.ok(lineOf(approved.body, ctx.kitchenA, ctx.rice).approvedAt);

  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  const sent = await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: ctx.kitchenA._id });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(lineOf(sent.body, ctx.kitchenA, ctx.dal).dispatchedAt, null, "a rejected line is not sent");
  assert.ok(share(sent.body, ctx.kitchenA).dispatchedAt, "the share counts as sent once every approved line is");
  assert.equal((await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: ctx.kitchenA._id })).body.code, "ALREADY_DISPATCHED");

  const receipt = { items: [ctx.rice, ctx.dal].map((product) => ({ stockItemId: product._id, expiryDate: "2030-01-01", photos: { goods: "/uploads/receipts/g.jpg", label: "/uploads/receipts/l.jpg" } })) };
  const received = await call(ctx.cookA2, "post", `/${order._id}/receive`).send(receipt);
  assert.equal(received.status, 200, JSON.stringify(received.body));
  assert.ok(share(received.body, ctx.kitchenA).deliveredAt, "delivered once every approved line arrived");
  assert.equal(await stockOf(ctx.kitchenA, ctx.rice), 10);
  assert.equal(await stockOf(ctx.kitchenA, ctx.dal), 0);
  const ledger = await request(app).get(`/api/product-ledger/${ctx.dal._id}`).query({ godownId: String(ctx.kitchenA._id) })
    .set("Authorization", `Bearer ${ctx.admin.token}`);
  assert.deepEqual(ledger.body.ledger, [], "the rejected dal never shows as received in the ledger");
});

test("a kitchen whose whole share was rejected is not approved by approve all", async () => {
  const order = await kitchenOrder();
  await reject(order, { godownId: ctx.kitchenB._id, reason: "Kitchen B is closed this week" });
  const res = await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(share(res.body, ctx.kitchenB).approvedAt, null);
  assert.ok(share(res.body, ctx.kitchenA).approvedAt);
});

// ---------- Cancelling the whole order ----------

test("cancelling an order needs a reason, which kitchens see", async () => {
  const order = await kitchenOrder();
  const bare = await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "cancelled" });
  assert.equal(bare.status, 400);
  assert.equal(bare.body.code, "REASON_REQUIRED");
  const res = await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "cancelled", reason: "Supplier stopped this line" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.status, "cancelled");
  assert.equal(res.body.cancellationReason, "Supplier stopped this line");
  assert.equal((await call(ctx.cookB, "get", `/${order._id}`)).body.cancellationReason, "Supplier stopped this line");
});
