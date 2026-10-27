import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { addDays, businessDateOf } from "../executive/params.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { UsageCorrection } from "../models/UsageCorrectionModel.js";

let app;
let ctx;
const today = businessDateOf(Date.now());
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await kitchen("Kitchen A");
  const kitchenB = await kitchen("Kitchen B");
  const { items } = await seedCatalog(["Rice"]);
  const row = await stockRow(kitchenA, items.Rice, 100);
  ctx = {
    kitchenA, row,
    cook: await createUser({ role: "user", godownId: kitchenA._id }),
    otherCook: await createUser({ role: "user", godownId: kitchenB._id }),
    admin: await createUser({ role: "admin" }),
  };
  await NoUsageDay.create({ godownId: kitchenA._id, date: today, reason: "closed", createdBy: ctx.cook._id });
});
const auth = (actor) => ["Authorization", `Bearer ${actor.token}`];
const ask = (actor, body) => request(app).post("/api/usage-corrections").set(...auth(actor)).send({ kind: "reopen_day", date: today, reason: "ticked_by_mistake", ...body });
const mine = (actor) => request(app).get("/api/usage-corrections/me").set(...auth(actor));
const all = (actor, status) => request(app).get("/api/usage-corrections").query(status ? { status } : {}).set(...auth(actor));
const approve = (actor, id, note) => request(app).post(`/api/usage-corrections/${id}/approve`).set(...auth(actor)).send({ note });
const reject = (actor, id, note) => request(app).post(`/api/usage-corrections/${id}/reject`).set(...auth(actor)).send({ note });
const recordUsage = (actor) => request(app).post("/api/orders").set(...auth(actor)).send({ date: today, items: [{ stockRecordId: ctx.row._id, qtyBaseUnit: 2 }] });

test("a kitchen asks to reopen a marked day; a second ask while one is pending, an unmarked day and a bad reason are refused", async () => {
  const created = await ask(ctx.cook, { note: "Wrong tick" });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, "pending");
  assert.equal(created.body.kitchen.name, "Kitchen A");
  assert.equal(created.body.date, today);

  assert.equal((await ask(ctx.cook, {})).body.code, "ALREADY_PENDING");
  assert.equal((await ask(ctx.cook, { date: addDays(today, -1) })).body.code, "NOT_MARKED");
  assert.equal((await ask(ctx.cook, { date: addDays(today, -1), reason: "forgot" })).body.code, "INVALID_REASON");
  assert.equal((await ask(ctx.cook, { date: addDays(today, -1), reason: "other", note: " " })).body.code, "NOTE_REQUIRED");
  assert.equal((await ask(ctx.cook, { kind: "edit_usage" })).body.code, "INVALID_KIND");

  const listed = await mine(ctx.cook);
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.map((row) => [row.date, row.status, row.note]), [[today, "pending", "Wrong tick"]]);
  assert.deepEqual((await mine(ctx.otherCook)).body, []);
  assert.equal((await mine(ctx.admin)).status, 403);
  assert.equal((await all(ctx.cook)).status, 403);
});

test("approving removes the mark and the kitchen can record that day again; deciding twice is refused", async () => {
  const { body: created } = await ask(ctx.cook, {});
  assert.equal((await recordUsage(ctx.cook)).body.code, "DAY_CLOSED");

  const approved = await approve(ctx.admin, created._id, "Reopened");
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.status, "approved");
  assert.equal(approved.body.decisionNote, "Reopened");
  assert.ok(approved.body.decidedBy);
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 0);

  const recorded = await recordUsage(ctx.cook);
  assert.ok(recorded.status < 300, JSON.stringify(recorded.body));

  assert.equal((await approve(ctx.admin, created._id)).body.code, "ALREADY_DECIDED");
  assert.equal((await reject(ctx.admin, created._id, "Too late")).body.code, "ALREADY_DECIDED");
  assert.equal((await approve(ctx.admin, "000000000000000000000000")).body.code, "NOT_FOUND");
  assert.equal((await approve(ctx.cook, created._id)).status, 403);
});

test("rejecting needs a note, keeps the mark, and the kitchen may ask again", async () => {
  const { body: created } = await ask(ctx.cook, {});
  assert.equal((await reject(ctx.admin, created._id, "")).body.code, "NOTE_REQUIRED");
  const rejected = await reject(ctx.admin, created._id, "The kitchen was closed that day");
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.status, "rejected");
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 1);
  assert.equal((await recordUsage(ctx.cook)).body.code, "DAY_CLOSED");

  assert.equal((await ask(ctx.cook, {})).status, 201);
  assert.equal(await UsageCorrection.countDocuments({ godownId: ctx.kitchenA._id }), 2);
  const pending = await all(ctx.admin, "pending");
  assert.equal(pending.status, 200);
  assert.equal(pending.body.length, 1);
  assert.equal((await all(ctx.admin)).body.length, 2);
});
