import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRequest, stockRow } from "./helpers/fixtures.js";
import { GodownStock } from "../models/FlowModels.js";
import { Godown } from "../models/InventoryModels.js";
import { buildExecutiveReport, KPI_ORDER } from "../executive/buildReport.js";
import { parseReportParams } from "../executive/params.js";

let app;
let f;
const NOW = new Date("2026-10-13T06:00:00Z");
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Alpha Kitchen");
  const B = await kitchen("Beta Kitchen");
  const C = await kitchen("Closed Kitchen", false);
  const ghost = new mongoose.Types.ObjectId();
  await distribution("2026-10-02T05:00:00Z", [[A, items.Rice, 10, 40], [B, items.Rice, 10, 40]]);
  await stockRow(A, items.Rice, 10, 20);
  await stockRow(B, items.Rice, 10);
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 40.004]] });
  await consumption(B, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 2, 80.004]] });
  await consumption(C, { date: "2026-10-06", createdAt: "2026-10-06T05:00:00Z", lines: [[items.Rice, 1, 40]] });
  await consumption({ _id: ghost }, { date: "2026-10-07", createdAt: "2026-10-07T05:00:00Z", lines: [[items.Rice, 1, 40]] });
  await stockRequest(B, { status: "pending", createdAt: "2026-10-12T06:00:00Z" });
  const superAdmin = await createUser({ role: "super_admin" });
  const admin = await createUser({ role: "admin" });
  f = { items, A, B, C, ghost, superAdmin, admin };
});

const report = (query) => buildExecutiveReport(parseReportParams({ from: "2026-10-01", to: "2026-10-10", ...query }, { now: NOW }), { now: NOW });

test("all-kitchens report has every KPI in order and a comparison table", async () => {
  const r = await report({});
  assert.deepEqual(r.kpis.map((k) => k.id), KPI_ORDER);
  assert.equal(r.meta.kitchen.name, "All kitchens");
  assert.equal(r.meta.currency, "INR");
  assert.equal(r.meta.timezone, "Asia/Kolkata");
  assert.equal(r.meta.generatedAt, NOW.toISOString());
  assert.ok(r.meta.definitions.length >= KPI_ORDER.length);
  assert.equal(r.kpis.find((k) => k.id === "stockValue").estimated, true);
  assert.equal(r.sections.kitchenComparison.status, "ok");
  assert.deepEqual(r.failures, []);
});

test("comparison: inactive and deleted kitchens appear with history; stock only for active", async () => {
  const rows = (await report({})).sections.kitchenComparison.data.rows;
  assert.deepEqual(rows.map((x) => x.kitchen), ["Beta Kitchen", "Alpha Kitchen", "Closed Kitchen", `Deleted kitchen (…${String(f.ghost).slice(-6)})`]);
  const closed = rows.find((x) => x.kitchen === "Closed Kitchen");
  assert.equal(closed.lowOrOutOfStock, null);
  assert.equal(closed.active, false);
  const ghost = rows.at(-1);
  assert.equal(ghost.deleted, true);
  const alpha = rows.find((x) => x.kitchen === "Alpha Kitchen");
  assert.equal(alpha.lowOrOutOfStock, 1);
  assert.equal(alpha.stockReceivedValue, 400);
  assert.equal(rows.find((x) => x.kitchen === "Beta Kitchen").pendingRequests, 1);
});

test("comparison rows sum to the consumption KPI up to rounding", async () => {
  const r = await report({});
  const kpi = r.kpis.find((k) => k.id === "consumptionValue").value;
  const sum = r.sections.kitchenComparison.data.rows.reduce((s, x) => s + x.consumptionValue, 0);
  assert.ok(Math.abs(kpi - sum) <= 0.005 * r.sections.kitchenComparison.data.rows.length, `${kpi} vs ${sum}`);
  assert.equal(kpi, 200.01);
});

test("single kitchen: no comparison, no all-only KPIs", async () => {
  const r = await report({ godownId: String(f.A._id) });
  assert.equal(r.sections.kitchenComparison, null);
  assert.equal(r.kpis.some((k) => k.id === "procurementSpend"), false);
  assert.equal(r.meta.kitchen.name, "Alpha Kitchen");
});

test("a failing section does not take the report down", async (t) => {
  t.mock.method(GodownStock, "find", () => { throw new Error("boom"); });
  const r = await report({});
  assert.equal(r.sections.stockHealth.status, "error");
  assert.equal(r.sections.stockHealth.code, "SECTION_FAILED");
  assert.equal(r.kpis.find((k) => k.id === "stockValue").status, "error");
  assert.equal(r.sections.consumptionTrend.status, "ok");
  assert.equal(r.sections.kitchenComparison.status, "error", "comparison depends on stock");
  assert.deepEqual(r.failures.map((x) => x.section).sort(), ["comparison", "stock"]);
});

test("empty database still produces a complete report", async () => {
  await clearDb();
  const r = await buildExecutiveReport(parseReportParams({}, { now: NOW }), { now: NOW });
  assert.equal(r.kpis.every((k) => k.status === "ok"), true);
  assert.equal(r.kpis.find((k) => k.id === "consumptionValue").value, 0);
  assert.deepEqual(r.sections.kitchenComparison.data.rows, []);
});

const get = (who, query) => request(app).get("/api/executive/summary").query(query).set("Authorization", `Bearer ${f[who].token}`);

test("HTTP: super-admin only", async () => {
  assert.equal((await get("admin", {})).status, 403);
  const ok = await get("superAdmin", {});
  assert.equal(ok.status, 200);
  assert.equal(ok.headers["cache-control"], "no-store");
  assert.equal("failures" in ok.body, false);
});

test("HTTP: parameter and kitchen errors", async () => {
  assert.equal((await get("superAdmin", { godownId: "nope" })).body.code, "INVALID_KITCHEN");
  assert.equal((await get("superAdmin", { from: "2026-02-30" })).body.code, "INVALID_DATE");
  assert.equal((await get("superAdmin", { to: "2099-01-01" })).body.code, "FUTURE_DATE");
  const missing = await get("superAdmin", { godownId: String(f.ghost) });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, "KITCHEN_NOT_FOUND");
  const closed = await get("superAdmin", { godownId: String(f.C._id), from: "2026-10-01", to: "2026-10-10" });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.meta.kitchen.active, false);
});

test("HTTP: a kitchen deleted after selection gives 404, not a crash", async () => {
  await Godown.deleteOne({ _id: f.B._id });
  const res = await get("superAdmin", { godownId: String(f.B._id) });
  assert.equal(res.status, 404);
});
