import mongoose from "mongoose";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { Consumption, GodownStock } from "../models/FlowModels.js";

let app;
let kitchen;
let cook;
let rice;
let stock;

before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  kitchen = await createGodown("FIFO Kitchen");
  ({ items: { Rice: rice } } = await seedCatalog(["Rice"]));
  rice.itemType = "daily_use";
  await rice.save();
  stock = await stockRow(kitchen, rice, 20);
  cook = await createUser({ role: "user", godownId: kitchen._id });
  await StockBatch.create([
    { godownId: kitchen._id, stockItemId: rice._id, sourceType: "opening_balance", receivedAt: new Date("2026-01-01"), receivedQtyBaseUnit: 8, remainingQtyBaseUnit: 8, unitPrice: 10 },
    { godownId: kitchen._id, stockItemId: rice._id, sourceType: "distribution", receivedAt: new Date("2026-02-01"), receivedQtyBaseUnit: 12, remainingQtyBaseUnit: 12, unitPrice: 20 },
  ]);
});

test("daily-use products deduct oldest received batches first and capture weighted value", async () => {
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [0, 10]);
  // The value is stored for admins; the kitchen's own response never carries prices.
  assert.equal(response.body.items[0].amountAtIssue, undefined);
  const saved = await Consumption.findById(response.body._id).lean();
  assert.equal(saved.items[0].amountAtIssue, 120);
  assert.equal(saved.items[0].unitPriceAtIssue, 12);
  assert.deepEqual(response.body.items[0].batchAllocations.map((line) => line.qtyBaseUnit), [8, 2]);
});

test("deleting a consumption restores its exact batch allocations", async () => {
  const created = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const admin = await createUser({ role: "admin" });
  const deleted = await request(app).delete(`/api/consumptions/${created.body._id}`)
    .set("Authorization", `Bearer ${admin.token}`);
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));

  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [8, 12]);
});

test("admin edits match batches by stock item even when the id arrives as a string", async () => {
  const created = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const admin = await createUser({ role: "admin" });
  const edited = await request(app).patch(`/api/consumptions/${created.body._id}`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ items: [{ stockItemId: String(rice._id), qtyBaseUnit: 12 }] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));

  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [0, 8]);
  assert.equal((await GodownStock.findById(stock._id)).qtyBaseUnit, 8);
});

const migratedUsage = (qty) => Consumption.create({
  godownId: kitchen._id, userId: cook.user._id, date: "2026-09-01", sourceType: "migrated_daily_usage",
  items: [{ stockItemId: rice._id, qtyBaseUnit: qty, unitPriceAtIssue: null, amountAtIssue: null, batchAllocations: [] }],
});

test("deleting migrated daily usage leaves stock and batches alone, since it never deducted stock", async () => {
  const migrated = await migratedUsage(5);
  const admin = await createUser({ role: "admin" });
  const deleted = await request(app).delete(`/api/consumptions/${migrated._id}`)
    .set("Authorization", `Bearer ${admin.token}`);
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));

  assert.equal(await Consumption.countDocuments({ _id: migrated._id }), 0);
  assert.equal((await GodownStock.findById(stock._id)).qtyBaseUnit, 20);
  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [8, 12]);
});

test("editing migrated daily usage corrects the history without moving stock", async () => {
  const migrated = await migratedUsage(5);
  const admin = await createUser({ role: "admin" });
  const edited = await request(app).patch(`/api/consumptions/${migrated._id}`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ items: [{ stockItemId: String(rice._id), qtyBaseUnit: 3 }] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));

  const saved = await Consumption.findById(migrated._id).lean();
  assert.equal(saved.sourceType, "migrated_daily_usage");
  assert.deepEqual(saved.items.map((item) => item.qtyBaseUnit), [3]);
  assert.equal((await GodownStock.findById(stock._id)).qtyBaseUnit, 20);
  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [8, 12]);
});

