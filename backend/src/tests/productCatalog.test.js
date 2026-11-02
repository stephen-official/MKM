import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { ProductRequest } from "../models/ProductRequestModel.js";
import { missingFields } from "../catalog/completeness.js";
import { assignMissingProductNos } from "../catalog/productService.js";
import { productPdfRow } from "../catalog/productPdf.js";
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
const base = (extra = {}) => ({ name: "Rice", stockGroupId: ctx.group._id, unitId: ctx.kg._id, itemType: "stock", defaultThreshold: 5, kind: "food", vegMark: "veg", storage: "room", imageUrl: "https://img.test/rice.jpg", ...extra });

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

test("expiry follows the food answers: packaged food asks for it; loose food and non-food do not", async () => {
  const packaged = (await as("admin", "post", "/api/products").send(base({ form: "packaged" }))).body;
  assert.equal(packaged.expiryRequired, true);
  assert.equal((await as("admin", "post", "/api/products").send(base({ name: "Onion", form: "loose" }))).body.expiryRequired, false);
  assert.equal((await as("admin", "post", "/api/products").send(base({ name: "Atta" }))).body.expiryRequired, true, "food with no answer on how it arrives counts as packaged");
  assert.equal((await as("admin", "post", "/api/products").send(base({ name: "Soap", kind: "non_food" }))).body.expiryRequired, false);
  // The form's old tick box is ignored once the kind is known.
  assert.equal((await as("admin", "put", `/api/products/${packaged._id}`).send({ expiryRequired: false })).body.expiryRequired, true);
  assert.equal((await as("admin", "put", `/api/products/${packaged._id}`).send({ form: "loose" })).body.expiryRequired, false);
});

test("a photo is required on the form; products without one are flagged and counted", async () => {
  const none = await as("admin", "post", "/api/products").send(base({ imageUrl: "" }));
  assert.equal(none.status, 400);
  assert.match(none.body.errors.imageUrl, /Add a photo/);
  const old = await StockItem.create({ name: "Old Dal", stockGroupId: ctx.group._id, unitId: ctx.kg._id, pricePerUnit: 50, kind: "food", vegMark: "veg", storage: "room" });
  const listed = await as("root", "get", "/api/products?status=nophoto");
  assert.deepEqual(listed.body.items.map((p) => [p.name, p.available]), [["Old Dal", true]]);
  assert.equal(listed.body.counts.noPhoto, 1);
  assert.match((await as("admin", "put", `/api/products/${old._id}`).send({ brand: "Tata" })).body.errors.imageUrl, /Add a photo/);
  assert.equal((await as("admin", "put", `/api/products/${old._id}`).send({ imageUrl: "https://img.test/dal.jpg" })).status, 200);
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
  assert.deepEqual(res.body.counts, { all: 2, available: 1, incomplete: 1, archived: 0, needsPrice: 1, fssai: 0, noPhoto: 0 });
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

test("every product gets a permanent Product ID: new ones on save, older ones once, oldest first", async () => {
  const created = (await as("admin", "post", "/api/products").send(base())).body;
  assert.equal(created.productNo, "P-0001");
  await StockItem.collection.insertMany([
    { name: "Older", stockGroupId: ctx.group._id, unitId: ctx.kg._id, createdAt: new Date("2025-01-01") },
    { name: "Newer", stockGroupId: ctx.group._id, unitId: ctx.kg._id, createdAt: new Date("2025-02-01") }
  ]);
  assert.equal(await assignMissingProductNos(), 2);
  assert.equal(await assignMissingProductNos(), 0);
  const byName = Object.fromEntries((await StockItem.find().lean()).map((p) => [p.name, p.productNo]));
  assert.deepEqual(byName, { Rice: "P-0001", Older: "P-0002", Newer: "P-0003" });
  await as("admin", "put", `/api/products/${created._id}`).send({ ...base(), productNo: "P-9999" });
  assert.equal((await StockItem.findById(created._id).lean()).productNo, "P-0001");
});

test("admins see how many products each group holds (archived too); kitchens do not get the count", async () => {
  await as("admin", "post", "/api/products").send(base());
  await StockItem.create({ ...base({ name: "Old rice" }), archived: true });
  const listed = (await as("admin", "get", "/api/inventory/stock-groups")).body;
  assert.deepEqual(listed.map((g) => [g.name, g.productCount]), [["Grains", 2], ["Other", 0]]);
  const kitchenView = (await as("cook", "get", "/api/inventory/stock-groups")).body;
  assert.equal(kitchenView[0].productCount, undefined);
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

test("the export can be imported again: every row updates its product instead of failing on the id", async () => {
  const rice = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60 }))).body;
  const exported = await as("root", "get", "/api/products/export/excel").buffer(true).parse((res, done) => { const chunks = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => done(null, Buffer.concat(chunks))); });
  assert.equal(exported.status, 200);
  const imported = await as("root", "post", "/api/products/import").attach("file", exported.body, "products-export.xlsx");
  assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.deepEqual(imported.body.results.map((r) => [r.action, r.name]), [["updated", "Rice"]]);
  assert.equal(imported.body.failed, 0);
  assert.equal((await as("root", "get", `/api/products/${rice._id}`)).body.pricePerUnit, 60);
});

