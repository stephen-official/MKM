import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { addDays, businessDateOf } from "../executive/params.js";
import { Consumption, GodownStock } from "../models/FlowModels.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { UsageCorrection } from "../models/UsageCorrectionModel.js";

let app;
let ctx;
const today = businessDateOf(Date.now());
const yesterday = addDays(today, -1);
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await kitchen("Kitchen A");
  const kitchenB = await kitchen("Kitchen B");
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const rice = await stockRow(kitchenA, items.Rice, 100);
  const dal = await stockRow(kitchenA, items.Dal, 10);
  ctx = {
    kitchenA, rice, dal, items,
    cook: await createUser({ role: "user", godownId: kitchenA._id }),
    otherCook: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
  // Yesterday is marked "no usage"; today is open for usage records.
  await NoUsageDay.create({ godownId: kitchenA._id, date: yesterday, reason: "closed", createdBy: ctx.cook._id });
});
const auth = (actor) => ["Authorization", `Bearer ${actor.token}`];
const line = (row, qtyBaseUnit, pack = {}) => ({ stockRecordId: row._id, qtyBaseUnit, ...pack });
const ask = (actor, body) => request(app).post("/api/usage-corrections").set(...auth(actor)).send(body);
const askReopen = (actor, body = {}) => ask(actor, { kind: "reopen_day", date: yesterday, items: [line(ctx.rice, 5)], ...body });
const askEdit = (actor, consumptionId, items, body = {}) => ask(actor, { kind: "edit_usage", consumptionId, items, ...body });
const withdraw = (actor, id) => request(app).delete(`/api/usage-corrections/${id}`).set(...auth(actor));
const mine = (actor) => request(app).get("/api/usage-corrections/me").set(...auth(actor));
const all = (actor, status) => request(app).get("/api/usage-corrections").query(status ? { status } : {}).set(...auth(actor));
const approve = (actor, id, note) => request(app).post(`/api/usage-corrections/${id}/approve`).set(...auth(actor)).send({ note });
const reject = (actor, id, note) => request(app).post(`/api/usage-corrections/${id}/reject`).set(...auth(actor)).send({ note });
const recordUsage = (actor, date, items = [line(ctx.rice, 2)]) => request(app).post("/api/orders").set(...auth(actor)).send({ date, items });
const stockOf = async (row) => Number((await GodownStock.findById(row._id).lean()).qtyBaseUnit);
const recordedLines = async (id) => (await Consumption.findById(id).lean())?.items.map((l) => [String(l.stockItemId), l.qtyBaseUnit]).sort();

test("reopen_day: the ask carries the usage to record; a second ask, an unmarked day, no items and a bad kind are refused", async () => {
  const created = await askReopen(ctx.cook, { items: [line(ctx.rice, 50, { packId: ctx.items.Rice._id, packName: "25 kg bag", packSize: 25, packQuantity: 2 })] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, "pending");
  assert.equal(created.body.kind, "reopen_day");
  assert.equal(created.body.kitchen.name, "Kitchen A");
  assert.equal(created.body.date, yesterday);
  assert.deepEqual(created.body.items.map((l) => [l.name, l.unit, l.qtyBaseUnit, l.packName, l.packQuantity]), [["Rice", "kg", 50, "25 kg bag", 2]]);
  assert.deepEqual(created.body.before, []);

  assert.equal((await askReopen(ctx.cook)).body.code, "ALREADY_PENDING");
  assert.equal((await askReopen(ctx.cook, { date: today })).body.code, "NOT_MARKED");
  assert.equal((await askReopen(ctx.cook, { items: [] })).body.code, "INVALID_ITEMS");
  assert.equal((await askReopen(ctx.cook, { items: [line(ctx.rice, 0)] })).body.code, "INVALID_QUANTITY");
  assert.equal((await askReopen(ctx.cook, { items: [line(ctx.rice, 1), line(ctx.rice, 2)] })).body.code, "DUPLICATE_ITEM");
  assert.equal((await askReopen(ctx.otherCook, { items: [line(ctx.rice, 1)] })).body.code, "INVALID_ITEMS"); // another kitchen's stock row
  assert.equal((await ask(ctx.cook, { kind: "undo", date: yesterday, items: [] })).body.code, "INVALID_KIND");

  const listed = await mine(ctx.cook);
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.map((row) => [row.date, row.status]), [[yesterday, "pending"]]);
  assert.deepEqual((await mine(ctx.otherCook)).body, []);
  assert.equal((await mine(ctx.admin)).status, 403);
  assert.equal((await all(ctx.cook)).status, 403);
});