test("deleting a kitchen stock row empties its batches so they cannot feed later usage", async () => {
  const admin = await createUser({ role: "admin" });
  const deleted = await request(app).delete(`/api/procurement/godown-stocks/${stock._id}`)
    .set("Authorization", `Bearer ${admin.token}`);
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));

  assert.equal(await GodownStock.countDocuments({ _id: stock._id }), 0);
  const batches = await StockBatch.find({ godownId: kitchen._id, stockItemId: rice._id }).sort({ receivedAt: 1 });
  assert.deepEqual(batches.map((batch) => batch.remainingQtyBaseUnit), [0, 0]);
});

test("over-using stock names the product in the error", async () => {
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 25 }] });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /Insufficient stock for Rice/);
});

test("an admin can edit one line while another line's stock row no longer exists", async () => {
  const { items: { Dal: dal } } = await seedCatalog(["Dal"]);
  const dalStock = await stockRow(kitchen, dal, 5);
  const created = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-18", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10 }, { stockRecordId: dalStock._id, qtyBaseUnit: 2 }] });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const admin = await createUser({ role: "admin" });
  await request(app).delete(`/api/procurement/godown-stocks/${dalStock._id}`).set("Authorization", `Bearer ${admin.token}`);
  const edited = await request(app).patch(`/api/consumptions/${created.body._id}`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ items: [{ stockItemId: String(rice._id), qtyBaseUnit: 12 }, { stockItemId: String(dal._id), qtyBaseUnit: 2 }] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));

  assert.equal((await GodownStock.findById(stock._id)).qtyBaseUnit, 8);
  const saved = await Consumption.findById(created.body._id).lean();
  assert.deepEqual(saved.items.map((item) => item.qtyBaseUnit), [12, 2]);
  const dalBatches = await StockBatch.find({ godownId: kitchen._id, stockItemId: dal._id });
  assert.deepEqual(dalBatches.map((batch) => batch.remainingQtyBaseUnit), [0]);
});

// --- Expiry-first usage (FEFO): what the kitchen app tells the cook to use first is what the records deduct ---

const batch = (extra) => ({ godownId: kitchen._id, stockItemId: rice._id, sourceType: "collaborative_order", receivedQtyBaseUnit: 10, remainingQtyBaseUnit: 10, unitPrice: 10, ...extra });

test("usage deducts the soonest-expiring batch first, even when it arrived later", async () => {
  await StockBatch.deleteMany({});
  const [later, soon] = await StockBatch.create([
    batch({ receivedAt: new Date("2026-09-01"), expiryDate: new Date("2027-03-01") }),
    batch({ receivedAt: new Date("2026-10-01"), expiryDate: new Date("2026-10-25") }),
  ]);
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-20", items: [{ stockRecordId: stock._id, qtyBaseUnit: 12 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal((await StockBatch.findById(soon._id)).remainingQtyBaseUnit, 0);
  assert.equal((await StockBatch.findById(later._id)).remainingQtyBaseUnit, 8);
});

test("batches without an expiry date are used after every dated one, oldest first", async () => {
  await StockBatch.deleteMany({});
  const [undatedOld, dated, undatedNew] = await StockBatch.create([
    batch({ sourceType: "opening_balance", receivedAt: new Date("2026-01-01"), expiryDate: null }),
    batch({ receivedAt: new Date("2026-10-01"), expiryDate: new Date("2027-01-01") }),
    batch({ sourceType: "distribution", receivedAt: new Date("2026-10-05"), expiryDate: null }),
  ]);
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-20", items: [{ stockRecordId: stock._id, qtyBaseUnit: 15 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal((await StockBatch.findById(dated._id)).remainingQtyBaseUnit, 0);
  assert.equal((await StockBatch.findById(undatedOld._id)).remainingQtyBaseUnit, 5);
  assert.equal((await StockBatch.findById(undatedNew._id)).remainingQtyBaseUnit, 10);
});

