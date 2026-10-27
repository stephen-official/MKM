import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { addDays, businessDateOf } from "../executive/params.js";
import { usageDayStatuses } from "../usage/usageDays.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";

test("usageDayStatuses: a kitchen with no usage yet sees only today, as missed", () => {
  assert.deepEqual(usageDayStatuses({ today: "2026-10-23" }), [{ date: "2026-10-23", status: "missed", entries: 0, reason: null }]);
});

test("usageDayStatuses: days run from the first usage date, newest first; recorded, none and missed are told apart", () => {
  const days = usageDayStatuses({
    today: "2026-10-23",
    firstUsageDate: "2026-10-20",
    entriesByDate: new Map([["2026-10-20", 1], ["2026-10-22", 2]]),
    noUsageByDate: new Map([["2026-10-21", "holiday"], ["2026-10-22", "closed"]]),
  });
  assert.deepEqual(days, [
    { date: "2026-10-23", status: "missed", entries: 0, reason: null },
    { date: "2026-10-22", status: "recorded", entries: 2, reason: null }, // usage wins over a stale mark
    { date: "2026-10-21", status: "none", entries: 0, reason: "holiday" },
    { date: "2026-10-20", status: "recorded", entries: 1, reason: null },
  ]);
});

test("usageDayStatuses: never looks back further than the lookback window", () => {
  const days = usageDayStatuses({ today: "2026-10-23", firstUsageDate: "2026-01-01", lookback: 3 });
  assert.deepEqual(days.map((day) => day.date), ["2026-10-23", "2026-10-22", "2026-10-21"]);
});

let app;
let ctx;
const today = businessDateOf(Date.now());
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchenA = await kitchen("Kitchen A");
  const { items } = await seedCatalog(["Rice"]);
  const row = await stockRow(kitchenA, items.Rice, 100);
  ctx = { kitchenA, rice: items.Rice, row, cook: await createUser({ role: "user", godownId: kitchenA._id }), admin: await createUser({ role: "admin" }) };
});
const as = (actor) => ({
  get: () => request(app).get("/api/usage-days").set("Authorization", `Bearer ${actor.token}`),
  none: (body) => request(app).post("/api/usage-days/none").set("Authorization", `Bearer ${actor.token}`).send(body),
});

test("GET lists the kitchen's days: the first usage day starts the range and a skipped day in between is missed", async () => {
  await consumption(ctx.kitchenA, { date: addDays(today, -2), createdAt: new Date(), lines: [[ctx.rice, 5]] });
  const { status, body } = await as(ctx.cook).get();
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.today, today);
  assert.deepEqual(body.days.map((day) => [day.date, day.status]), [[today, "missed"], [addDays(today, -1), "missed"], [addDays(today, -2), "recorded"]]);
  assert.equal(body.missed, 2);
});

test("POST none marks a day (with its note); a future day, a bad reason and a recorded day are refused; there is no kitchen undo", async () => {
  await consumption(ctx.kitchenA, { date: addDays(today, -1), createdAt: new Date(), lines: [[ctx.rice, 5]] });
  const marked = await as(ctx.cook).none({ date: today, reason: "holiday", note: "Diwali" });
  assert.equal(marked.status, 201, JSON.stringify(marked.body));
  const { body } = await as(ctx.cook).get();
  assert.deepEqual(body.days[0], { date: today, status: "none", entries: 0, reason: "holiday", note: "Diwali" });
  assert.equal(body.missed, 0);
  assert.deepEqual(body.marks.map((mark) => [mark.date, mark.reason, mark.note]), [[today, "holiday", "Diwali"]]);

  assert.equal((await as(ctx.cook).none({ date: addDays(today, 1), reason: "closed" })).body.code, "FUTURE_DATE");
  assert.equal((await as(ctx.cook).none({ date: today, reason: "strike" })).body.code, "INVALID_REASON");
  assert.equal((await as(ctx.cook).none({ date: addDays(today, -1), reason: "closed" })).status, 409);

  const undo = await request(app).delete(`/api/usage-days/none/${today}`).set("Authorization", `Bearer ${ctx.cook.token}`);
  assert.equal(undo.status, 404);
});

test("recording usage on a day marked no-usage is refused until an admin reopens it", async () => {
  await as(ctx.cook).none({ date: today, reason: "closed" });
  const recorded = await request(app).post("/api/orders").set("Authorization", `Bearer ${ctx.cook.token}`)
    .send({ date: today, items: [{ stockRecordId: ctx.row._id, qtyBaseUnit: 2 }] });
  assert.equal(recorded.status, 409, JSON.stringify(recorded.body));
  assert.equal(recorded.body.code, "DAY_CLOSED");
  assert.equal(await NoUsageDay.countDocuments({ godownId: ctx.kitchenA._id }), 1);
  const { body } = await as(ctx.cook).get();
  assert.equal(body.days[0].status, "none");
});

test("the day list is kitchen-only: an admin login is refused", async () => {
  assert.equal((await as(ctx.admin).get()).status, 403);
});
