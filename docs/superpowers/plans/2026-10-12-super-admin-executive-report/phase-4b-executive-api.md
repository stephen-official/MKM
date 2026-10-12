# Phase 4b — Executive Report API, indexes, performance, Excel

Read `README.md` Decisions 4, 7 and 8 first. Depends on Phase 4a (and Task 9's `PROTECTED_MOUNTS`).

---

### Task 22: Kitchen comparison, report assembly and `GET /api/executive/summary`

**Files:**
- Create: `backend/src/executive/sections/comparison.js`, `backend/src/executive/buildReport.js`, `backend/src/routes/executiveRoutes.js`
- Modify: `backend/src/app.js` (`PROTECTED_MOUNTS` gets `["/api/executive", executiveRoutes]`; CORS `exposedHeaders`)
- Test: `backend/src/tests/executiveReport.test.js`

**Interfaces:**
- Consumes: everything in Phase 4a.
- Produces:
  - `comparisonSection(ctx) → { kpis: {}, sections: { kitchenComparison: { rows, total, page, pageSize, pages } } }`; row = `{ godownId, kitchen, active, deleted, consumptionValue, unvaluedLines, lowOrOutOfStock (number|null), pendingRequests, stockReceivedValue }`
  - `class KitchenNotFoundError` (status 404, code `KITCHEN_NOT_FOUND`)
  - `resolveKitchen(godownId) → { id, name, active }` (`{ id: "all", name: "All kitchens", active: null }` for all)
  - `attachLoaders(ctx)` — sets `ctx.consumption`, `ctx.stock`, `ctx.distributions`, `ctx.pendingRequestsByKitchen` (memoised)
  - `KPI_ORDER`, `buildExecutiveReport(params, { now?, limits?, maxTimeMS? }) → { meta, kpis, sections, failures }`
- HTTP: `GET /api/executive/summary?godownId&from&to&healthPage&unpricedPage&comparisonPage` (super_admin) → `{ meta, kpis, sections }`, `Cache-Control: no-store`.

Report shape (the UI and exports consume exactly this):

```
meta: {
  kitchen: { id, name, active }, from, to, days, previous: { from, to },
  timezone, currency: "INR", generatedAt, definitions: DEFINITIONS,
  notes: { historicalStock, unvaluedConsumption }
}
kpis: [{ id, label, kind, format, estimated, status: "ok"|"error", value, details }]   // order = KPI_ORDER filtered by scope
sections: {
  consumptionTrend, topItems, stockHealth, unpricedStock, procurement, requestsTransfers,   // each { status: "ok", data } | { status: "error", code: "SECTION_FAILED" }
  kitchenComparison                                                                         // same, or null when a single kitchen is selected
}
```

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveReport.test.js`:

```js
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
```

Fixture note: `consumption({ _id: ghost }, …)` works because the helper only reads `godown._id`.

Numbers: A 40.004 + B 80.004 + C 40 + ghost 40 = 200.008 → KPI `round2` = 200.01; rows round individually (40, 80, 40, 40 = 200) — the tolerance assertion is the documented rule (README Decision 4, Kitchen comparison).

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: `comparison.js`**

```js
import { round2 } from "../../utils/money.js";
import { collator, compareIds, paginate } from "../paginate.js";

/** All kitchens only. Rows: active kitchens plus any kitchen (incl. inactive/deleted) with period activity. */
export const comparisonSection = async (ctx) => {
  const [consumption, stock, distributions, pending] = await Promise.all([
    ctx.consumption(), ctx.stock(), ctx.distributions(), ctx.pendingRequestsByKitchen()
  ]);
  const consumptionBy = new Map(consumption.byKitchen.map((r) => [String(r._id), r]));
  const ids = new Set([
    ...ctx.activeIds.map(String),
    ...consumptionBy.keys(),
    ...distributions.byKitchen.keys(),
    ...pending.keys()
  ]);
  const rows = [...ids].map((id) => {
    const known = ctx.godowns.get(id);
    const active = known ? known.active : false;
    return {
      godownId: id,
      kitchen: ctx.kitchenName(id),
      active,
      deleted: !known,
      consumptionValue: round2(consumptionBy.get(id)?.value || 0),
      unvaluedLines: consumptionBy.get(id)?.unvaluedLines || 0,
      lowOrOutOfStock: active ? (stock.perKitchen.get(id)?.lowOrOut || 0) : null,
      pendingRequests: pending.get(id) || 0,
      stockReceivedValue: round2(distributions.byKitchen.get(id) || 0)
    };
  }).sort((a, b) => b.consumptionValue - a.consumptionValue || collator.compare(a.kitchen, b.kitchen) || compareIds(a.godownId, b.godownId));
  return { kpis: {}, sections: { kitchenComparison: paginate(rows, ctx.params.pages.comparison, ctx.limits.comparisonPageSize) } };
};
```

- [ ] **Step 4: `buildReport.js`**

```js
import { Godown } from "../models/InventoryModels.js";
import { createContext, memo, UI_LIMITS } from "./context.js";
import { DEFINITIONS, DEFINITION_BY_ID, HISTORICAL_STOCK_NOTE, UNVALUED_CONSUMPTION_NOTE } from "./definitions.js";
import { aggregateConsumption, consumptionSection } from "./sections/consumption.js";
import { loadStockSnapshot, stockSections } from "./sections/stock.js";
import { aggregateDistributions, procurementSection } from "./sections/procurement.js";
import { pendingRequestsByKitchen, requestsTransfersSection } from "./sections/requestsTransfers.js";
import { comparisonSection } from "./sections/comparison.js";

export class KitchenNotFoundError extends Error {
  constructor() {
    super("That kitchen does not exist.");
    this.status = 404;
    this.code = "KITCHEN_NOT_FOUND";
  }
}

export const KPI_ORDER = Object.freeze([
  "stockValue", "lowStock", "outOfStock", "consumptionValue", "dailyUseLines",
  "pendingRequests", "pendingSupplyRequests", "openTransfers",
  "stockReceivedValue", "procurementSpend", "poAwaitingDistribution"
]);
const ALL_ONLY = new Set(["procurementSpend", "poAwaitingDistribution"]);
const KPI_SOURCE = {
  stockValue: "stock", lowStock: "stock", outOfStock: "stock",
  consumptionValue: "consumption", dailyUseLines: "consumption",
  pendingRequests: "flow", pendingSupplyRequests: "flow", openTransfers: "flow",
  stockReceivedValue: "procurement", procurementSpend: "procurement", poAwaitingDistribution: "procurement"
};
const SECTION_SOURCE = {
  consumptionTrend: "consumption", topItems: "consumption", stockHealth: "stock", unpricedStock: "stock",
  procurement: "procurement", requestsTransfers: "flow"
};

export const resolveKitchen = async (godownId) => {
  if (godownId === "all") return { id: "all", name: "All kitchens", active: null };
  const doc = await Godown.findById(godownId).select("name active").lean();
  if (!doc) throw new KitchenNotFoundError();
  return { id: String(doc._id), name: doc.name, active: doc.active !== false };
};

export const attachLoaders = (ctx) => {
  const { params, tz, scopeIds } = ctx;
  ctx.consumption = memo(() => aggregateConsumption({ scopeIds, from: params.from, to: params.to, window: params.window, tz, options: ctx.aggOptions() }));
  ctx.stock = memo(() => loadStockSnapshot(ctx));
  ctx.distributions = memo(() => aggregateDistributions(ctx));
  ctx.pendingRequestsByKitchen = memo(() => pendingRequestsByKitchen(ctx));
  return ctx;
};

const isTimeout = (error) => error?.code === 50 || error?.codeName === "MaxTimeMSExpired";

export const buildExecutiveReport = async (params, { now = new Date(), limits = UI_LIMITS, maxTimeMS } = {}) => {
  const kitchen = await resolveKitchen(params.godownId);
  const godownDocs = await Godown.find().select("name active").lean();
  const ctx = attachLoaders(createContext({ params, kitchen, godownDocs, now, limits, maxTimeMS }));
  const failures = [];

  const run = async (name, fn) => {
    try {
      return { status: "ok", ...(await fn(ctx)) };
    } catch (error) {
      failures.push({ section: name, code: isTimeout(error) ? "TIMEOUT" : "SECTION_FAILED" });
      console.error(`[executive] section ${name} failed:`, error.message);
      return { status: "error" };
    }
  };

  const [consumption, stock, procurement, flow] = await Promise.all([
    run("consumption", consumptionSection),
    run("stock", stockSections),
    run("procurement", procurementSection),
    run("requestsTransfers", requestsTransfersSection)
  ]);
  const comparison = params.godownId === "all" ? await run("comparison", comparisonSection) : null;
  const sources = { consumption, stock, procurement, flow };

  const kpis = KPI_ORDER
    .filter((id) => params.godownId === "all" || !ALL_ONLY.has(id))
    .map((id) => {
      const def = DEFINITION_BY_ID[id];
      const source = sources[KPI_SOURCE[id]];
      const base = { id, label: def.label, kind: def.kind, format: def.format, estimated: id === "stockValue" };
      if (source.status !== "ok") return { ...base, status: "error", value: null, details: null };
      const kpi = source.kpis[id];
      return { ...base, status: "ok", value: kpi.value, details: kpi.details || null };
    });

  const section = (name) => {
    const source = sources[SECTION_SOURCE[name]];
    return source.status === "ok" ? { status: "ok", data: source.sections[name] } : { status: "error", code: "SECTION_FAILED" };
  };

  return {
    meta: {
      kitchen, from: params.from, to: params.to, days: params.days,
      previous: { from: params.previous.from, to: params.previous.to },
      timezone: params.tz, currency: "INR", generatedAt: now.toISOString(),
      definitions: DEFINITIONS,
      notes: { historicalStock: HISTORICAL_STOCK_NOTE, unvaluedConsumption: UNVALUED_CONSUMPTION_NOTE }
    },
    kpis,
    sections: {
      consumptionTrend: section("consumptionTrend"),
      topItems: section("topItems"),
      stockHealth: section("stockHealth"),
      unpricedStock: section("unpricedStock"),
      procurement: section("procurement"),
      requestsTransfers: section("requestsTransfers"),
      kitchenComparison: comparison === null ? null
        : comparison.status === "ok" ? { status: "ok", data: comparison.sections.kitchenComparison } : { status: "error", code: "SECTION_FAILED" }
    },
    failures
  };
};
```

- [ ] **Step 5: `executiveRoutes.js`**

```js
import express from "express";
import { authorize } from "../middleware/auth.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { ReportParamError, parseReportParams } from "../executive/params.js";

export const executiveRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);

