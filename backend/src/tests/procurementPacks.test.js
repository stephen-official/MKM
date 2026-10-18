import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { GodownStock } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { StockBatch } from "../models/StockBatchModel.js";

let app;
let admin;
let cook;
let kitchen;
let rice;
let bag;

before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  kitchen = await createGodown("Pack Kitchen");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  rice = await StockItem.create({
    name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 58,
    soldInPacks: true, packs: [{ name: "Bag", size: 25, price: 1450 }],
  });
  bag = rice.packs[0];
  admin = await createUser({ role: "admin" });
  cook = await createUser({ role: "user", godownId: kitchen._id });
});

const auth = (actor, method, url) => request(app)[method](url).set("Authorization", `Bearer ${actor.token}`);
const packed = (quantity, price = 1450) => ({
  stockItemId: rice._id, packId: bag._id, packName: bag.name, packSize: bag.size,
  packQuantity: quantity, packPrice: price,
});

test("pack snapshots survive indent, PO and distribution while stock stays in base units", async () => {
  const indent = await auth(admin, "post", "/api/procurement/indents").send({
    items: [{ ...packed(3), orderedQty: 75, qtyBaseUnit: 75, unitPrice: 58, amount: 4350 }],
  });
  assert.equal(indent.status, 201, JSON.stringify(indent.body));
  assert.equal(indent.body.items[0].packQuantity, 3);

  await auth(admin, "post", `/api/procurement/indents/${indent.body._id}/mark-purchased`);
  const po = await auth(admin, "post", "/api/procurement/purchase-orders").send({
    indentId: indent.body._id,
    items: [{ ...packed(2, 1500), orderedQty: 75, receivedQty: 50, qtyBaseUnit: 50, unitPrice: 60, amount: 3000 }],
  });
  assert.equal(po.status, 201, JSON.stringify(po.body));
  assert.equal(po.body.totalAmount, 3000);
  // Only a super-admin may change catalog prices; an admin's PO keeps its price on the PO and batches.
  assert.equal((await StockItem.findById(rice._id)).pricePerUnit, 58);

  const distribution = await auth(admin, "post", "/api/procurement/distributions").send({
    purchaseOrderId: po.body._id,
    allocations: [{ ...packed(2, 1500), godownId: kitchen._id, qtyBaseUnit: 50, unitPrice: 60, amount: 3000 }],
    leftovers: [],
  });
  assert.equal(distribution.status, 201, JSON.stringify(distribution.body));
  assert.equal(distribution.body.allocations[0].packName, "Bag");
  assert.equal((await GodownStock.findOne({ godownId: kitchen._id, stockItemId: rice._id })).qtyBaseUnit, 50);
  const batch = await StockBatch.findOne({ godownId: kitchen._id, stockItemId: rice._id });
  assert.equal(batch.remainingQtyBaseUnit, 50);
  assert.equal(batch.unitPrice, 60);
});

test("a kitchen supply request stores the chosen pack snapshot", async () => {
  const response = await auth(cook, "post", "/api/indent-requests").send({
    items: [{ ...packed(2), qtyBaseUnit: 50 }], note: "Monthly rice",
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.items[0].packQuantity, 2);
  assert.equal(response.body.items[0].qtyBaseUnit, 50);
});

const receivePo = async (actor, line) => {
  const indent = await auth(admin, "post", "/api/procurement/indents").send({
    items: [{ ...packed(3), orderedQty: 75, qtyBaseUnit: 75, unitPrice: 58, amount: 4350 }],
  });
  return auth(actor, "post", "/api/procurement/purchase-orders").send({ indentId: indent.body._id, items: [line] });
};

test("a super-admin's PO updates the catalog unit and pack prices", async () => {
  const superAdmin = await createUser({ role: "super_admin" });
  const po = await receivePo(superAdmin, { ...packed(2, 1500), orderedQty: 75, receivedQty: 50, qtyBaseUnit: 50, unitPrice: 60, amount: 3000 });
  assert.equal(po.status, 201, JSON.stringify(po.body));
  const product = await StockItem.findById(rice._id);
  assert.equal(product.pricePerUnit, 60);
  assert.equal(product.packs[0].price, 1500);
});

test("a zero PO price never replaces the catalog price, even for a super-admin", async () => {
  const superAdmin = await createUser({ role: "super_admin" });
  const po = await receivePo(superAdmin, { stockItemId: rice._id, orderedQty: 75, receivedQty: 50, unitPrice: 0, amount: 0 });
  assert.equal(po.status, 201, JSON.stringify(po.body));
  assert.equal((await StockItem.findById(rice._id)).pricePerUnit, 58);
});

test("a pack line received as zero is accepted so partial intakes can be recorded", async () => {
  const indent = await auth(admin, "post", "/api/procurement/indents").send({
    items: [{ ...packed(2), orderedQty: 50, qtyBaseUnit: 50, unitPrice: 58, amount: 2900 }],
  });
  const po = await auth(admin, "post", "/api/procurement/purchase-orders").send({
    indentId: indent.body._id,
    items: [
      { ...packed(0), orderedQty: 50, receivedQty: 0, qtyBaseUnit: 0, unitPrice: 58, amount: 0 },
      { stockItemId: rice._id, orderedQty: 10, receivedQty: 10, qtyBaseUnit: 10, unitPrice: 58, amount: 580 },
    ],
  });
  assert.equal(po.status, 201, JSON.stringify(po.body));
  assert.equal(po.body.totalAmount, 580);
});