test("an expired batch is deducted before everything else: using it is allowed, never refused", async () => {
  await StockBatch.deleteMany({});
  const [expired, fresh] = await StockBatch.create([
    batch({ receivedAt: new Date("2026-10-10"), expiryDate: new Date("2026-10-01") }),
    batch({ receivedAt: new Date("2026-10-01"), expiryDate: new Date("2027-01-01") }),
  ]);
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-20", items: [{ stockRecordId: stock._id, qtyBaseUnit: 4 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal((await StockBatch.findById(expired._id)).remainingQtyBaseUnit, 6);
  assert.equal((await StockBatch.findById(fresh._id)).remainingQtyBaseUnit, 10);
});

test("usage entered in bags is stored in the base unit with the bag kept as a snapshot", async () => {
  await StockBatch.deleteMany({});
  await StockBatch.create([batch({ receivedAt: new Date("2026-10-01"), expiryDate: new Date("2027-01-01"), remainingQtyBaseUnit: 60 })]);
  await mongoose.model("GodownStock").updateOne({ _id: stock._id }, { $set: { qtyBaseUnit: 60 } });
  const response = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-20", items: [{ stockRecordId: stock._id, qtyBaseUnit: 10, packId: "e1055b121c8277e1392329bc", packName: "5 kg bag", packSize: 5, packQuantity: 2 }] });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const line = response.body.items[0];
  assert.equal(line.qtyBaseUnit, 10);
  assert.deepEqual([line.packName, line.packSize, line.packQuantity], ["5 kg bag", 5, 2]);
  // A snapshot that does not add up to the base quantity is dropped, never trusted over the kilograms.
  const odd = await request(app).post("/api/consumptions")
    .set("Authorization", `Bearer ${cook.token}`)
    .send({ date: "2026-10-20", items: [{ stockRecordId: stock._id, qtyBaseUnit: 3, packId: "e1055b121c8277e1392329bc", packName: "5 kg bag", packSize: 5, packQuantity: 2 }] });
  assert.equal(odd.status, 201, JSON.stringify(odd.body));
  assert.equal(odd.body.items[0].packName ?? "", "");
});

test("my-kitchen-stock lists dated lots soonest first, grouped by date, with no batch ids or prices, plus the suppliers behind the stock", async () => {
  await StockBatch.deleteMany({});
  await StockBatch.create([
    batch({ receivedAt: new Date("2026-09-01"), expiryDate: new Date("2027-03-01T00:00:00+05:30"), remainingQtyBaseUnit: 7, supplierName: "Sri Traders" }),
    batch({ receivedAt: new Date("2026-10-01"), expiryDate: new Date("2026-10-25T00:00:00+05:30"), remainingQtyBaseUnit: 3, supplierName: "Anand's Trade and Marketplace" }),
    batch({ receivedAt: new Date("2026-10-02"), expiryDate: new Date("2026-10-25T00:00:00+05:30"), remainingQtyBaseUnit: 4, supplierName: "Sri Traders" }),
    batch({ sourceType: "opening_balance", receivedAt: new Date("2026-01-01"), expiryDate: null, remainingQtyBaseUnit: 6 }),
    batch({ receivedAt: new Date("2026-10-03"), expiryDate: new Date("2026-11-01T00:00:00+05:30"), remainingQtyBaseUnit: 0, supplierName: "Used Up Stores" }),
  ]);
  const response = await request(app).get("/api/my-kitchen-stock").set("Authorization", `Bearer ${cook.token}`);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const row = response.body.find((item) => String(item.stockItemId) === String(rice._id));
  assert.deepEqual(row.expiries, [{ date: "2026-10-25", qtyBaseUnit: 7 }, { date: "2027-03-01", qtyBaseUnit: 7 }]);
  // Each supplier once, A–Z; a batch that is used up or has no supplier adds nothing.
  assert.deepEqual(row.suppliers, ["Anand's Trade and Marketplace", "Sri Traders"]);
  assert.equal(JSON.stringify(row).includes("unitPrice"), false);
});