test("food safety: a new product must say whether it is food; food needs a veg mark and storage; non-food clears them; old products are flagged, not hidden", async () => {
  const noKind = await as("root", "post", "/api/products").send({ ...base({ pricePerUnit: 60 }), kind: undefined });
  assert.equal(noKind.status, 400);
  assert.equal(noKind.body.errors.kind, "Say whether this is food or not.");
  const bare = await as("root", "post", "/api/products").send({ ...base({ pricePerUnit: 60 }), vegMark: undefined, storage: undefined });
  assert.equal(bare.status, 400);
  assert.deepEqual(Object.keys(bare.body.errors).sort(), ["storage", "vegMark"]);
  assert.equal((await as("root", "post", "/api/products").send(base({ pricePerUnit: 60, allergens: ["milk", "nuts"] }))).body.errors.allergens, "Pick allergens from the list.");

  const food = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60, form: "packaged", allergens: ["gluten", "milk", "milk"], storage: "fridge" }))).body;
  assert.deepEqual([food.kind, food.form, food.vegMark, food.allergens, food.storage, food.fssaiMissing, food.available], ["food", "packaged", "veg", ["gluten", "milk"], "fridge", false, true]);

  const soap = (await as("root", "post", "/api/products").send(base({ name: "Soap", pricePerUnit: 20, kind: "non_food", form: "packaged", allergens: ["milk"] }))).body;
  assert.deepEqual([soap.kind, soap.form, soap.vegMark, soap.allergens, soap.storage, soap.fssaiMissing, soap.available], ["non_food", null, null, [], null, false, true]);

  // A product from before these facts existed: still available to kitchens, but counted under "fssai" until someone edits it.
  const old = await StockItem.create({ name: "Old Dal", stockGroupId: ctx.group._id, unitId: ctx.kg._id, pricePerUnit: 50, imageUrl: "https://img.test/dal.jpg" });
  const listed = await as("root", "get", "/api/products?status=fssai");
  assert.deepEqual(listed.body.items.map((p) => [p.name, p.available, p.fssaiMissing]), [["Old Dal", true, true]]);
  assert.equal(listed.body.counts.fssai, 1);
  // Editing it must now say the kind; a food kind without its facts is refused, and once given the product is complete.
  assert.equal((await as("root", "put", `/api/products/${old._id}`).send({ kind: "food" })).body.errors.vegMark, "Choose veg, non-veg or egg.");
  const fixed = await as("root", "put", `/api/products/${old._id}`).send({ kind: "food", vegMark: "veg", storage: "room" });
  assert.equal(fixed.status, 200, JSON.stringify(fixed.body));
  assert.equal(fixed.body.fssaiMissing, false);
  assert.equal((await as("root", "put", `/api/products/${old._id}`).send({ name: "Old Dal 2" })).body.kind, "food");
});

test("the Other group is always there, listed last, and can be neither renamed nor deleted", async () => {
  await StockGroup.create({ name: "Zebra" });
  const listed = await as("admin", "get", "/api/inventory/stock-groups");
  assert.deepEqual(listed.body.map((g) => g.name), ["Grains", "Zebra", "Other"]);
  const other = listed.body.find((g) => g.name === "Other");
  assert.equal((await as("admin", "put", `/api/inventory/stock-groups/${other._id}`).send({ name: "Misc" })).body.code, "GROUP_BUILT_IN");
  assert.equal((await as("admin", "delete", `/api/inventory/stock-groups/${other._id}`)).body.code, "GROUP_BUILT_IN");
  assert.equal((await as("admin", "put", `/api/inventory/stock-groups/${ctx.group._id}`).send({ name: "other" })).body.code, "GROUP_BUILT_IN");
  assert.equal((await as("admin", "get", "/api/inventory/stock-groups")).body.length, 3);
});

const fetchBook = async (path, who = "root") => {
  const ExcelJS = (await import("exceljs")).default;
  const res = await as(who, "get", path).buffer(true).parse((r, done) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => done(null, Buffer.concat(c))); });
  assert.equal(res.status, 200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(res.body);
  const sheet = book.getWorksheet("Products");
  const headers = sheet.getRow(1).values.slice(1);
  const addRow = (values) => sheet.addRow(headers.map((h) => values[h] ?? ""));
  const upload = async (uploader = who) => as(uploader, "post", "/api/products/import").attach("file", Buffer.from(await book.xlsx.writeBuffer()), "p.xlsx");
  return { book, sheet, headers, addRow, upload };
};
const food = { "Product group *": "Grains", "Unit *": "kg", "Food or non-food *": "Food", "Veg / Non-veg / Egg": "Veg", Storage: "Room temperature", "No allergens": "Yes" };

