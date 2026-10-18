import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { ProductRequest } from "../models/ProductRequestModel.js";
import { missingFields } from "../catalog/completeness.js";
import { presetFor } from "../catalog/units.js";
import { applyCatalogMigration, planCatalogMigration } from "../jobs/migrate-product-catalog.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    kitchen,
    root: await createUser({ role: "super_admin" }),
    admin: await createUser({ role: "admin" }),
    cook: await createUser({ role: "user", godownId: kitchen._id }),
    group: await StockGroup.create({ name: "Grains" })
  };
  const units = (await as("admin", "get", "/api/products/units")).body;
  ctx.kg = units.find((u) => u.symbol === "kg");
});

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);
const base = (extra = {}) => ({ name: "Rice", stockGroupId: ctx.group._id, unitId: ctx.kg._id, itemType: "stock", defaultThreshold: 5, ...extra });

test("preset aliases map common spellings and nothing vague", () => {
  assert.equal(presetFor({ symbol: "Kgs" }).symbol, "kg");
  assert.equal(presetFor({ symbol: "Nos" }).symbol, "pcs");
  assert.equal(presetFor({ symbol: "x", name: "Litre" }).symbol, "L");
  assert.equal(presetFor({ symbol: "tray" }), null);
});

test("a product needs a preset unit, a price and complete packs", () => {
  const ok = { stockGroupId: "g", pricePerUnit: 50 };
  assert.deepEqual(missingFields(ok, { symbol: "kg" }), []);
  assert.deepEqual(missingFields(ok, { symbol: "Kg" }), ["unit"]);
  assert.deepEqual(missingFields({ ...ok, pricePerUnit: 0 }, { symbol: "kg" }), ["price"]);
  assert.deepEqual(missingFields({ ...ok, soldInPacks: true, packs: [] }, { symbol: "kg" }), ["packs"]);
  assert.deepEqual(missingFields({ ...ok, soldInPacks: true, packs: [{ name: "Bag", size: 25, price: null }] }, { symbol: "kg" }), ["packPrice"]);
});

test("preset units are created once and listed in order", async () => {
  await as("admin", "get", "/api/products/units");
  const units = (await as("admin", "get", "/api/products/units")).body;
  assert.deepEqual(units.map((u) => u.symbol), ["kg", "g", "L", "mL", "pcs", "dozen", "packet"]);
  assert.equal(await Unit.countDocuments({ symbol: "kg" }), 1);
});

test("an admin creates a product without a price; it stays hidden from kitchens until a super-admin prices it", async () => {
  const created = await as("admin", "post", "/api/products").send(base({ brand: "India Gate", productCode: "RICE-01" }));
  assert.equal(created.status, 201);
  assert.equal(created.body.available, false);
  assert.deepEqual(created.body.missing, ["price"]);

  assert.equal((await as("cook", "get", "/api/inventory/stock-items")).body.length, 0);

  const priced = await as("root", "put", `/api/products/${created.body._id}`).send({ pricePerUnit: 62.5 });
  assert.equal(priced.status, 200);
  assert.equal(priced.body.available, true);
  assert.ok(priced.body.priceUpdatedAt);
  assert.deepEqual((await as("cook", "get", "/api/inventory/stock-items")).body.map((p) => p.name), ["Rice"]);
});

test("only a super-admin may set or change a price", async () => {
  assert.equal((await as("admin", "post", "/api/products").send(base({ pricePerUnit: 10 }))).body.code, "PRICE_SUPER_ADMIN_ONLY");
  const product = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60 }))).body;
  assert.equal((await as("admin", "put", `/api/products/${product._id}`).send({ pricePerUnit: 70 })).status, 403);
  // Echoing the current price back (as the form does) is not a change.
  const edit = await as("admin", "put", `/api/products/${product._id}`).send({ pricePerUnit: 60, brand: "Daawat" });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.brand, "Daawat");
});