test("approving a reopen_day removes the mark and records the usage in one go; deciding twice is refused", async () => {
  const { body: created } = await askReopen(ctx.cook, { items: [line(ctx.rice, 5), line(ctx.dal, 1)] });
  assert.equal((await recordUsage(ctx.cook, yesterday)).body.code, "DAY_CLOSED");

  const approved = await approve(ctx.admin, created._id, "Reopened");
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.status, "approved");
  assert.equal(approved.body.decisionNote, "Reopened");
  assert.ok(approved.body.decidedBy);
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 0);
  const recorded = await Consumption.find({ godownId: ctx.kitchenA._id, date: yesterday }).lean();
  assert.equal(recorded.length, 1);
  assert.equal(String(recorded[0].userId), String(ctx.cook.user._id));
  assert.deepEqual(recorded[0].items.map((l) => l.qtyBaseUnit).sort(), [1, 5]);
  assert.equal(await stockOf(ctx.rice), 95);
  assert.equal(await stockOf(ctx.dal), 9);

  assert.equal((await approve(ctx.admin, created._id)).body.code, "ALREADY_DECIDED");
  assert.equal((await reject(ctx.admin, created._id, "Too late")).body.code, "ALREADY_DECIDED");
  assert.equal((await approve(ctx.admin, "000000000000000000000000")).body.code, "NOT_FOUND");
  assert.equal((await approve(ctx.cook, created._id)).status, 403);
});

test("approving fails cleanly when the stock is no longer there; the mark stays and the ask stays pending", async () => {
  const { body: created } = await askReopen(ctx.cook, { items: [line(ctx.dal, 8)] });
  await GodownStock.updateOne({ _id: ctx.dal._id }, { $set: { qtyBaseUnit: 3 } });
  const failed = await approve(ctx.admin, created._id);
  assert.equal(failed.status, 409);
  assert.equal(failed.body.code, "CANNOT_APPLY");
  assert.match(failed.body.message, /Insufficient stock for Dal/);
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 1);
  assert.equal((await UsageCorrection.findById(created._id)).status, "pending");
  assert.equal(await stockOf(ctx.dal), 3);
});

test("rejecting needs a note, keeps the mark, and the kitchen may ask again", async () => {
  const { body: created } = await askReopen(ctx.cook);
  assert.equal((await reject(ctx.admin, created._id, "")).body.code, "NOTE_REQUIRED");
  const rejected = await reject(ctx.admin, created._id, "The kitchen was closed that day");
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.status, "rejected");
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 1);
  assert.equal((await recordUsage(ctx.cook, yesterday)).body.code, "DAY_CLOSED");

  assert.equal((await askReopen(ctx.cook)).status, 201);
  assert.equal(await UsageCorrection.countDocuments({ godownId: ctx.kitchenA._id }), 2);
  const pending = await all(ctx.admin, "pending");
  assert.equal(pending.status, 200);
  assert.equal(pending.body.length, 1);
  assert.equal((await all(ctx.admin)).body.length, 2);
});