test("an import row names what is wrong, and a pack price that is not a number is refused, not saved", async () => {
  const { addRow, upload } = await fetchBook("/api/products/import-template");
  addRow({ "Name *": "Tomato", ...food, "Ordered in packs": "Yes", "Pack 1 name": "Box/Carton", "Pack 1 size": "?", "Pack 1 price (₹)": 300 });
  addRow({ "Name *": "Masala", ...food, "Ordered in packs": "Yes", "Pack 1 name": "Packet", "Pack 1 size": 0.05, "Pack 1 price (₹)": "?" });
  const res = await upload();
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.results.map((r) => r.message), ["Pack 1: Enter how much one pack holds.", "Pack 1: Enter the pack price as a number."]);
});

test("the template carries a note per column and dropdowns fed by the current groups and pack names", async () => {
  await as("root", "post", "/api/products").send(base({ pricePerUnit: 60, soldInPacks: true, packs: [{ name: "Sack", size: 25, price: 1400 }] }));
  const { book, sheet, headers } = await fetchBook("/api/products/import-template");
  assert.equal(headers[0], "Product ID");
  assert.ok(!headers.includes("Product Code"));
  const notes = sheet.getRow(2).values.slice(1);
  assert.equal(notes.length, headers.length);
  assert.ok(notes.every((note) => note.split(/\s+/).length <= 12), "every note is short");
  const lists = book.getWorksheet("Lists");
  const column = (name) => lists.getColumn(lists.getRow(1).values.indexOf(name)).values.slice(2);
  assert.deepEqual(column("groups"), ["Grains", "Other"]);
  assert.ok(column("packs").includes("Sack") && column("packs").includes("Bag"));
  assert.deepEqual(column("units"), ["kg", "g", "L", "mL", "pcs", "dozen", "packet"]);
  assert.equal(sheet.dataValidations.find("C3")?.type, "list");
  assert.equal(sheet.dataValidations.find("C1999")?.formulae[0], "Lists!$A$2:$A$3");
});

test("bulk add: plain words, allergen columns and packs are read; a typed new group is created; Product ID updates; old layouts are refused", async () => {
  const { addRow, upload } = await fetchBook("/api/products/import-template");
  addRow({ "Name *": "Paneer", ...food, "Product group *": "Dairy", "Unit *": "Kgs", "Packaged or loose": "Loose or fresh", "No allergens": "", Milk: "Yes", Storage: "Fridge", Type: "Daily use" });
  addRow({ "Name *": "Phenyl", "Product group *": "Cleaning", "Unit *": "L", "Food or non-food *": "Non-food", "Ordered in packs": "Yes", "Pack 1 name": "Can", "Pack 1 size": 5, "Pack 1 price (₹)": 450, "Price per unit (₹)": 90 });
  addRow({ "Name *": "Broken", "Product group *": "Typo group", "Unit *": "kg" });
  const res = await upload();
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.results.map((r) => r.action), ["created", "created", "error"]);
  const paneer = await StockItem.findOne({ name: "Paneer" }).populate("stockGroupId unitId").lean();
  assert.deepEqual([paneer.stockGroupId.name, paneer.unitId.symbol, paneer.form, paneer.storage, paneer.itemType, paneer.allergens], ["Dairy", "kg", "loose", "fridge", "daily_use", ["milk"]]);
  assert.match(paneer.productNo, /^P-\d{4}$/);
  assert.equal(await StockGroup.exists({ name: "Typo group" }), null, "a group no row ended up in is removed again");

  // Export, change a cell, upload: the row with that Product ID is updated, and an admin's upload keeps the pack price.
  const round = await fetchBook("/api/products/export/excel", "admin");
  const phenylRow = round.sheet.getRows(3, round.sheet.rowCount).find((r) => r.getCell(2).value === "Phenyl");
  phenylRow.getCell(round.headers.indexOf("Brand") + 1).value = "Clean Co";
  const again = await round.upload("admin");
  assert.equal(again.body.failed, 0, JSON.stringify(again.body));
  const phenyl = await StockItem.findOne({ name: "Phenyl" }).lean();
  assert.equal(phenyl.brand, "Clean Co");
  assert.equal(phenyl.packs[0].price, 450);
  assert.equal(await StockItem.countDocuments(), 2);

  const old = new ((await import("exceljs")).default.Workbook)();
  old.addWorksheet("Products").addRow(["Product ID", "Name", "Product Group"]);
  const refused = await as("root", "post", "/api/products/import").attach("file", Buffer.from(await old.xlsx.writeBuffer()), "old.xlsx");
  assert.equal(refused.body.code, "INVALID_IMPORT");
});

test("the PDF export lists every product with plain words and a note per column", async () => {
  const rice = (await as("root", "post", "/api/products").send(base({ pricePerUnit: 60, allergens: ["gluten"], soldInPacks: true, packs: [{ name: "Bag", size: 25, price: 1400 }] }))).body;
  assert.deepEqual(productPdfRow(rice), ["P-0001", "Rice", "Grains", "kg", "Food, Veg, Room temperature", "Gluten", "5 kg", "INR 60", "Bag 25 kg, INR 1,400", "Available"]);
  const res = await as("admin", "get", "/api/products/export/pdf").buffer(true).parse((r, done) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => done(null, Buffer.concat(c))); });
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "application/pdf");
  assert.equal(res.body.subarray(0, 4).toString(), "%PDF");
});
