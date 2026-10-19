import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { Supplier } from "../models/SupplierModel.js";
import { businessDateOf } from "../executive/params.js";

// Phase 2: a kitchen receives a delivery with photos, expiry, batch and storage details per product.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await createGodown("Kitchen A");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const [rice, salt] = await StockItem.create([
    { name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 },
    { name: "Salt", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 20, expiryRequired: false },
  ]);
  const supplier = await Supplier.create({ name: "Sri Lakshmi Traders", nameKey: "sri lakshmi traders", fssaiLicence: "12345678901234" });
  ctx = {
    kitchenA, rice, salt, supplier,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    admin: await createUser({ role: "admin" }),
  };
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const photos = { goods: "https://res.cloudinary.com/x/goods.jpg", label: "/uploads/receipts/label.jpg" };
const riceDetails = (extra = {}) => ({ stockItemId: ctx.rice._id, photos, expiryDate: "2030-01-31", mfgDate: "2026-09-01", lotNumber: "B-4471", storage: "room", ...extra });

/** Opens, approves, orders (with supplier unless told not to) and dispatches an order for the given lines. */
const dispatched = async (items, { supplierId = ctx.supplier._id } = {}) => {
  const order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items })).body;
  await call(ctx.admin, "post", `/${order._id}/approve`).send({});
  await call(ctx.admin, "patch", `/${order._id}/status`).send({ status: "ordered", supplierId });
  await call(ctx.admin, "post", `/${order._id}/dispatch`).send({ godownId: ctx.kitchenA._id });
  return order;
};
const receive = (order, body) => call(ctx.cookA, "post", `/${order._id}/receive`).send(body);
const stockOf = async (product) => Number((await GodownStock.findOne({ godownId: ctx.kitchenA._id, stockItemId: product._id }).lean())?.qtyBaseUnit || 0);
const yymm = businessDateOf(new Date()).slice(2, 7).replace("-", "");

test("receiving records photos, dates, batch, storage and the supplier on a tracked stock batch", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 100 }]);
  const res = await receive(order, { items: [riceDetails({ notes: "Bags dry" })] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const line = res.body.contributions[0].items[0];
  assert.equal(line.trackingId, `MKM-${yymm}-0001`);
  assert.ok(line.deliveredAt);
  assert.equal(line.stockItemId.expiryRequired, true, "the kitchen is told whether expiry is required");
  assert.equal(await stockOf(ctx.rice), 100);

  const batch = await StockBatch.findOne({ godownId: ctx.kitchenA._id, stockItemId: ctx.rice._id }).lean();
  assert.equal(batch.trackingId, `MKM-${yymm}-0001`);
  assert.equal(batch.condition, "good");
  assert.equal(batch.expiryDate.toISOString().slice(0, 10), "2030-01-30", "stored as the start of that day in business time (UTC+5:30)");
  assert.equal(batch.mfgDate.toISOString().slice(0, 10), "2026-08-31");
  assert.equal(batch.lotNumber, "B-4471");
  assert.equal(batch.storage, "room");
  assert.equal(batch.notes, "Bags dry");
  assert.deepEqual(batch.photos, photos);
  assert.equal(batch.supplierName, "Sri Lakshmi Traders");
  assert.equal(batch.supplierFssaiLicence, "12345678901234");
  assert.equal(batch.unitPrice, 50);

  const admin = await request(app).get("/api/procurement/stock-batches").query({ godownId: String(ctx.kitchenA._id) }).set("Authorization", `Bearer ${ctx.admin.token}`);
  assert.equal(admin.body[0].trackingId, `MKM-${yymm}-0001`);
});

test("tracking IDs run on within the month across orders and kitchens", async () => {
  const first = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 1 }]);
  const second = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 2 }, { stockItemId: ctx.salt._id, qtyBaseUnit: 3 }]);
  await receive(first, { items: [riceDetails()] });
  const res = await receive(second, { items: [riceDetails(), { stockItemId: ctx.salt._id, photos }] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const ids = (await StockBatch.find({ godownId: ctx.kitchenA._id }).sort({ trackingId: 1 }).lean()).map((b) => b.trackingId);
  assert.deepEqual(ids, [`MKM-${yymm}-0001`, `MKM-${yymm}-0002`, `MKM-${yymm}-0003`]);
});