test("a super-admin must give every product and pack a price", async () => {
  const res = await as("root", "post", "/api/products").send(base({ soldInPacks: true, packs: [{ name: "Bag", size: 25 }] }));
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.pricePerUnit);
  assert.ok(res.body.errors.packList[0].price);
});

test("ordered in packs needs at least one named pack with a size", async () => {
  const none = await as("admin", "post", "/api/products").send(base({ soldInPacks: true, packs: [] }));
  assert.ok(none.body.errors.packs);
  const bad = await as("admin", "post", "/api/products").send(base({ soldInPacks: true, packs: [{ name: "", size: 0 }, { name: "Bag", size: 25 }, { name: "bag", size: 50 }] }));
  assert.ok(bad.body.errors.packList[0].name && bad.body.errors.packList[0].size);
  assert.match(bad.body.errors.packList[2].name, /different name/);
});

test("an admin resizing a pack clears that pack's price for the super-admin to set again", async () => {
  const product = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60, soldInPacks: true, packs: [{ name: "Bag", size: 25, price: 1450 }, { name: "Sack", size: 50, price: 2800 }] }))).body;
  assert.equal(product.available, true);
  const [bag, sack] = product.packs;
  const res = await as("admin", "put", `/api/products/${product._id}`).send({ packs: [{ _id: bag._id, name: "Bag", size: 30 }, { _id: sack._id, name: "Sack", size: 50 }] });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.packs.map((p) => p.price), [null, 2800]);
  assert.deepEqual(res.body.missing, ["packPrice"]);
});

test("names and product codes are unique regardless of case", async () => {
  await as("admin", "post", "/api/products").send(base({ productCode: "R-1" }));
  const dup = await as("admin", "post", "/api/products").send(base({ name: "RICE", productCode: "r-1" }));
  assert.ok(dup.body.errors.name && dup.body.errors.productCode);
});

test("archiving is super-admin only and refused while any kitchen holds stock", async () => {
  const product = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60 }))).body;
  const row = await GodownStock.create({ godownId: ctx.kitchen._id, stockItemId: product._id, qtyBaseUnit: 3 });
  assert.equal((await as("admin", "post", `/api/products/${product._id}/archive`)).status, 403);
  assert.equal((await as("root", "post", `/api/products/${product._id}/archive`)).body.code, "STOCK_HELD");

  await GodownStock.updateOne({ _id: row._id }, { qtyBaseUnit: 0 });
  const archived = await as("root", "post", `/api/products/${product._id}/archive`);
  assert.equal(archived.body.archived, true);
  assert.equal(archived.body.available, false);
  assert.equal((await as("admin", "get", "/api/products?status=archived")).body.items.length, 1);
  assert.equal((await as("root", "post", `/api/products/${product._id}/restore`)).body.archived, false);
});

test("the list filters by status and search and always returns the counts", async () => {
  await as("root", "post", "/api/products").send(base({ pricePerUnit: 60 }));
  await as("admin", "post", "/api/products").send(base({ name: "Dal", brand: "Tata" }));
  const res = await as("admin", "get", "/api/products?status=incomplete");
  assert.deepEqual(res.body.items.map((p) => p.name), ["Dal"]);
  assert.deepEqual(res.body.counts, { all: 2, available: 1, incomplete: 1, archived: 0 });
  assert.deepEqual((await as("admin", "get", "/api/products?q=tata")).body.items.map((p) => p.name), ["Dal"]);
  assert.equal((await as("cook", "get", "/api/products")).status, 403);
});

test("kitchens cannot use an incomplete product and see it flagged in their stock", async () => {
  const product = (await as("admin", "post", "/api/products").send(base())).body;
  await GodownStock.create({ godownId: ctx.kitchen._id, stockItemId: product._id, qtyBaseUnit: 10 });
  const res = await as("cook", "post", "/api/requests").send({ requestType: "stock_request", reason: "x", targetDate: "2026-10-18", items: [{ stockItemId: product._id, qtyBaseUnit: 1 }] });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "PRODUCT_UNAVAILABLE");
  assert.match(res.body.error, /Rice is not available/);
  const supply = await as("cook", "post", "/api/indent-requests").send({ items: [{ stockItemId: product._id, qtyBaseUnit: 1 }] });
  assert.equal(supply.status, 409);
  const stock = (await as("cook", "get", "/api/my-kitchen-stock")).body;
  assert.equal(stock[0].available, false);
  assert.deepEqual(stock[0].missing, ["price"]);
});