test("edit_usage: the ask keeps a before snapshot; unchanged lines, another kitchen's record and a second ask are refused", async () => {
  const recorded = await recordUsage(ctx.cook, today, [line(ctx.rice, 10), line(ctx.dal, 2)]);
  assert.equal(recorded.status, 201, JSON.stringify(recorded.body));
  const id = recorded.body._id;

  assert.equal((await askEdit(ctx.cook, id, [line(ctx.rice, 10), line(ctx.dal, 2)])).body.code, "NO_CHANGE");
  assert.equal((await askEdit(ctx.cook, id, [line(ctx.dal, 2), line(ctx.rice, 10)])).body.code, "NO_CHANGE");
  assert.equal((await askEdit(ctx.otherCook, id, [])).body.code, "NOT_FOUND");
  assert.equal((await askEdit(ctx.cook, "000000000000000000000000", [])).body.code, "NOT_FOUND");

  const created = await askEdit(ctx.cook, id, [line(ctx.rice, 8)]);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.kind, "edit_usage");
  assert.equal(created.body.date, today);
  assert.equal(String(created.body.consumptionId), String(id));
  assert.deepEqual(created.body.before.map((l) => [l.name, l.qtyBaseUnit]).sort(), [["Dal", 2], ["Rice", 10]]);
  assert.deepEqual(created.body.items.map((l) => [l.name, l.qtyBaseUnit]), [["Rice", 8]]);
  assert.equal((await askEdit(ctx.cook, id, [])).body.code, "ALREADY_PENDING");
  // Nothing moved yet.
  assert.equal(await stockOf(ctx.rice), 90);
  assert.equal(await stockOf(ctx.dal), 8);
});

test("approving an edit replaces the lines and moves stock by the difference", async () => {
  const { body: recorded } = await recordUsage(ctx.cook, today, [line(ctx.rice, 10), line(ctx.dal, 2)]);
  const { body: created } = await askEdit(ctx.cook, recorded._id, [line(ctx.rice, 8), line(ctx.dal, 3)]);
  const approved = await approve(ctx.admin, created._id);
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.deepEqual(await recordedLines(recorded._id), [[String(ctx.items.Dal._id), 3], [String(ctx.items.Rice._id), 8]].sort());
  assert.equal(await stockOf(ctx.rice), 92);
  assert.equal(await stockOf(ctx.dal), 7);
});

test("approving an edit with no lines deletes the record and returns the stock", async () => {
  const { body: recorded } = await recordUsage(ctx.cook, today, [line(ctx.rice, 10)]);
  const { body: created } = await askEdit(ctx.cook, recorded._id, []);
  assert.equal(created.status, "pending");
  assert.equal((await approve(ctx.admin, created._id)).status, 200);
  assert.equal(await Consumption.countDocuments({ _id: recorded._id }), 0);
  assert.equal(await stockOf(ctx.rice), 100);
});

test("a record the admin changed after the ask cannot be approved; the kitchen can withdraw a pending ask", async () => {
  const { body: recorded } = await recordUsage(ctx.cook, today, [line(ctx.rice, 10)]);
  const { body: created } = await askEdit(ctx.cook, recorded._id, [line(ctx.rice, 8)]);
  const edited = await request(app).patch(`/api/consumptions/${recorded._id}`).set(...auth(ctx.admin))
    .send({ items: [{ stockItemId: ctx.items.Rice._id, stockRecordId: ctx.rice._id, qtyBaseUnit: 9 }] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  const failed = await approve(ctx.admin, created._id);
  assert.equal(failed.body.code, "RECORD_CHANGED");
  assert.equal(await stockOf(ctx.rice), 91);

  assert.equal((await withdraw(ctx.otherCook, created._id)).body.code, "NOT_FOUND");
  const w = await withdraw(ctx.cook, created._id); assert.equal(w.status, 200, JSON.stringify(w.body));
  assert.equal(await UsageCorrection.countDocuments({}), 0);
  assert.equal((await withdraw(ctx.cook, created._id)).body.code, "NOT_FOUND");

  // Once decided, an ask can no longer be withdrawn.
  const { body: again } = await askEdit(ctx.cook, recorded._id, [line(ctx.rice, 8)]);
  await reject(ctx.admin, again._id, "No");
  assert.equal((await withdraw(ctx.cook, again._id)).body.code, "ALREADY_DECIDED");
});

test("a record that was deleted after the ask cannot be approved", async () => {
  const { body: recorded } = await recordUsage(ctx.cook, today, [line(ctx.rice, 10)]);
  const { body: created } = await askEdit(ctx.cook, recorded._id, [line(ctx.rice, 8)]);
  assert.equal((await request(app).delete(`/api/consumptions/${recorded._id}`).set(...auth(ctx.admin))).status, 200);
  assert.equal((await approve(ctx.admin, created._id)).body.code, "RECORD_GONE");
});
