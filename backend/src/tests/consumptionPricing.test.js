import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { Consumption, Request } from "../models/FlowModels.js";
import { DailyUsage as DailyUsageModel } from "../models/DailyUsageModel.js";

let app;
let f;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Kitchen A");
  await distribution("2026-10-01T05:00:00Z", [[A, items.Rice, 50, 45]]);
  const rice = await stockRow(A, items.Rice, 50);
  const dal = await stockRow(A, items.Dal, 50);
  const admin = await createUser({ role: "admin" });
  const cook = await createUser({ role: "user", godownId: A._id });
  f = { items, A, rice, dal, admin, cook };
});

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${f[who].token}`);

test("new consumption lines store unit price and amount at issue; unpriced lines store null", async () => {
  const res = await as("cook", "post", "/api/consumptions").send({
    date: "2026-10-12",
    items: [{ stockRecordId: f.rice._id, qtyBaseUnit: 2 }, { stockRecordId: f.dal._id, qtyBaseUnit: 1 }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const saved = await Consumption.findById(res.body._id).lean();
  const rice = saved.items.find((i) => String(i.stockItemId) === String(f.items.Rice._id));
  const dal = saved.items.find((i) => String(i.stockItemId) === String(f.items.Dal._id));
  assert.equal(rice.unitPriceAtIssue, 45);
  assert.equal(rice.amountAtIssue, 90);
  assert.equal(dal.unitPriceAtIssue, null);
  assert.equal(dal.amountAtIssue, null);
});

test("editing keeps the original price; added lines are priced now", async () => {
  const created = await as("cook", "post", "/api/consumptions").send({ date: "2026-10-12", items: [{ stockRecordId: f.rice._id, qtyBaseUnit: 2 }] });
  await distribution("2026-10-12T05:00:00Z", [[f.A, f.items.Rice, 10, 60]]);
  const res = await as("admin", "patch", `/api/consumptions/${created.body._id}`).send({
    items: [
      { stockItemId: f.items.Rice._id, stockRecordId: f.rice._id, qtyBaseUnit: 3 },
      { stockItemId: f.items.Dal._id, stockRecordId: f.dal._id, qtyBaseUnit: 1 }
    ]
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await Consumption.findById(created.body._id).lean();
  const rice = saved.items.find((i) => String(i.stockItemId) === String(f.items.Rice._id));
  assert.equal(rice.unitPriceAtIssue, 45);
  assert.equal(rice.amountAtIssue, 135);
  const dal = saved.items.find((i) => String(i.stockItemId) === String(f.items.Dal._id));
  assert.equal(dal.amountAtIssue, null);
});

test("request approval prices lines, normalises the date, and nets returns", async () => {
  const ok = await Request.create({ godownId: f.A._id, userId: f.cook.user._id, targetDate: "2026-10-12", reason: "r",
    items: [{ stockItemId: f.items.Rice._id, qtyBaseUnit: 3 }] });
  const vague = await Request.create({ godownId: f.A._id, userId: f.cook.user._id, targetDate: "next Monday", reason: "r",
    items: [{ stockItemId: f.items.Rice._id, qtyBaseUnit: -1 }] });
  assert.equal((await as("admin", "post", `/api/requests/${ok._id}/approve`)).status, 200);
  assert.equal((await as("admin", "post", `/api/requests/${vague._id}/approve`)).status, 200);
  const rows = await Consumption.find().sort({ createdAt: 1 }).lean();
  assert.equal(rows[0].date, "2026-10-12");
  assert.equal(rows[0].items[0].amountAtIssue, 135);
  assert.match(rows[1].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(rows[1].items[0].amountAtIssue, -45);
});

test("daily-usage approvals store an ISO date and no price", async () => {
  const daily = await Request.create({ godownId: f.A._id, userId: f.cook.user._id, requestType: "daily_usage", targetDate: "2026-10-11T09:00:00.000Z", reason: "r",
    items: [{ stockItemId: f.items.Dal._id, qtyBaseUnit: 1 }] });
  assert.equal((await as("admin", "post", `/api/requests/${daily._id}/approve`)).status, 200);
  const row = await DailyUsageModel.findOne().lean();
  assert.equal(row.date, "2026-10-11");
  assert.equal(row.items[0].amountAtIssue, undefined);
});