export const sendReportError = (res, error) => {
  if (error instanceof ReportParamError || error?.code === "KITCHEN_NOT_FOUND") {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  console.error("[executive]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "The report could not be generated." });
};

executiveRoutes.get("/summary", superAdminOnly, async (req, res) => {
  try {
    const now = new Date();
    const params = parseReportParams(req.query, { now });
    const { failures: _failures, ...report } = await buildExecutiveReport(params, { now });
    res.set("Cache-Control", "no-store");
    return res.json(report);
  } catch (error) {
    return sendReportError(res, error);
  }
});
```

- [ ] **Step 6: Mount and expose download headers**

In `backend/src/app.js`: import `{ executiveRoutes } from "./routes/executiveRoutes.js"`, append `["/api/executive", executiveRoutes]` to `PROTECTED_MOUNTS`, and add `exposedHeaders: ["Content-Disposition"]` to the first `cors({...})` options object (needed so the browser can read the export filename in Task 24/27).

- [ ] **Step 7: Run** — `npm --prefix backend test` → PASS (including the Task 9 coverage test: `/api/executive/*` is an `open` rule).

- [ ] **Step 8: Commit**

```bash
git add backend/src/executive/sections/comparison.js backend/src/executive/buildReport.js backend/src/routes/executiveRoutes.js \
  backend/src/app.js backend/src/tests/executiveReport.test.js
git commit -m "feat(executive): assemble report with isolated sections and super-admin summary API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Indexes, query-plan checks, production-sized performance test

**Files:**
- Modify: `backend/src/models/FlowModels.js` (index declarations after each schema), `backend/src/models/DailyUsageModel.js`
- Create: `backend/src/tests/helpers/perfFixture.js`
- Test: `backend/src/tests/executiveIndexes.test.js`, `backend/src/tests/executivePerf.test.js`

**Interfaces:**
- Consumes: `consumptionRangeMatch` (Task 19), `buildExecutiveReport` (Task 22), `syncAllIndexes` (Task 1).
- Produces: `seedProductionSized({ kitchens, items, days, consumptionsPerKitchenPerDay, linesPerConsumption, distributions, allocationsPerDistribution, purchaseOrders, linesPerPO, requests, transfers, supplyRequests }) → { godownIds }` and `PRODUCTION_SIZE` (README Decision 8 numbers).

- [ ] **Step 1: Failing index/plan test**

`backend/src/tests/executiveIndexes.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { Consumption, Distribution, IndentRequest, PurchaseOrder, Request, Transfer } from "../models/FlowModels.js";
import { DailyUsage } from "../models/DailyUsageModel.js";
import { consumptionRangeMatch } from "../executive/sections/consumption.js";
import { parseReportParams } from "../executive/params.js";

before(async () => { await startDb(); await syncAllIndexes(); });
after(stopDb);

const keys = async (Model) => (await Model.collection.indexes()).map((i) => JSON.stringify(i.key));

test("report indexes exist", async () => {
  const expect = {
    Consumption: [{ godownId: 1, date: 1 }, { date: 1 }, { godownId: 1, createdAt: 1 }, { createdAt: 1 }],
    DailyUsage: [{ godownId: 1, date: 1 }, { createdAt: 1 }],
    Distribution: [{ "allocations.godownId": 1, "allocations.stockItemId": 1, createdAt: -1 }, { createdAt: 1 }],
    PurchaseOrder: [{ status: 1 }, { receivedAt: 1 }, { "items.stockItemId": 1, receivedAt: -1 }],
    Request: [{ status: 1, godownId: 1, createdAt: 1 }, { godownId: 1, createdAt: 1 }, { createdAt: 1 }],
    Transfer: [{ status: 1, createdAt: 1 }, { fromGodownId: 1, status: 1 }, { toGodownId: 1, status: 1 }, { createdAt: 1 }],
    IndentRequest: [{ status: 1, godownId: 1, createdAt: 1 }, { godownId: 1, createdAt: 1 }]
  };
  const models = { Consumption, DailyUsage, Distribution, PurchaseOrder, Request, Transfer, IndentRequest };
  for (const [name, wanted] of Object.entries(expect)) {
    const have = await keys(models[name]);
    for (const k of wanted) assert.ok(have.includes(JSON.stringify(k)), `${name} missing ${JSON.stringify(k)}`);
  }
});

const noCollScan = (plan, label) => assert.equal(JSON.stringify(plan).includes("COLLSCAN"), false, `${label} uses a collection scan`);

test("report filters use indexes, not collection scans", async () => {
  const p = parseReportParams({ from: "2026-10-01", to: "2026-10-10" }, { now: new Date("2026-10-13T06:00:00Z") });
  const scopeIds = [new mongoose.Types.ObjectId()];
  const w = { $gte: p.window.start, $lt: p.window.end };
  noCollScan(await Consumption.find(consumptionRangeMatch({ scopeIds: null, ...p })).explain("queryPlanner"), "consumption all");
  noCollScan(await Consumption.find(consumptionRangeMatch({ scopeIds, ...p })).explain("queryPlanner"), "consumption kitchen");
  noCollScan(await Distribution.find({ createdAt: w }).explain("queryPlanner"), "distributions");
  noCollScan(await PurchaseOrder.find({ receivedAt: w }).explain("queryPlanner"), "po spend");
  noCollScan(await PurchaseOrder.find({ status: "pending" }).explain("queryPlanner"), "po awaiting");
  noCollScan(await Request.find({ status: "pending", godownId: { $in: scopeIds } }).explain("queryPlanner"), "pending requests");
  noCollScan(await Request.find({ createdAt: w }).explain("queryPlanner"), "requests in range");
  noCollScan(await Transfer.find({ status: "pending", $or: [{ fromGodownId: { $in: scopeIds } }, { toGodownId: { $in: scopeIds } }] }).explain("queryPlanner"), "open transfers");
  noCollScan(await IndentRequest.find({ createdAt: w, godownId: { $in: scopeIds } }).explain("queryPlanner"), "supply requests");
});
```

Run: `npm --prefix backend test` → FAIL (indexes missing).

- [ ] **Step 2: Declare the indexes**

In `backend/src/models/FlowModels.js`, after each schema definition and before the `mongoose.model(...)` exports at the bottom:

```js
// --- Executive report indexes (README Decision 8) ---
consumptionSchema.index({ godownId: 1, date: 1 });
consumptionSchema.index({ date: 1 });
consumptionSchema.index({ godownId: 1, createdAt: 1 });
consumptionSchema.index({ createdAt: 1 });
distributionSchema.index({ "allocations.godownId": 1, "allocations.stockItemId": 1, createdAt: -1 });
distributionSchema.index({ createdAt: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ receivedAt: 1 });
purchaseOrderSchema.index({ "items.stockItemId": 1, receivedAt: -1 });
requestSchema.index({ status: 1, godownId: 1, createdAt: 1 });
requestSchema.index({ godownId: 1, createdAt: 1 });
requestSchema.index({ createdAt: 1 });
transferSchema.index({ status: 1, createdAt: 1 });
transferSchema.index({ fromGodownId: 1, status: 1 });
transferSchema.index({ toGodownId: 1, status: 1 });
transferSchema.index({ createdAt: 1 });
indentSchema.index({ createdAt: 1 });
indentSchema.index({ status: 1 });
indentRequestSchema.index({ status: 1, godownId: 1, createdAt: 1 });
indentRequestSchema.index({ godownId: 1, createdAt: 1 });
```

In `backend/src/models/DailyUsageModel.js` before the model export:

```js
dailyUsageSchema.index({ godownId: 1, date: 1 });
dailyUsageSchema.index({ createdAt: 1 });
```

Production note (put in Task 35 docs): Mongoose `autoIndex` builds these at startup; on large production collections build them once beforehand with `db.collection.createIndex(...)` during a quiet period.

Run: `npm --prefix backend test` → index test PASS. If the transfer `$or` plan still shows `COLLSCAN`, it is because an `$or` branch lacks an index — both branches here have `{fromGodownId,status}` / `{toGodownId,status}`; check spelling before changing the query.

- [ ] **Step 3: Production-sized fixture**

`backend/src/tests/helpers/perfFixture.js`:

```js
import mongoose from "mongoose";
import { Godown, StockGroup, StockItem, Unit } from "../../models/InventoryModels.js";
import { Consumption, Distribution, GodownStock, IndentRequest, PurchaseOrder, Request, Transfer } from "../../models/FlowModels.js";

const { ObjectId } = mongoose.Types;
const DAY = 86_400_000;

// README Decision 8 — replace with real production counts if they are larger.
export const PRODUCTION_SIZE = Object.freeze({
  kitchens: 40, items: 1200, days: 365,
  consumptionsPerKitchenPerDay: 2, linesPerConsumption: 6,
  distributions: 3000, allocationsPerDistribution: 40,
  purchaseOrders: 1500, linesPerPO: 30,
  requests: 15000, transfers: 6000, supplyRequests: 4000
});

const insertBatches = async (collection, docs, size = 5000) => {
  for (let i = 0; i < docs.length; i += size) await collection.insertMany(docs.slice(i, i + size), { ordered: false });
};

/** Deterministic, fast raw inserts (no Mongoose validation) shaped like real documents. */
export const seedProductionSized = async (size = PRODUCTION_SIZE, end = new Date("2026-10-13T06:00:00Z")) => {
  const group = await StockGroup.create({ name: "Perf group" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const godowns = Array.from({ length: size.kitchens }, (_, k) => ({ _id: new ObjectId(), name: `Kitchen ${String(k).padStart(3, "0")}`, active: k % 10 !== 9 }));
  const items = Array.from({ length: size.items }, (_, i) => ({ _id: new ObjectId(), name: `Item ${String(i).padStart(5, "0")}`, stockGroupId: group._id, unitId: unit._id, itemType: "stock", defaultThreshold: 0 }));
  await Godown.collection.insertMany(godowns);
  await StockItem.collection.insertMany(items);

  const at = (daysAgo, hour = 6) => new Date(end.getTime() - daysAgo * DAY - hour * 3_600_000);
  const isoDay = (date) => date.toISOString().slice(0, 10);

  await insertBatches(GodownStock.collection, godowns.flatMap((g, gi) => items.map((it, ii) => ({
    godownId: g._id, stockItemId: it._id, qtyBaseUnit: (ii * 7 + gi * 13) % 60 - 3, thresholdBaseUnit: ii % 5 === 0 ? 20 : 0
  }))));

  const consumptions = [];
  for (let d = 0; d < size.days; d += 1) {
    for (const [gi, g] of godowns.entries()) {
      for (let c = 0; c < size.consumptionsPerKitchenPerDay; c += 1) {
        const createdAt = at(d, c + 1);
        consumptions.push({
          godownId: g._id, userId: new ObjectId(), date: (d + gi) % 17 === 0 ? String(createdAt) : isoDay(createdAt), createdAt, updatedAt: createdAt,
          items: Array.from({ length: size.linesPerConsumption }, (_, l) => {
            const it = items[(d * 31 + gi * 7 + l) % items.length];
            const qty = 1 + ((d + l) % 4);
            return (d + l) % 9 === 0
              ? { stockItemId: it._id, qtyBaseUnit: qty }
              : { stockItemId: it._id, qtyBaseUnit: qty, unitPriceAtIssue: 40, amountAtIssue: qty * 40 };
          })
        });
      }
    }
  }
  await insertBatches(Consumption.collection, consumptions);

  await insertBatches(Distribution.collection, Array.from({ length: size.distributions }, (_, n) => {
    const createdAt = at(n % size.days);
    return {
      purchaseOrderId: null, leftoverSourceId: null, createdAt, updatedAt: createdAt, leftovers: [],
      allocations: Array.from({ length: size.allocationsPerDistribution }, (_, a) => ({
        godownId: godowns[(n + a) % godowns.length]._id, stockItemId: items[(n * 3 + a) % items.length]._id,
        qtyBaseUnit: 5 + (a % 10), unitPrice: a % 13 === 0 ? null : 20 + (a % 50)
      }))
    };
  }));

  await insertBatches(PurchaseOrder.collection, Array.from({ length: size.purchaseOrders }, (_, n) => {
    const receivedAt = at(n % size.days);
    const lines = Array.from({ length: size.linesPerPO }, (_, l) => ({ stockItemId: items[(n * 5 + l) % items.length]._id, orderedQty: 10, receivedQty: 10, unitPrice: 30 + (l % 20), amount: 10 * (30 + (l % 20)), status: "approved" }));
    return { indentId: new ObjectId(), items: lines, totalAmount: lines.reduce((s, l) => s + l.amount, 0), receivedAt, status: n % 4 === 0 ? "pending" : "distributed", createdAt: receivedAt, updatedAt: receivedAt };
  }));

  const statuses = ["pending", "approved", "rejected"];
  await insertBatches(Request.collection, Array.from({ length: size.requests }, (_, n) => {
    const createdAt = at(n % size.days);
    return { godownId: godowns[n % godowns.length]._id, userId: new ObjectId(), requestType: "stock_request", targetDate: isoDay(createdAt), reason: "perf", items: [], status: statuses[n % 3], adminDecision: "", createdAt, updatedAt: createdAt };
  }));
  await insertBatches(Transfer.collection, Array.from({ length: size.transfers }, (_, n) => {
    const createdAt = at(n % size.days);
    return { fromGodownId: godowns[n % godowns.length]._id, toGodownId: godowns[(n + 1) % godowns.length]._id, items: [], createdBy: new ObjectId(), status: ["pending", "accepted", "rejected"][n % 3], createdAt, updatedAt: createdAt };
  }));
  await insertBatches(IndentRequest.collection, Array.from({ length: size.supplyRequests }, (_, n) => {
    const createdAt = at(n % size.days);
    return { godownId: godowns[n % godowns.length]._id, userId: new ObjectId(), items: [], note: "", targetDate: null, status: ["pending", "confirmed", "received"][n % 3], createdAt, updatedAt: createdAt };
  }));
  return { godownIds: godowns.map((g) => g._id) };
};
```

- [ ] **Step 4: The perf test (opt-in)**

`backend/src/tests/executivePerf.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { PRODUCTION_SIZE, seedProductionSized } from "./helpers/perfFixture.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { parseReportParams } from "../executive/params.js";
import { EXPORT_LIMITS } from "../executive/context.js";

const enabled = process.env.PERF === "1";
const NOW = new Date("2026-10-13T06:00:00Z");
const TARGET_KITCHEN_MS = 1500;
const TARGET_ALL_MS = 3000;
const TARGET_EXPORT_MS = 10_000;
let seeded;

before(async () => {
  if (!enabled) return;
  await startDb();
  await syncAllIndexes();
  seeded = await seedProductionSized(PRODUCTION_SIZE, NOW);
}, { timeout: 600_000 });
after(async () => { if (enabled) await stopDb(); });

const p95 = async (fn, runs = 7) => {
  const times = [];
  await fn(); // warm-up
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.ceil(0.95 * times.length) - 1];
};

const run = (query, limits) => buildExecutiveReport(parseReportParams(query, { now: NOW }), { now: NOW, limits });

test("summary for one kitchen meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ godownId: String(seeded.godownIds[0]), from: "2025-10-13", to: "2026-10-13" }));
  console.log(`one kitchen, 366 days: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_KITCHEN_MS, `${ms} ms > ${TARGET_KITCHEN_MS} ms`);
});

test("summary for all kitchens meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ from: "2025-10-13", to: "2026-10-13" }));
  console.log(`all kitchens, 366 days: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_ALL_MS, `${ms} ms > ${TARGET_ALL_MS} ms`);
});

test("export-sized report meets the target", { skip: !enabled, timeout: 120_000 }, async () => {
  const ms = await p95(() => run({ from: "2025-10-13", to: "2026-10-13" }, EXPORT_LIMITS), 3);
  console.log(`export data, all kitchens: p95 ${ms.toFixed(0)} ms`);
  assert.ok(ms <= TARGET_EXPORT_MS);
});
```

- [ ] **Step 5: Run the perf test**

Run: `npm --prefix backend run test:perf` (takes several minutes; seeding ~200k documents).
Expected: three PASS lines with printed p95 values. Paste the printed numbers into the task report.

**If a target is missed** (only then): add an in-process cache in `executiveRoutes.js` — a `Map` keyed `${godownId}|${from}|${to}|${healthPage}|${unpricedPage}|${comparisonPage}` holding `{ report, storedAt }`, TTL 60 s, max 100 entries (delete the oldest key on insert when full), used only by `/summary` (never `/export.*`). `generatedAt` already reflects when the cached report was built. Add a test that two calls within 60 s return the same `generatedAt` and a call for another kitchen does not. Record the decision in the task report. Do **not** add caching pre-emptively.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/FlowModels.js backend/src/models/DailyUsageModel.js backend/src/tests/helpers/perfFixture.js \
  backend/src/tests/executiveIndexes.test.js backend/src/tests/executivePerf.test.js
git commit -m "perf(executive): report indexes, query-plan checks and production-sized benchmark

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: Server-generated Excel export

**Files:**
- Create: `backend/src/executive/excelExport.js`, `backend/src/executive/exportCommon.js`
- Modify: `backend/src/routes/executiveRoutes.js` (add `GET /export.xlsx`)
- Test: `backend/src/tests/executiveExport.test.js`

**Interfaces:**
- Consumes: `buildExecutiveReport`, `EXPORT_LIMITS`, `parseReportParams`, `sendReportError`.
- Produces (`exportCommon.js`): `EXPORT_TIMEOUT_MS = 30_000`, `EXPORT_MAX_TIME_MS = 25_000`, `exportFilename({ kitchen, from, to, generatedAt, tz, ext }) → string`, `contentDisposition(filename) → string`, `withTimeout(promise, ms) → promise` (rejects with `code: "EXPORT_TIMEOUT"`), `buildExportReport(query, { now? }) → report` (throws `{ status: 504, code: "EXPORT_TIMEOUT" }` / `{ status: 500, code: "EXPORT_INCOMPLETE" }` on section failures), `formatGeneratedAt(iso, tz) → "13/10/2026 14:05 IST"`.
- Produces (`excelExport.js`): `buildExcelWorkbook(report, { listLimit = 5000 } = {}) → ExcelJS.Workbook`, `SHEETS` (ordered sheet names).
- HTTP: `GET /api/executive/export.xlsx?godownId&from&to` (super_admin).

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveExport.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import ExcelJS from "exceljs";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { buildExcelWorkbook, SHEETS } from "../executive/excelExport.js";
import { exportFilename, withTimeout } from "../executive/exportCommon.js";

let app;
let f;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Main Kitchen");
  await distribution("2026-10-02T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await stockRow(A, items.Rice, 10, 20);
  await stockRow(A, items.Dal, 4);
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 40.5], [items.Dal, 2]] });
  f = { A, superAdmin: await createUser({ role: "super_admin" }), admin: await createUser({ role: "admin" }) };
});

const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

const fetchBoth = async (query) => {
  const auth = { Authorization: `Bearer ${f.superAdmin.token}` };
  const summary = await request(app).get("/api/executive/summary").query(query).set(auth);
  const file = await request(app).get("/api/executive/export.xlsx").query(query).set(auth).buffer(true).parse(binary);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.body);
  return { summary: summary.body, file, wb };
};

const kpiRows = (wb) => {
  const sheet = wb.getWorksheet("Summary");
  const out = {};
  sheet.eachRow((row) => { if (row.getCell(5).value) out[row.getCell(5).value] = row.getCell(2).value; });
  return out;
};

test("export totals equal the summary API totals", async () => {
  const { summary, file, wb } = await fetchBoth({ from: "2026-10-01", to: "2026-10-10" });
  assert.equal(file.status, 200);
  assert.equal(file.headers["content-type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const exported = kpiRows(wb);
  for (const kpi of summary.kpis) assert.equal(exported[kpi.id], kpi.value, kpi.id);
  assert.deepEqual(wb.worksheets.map((s) => s.name), SHEETS);
});

test("summary sheet records kitchen, range, generation time, timezone, currency and exclusions", async () => {
  const { wb } = await fetchBoth({ godownId: String(f.A._id), from: "2026-10-01", to: "2026-10-10" });
  const text = [];
  wb.getWorksheet("Summary").eachRow((row) => text.push(row.values.filter(Boolean).join(" | ")));
  const joined = text.join("\n");
  for (const needle of ["Main Kitchen", "2026-10-01 to 2026-10-10", "Asia/Kolkata", "INR", "Unpriced stock items", "Unvalued consumption lines", "Unpriced allocations", "Stock figures are current"]) {
    assert.ok(joined.includes(needle), `missing ${needle}`);
  }
  assert.equal(wb.getWorksheet("Kitchen comparison").rowCount <= 2, true, "single kitchen: comparison sheet only says not applicable");
});

test("filename and disposition follow the convention", async () => {
  const { file } = await fetchBoth({ godownId: String(f.A._id), from: "2026-10-01", to: "2026-10-10" });
  assert.match(file.headers["content-disposition"], /^attachment; filename="MKM-Executive-Report_Main-Kitchen_2026-10-01_to_2026-10-10_generated-\d{8}-\d{4}-IST\.xlsx"; filename\*=UTF-8''/);
  assert.equal(
    exportFilename({ kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-10", generatedAt: "2026-10-13T08:35:00Z", tz: "Asia/Kolkata", ext: "xlsx" }),
    "MKM-Executive-Report_All-Kitchens_2026-10-01_to_2026-10-10_generated-20261013-1405-IST.xlsx"
  );
  assert.equal(
    exportFilename({ kitchen: { id: "x", name: "Café / Annex #2" }, from: "2026-10-01", to: "2026-10-02", generatedAt: "2026-10-13T08:35:00Z", tz: "Europe/London", ext: "pdf" }),
    "MKM-Executive-Report_Cafe-Annex-2_2026-10-01_to_2026-10-02_generated-20261013-0935-Europe-London.pdf"
  );
});

test("long lists are truncated with a visible note", async () => {
  const report = {
    meta: { kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-10", timezone: "Asia/Kolkata", currency: "INR", generatedAt: "2026-10-13T06:00:00Z", definitions: [], notes: { historicalStock: "n", unvaluedConsumption: "n" } },
    kpis: [],
    sections: {
      consumptionTrend: { status: "ok", data: { points: [] } },
      topItems: { status: "ok", data: { items: [], tiedBeyondLimit: 0 } },
      stockHealth: { status: "ok", data: { rows: [{ kitchen: "K", item: "I", unit: "kg", qty: 0, threshold: 1, state: "out", ratio: null }], total: 7001 } },
      unpricedStock: { status: "ok", data: { rows: [], total: 0 } },
      procurement: { status: "ok", data: { scope: "kitchen", stockReceived: { value: 0 }, supplyRequests: [] } },
      requestsTransfers: { status: "ok", data: { requests: { byStatus: [], pendingAgeing: { buckets: [] } }, transfers: { byStatus: [], openAgeing: { buckets: [] } } } },
      kitchenComparison: null
    }
  };
  const wb = buildExcelWorkbook(report, { listLimit: 5000 });
  assert.equal(wb.getWorksheet("Stock health").getRow(1).getCell(1).value, "Showing 1 of 7,001 rows. Narrow the filters to see the rest.");
});

test("timeouts surface as EXPORT_TIMEOUT", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), (e) => e.code === "EXPORT_TIMEOUT" && e.status === 504);
});

test("admins cannot export", async () => {
  const res = await request(app).get("/api/executive/export.xlsx").set("Authorization", `Bearer ${f.admin.token}`);
  assert.equal(res.status, 403);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: `exportCommon.js`**

```js
import { buildExecutiveReport } from "./buildReport.js";
import { EXPORT_LIMITS } from "./context.js";
import { parseReportParams } from "./params.js";

export const EXPORT_TIMEOUT_MS = 30_000;
export const EXPORT_MAX_TIME_MS = 25_000;

const tzLabel = (tz) => (tz === "Asia/Kolkata" ? "IST" : tz.replace(/\//g, "-"));

const localParts = (iso, tz) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type).value;
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
};

export const formatGeneratedAt = (iso, tz) => {
  const p = localParts(iso, tz);
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.min} ${tzLabel(tz)}`;
};

const slug = (name) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Kitchen";

export const exportFilename = ({ kitchen, from, to, generatedAt, tz, ext }) => {
  const p = localParts(generatedAt, tz);
  const who = kitchen.id === "all" ? "All-Kitchens" : slug(kitchen.name);
  return `MKM-Executive-Report_${who}_${from}_to_${to}_generated-${p.y}${p.m}${p.d}-${p.h}${p.min}-${tzLabel(tz)}.${ext}`;
};

export const contentDisposition = (filename) =>
  `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

export const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("The export took too long. Try a shorter range or a single kitchen."), { status: 504, code: "EXPORT_TIMEOUT" })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/** Same calculation as /summary, with export page sizes; fails rather than export partial data. */
export const buildExportReport = async (query, { now = new Date() } = {}) => {
  const params = parseReportParams(query, { now });
  params.pages = { health: 1, unpriced: 1, comparison: 1 };
  const report = await withTimeout(buildExecutiveReport(params, { now, limits: EXPORT_LIMITS, maxTimeMS: EXPORT_MAX_TIME_MS }), EXPORT_TIMEOUT_MS);
  if (report.failures.some((f) => f.code === "TIMEOUT")) {
    throw Object.assign(new Error("The export took too long. Try a shorter range or a single kitchen."), { status: 504, code: "EXPORT_TIMEOUT" });
  }
  if (report.failures.length) {
    throw Object.assign(new Error("Part of the report could not be generated, so nothing was exported."), { status: 500, code: "EXPORT_INCOMPLETE" });
  }
  return report;
};
```

- [ ] **Step 4: `excelExport.js`**

```js
import ExcelJS from "exceljs";
import { formatGeneratedAt } from "./exportCommon.js";

export const SHEETS = Object.freeze([
  "Summary", "Definitions", "Consumption trend", "Top items", "Stock health", "Unpriced stock",
  "Procurement", "Requests & transfers", "Kitchen comparison"
]);
const MONEY = '"₹"#,##0.00';
const QTY = "#,##0.###";
const fmtCount = (n) => Number(n).toLocaleString("en-IN");

const header = (sheet, cells) => {
  const row = sheet.addRow(cells);
  row.font = { bold: true };
  return row;
};

const truncationNote = (sheet, shown, total) => {
  if (total > shown) sheet.addRow([`Showing ${fmtCount(shown)} of ${fmtCount(total)} rows. Narrow the filters to see the rest.`]);
};

const table = (sheet, section, columns, rowsOf) => {
  if (!section || section.status !== "ok") {
    sheet.addRow(["This section could not be generated."]);
    return;
  }
  const rows = rowsOf(section.data);
  truncationNote(sheet, rows.length, section.data.total ?? rows.length);
  header(sheet, columns.map((c) => c.label));
  for (const r of rows) sheet.addRow(columns.map((c) => c.value(r)));
  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width || 16;
    if (c.numFmt) sheet.getColumn(i + 1).numFmt = c.numFmt;
  });
};

