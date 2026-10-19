import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { Supplier } from "../models/SupplierModel.js";

// Supplier and invoice number on a shared order: set by the admin, shown read-only to kitchens.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await createGodown("Kitchen A");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 });
  const supplier = await Supplier.create({ name: "Sri Lakshmi Traders", nameKey: "sri lakshmi traders", fssaiLicence: "12345678901234", phone: "9876543210" });
  const archived = await Supplier.create({ name: "Old Vendor", nameKey: "old vendor", fssaiLicence: "11111111111111", active: false });
  ctx = {
    rice, supplier, archived,
    cookA: await createUser({ role: "user", godownId: kitchenA._id }),
    admin: await createUser({ role: "admin" }),
  };
  const created = await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: rice._id, qtyBaseUnit: 20 }] });
  ctx.order = created.body;
  await call(ctx.admin, "post", `/${ctx.order._id}/approve`).send({});
});

const call = (actor, method, path) => request(app)[method](`/api/procurement/collaborative-purchase-orders${path}`).set("Authorization", `Bearer ${actor.token}`);
const purchase = (actor, body) => call(actor, "patch", `/${ctx.order._id}/purchase`).send(body);

test("marking an order ordered with a supplier shows the supplier's name and licence to the kitchen, nothing more", async () => {
  const ordered = await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  assert.equal(ordered.status, 200, JSON.stringify(ordered.body));
  assert.equal(ordered.body.status, "ordered");
  assert.equal(ordered.body.supplier.name, "Sri Lakshmi Traders");
  assert.equal(ordered.body.supplier.fssaiLicence, "12345678901234");
  assert.equal(ordered.body.invoiceNo, "");

  const seen = (await call(ctx.cookA, "get", `/${ctx.order._id}`)).body;
  assert.deepEqual(seen.supplier, { _id: String(ctx.supplier._id), name: "Sri Lakshmi Traders", fssaiLicence: "12345678901234" });
  assert.equal(seen.supplierId, undefined);
  assert.equal(seen.supplier.phone, undefined);
});

test("an order can still be marked ordered without a supplier", async () => {
  const ordered = await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered" });
  assert.equal(ordered.status, 200, JSON.stringify(ordered.body));
  assert.equal(ordered.body.supplier, null);
});

test("the admin sets the invoice number after ordering; kitchens read it, never write it", async () => {
  await call(ctx.admin, "patch", `/${ctx.order._id}/status`).send({ status: "ordered", supplierId: ctx.supplier._id });
  assert.equal((await purchase(ctx.cookA, { invoiceNo: "INV-1" })).status, 403);
  const saved = await purchase(ctx.admin, { invoiceNo: "  INV-2026-0042 " });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.invoiceNo, "INV-2026-0042");
  assert.equal(saved.body.supplier.name, "Sri Lakshmi Traders", "supplier kept when only the invoice is sent");
  assert.equal((await call(ctx.cookA, "get", `/${ctx.order._id}`)).body.invoiceNo, "INV-2026-0042");
});

test("the supplier can be chosen before ordering and changed after, but only to an active supplier", async () => {
  const early = await purchase(ctx.admin, { supplierId: ctx.supplier._id });
  assert.equal(early.status, 200, JSON.stringify(early.body));
  assert.equal(early.body.status, "approved");
  assert.equal(early.body.supplier.name, "Sri Lakshmi Traders");

  const archived = await purchase(ctx.admin, { supplierId: ctx.archived._id });
  assert.equal(archived.status, 400);
  assert.equal(archived.body.code, "INVALID_INPUT");
  const unknown = await purchase(ctx.admin, { supplierId: "000000000000000000000000" });
  assert.equal(unknown.status, 400);
  assert.equal((await purchase(ctx.admin, { invoiceNo: "x".repeat(61) })).status, 400);
  assert.equal((await purchase(ctx.admin, {})).status, 400);
});

test("purchase details cannot be set on an order that is still open or cancelled", async () => {
  const open = (await call(ctx.cookA, "post", "/").send({ neededIn: "1w", items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 5 }] })).body;
  const res = await call(ctx.admin, "patch", `/${open._id}/purchase`).send({ supplierId: ctx.supplier._id });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "NOT_APPROVED");
});