test("old inventory routes no longer write products or units, and a group in use cannot be deleted", async () => {
  assert.equal((await as("admin", "post", "/api/inventory/stock-items").send(base())).body.code, "USE_PRODUCTS_PAGE");
  assert.equal((await as("admin", "post", "/api/inventory/units").send({ symbol: "tray" })).body.code, "UNITS_ARE_PRESETS");
  await as("admin", "post", "/api/products").send(base());
  assert.equal((await as("admin", "delete", `/api/inventory/stock-groups/${ctx.group._id}`)).body.code, "GROUP_IN_USE");
});

test("a kitchen requests a product; an admin approves it by creating the product, once", async () => {
  const asked = await as("cook", "post", "/api/product-requests").send({ name: "Basmati rice", unitSymbol: "kg", note: "For biryani day" });
  assert.equal(asked.status, 201);
  assert.equal(asked.body.kitchen.name, "Kitchen A");
  assert.equal((await as("admin", "get", "/api/product-requests?status=pending")).body.length, 1);

  const approved = await as("admin", "post", `/api/product-requests/${asked.body._id}/approve`).send({ product: base({ name: "Basmati rice" }) });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, "approved");
  assert.equal(approved.body.product.name, "Basmati rice");

  const again = await as("root", "post", `/api/product-requests/${asked.body._id}/approve`).send({ product: base({ name: "Other" }) });
  assert.equal(again.body.code, "ALREADY_DECIDED");
  assert.equal(await StockItem.countDocuments({ name: "Other" }), 0);
  assert.equal((await as("cook", "get", "/api/product-requests/me")).body[0].status, "approved");
});

test("rejecting a product request needs a reason the kitchen can read", async () => {
  const asked = (await as("cook", "post", "/api/product-requests").send({ name: "Saffron" })).body;
  assert.equal((await as("admin", "post", `/api/product-requests/${asked._id}/reject`).send({})).status, 400);
  const rejected = await as("admin", "post", `/api/product-requests/${asked._id}/reject`).send({ note: "Too costly" });
  assert.equal(rejected.body.decisionNote, "Too costly");
  assert.equal((await as("admin", "post", "/api/product-requests").send({ name: "x" })).status, 403);
  assert.equal(await ProductRequest.countDocuments(), 1);
});

test("the migration merges look-alike units into presets and reports what is still missing", async () => {
  const oldKg = await Unit.create({ name: "Kilogram", symbol: "Kgs" });
  const tray = await Unit.create({ name: "Tray", symbol: "tray" });
  await StockItem.create({ name: "Onion", stockGroupId: ctx.group._id, unitId: oldKg._id, pricePerUnit: 30 });
  await StockItem.create({ name: "Eggs", stockGroupId: ctx.group._id, unitId: tray._id });

  const plan = await planCatalogMigration();
  assert.deepEqual(plan.merges.map((m) => [m.symbol, m.into, m.products]), [["Kgs", "kg", ["Onion"]]]);
  assert.deepEqual(plan.unmatched.map((u) => u.symbol), ["tray"]);
  assert.deepEqual(plan.incomplete, [{ name: "Eggs", archived: false, missing: ["unit", "price"] }]);
  assert.equal(await Unit.exists({ _id: oldKg._id }) !== null, true, "planning changes nothing");

  assert.equal((await applyCatalogMigration(plan)).moved, 1);
  assert.equal(await Unit.exists({ _id: oldKg._id }), null);
  const onion = await StockItem.findOne({ name: "Onion" }).lean();
  assert.equal(String(onion.unitId), String(ctx.kg._id));
});
