import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { DEFAULT_ORDERING_SETTINGS } from "../ordering/window.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg" });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id, pricePerUnit: 50 });
  ctx = {
    rice,
    cook: await createUser({ role: "user", godownId: kitchen._id }),
    admin: await createUser({ role: "admin" }),
    owner: await createUser({ role: "super_admin" }),
  };
});

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const settings = (actor, method = "get") => request(app)[method]("/api/ordering-settings").set("Authorization", `Bearer ${actor.token}`);
const custom = { ...DEFAULT_ORDERING_SETTINGS, closeBeforeHours: 24, emergencyHours: 2 };

test("every signed-in user reads the defaults until a super-admin saves figures", async () => {
  for (const actor of [ctx.cook, ctx.admin, ctx.owner]) {
    const res = await settings(actor);
    assert.equal(res.status, 200);
    assert.equal(res.body.version, 0);
    assert.deepEqual(res.body.settings, JSON.parse(JSON.stringify(DEFAULT_ORDERING_SETTINGS)));
  }
});

test("only a super-admin changes the figures", async () => {
  for (const actor of [ctx.cook, ctx.admin]) {
    assert.equal((await settings(actor, "put").send({ expectedVersion: 0, settings: custom })).status, 403);
  }
  const saved = await settings(ctx.owner, "put").send({ expectedVersion: 0, settings: custom });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.version, 1);
  assert.equal((await settings(ctx.cook)).body.settings.closeBeforeHours, 24);
});

test("a save based on an old version is refused", async () => {
  await settings(ctx.owner, "put").send({ expectedVersion: 0, settings: custom });
  const stale = await settings(ctx.owner, "put").send({ expectedVersion: 0, settings: DEFAULT_ORDERING_SETTINGS });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
});

test("figures that would break ordering are refused", async () => {
  const option = DEFAULT_ORDERING_SETTINGS.neededInOptions[0];
  const bad = [
    { minOpenShare: 0 }, { minOpenShare: 1 }, { emergencyHours: 0 }, { emergencyHours: 48 }, { closeBeforeHours: -1 },
    { neededInOptions: [] }, { neededInOptions: [option, option] }, { neededInOptions: [{ ...option, hours: 0 }] },
    { neededInOptions: [{ ...option, label: "" }] },
  ];
  for (const change of bad) {
    const res = await settings(ctx.owner, "put").send({ expectedVersion: 0, settings: { ...DEFAULT_ORDERING_SETTINGS, ...change } });
    assert.equal(res.status, 400, JSON.stringify(change));
    assert.equal(res.body.code, "INVALID_INPUT");
  }
  assert.equal((await settings(ctx.cook)).body.version, 0);
});

test("new orders use the saved figures", async () => {
  await settings(ctx.owner, "put").send({ expectedVersion: 0, settings: custom });
  const before = Date.now();
  const order = (url, body) => request(app).post("/api/procurement/collaborative-purchase-orders")
    .set("Authorization", `Bearer ${ctx.cook.token}`).send({ ...body, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 10 }] });
  const week = await order("/", { neededIn: "1w" });
  assert.equal(week.status, 201, JSON.stringify(week.body));
  assert.ok(Math.abs(new Date(week.body.closesAt) - (before + 6 * DAY)) < 60_000);
  const urgent = await order("/", { emergency: true });
  assert.ok(Math.abs(new Date(urgent.body.neededBy) - (before + 2 * HOUR)) < 60_000);
});