test("both photos are required, and nothing is added to stock when a detail is refused", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 100 }]);
  const noLabel = await receive(order, { items: [riceDetails({ photos: { goods: photos.goods, label: "" } })] });
  assert.equal(noLabel.status, 400);
  assert.equal(noLabel.body.code, "PHOTO_REQUIRED");
  assert.match(noLabel.body.message, /Rice: take a photo of the brand label/);
  const badUrl = await receive(order, { items: [riceDetails({ photos: { goods: "javascript:alert(1)", label: photos.label } })] });
  assert.equal(badUrl.body.code, "PHOTO_REQUIRED");
  assert.equal(await stockOf(ctx.rice), 0);
  assert.equal(await StockBatch.countDocuments({}), 0);
  assert.equal((await receive(order, { items: [riceDetails()] })).status, 200, "the same order can then be received properly");
});

test("expiry is required unless the admin turned it off for the product", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }, { stockItemId: ctx.salt._id, qtyBaseUnit: 5 }]);
  const noExpiry = await receive(order, { items: [riceDetails({ expiryDate: "" }), { stockItemId: ctx.salt._id, photos }] });
  assert.equal(noExpiry.status, 400);
  assert.equal(noExpiry.body.code, "EXPIRY_REQUIRED");
  assert.match(noExpiry.body.message, /Rice: enter the expiry date/);
  const ok = await receive(order, { items: [riceDetails(), { stockItemId: ctx.salt._id, photos }] });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const salt = await StockBatch.findOne({ stockItemId: ctx.salt._id }).lean();
  assert.equal(salt.expiryDate, null);
  assert.equal(salt.storage, null);
  assert.equal(await stockOf(ctx.salt), 5);
});

test("expired goods, impossible dates and bad storage are refused with plain messages", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }]);
  const expired = await receive(order, { items: [riceDetails({ expiryDate: "2020-01-01" })] });
  assert.equal(expired.status, 400);
  assert.equal(expired.body.code, "EXPIRED_GOODS");
  assert.match(expired.body.message, /call the central store/);
  assert.equal((await receive(order, { items: [riceDetails({ expiryDate: "31/01/2030" })] })).body.message, "Rice: expiry date must be a date like 2026-12-31");
  assert.match((await receive(order, { items: [riceDetails({ mfgDate: "2031-01-01" })] })).body.message, /manufacture date cannot be in the future/);
  assert.match((await receive(order, { items: [riceDetails({ storage: "hot" })] })).body.message, /room, fridge or freezer/);
  assert.equal((await receive(order, { items: [riceDetails()] })).status, 200);
});

test("every arriving product needs its details; an empty body is refused", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }, { stockItemId: ctx.salt._id, qtyBaseUnit: 5 }]);
  const empty = await receive(order, {});
  assert.equal(empty.status, 400);
  assert.equal(empty.body.code, "MISSING_ITEM_DETAILS");
  const partial = await receive(order, { items: [riceDetails()] });
  assert.equal(partial.status, 400);
  assert.equal(partial.body.code, "MISSING_ITEM_DETAILS");
  assert.match(partial.body.message, /Salt is missing its receiving details/);
  assert.equal(await stockOf(ctx.rice), 0, "all or nothing");
});

test("an order placed without a supplier leaves the supplier fields blank on the batch", async () => {
  const order = await dispatched([{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }], { supplierId: null });
  assert.equal((await receive(order, { items: [riceDetails()] })).status, 200);
  const batch = await StockBatch.findOne({ stockItemId: ctx.rice._id }).lean();
  assert.equal(batch.supplierName, "");
  assert.equal(batch.supplierFssaiLicence, "");
});