export const buildExcelWorkbook = (report, { listLimit = 5000 } = {}) => {
  const { meta, kpis, sections } = report;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MKM Executive Report";
  wb.created = new Date(meta.generatedAt);
  const sheets = Object.fromEntries(SHEETS.map((name) => [name, wb.addWorksheet(name)]));

  // Summary: column 5 holds the KPI id so totals can be checked mechanically.
  const s = sheets.Summary;
  s.addRow(["Executive Report"]).font = { bold: true, size: 14 };
  s.addRow(["Kitchen", meta.kitchen.name + (meta.kitchen.active === false ? " (inactive)" : "")]);
  s.addRow(["Period", `${meta.from} to ${meta.to} (inclusive)`]);
  s.addRow(["Generated at", formatGeneratedAt(meta.generatedAt, meta.timezone)]);
  s.addRow(["Timezone", meta.timezone]);
  s.addRow(["Currency", meta.currency]);
  s.addRow([]);
  header(s, ["KPI", "Value", "Type", "Notes", "KPI id"]);
  for (const k of kpis) {
    const row = s.addRow([
      k.label + (k.estimated ? " (estimated)" : ""),
      k.status === "ok" ? k.value : "Not available",
      k.kind === "snapshot" ? "Current" : "Period",
      k.status === "ok" ? "" : "Could not be calculated",
      k.id
    ]);
    if (k.format === "money" && k.status === "ok") row.getCell(2).numFmt = MONEY;
  }
  const kpi = (id) => kpis.find((k) => k.id === id);
  s.addRow([]);
  header(s, ["Excluded or unvalued", "Count"]);
  s.addRow(["Unpriced stock items", kpi("stockValue")?.details?.unpricedItemCount ?? 0]);
  s.addRow(["Unpriced stock quantity (base units)", kpi("stockValue")?.details?.unpricedQty ?? 0]);
  s.addRow(["Unvalued consumption lines", kpi("consumptionValue")?.details?.unvaluedLineCount ?? 0]);
  s.addRow(["Unpriced allocations", kpi("stockReceivedValue")?.details?.unpricedAllocationCount ?? 0]);
  s.addRow([]);
  s.addRow(["Note", meta.notes.historicalStock]);
  s.addRow(["Note", meta.notes.unvaluedConsumption]);
  s.getColumn(1).width = 42;
  s.getColumn(2).width = 22;
  s.getColumn(4).width = 26;
  s.getColumn(5).hidden = true;

  header(sheets.Definitions, ["KPI", "Type", "Definition"]);
  for (const d of meta.definitions) sheets.Definitions.addRow([d.label, d.kind === "snapshot" ? "Current" : "Period", d.text]);
  sheets.Definitions.getColumn(1).width = 36;
  sheets.Definitions.getColumn(3).width = 120;

  table(sheets["Consumption trend"], sections.consumptionTrend, [
    { label: "Date", value: (r) => r.date, width: 14 },
    { label: "Consumption value", value: (r) => r.value, numFmt: MONEY, width: 20 },
    { label: "Unvalued lines", value: (r) => r.unvaluedLines }
  ], (d) => d.points);

  table(sheets["Top items"], sections.topItems, [
    { label: "Rank", value: (r) => r.rank, width: 8 },
    { label: "Item", value: (r) => r.name, width: 32 },
    { label: "Value", value: (r) => r.value, numFmt: MONEY, width: 18 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 },
    { label: "Unvalued lines", value: (r) => r.unvaluedLines }
  ], (d) => d.items);

  table(sheets["Stock health"], sections.stockHealth, [
    { label: "Status", value: (r) => (r.state === "out" ? "Out of stock" : "Low"), width: 14 },
    { label: "Kitchen", value: (r) => r.kitchen, width: 28 },
    { label: "Item", value: (r) => r.item, width: 32 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Threshold", value: (r) => r.threshold, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 }
  ], (d) => d.rows.slice(0, listLimit));

  table(sheets["Unpriced stock"], sections.unpricedStock, [
    { label: "Kitchen", value: (r) => r.kitchen, width: 28 },
    { label: "Item", value: (r) => r.item, width: 32 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 }
  ], (d) => d.rows.slice(0, listLimit));

  const p = sheets.Procurement;
  if (sections.procurement?.status === "ok") {
    const d = sections.procurement.data;
    header(p, ["Measure", "Value"]);
    p.addRow(["Stock received value", d.stockReceived.value]).getCell(2).numFmt = MONEY;
    p.addRow(["Unpriced allocations", d.stockReceived.unpricedAllocationCount ?? 0]);
    p.addRow(["Distributions", d.stockReceived.distributionCount ?? 0]);
    if (d.scope === "all") {
      p.addRow(["Procurement spend (received value)", d.spend.value]).getCell(2).numFmt = MONEY;
      p.addRow(["Purchase orders received", d.spend.poCount]);
      p.addRow(["POs awaiting distribution", d.awaiting.count]);
      p.addRow(["Value awaiting distribution", d.awaiting.value]).getCell(2).numFmt = MONEY;
      p.addRow([]);
      header(p, ["Indent status", "Count", "Value"]);
      for (const r of d.indents) p.addRow([r.status, r.count, r.value]).getCell(3).numFmt = MONEY;
    }
    p.addRow([]);
    header(p, ["Supply request status", "Count"]);
    for (const r of d.supplyRequests) p.addRow([r.status, r.count]);
    p.getColumn(1).width = 38;
    p.getColumn(2).width = 18;
  } else {
    p.addRow(["This section could not be generated."]);
  }

  const rt = sheets["Requests & transfers"];
  if (sections.requestsTransfers?.status === "ok") {
    const { requests, transfers } = sections.requestsTransfers.data;
    header(rt, ["Requests created in period", "Count"]);
    for (const r of requests.byStatus) rt.addRow([r.status, r.count]);
    rt.addRow(["Approval rate (%)", requests.approvalRate ?? "—"]);
    rt.addRow([]);
    header(rt, ["Pending requests by age", "Count"]);
    for (const b of requests.pendingAgeing.buckets) rt.addRow([b.label, b.count]);
    rt.addRow([]);
    header(rt, ["Transfers created in period", "Count"]);
    for (const r of transfers.byStatus) rt.addRow([r.status, r.count]);
    rt.addRow([]);
    header(rt, ["Open transfers by age", "Count"]);
    for (const b of transfers.openAgeing.buckets) rt.addRow([b.label, b.count]);
    rt.getColumn(1).width = 34;
  } else {
    rt.addRow(["This section could not be generated."]);
  }

  const kc = sheets["Kitchen comparison"];
  if (sections.kitchenComparison === null) {
    kc.addRow(["Not applicable: a single kitchen is selected."]);
  } else {
    table(kc, sections.kitchenComparison, [
      { label: "Kitchen", value: (r) => r.kitchen + (r.deleted ? "" : r.active ? "" : " (inactive)"), width: 32 },
      { label: "Consumption value", value: (r) => r.consumptionValue, numFmt: MONEY, width: 20 },
      { label: "Unvalued lines", value: (r) => r.unvaluedLines },
      { label: "Low or out of stock (current)", value: (r) => (r.lowOrOutOfStock === null ? "—" : r.lowOrOutOfStock), width: 26 },
      { label: "Pending requests (current)", value: (r) => r.pendingRequests, width: 24 },
      { label: "Stock received value", value: (r) => r.stockReceivedValue, numFmt: MONEY, width: 20 }
    ], (d) => d.rows);
  }
  return wb;
};
```

- [ ] **Step 5: Route**

Append to `backend/src/routes/executiveRoutes.js`:

```js
import { buildExcelWorkbook } from "../executive/excelExport.js";
import { buildExportReport, contentDisposition, exportFilename } from "../executive/exportCommon.js";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const exportError = (res, error) => {
  if (error?.code === "EXPORT_TIMEOUT" || error?.code === "EXPORT_INCOMPLETE") {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  return sendReportError(res, error);
};

executiveRoutes.get("/export.xlsx", superAdminOnly, async (req, res) => {
  try {
    const report = await buildExportReport(req.query);
    const buffer = await buildExcelWorkbook(report).xlsx.writeBuffer();
    const filename = exportFilename({ kitchen: report.meta.kitchen, from: report.meta.from, to: report.meta.to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: "xlsx" });
    res.set({ "Content-Type": XLSX_MIME, "Content-Disposition": contentDisposition(filename), "Cache-Control": "no-store" });
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return exportError(res, error);
  }
});
```

(Move the imports to the top of the file with the others.)

- [ ] **Step 6: Run** — `npm --prefix backend test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/executive/exportCommon.js backend/src/executive/excelExport.js backend/src/routes/executiveRoutes.js backend/src/tests/executiveExport.test.js
git commit -m "feat(executive): server-generated Excel export matching on-screen totals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
