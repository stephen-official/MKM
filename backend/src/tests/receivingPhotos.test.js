import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { cloudinaryConfigured } from "../stock/photoStorage.js";

// Kitchen receiving photos. Tests run without Cloudinary keys, so files land under backend/uploads/receipts.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await createGodown("Kitchen A");
  const kitchenB = await createGodown("Kitchen B");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 });
  ctx = {
    rice,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    cookB: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
  ctx.order = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: rice._id, qtyBaseUnit: 10 }] })).body;
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
// A tiny valid JPEG header is enough: the server trusts the declared type and size, not the pixels.
const jpeg = (bytes = 64) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(bytes - 4, 1)]);
const upload = (actor, file = jpeg(), name = "goods.jpg", type = "image/jpeg") =>
  call(actor, "post", `/${ctx.order._id}/photos`).attach("photo", file, { filename: name, contentType: type });

test("tests run on the disk fallback", () => { assert.equal(cloudinaryConfigured(), false); });

test("a kitchen on the order uploads a photo and gets back a URL that serves the image", async () => {
  const res = await upload(ctx.cookA);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.body.url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/receipts\/\d+-[0-9a-f]{12}\.jpg$/);
  const served = await request(app).get(new URL(res.body.url).pathname);
  assert.equal(served.status, 200);
  assert.match(served.headers["content-type"], /image\/jpeg/);
  assert.equal(served.body.length, 64);
});

test("only kitchens on the order upload; admins and other kitchens are refused", async () => {
  assert.equal((await upload(ctx.admin)).status, 403);
  const other = await upload(ctx.cookB);
  assert.equal(other.status, 404);
  assert.equal(other.body.code, "NOT_FOUND");
});

test("non-images, oversized files and an empty form are refused with plain messages", async () => {
  const pdf = await upload(ctx.cookA, Buffer.from("%PDF-1.4"), "bill.pdf", "application/pdf");
  assert.equal(pdf.status, 400);
  assert.equal(pdf.body.code, "INVALID_INPUT");
  assert.match(pdf.body.message, /JPEG, PNG or WebP/);
  const huge = await upload(ctx.cookA, jpeg(8 * 1024 * 1024 + 1));
  assert.equal(huge.status, 400);
  assert.equal(huge.body.code, "PHOTO_TOO_LARGE");
  const none = await call(ctx.cookA, "post", `/${ctx.order._id}/photos`).field("kind", "goods");
  assert.equal(none.status, 400);
  assert.equal(none.body.code, "PHOTO_REQUIRED");
});

test("the uploaded URLs are accepted by receive end to end", async () => {
  await call(ctx.admin, "post", `/${ctx.order._id}/approve`).send({});
  await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" });
  await call(ctx.admin, "post", `/${ctx.order._id}/dispatch`).send({ godownId: ctx.cookA.user.godownId });
  const goods = (await upload(ctx.cookA)).body.url;
  const label = (await upload(ctx.cookA, jpeg(), "label.png", "image/png")).body.url;
  const res = await call(ctx.cookA, "post", `/${ctx.order._id}/receive`).send({ items: [{ stockItemId: ctx.rice._id, expiryDate: "2030-01-01", photos: { goods, label } }] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual((await StockBatch.findOne({ stockItemId: ctx.rice._id }).lean()).photos, { goods, label });
});
