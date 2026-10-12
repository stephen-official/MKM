# Phase 4a — Executive Report data layer

Read `README.md` Decisions 4, 5 and 6 first — they are normative for every number below. Depends on Phases 0–1 (Phase 2/3 not required).

All new backend modules live in `backend/src/executive/`. Each section module exports one async function that takes a shared **context** (`ctx`, built in Task 22) and returns `{ kpis: { [kpiId]: { value, details? } }, sections: { [sectionName]: data } }`. Until Task 22 exists, tests build the context with the `makeCtx()` helper created in Task 16.

---

### Task 16: Parameters, business time, money, definitions, fixtures

**Files:**
- Create: `backend/src/utils/money.js`
- Create: `backend/src/executive/params.js`
- Create: `backend/src/executive/definitions.js`
- Create: `backend/src/executive/context.js`
- Create: `backend/src/tests/helpers/fixtures.js`
- Test: `backend/src/tests/executiveParams.test.js`

**Interfaces:**
- Produces (`money.js`): `round2(x) → number` (half away from zero, never `-0`), `round3(x)`.
- Produces (`params.js`): `BUSINESS_TZ`, `MAX_SPAN_DAYS = 366`, `DEFAULT_SPAN_DAYS = 30`, `MIN_DATE = "2000-01-01"`, `class ReportParamError { status, code }`, `isIsoDate(v)`, `addDays(dateStr, n)`, `daysInclusive(from, to)`, `businessDateOf(instant, tz?)`, `startOfBusinessDay(dateStr, tz?) → Date`, `windowFor(from, to, tz?) → { start: Date, end: Date }` (half-open), `normalizeBusinessDate(value, fallbackInstant, tz?) → "YYYY-MM-DD"`, `parseReportParams(query, { now?, tz? }) → ReportParams`:

```
ReportParams = {
  godownId: "all" | "<24-hex lowercase>",
  from, to, days, today, tz,
  window: { start: Date, end: Date },
  previous: { from, to, window },
  pages: { health: int≥1, unpriced: int≥1, comparison: int≥1 }
}
```

- Produces (`definitions.js`): `DEFINITIONS: { id, label, kind: "snapshot"|"period", format: "money"|"count", text }[]`, `DEFINITION_BY_ID`, `HISTORICAL_STOCK_NOTE`, `UNVALUED_CONSUMPTION_NOTE`, `AGE_BUCKETS`.
- Produces (`context.js`): `memo(fn)`, `createContext({ params, kitchen, godownDocs, now, limits, maxTimeMS }) → ctx` with fields `params, kitchen, godowns (Map id→{name,active}), activeIds (ObjectId[]), scopeIds (ObjectId[] | null), now, tz, limits: { listPageSize, comparisonPageSize }, maxTimeMS, kitchenName(id), aggOptions() → { maxTimeMS? }`. Loader slots (`ctx.consumption`, `ctx.stock`, `ctx.distributions`, `ctx.pendingRequestsByKitchen`) are attached by later tasks via `attachLoaders(ctx)` in Task 22; section tests attach the ones they need.
- Produces (`tests/helpers/fixtures.js`): `insertRaw`, `seedCatalog`, `kitchen`, `stockRow`, `distribution`, `purchaseOrder`, `consumption`, `dailyUsage`, `stockRequest`, `transfer`, `indent`, `supplyRequest`, `makeCtx` (signatures in the code below).

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveParams.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { round2, round3 } from "../utils/money.js";
import {
  addDays, businessDateOf, daysInclusive, isIsoDate, normalizeBusinessDate, parseReportParams, startOfBusinessDay, windowFor
} from "../executive/params.js";
import { DEFINITIONS } from "../executive/definitions.js";

const NOW = new Date("2026-10-13T06:00:00Z"); // 11:30 IST on 13 Oct

test("round2 rounds half away from zero and never returns -0", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(Object.is(round2(-0.001), 0), true);
  assert.equal(round3(1.0005), 1.001);
});

test("ISO date validation rejects impossible dates", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-2-3"), false);
  assert.equal(isIsoDate("Mon Oct 12 2026"), false);
  assert.equal(isIsoDate(undefined), false);
});

test("business day boundaries are in Asia/Kolkata", () => {
  assert.equal(startOfBusinessDay("2026-10-01").toISOString(), "2026-09-30T18:30:00.000Z");
  const w = windowFor("2026-10-01", "2026-10-10");
  assert.equal(w.start.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(w.end.toISOString(), "2026-10-10T18:30:00.000Z");
  assert.equal(businessDateOf(new Date("2026-10-10T18:29:59Z")), "2026-10-10");
  assert.equal(businessDateOf(new Date("2026-10-10T18:30:00Z")), "2026-10-11");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysInclusive("2026-10-01", "2026-10-10"), 10);
});

test("DST zones still get correct midnights", () => {
  assert.equal(startOfBusinessDay("2026-03-29", "Europe/London").toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(startOfBusinessDay("2026-03-30", "Europe/London").toISOString(), "2026-03-29T23:00:00.000Z");
});

test("normalizeBusinessDate keeps ISO prefixes and falls back to the instant's business date", () => {
  assert.equal(normalizeBusinessDate("2026-10-12", NOW), "2026-10-12");
  assert.equal(normalizeBusinessDate("2026-10-12T22:00:00.000Z", NOW), "2026-10-12");
  assert.equal(normalizeBusinessDate("next Monday", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate(null, NOW), "2026-10-13");
});

test("defaults: last 30 days including today, previous period of equal length", () => {
  const p = parseReportParams({}, { now: NOW });
  assert.equal(p.godownId, "all");
  assert.equal(p.to, "2026-10-13");
  assert.equal(p.from, "2026-09-14");
  assert.equal(p.days, 30);
  assert.deepEqual([p.previous.from, p.previous.to], ["2026-08-15", "2026-09-13"]);
  assert.deepEqual(p.pages, { health: 1, unpriced: 1, comparison: 1 });
});

test("parameter errors carry codes", () => {
  const code = (query) => { try { parseReportParams(query, { now: NOW }); return null; } catch (e) { return `${e.status}:${e.code}`; } };
  assert.equal(code({ godownId: "kitchen-1" }), "400:INVALID_KITCHEN");
  assert.equal(code({ godownId: ["a", "b"] }), "400:INVALID_KITCHEN");
  assert.equal(code({ from: "2026-13-01" }), "400:INVALID_DATE");
  assert.equal(code({ from: "1999-12-31", to: "2000-01-05" }), "400:INVALID_DATE");
  assert.equal(code({ to: "2026-10-14" }), "400:FUTURE_DATE");
  assert.equal(code({ from: "2026-10-10", to: "2026-10-01" }), "400:INVALID_RANGE");
  assert.equal(code({ from: "2025-10-12", to: "2026-10-13" }), "400:RANGE_TOO_LONG");
  assert.equal(code({ from: "2025-10-13", to: "2026-10-13" }), null, "366 days inclusive is allowed");
});

test("page params are lenient", () => {
  const p = parseReportParams({ healthPage: "3", unpricedPage: "-1", comparisonPage: "abc", godownId: "65F0C0FFEE0000000000ABCD" }, { now: NOW });
  assert.deepEqual(p.pages, { health: 3, unpriced: 1, comparison: 1 });
  assert.equal(p.godownId, "65f0c0ffee0000000000abcd");
});

test("every definition has id, label, kind, format and text", () => {
  for (const d of DEFINITIONS) {
    assert.ok(d.id && d.label && d.text, d.id);
    assert.ok(["snapshot", "period"].includes(d.kind), d.id);
    assert.ok(["money", "count"].includes(d.format), d.id);
  }
});
```

- [ ] **Step 2: Run** — `npm --prefix backend test` → FAIL (modules missing).

- [ ] **Step 3: `money.js`**

```js
const roundTo = (value, places) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** places;
  const rounded = (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * factor)) / factor;
  return rounded === 0 ? 0 : rounded;
};

/** Money: half away from zero, 2 dp. Apply once to a final total, never before summing. */
export const round2 = (value) => roundTo(value, 2);
/** Quantities: 3 dp. */
export const round3 = (value) => roundTo(value, 3);
```

- [ ] **Step 4: `params.js`**

```js
import mongoose from "mongoose";

export const BUSINESS_TZ = process.env.BUSINESS_TZ || "Asia/Kolkata";
export const MAX_SPAN_DAYS = 366;
export const DEFAULT_SPAN_DAYS = 30;
export const MIN_DATE = "2000-01-01";
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HEX_ID = /^[a-f0-9]{24}$/i;
const MAX_PAGE = 10_000;

export class ReportParamError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isIsoDate = (value) => {
  const match = DATE_RE.exec(typeof value === "string" ? value : "");
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const daysInclusive = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

export const businessDateOf = (instant, tz = BUSINESS_TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(instant));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** Minutes the zone is ahead of UTC at a given instant. */
const offsetMinutes = (instantMs, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(new Date(instantMs));
  const v = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60_000);
};

/** UTC instant of 00:00 on dateStr in tz (second pass corrects across DST changes). */
export const startOfBusinessDay = (dateStr, tz = BUSINESS_TZ) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d);
  const guess = naive - offsetMinutes(naive, tz) * 60_000;
  return new Date(naive - offsetMinutes(guess, tz) * 60_000);
};

export const windowFor = (from, to, tz = BUSINESS_TZ) => ({
  start: startOfBusinessDay(from, tz),
  end: startOfBusinessDay(addDays(to, 1), tz)
});

export const normalizeBusinessDate = (value, fallbackInstant, tz = BUSINESS_TZ) => {
  const prefix = typeof value === "string" ? value.slice(0, 10) : "";
  return isIsoDate(prefix) ? prefix : businessDateOf(fallbackInstant, tz);
};

const pageParam = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE ? n : 1;
};

const fail = (code, message) => { throw new ReportParamError(400, code, message); };

export const parseReportParams = (query = {}, { now = new Date(), tz = BUSINESS_TZ } = {}) => {
  const rawKitchen = query.godownId ?? "all";
  let godownId = null;
  if (rawKitchen === "all") godownId = "all";
  else if (typeof rawKitchen === "string" && HEX_ID.test(rawKitchen) && mongoose.isValidObjectId(rawKitchen)) godownId = rawKitchen.toLowerCase();
  else fail("INVALID_KITCHEN", 'godownId must be "all" or a kitchen id.');

  for (const name of ["from", "to"]) {
    const value = query[name];
    if (value !== undefined && value !== "" && !isIsoDate(value)) fail("INVALID_DATE", `${name} must be a real date in YYYY-MM-DD format.`);
  }
  const today = businessDateOf(now, tz);
  const to = query.to || today;
  const from = query.from || addDays(to, -(DEFAULT_SPAN_DAYS - 1));
  if (from < MIN_DATE || to < MIN_DATE) fail("INVALID_DATE", `Dates must be on or after ${MIN_DATE}.`);
  if (to > today) fail("FUTURE_DATE", "The range cannot end after today.");
  if (from > to) fail("INVALID_RANGE", "The start date must be on or before the end date.");
  const days = daysInclusive(from, to);
  if (days > MAX_SPAN_DAYS) fail("RANGE_TOO_LONG", `The range cannot be longer than ${MAX_SPAN_DAYS} days.`);

  const previousTo = addDays(from, -1);
  const previousFrom = addDays(from, -days);
  return {
    godownId, from, to, days, today, tz,
    window: windowFor(from, to, tz),
    previous: { from: previousFrom, to: previousTo, window: windowFor(previousFrom, previousTo, tz) },
    pages: { health: pageParam(query.healthPage), unpriced: pageParam(query.unpricedPage), comparison: pageParam(query.comparisonPage) }
  };
};
```

- [ ] **Step 5: `definitions.js`**

```js
// Normative KPI definitions (README Decision 4). Served with every report, shown as
// tooltips and written to the export's Definitions sheet — edit here only.
export const HISTORICAL_STOCK_NOTE =
  "Stock figures are current, not as of the end of the selected period.";
export const UNVALUED_CONSUMPTION_NOTE =
  "Consumption recorded before prices were captured at issue has no value and is counted as unvalued lines.";

export const AGE_BUCKETS = Object.freeze([
  { id: "lt1d", label: "Under 1 day", maxDays: 1 },
  { id: "1to3d", label: "1 to 3 days", maxDays: 3 },
  { id: "3to7d", label: "3 to 7 days", maxDays: 7 },
  { id: "gt7d", label: "7 days or more", maxDays: null }
]);

export const DEFINITIONS = Object.freeze([
  { id: "stockValue", label: "Estimated stock value", kind: "snapshot", format: "money",
    text: "Current quantity × latest valid price for each kitchen item with stock above zero. Price = latest distribution price to that kitchen, else latest purchase-order price, else unpriced (excluded and counted separately). Active kitchens only when viewing all kitchens." },
  { id: "lowStock", label: "Items below threshold", kind: "snapshot", format: "count",
    text: "Kitchen items with a threshold set and current quantity above zero but at or below the threshold." },
  { id: "outOfStock", label: "Out of stock", kind: "snapshot", format: "count",
    text: "Kitchen items whose current quantity is zero or less." },
  { id: "consumptionValue", label: "Consumption value", kind: "period", format: "money",
    text: "Sum of the value recorded at the time of issue for consumption lines dated in the period (inclusive). Returns net off. Lines without a recorded value are counted as unvalued, never re-priced. Compared with the previous period of equal length." },
  { id: "dailyUseLines", label: "Daily-use issues", kind: "period", format: "count",
    text: "Number of daily-use item lines dated in the period. Daily-use items carry no price, so they are counted rather than valued." },
  { id: "pendingRequests", label: "Pending requests", kind: "snapshot", format: "count",
    text: "Kitchen stock and daily-use requests currently waiting for an admin decision." },
  { id: "pendingSupplyRequests", label: "Supply requests awaiting confirmation", kind: "snapshot", format: "count",
    text: "Kitchen supply requests currently in pending status." },
  { id: "openTransfers", label: "Open transfers", kind: "snapshot", format: "count",
    text: "Transfers currently pending acceptance, where the kitchen is the sender or the receiver." },
  { id: "stockReceivedValue", label: "Stock received value", kind: "period", format: "money",
    text: "Quantity × unit price of stock distributed to the kitchen(s) during the period. Allocations without a valid price are excluded and counted. Leftover redistributions count once, as their own movements." },
  { id: "procurementSpend", label: "Procurement spend (received value)", kind: "period", format: "money",
    text: "Total of purchase orders received in the period (received quantity, or ordered quantity when none recorded, × unit price). All kitchens only." },
  { id: "poAwaitingDistribution", label: "POs awaiting distribution", kind: "snapshot", format: "count",
    text: "Purchase orders received but not yet distributed to kitchens. All kitchens only." }
]);

export const DEFINITION_BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map((d) => [d.id, d])));
```

- [ ] **Step 6: `context.js`**

```js
import mongoose from "mongoose";

export const UI_LIMITS = Object.freeze({ listPageSize: 25, comparisonPageSize: 25 });
export const EXPORT_LIMITS = Object.freeze({ listPageSize: 5000, comparisonPageSize: 1000 });

/** Runs fn once; later calls share the same promise (sections reuse loaded data). */
export const memo = (fn) => {
  let promise = null;
  return () => (promise ??= fn());
};

export const createContext = ({ params, kitchen, godownDocs, now = new Date(), limits = UI_LIMITS, maxTimeMS }) => {
  const godowns = new Map(godownDocs.map((g) => [String(g._id), { name: g.name, active: g.active !== false }]));
  return {
    params,
    kitchen,
    godowns,
    activeIds: godownDocs.filter((g) => g.active !== false).map((g) => g._id),
    scopeIds: params.godownId === "all" ? null : [new mongoose.Types.ObjectId(params.godownId)],
    now,
    tz: params.tz,
    limits,
    maxTimeMS,
    kitchenName: (id) => godowns.get(String(id))?.name ?? `Deleted kitchen (…${String(id).slice(-6)})`,
    aggOptions: () => (maxTimeMS ? { maxTimeMS } : {})
  };
};
```

- [ ] **Step 7: Fixture helpers**

`backend/src/tests/helpers/fixtures.js`:

```js
import mongoose from "mongoose";
import { Godown, StockGroup, StockItem, Unit } from "../../models/InventoryModels.js";
import {
  Consumption, Distribution, GodownStock, Indent, IndentRequest, PurchaseOrder, Request, Transfer
} from "../../models/FlowModels.js";
import { DailyUsage } from "../../models/DailyUsageModel.js";
import { parseReportParams } from "../../executive/params.js";
import { createContext, UI_LIMITS } from "../../executive/context.js";

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

/** Inserts docs keeping explicit createdAt/updatedAt (Mongoose timestamps would overwrite them on save). */
export const insertRaw = async (Model, docs) => {
  const rows = docs.map((doc) => {
    const casted = new Model(doc).toObject({ depopulate: true });
    casted.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
    casted.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : casted.createdAt;
    return casted;
  });
  if (rows.length) await Model.collection.insertMany(rows);
  return rows;
};

export const seedCatalog = async (names = ["Rice", "Dal", "Oil"]) => {
  seq += 1;
  const group = await StockGroup.create({ name: `Group ${seq}` });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const items = {};
  for (const name of names) items[name] = await StockItem.create({ name, stockGroupId: group._id, unitId: unit._id });
  return { group, unit, items };
};

export const kitchen = (name, active = true) => Godown.create({ name, active });

export const stockRow = (godown, item, qty, threshold = 0) =>
  GodownStock.create({ godownId: godown._id, stockItemId: item._id, qtyBaseUnit: qty, thresholdBaseUnit: threshold });

/** allocations: [godown, item, qty, unitPrice][] */
export const distribution = async (createdAt, allocations, extra = {}) => (await insertRaw(Distribution, [{
  createdAt,
  allocations: allocations.map(([godown, item, qty, unitPrice]) => ({ godownId: godown._id, stockItemId: item._id, qtyBaseUnit: qty, unitPrice })),
  ...extra
}]))[0];

/** lines: [item, qty, unitPrice][] — totalAmount mirrors procurementRoutes.js */
export const purchaseOrder = async (receivedAt, lines, { status = "pending", createdAt } = {}) => (await insertRaw(PurchaseOrder, [{
  indentId: oid(),
  receivedAt: new Date(receivedAt),
  createdAt: createdAt || receivedAt,
  status,
  items: lines.map(([item, qty, unitPrice]) => ({ stockItemId: item._id, orderedQty: qty, receivedQty: qty, unitPrice, amount: qty * (unitPrice || 0) })),
  totalAmount: lines.reduce((sum, [, qty, unitPrice]) => sum + qty * (unitPrice || 0), 0)
}]))[0];

/** lines: [item, qty, amountAtIssue?][] — omit the amount for an unvalued line */
export const consumption = async (godown, { date, createdAt, lines }) => (await insertRaw(Consumption, [{
  godownId: godown._id, userId: oid(), date, createdAt,
  items: lines.map(([item, qty, amount]) => ({ stockItemId: item._id, qtyBaseUnit: qty, ...(amount === undefined ? {} : { amountAtIssue: amount }) }))
}]))[0];

export const dailyUsage = async (godown, { date, createdAt, lines }) => (await insertRaw(DailyUsage, [{
  godownId: godown._id, userId: oid(), date, createdAt,
  items: lines.map(([item, qty]) => ({ stockItemId: item._id, qtyBaseUnit: qty }))
}]))[0];

export const stockRequest = async (godown, { status = "pending", createdAt, requestType = "stock_request" }) => (await insertRaw(Request, [{
  godownId: godown._id, userId: oid(), requestType, targetDate: "2026-10-01", reason: "fixture", items: [], status, createdAt
}]))[0];

export const transfer = async (from, to, { status = "pending", createdAt }) => (await insertRaw(Transfer, [{
  fromGodownId: from._id, toGodownId: to._id, createdBy: oid(), items: [], status, createdAt
}]))[0];

export const indent = async ({ status = "pending", createdAt, totalAmount = 0 }) => (await insertRaw(Indent, [{
  indentNo: `IND-${++seq}`, createdBy: oid(), items: [], totalAmount, status, createdAt
}]))[0];

export const supplyRequest = async (godown, { status = "pending", createdAt }) => (await insertRaw(IndentRequest, [{
  godownId: godown._id, userId: oid(), items: [], status, createdAt
}]))[0];

/** Context for section tests (Task 22 builds the real one inside buildExecutiveReport). */
export const makeCtx = async (query, { now = new Date("2026-10-13T06:00:00Z"), limits = UI_LIMITS } = {}) => {
  const params = parseReportParams(query, { now });
  const godownDocs = await Godown.find().select("name active").lean();
  return createContext({ params, kitchen: null, godownDocs, now, limits });
};
```

- [ ] **Step 8: Run** — `npm --prefix backend test` → PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/utils/money.js backend/src/executive backend/src/tests/helpers/fixtures.js backend/src/tests/executiveParams.test.js
git commit -m "feat(executive): report parameters, business-time windows and KPI definitions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Valuation

**Files:**
- Create: `backend/src/executive/valuation.js`
- Test: `backend/src/tests/executiveValuation.test.js`

**Interfaces:**
- Consumes: `round2` (Task 16), fixtures (Task 16).
- Produces:
  - `PRICE_RANGE = { $gt: 0, $lte: Number.MAX_VALUE }`, `isValidPrice(p) → boolean`
  - `kitchenDistributionPrices({ godownIds?, stockItemIds?, options? }) → Map<"g:i", number>`
  - `purchaseOrderPrices({ stockItemIds?, options? }) → Map<"i", number>`
  - `resolvePrice(kitchenMap, poMap, godownId, stockItemId) → { price: number|null, source: "kitchen-distribution"|"purchase-order"|null }`
  - `pricesForKitchen(godownId, stockItemIds) → Map<stockItemIdString, { price, source }>` (used by Task 18)

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveValuation.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, kitchen, purchaseOrder, seedCatalog } from "./helpers/fixtures.js";
import { kitchenDistributionPrices, pricesForKitchen, purchaseOrderPrices, resolvePrice } from "../executive/valuation.js";

let f;
before(startDb);
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  // Kitchen A rice: 40 then 45 (latest valid wins); later invalid prices ignored.
  await distribution("2026-09-01T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await distribution("2026-10-01T05:00:00Z", [[A, items.Rice, 10, 45], [B, items.Oil, 5, 90]]);
  await distribution("2026-10-05T05:00:00Z", [[A, items.Rice, 10, 0]]);
  await distribution("2026-10-06T05:00:00Z", [[A, items.Rice, 10, null]]);
  await distribution("2026-10-07T05:00:00Z", [[A, items.Rice, 10, -3]]);
  await distribution("2026-10-08T05:00:00Z", [[A, items.Rice, 0, 99]]);
  // PO fallback for rice: latest by receivedAt (not createdAt); negative ignored.
  await purchaseOrder("2026-09-10T05:00:00Z", [[items.Rice, 100, 38]], { createdAt: "2026-09-25T05:00:00Z" });
  await purchaseOrder("2026-09-20T05:00:00Z", [[items.Rice, 100, 41]], { createdAt: "2026-09-21T05:00:00Z" });
  await purchaseOrder("2026-09-25T05:00:00Z", [[items.Rice, 100, -5]]);
  f = { items, A, B };
});

test("latest valid distribution price to that kitchen wins", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.A._id, f.items.Rice._id), { price: 45, source: "kitchen-distribution" });
});

test("falls back to latest valid PO price by receivedAt", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Rice._id), { price: 41, source: "purchase-order" });
});

test("another kitchen's distribution price is not used; no price → unpriced", async () => {
  const kMap = await kitchenDistributionPrices({});
  const poMap = await purchaseOrderPrices({});
  assert.deepEqual(resolvePrice(kMap, poMap, f.A._id, f.items.Oil._id), { price: null, source: null });
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Oil._id), { price: 90, source: "kitchen-distribution" });
  assert.deepEqual(resolvePrice(kMap, poMap, f.B._id, f.items.Dal._id), { price: null, source: null });
});

test("filters by kitchen and item", async () => {
  const kMap = await kitchenDistributionPrices({ godownIds: [f.B._id] });
  assert.equal(kMap.size, 1);
  const prices = await pricesForKitchen(String(f.A._id), [f.items.Rice._id, f.items.Dal._id]);
  assert.deepEqual(prices.get(String(f.items.Rice._id)), { price: 45, source: "kitchen-distribution" });
  assert.deepEqual(prices.get(String(f.items.Dal._id)), { price: null, source: null });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** `backend/src/executive/valuation.js`:

```js
import mongoose from "mongoose";
import { Distribution, PurchaseOrder } from "../models/FlowModels.js";

// Excludes null, strings, NaN (Mongo sorts NaN below every number), zero, negatives and Infinity.
export const PRICE_RANGE = Object.freeze({ $gt: 0, $lte: Number.MAX_VALUE });
export const isValidPrice = (price) => typeof price === "number" && Number.isFinite(price) && price > 0;

const toIds = (ids) => ids?.map((id) => new mongoose.Types.ObjectId(String(id)));

export const kitchenDistributionPrices = async ({ godownIds = null, stockItemIds = null, options = {} } = {}) => {
  const docMatch = {};
  const lineMatch = { "allocations.unitPrice": PRICE_RANGE, "allocations.qtyBaseUnit": { $gt: 0 } };
  if (godownIds) {
    docMatch["allocations.godownId"] = { $in: toIds(godownIds) };
    lineMatch["allocations.godownId"] = { $in: toIds(godownIds) };
  }
  if (stockItemIds) {
    docMatch["allocations.stockItemId"] = { $in: toIds(stockItemIds) };
    lineMatch["allocations.stockItemId"] = { $in: toIds(stockItemIds) };
  }
  const rows = await Distribution.aggregate([
    { $match: docMatch },
    { $sort: { createdAt: -1, _id: -1 } },
    { $unwind: "$allocations" },
    { $match: lineMatch },
    { $group: { _id: { g: "$allocations.godownId", i: "$allocations.stockItemId" }, price: { $first: "$allocations.unitPrice" } } }
  ]).allowDiskUse(true).option(options);
  const map = new Map();
  for (const row of rows) if (isValidPrice(row.price)) map.set(`${row._id.g}:${row._id.i}`, row.price);
  return map;
};

export const purchaseOrderPrices = async ({ stockItemIds = null, options = {} } = {}) => {
  const docMatch = stockItemIds ? { "items.stockItemId": { $in: toIds(stockItemIds) } } : {};
  const lineMatch = { "items.unitPrice": PRICE_RANGE, ...(stockItemIds ? { "items.stockItemId": { $in: toIds(stockItemIds) } } : {}) };
  const rows = await PurchaseOrder.aggregate([
    { $match: docMatch },
    { $sort: { receivedAt: -1, createdAt: -1, _id: -1 } },
    { $unwind: "$items" },
    { $match: lineMatch },
    { $group: { _id: "$items.stockItemId", price: { $first: "$items.unitPrice" } } }
  ]).allowDiskUse(true).option(options);
  const map = new Map();
  for (const row of rows) if (isValidPrice(row.price)) map.set(String(row._id), row.price);
  return map;
};

export const resolvePrice = (kitchenMap, poMap, godownId, stockItemId) => {
  const own = kitchenMap.get(`${godownId}:${stockItemId}`);
  if (own !== undefined) return { price: own, source: "kitchen-distribution" };
  const po = poMap.get(String(stockItemId));
  if (po !== undefined) return { price: po, source: "purchase-order" };
  return { price: null, source: null };
};

/** Price now for each item in one kitchen — used when recording consumption. */
export const pricesForKitchen = async (godownId, stockItemIds) => {
  const ids = [...new Set(stockItemIds.map(String))];
  if (!ids.length) return new Map();
  const [kitchenMap, poMap] = await Promise.all([
    kitchenDistributionPrices({ godownIds: [godownId], stockItemIds: ids }),
    purchaseOrderPrices({ stockItemIds: ids })
  ]);
  return new Map(ids.map((id) => [id, resolvePrice(kitchenMap, poMap, String(godownId), id)]));
};
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/executive/valuation.js backend/src/tests/executiveValuation.test.js
git commit -m "feat(executive): kitchen stock valuation with distribution and PO price fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Record price at issue on every consumption write

**Files:**
- Modify: `backend/src/models/FlowModels.js:94-108` (consumption item schema)
- Modify: `backend/src/routes/operationsRoutes.js` — `handleStockProcessing` (~line 72), consumption PATCH (~line 355 "Save new consumption items"), `/requests/:id/approve` (~line 880)
- Test: `backend/src/tests/consumptionPricing.test.js`

**Interfaces:**
- Consumes: `pricesForKitchen` (Task 17), `round2` (Task 16), `normalizeBusinessDate`, `BUSINESS_TZ` (Task 16).
- Produces: every new/edited `Consumption.items[]` has `unitPriceAtIssue: number|null` and `amountAtIssue: number|null`; request approvals store `date` as business `YYYY-MM-DD` on both `Consumption` and `DailyUsage`.

Existing records are **not** backfilled (README Decision 5).

- [ ] **Step 1: Failing tests**

`backend/src/tests/consumptionPricing.test.js`:

```js
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
```

- [ ] **Step 2: Run** — FAIL (`unitPriceAtIssue` undefined; approval date is a Date-string).

- [ ] **Step 3: Schema**

In `backend/src/models/FlowModels.js`, consumption `items` entry becomes:

```js
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        qtyBaseUnit: Number, 
        unitDisplay: String, 
        // Captured when the line is recorded (README Decision 5); null = no valid price then.
        unitPriceAtIssue: { type: Number, default: null },
        amountAtIssue: { type: Number, default: null }
      }
```

Note: `default: null` applies only to newly written lines; legacy documents keep the field absent and are treated identically (unvalued).

- [ ] **Step 4: A pricing helper in operationsRoutes.js**

Add imports:

```js
import { pricesForKitchen } from "../executive/valuation.js";
import { normalizeBusinessDate } from "../executive/params.js";
import { round2 } from "../utils/money.js";
```

Add above `handleStockProcessing`:

```js
/** Adds unitPriceAtIssue/amountAtIssue to lines; `keep` maps stockItemId → an already-captured price. */
const priceLines = async (godownId, lines, keep = new Map()) => {
  const prices = await pricesForKitchen(godownId, lines.filter((l) => !keep.has(String(l.stockItemId))).map((l) => l.stockItemId));
  return lines.map((line) => {
    const id = String(line.stockItemId);
    const unitPrice = keep.has(id) ? keep.get(id) : prices.get(id)?.price ?? null;
    const qty = Number(line.qtyBaseUnit);
    return {
      ...line,
      unitPriceAtIssue: unitPrice,
      amountAtIssue: unitPrice === null || !Number.isFinite(qty) ? null : round2(qty * unitPrice)
    };
  });
};
```

- [ ] **Step 5: Use it in the three write paths**

`handleStockProcessing` — replace `items: orderItems` in `Consumption.create([...])` with `items: await priceLines(godownId, orderItems)`.

Consumption PATCH — replace the `consumption.items = items.filter(...).map(...)` block with:

```js
        const keptPrices = new Map(
          oldItems
            .filter((old) => old.unitPriceAtIssue !== undefined && old.unitPriceAtIssue !== null)
            .map((old) => [String(old.stockItemId), old.unitPriceAtIssue])
        );
        consumption.items = await priceLines(
          godownId,
          items
            .filter((item) => Number(item.qtyBaseUnit) > 0)
            .map((item) => ({ stockItemId: item.stockItemId, qtyBaseUnit: Number(item.qtyBaseUnit), stockRecordId: item.stockRecordId || undefined })),
          keptPrices
        );
```

(`godownId` and `oldItems` are already in scope in that handler — confirm with a quick read of lines 162–215; if the variable holding the kitchen is named differently, use that name.)

`/requests/:id/approve` — replace the `record` object with:

```js
      const date = normalizeBusinessDate(request.targetDate, new Date());
      const baseLines = request.items.map((item) => ({ stockItemId: item.stockItemId, qtyBaseUnit: item.qtyBaseUnit }));
      const record = {
        godownId: request.godownId,
        userId: request.userId,
        date,
        items: request.requestType === "daily_usage" ? baseLines : await priceLines(request.godownId, baseLines),
      };
```

- [ ] **Step 6: Run** — `npm --prefix backend test` → PASS (all previous tests too).

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/FlowModels.js backend/src/routes/operationsRoutes.js backend/src/tests/consumptionPricing.test.js
git commit -m "feat(consumption): capture unit price and amount at issue; ISO dates on approvals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Consumption section (value, trend, top items, daily-use)

**Files:**
- Create: `backend/src/executive/sections/consumption.js`
- Test: `backend/src/tests/executiveConsumption.test.js`

**Interfaces:**
- Consumes: `addDays` (Task 16), `round2/round3`, `ctx` fields from `createContext`.
- Produces:
  - `effectiveDateExpr(tz)`, `consumptionRangeMatch({ scopeIds, from, to, window })` (exported for the index/explain test in Task 23)
  - `aggregateConsumption({ scopeIds, from, to, window, tz, options, withBreakdowns = true }) → { totals: { value, unvaluedLines, unvaluedQty, qty, lines }, byDate: [{ _id: date, ...sums }], byItem: [{ _id: stockItemId, ...sums }], byKitchen: [{ _id: godownId, ...sums }] }` (raw, unrounded)
  - `TOP_LIMIT = 10`, `rankTopItems(byItem, limit = TOP_LIMIT) → { items, tiedBeyondLimit, unvaluedItemCount }`
  - `consumptionSection(ctx) → { kpis: { consumptionValue, dailyUseLines }, sections: { consumptionTrend, topItems } }`; requires `ctx.consumption` loader (memoised `aggregateConsumption` for the current window — the test attaches it).

KPI/section payloads:

```
kpis.consumptionValue = { value, details: { unvaluedLineCount, unvaluedQty, previousValue, deltaPct } }
kpis.dailyUseLines   = { value }
sections.consumptionTrend = { points: [{ date, value, unvaluedLines }], total, previousTotal, deltaPct }
sections.topItems = { items: [{ rank, stockItemId, name, unit, value, qty, unvaluedLines }], tiedBeyondLimit, unvaluedItemCount }
```

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveConsumption.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { consumption, dailyUsage, kitchen, makeCtx, seedCatalog } from "./helpers/fixtures.js";
import { memo } from "../executive/context.js";
import { aggregateConsumption, consumptionSection, rankTopItems } from "../executive/sections/consumption.js";

let f;
before(startDb);
after(stopDb);

const ctxFor = async (query) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query });
  ctx.consumption = memo(() => aggregateConsumption({ scopeIds: ctx.scopeIds, from: ctx.params.from, to: ctx.params.to, window: ctx.params.window, tz: ctx.tz }));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const { Rice, Dal, Oil } = items;
  await consumption(A, { date: "2026-10-01", createdAt: "2026-10-01T05:00:00Z", lines: [[Rice, 2, 100], [Dal, 1, 50]] });
  await consumption(A, { date: "2026-10-10", createdAt: "2026-10-10T05:00:00Z", lines: [[Rice, 1, 50.25]] });
  await consumption(A, { date: "2026-10-11", createdAt: "2026-10-11T05:00:00Z", lines: [[Rice, 5, 999]] });
  await consumption(A, { date: "2026-09-30", createdAt: "2026-09-30T05:00:00Z", lines: [[Rice, 1, 40]] });
  await consumption(B, { date: "Mon Oct 05 2026 00:00:00 GMT+0530", createdAt: "2026-10-04T20:00:00Z", lines: [[Oil, 3, 30]] });
  await consumption(B, { date: "Thu Oct 01 2026", createdAt: "2026-09-30T19:00:00Z", lines: [[Dal, 4]] });
  await consumption(B, { date: "2026-10-03", createdAt: "2026-10-03T05:00:00Z", lines: [[Oil, -1, -10]] });
  await consumption(B, { date: "garbage", createdAt: "2026-10-10T18:29:59Z", lines: [[Rice, 1, 7]] });
  await consumption(B, { date: "garbage", createdAt: "2026-10-10T18:30:00Z", lines: [[Rice, 1, 1000]] });
  await dailyUsage(A, { date: "2026-10-02", createdAt: "2026-10-02T05:00:00Z", lines: [[Dal, 1], [Oil, 1]] });
  await dailyUsage(A, { date: "2026-10-12", createdAt: "2026-10-12T05:00:00Z", lines: [[Dal, 1]] });
  f = { items, A, B };
});

test("all kitchens: value from amountAtIssue, returns net off, unvalued lines counted not priced", async () => {
  const { kpis } = await consumptionSection(await ctxFor({}));
  assert.equal(kpis.consumptionValue.value, 227.25);
  assert.equal(kpis.consumptionValue.details.unvaluedLineCount, 1);
  assert.equal(kpis.consumptionValue.details.unvaluedQty, 4);
  assert.equal(kpis.consumptionValue.details.previousValue, 40);
  assert.equal(kpis.consumptionValue.details.deltaPct, 468.13);
  assert.equal(kpis.dailyUseLines.value, 2);
});

test("non-ISO consumption dates fall back to createdAt business date (IST boundaries)", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  const byDate = Object.fromEntries(sections.consumptionTrend.points.map((p) => [p.date, p]));
  assert.equal(byDate["2026-10-05"].value, 30);
  assert.equal(byDate["2026-10-01"].value, 150);
  assert.equal(byDate["2026-10-01"].unvaluedLines, 1);
  assert.equal(byDate["2026-10-10"].value, 57.25, "23:59:59 IST counted, 00:00 IST next day excluded");
});

test("trend is zero-filled and covers every day in range", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  assert.equal(sections.consumptionTrend.points.length, 10);
  assert.equal(sections.consumptionTrend.points[1].date, "2026-10-02");
  assert.equal(sections.consumptionTrend.points[1].value, 0);
  assert.equal(sections.consumptionTrend.total, 227.25);
});

test("single kitchen scope", async () => {
  const { kpis } = await consumptionSection(await ctxFor({ godownId: String(f.A._id) }));
  assert.equal(kpis.consumptionValue.value, 200.25);
  assert.equal(kpis.consumptionValue.details.unvaluedLineCount, 0);
  const b = await consumptionSection(await ctxFor({ godownId: String(f.B._id) }));
  assert.equal(b.kpis.consumptionValue.value, 27);
  assert.equal(b.kpis.dailyUseLines.value, 0);
});

test("top items ranked by value, then qty, then name", async () => {
  const { sections } = await consumptionSection(await ctxFor({}));
  assert.deepEqual(sections.topItems.items.map((i) => [i.rank, i.name, i.value, i.qty]), [
    [1, "Rice", 157.25, 4], [2, "Dal", 50, 5], [3, "Oil", 20, 2]
  ]);
  assert.equal(sections.topItems.unvaluedItemCount, 1);
  assert.equal(sections.topItems.tiedBeyondLimit, 0);
});

test("previous period with zero value gives deltaPct null", async () => {
  const { kpis } = await consumptionSection(await ctxFor({ from: "2026-10-05", to: "2026-10-10" }));
  // previous = 2026-09-29..2026-10-04: has A 09-30 (40), B 10-01 Dal unvalued, B 10-03 -10, A 10-01 150 → not zero
  assert.notEqual(kpis.consumptionValue.details.deltaPct, null);
  const empty = await consumptionSection(await ctxFor({ from: "2026-08-01", to: "2026-08-02" }));
  assert.equal(empty.kpis.consumptionValue.value, 0);
  assert.equal(empty.kpis.consumptionValue.details.deltaPct, null);
  assert.equal(empty.sections.topItems.items.length, 0);
});

test("rankTopItems: exactly ten, deterministic ties, tiedBeyondLimit", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    _id: `65f0c0ffee00000000000${String(i).padStart(3, "0")}`, value: 10, qty: 1, unvaluedLines: 0,
    name: `Item ${String(12 - i).padStart(2, "0")}`, unit: "kg"
  }));
  const ranked = rankTopItems(rows);
  assert.equal(ranked.items.length, 10);
  assert.deepEqual(ranked.items.map((r) => r.name), ["Item 01", "Item 02", "Item 03", "Item 04", "Item 05", "Item 06", "Item 07", "Item 08", "Item 09", "Item 10"]);
  assert.equal(ranked.tiedBeyondLimit, 2);
  const byQty = rankTopItems([
    { _id: "a", value: 10, qty: 5, unvaluedLines: 0, name: "X", unit: "" },
    { _id: "b", value: 10, qty: 7, unvaluedLines: 0, name: "Y", unit: "" },
    { _id: "c", value: 10.004, qty: 1, unvaluedLines: 0, name: "Z", unit: "" }
  ]);
  assert.deepEqual(byQty.items.map((r) => r.name), ["Y", "X", "Z"], "values equal at 2 dp tie-break on qty");
});
```

(`rankTopItems` receives rows already joined with `name`/`unit`; the section joins names before calling it.)

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** `backend/src/executive/sections/consumption.js`:

```js
import { Consumption } from "../../models/FlowModels.js";
import { DailyUsage } from "../../models/DailyUsageModel.js";
import { StockItem } from "../../models/InventoryModels.js";
import { round2, round3 } from "../../utils/money.js";
import { addDays } from "../params.js";

export const TOP_LIMIT = 10;
const ISO_DAY = "^\\d{4}-\\d{2}-\\d{2}$";
const collator = new Intl.Collator("en", { sensitivity: "base" });

/** Consumption.date when it is YYYY-MM-DD, else the business date of createdAt. */
export const effectiveDateExpr = (tz) => ({
  $let: {
    vars: { raw: { $convert: { input: "$date", to: "string", onError: "", onNull: "" } } },
    in: {
      $cond: [
        { $regexMatch: { input: "$$raw", regex: ISO_DAY } },
        "$$raw",
        { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: tz } }
      ]
    }
  }
});

/** Index-friendly prefilter: either branch can only over-select; the effective-date match trims it. */
export const consumptionRangeMatch = ({ scopeIds, from, to, window }) => ({
  ...(scopeIds ? { godownId: { $in: scopeIds } } : {}),
  $or: [
    { date: { $gte: from, $lte: to } },
    { createdAt: { $gte: window.start, $lt: window.end } }
  ]
});

const VALUED = { $isNumber: "$items.amountAtIssue" };
const SUMS = {
  value: { $sum: "$amount" },
  unvaluedLines: { $sum: { $cond: ["$valued", 0, 1] } },
  unvaluedQty: { $sum: { $cond: ["$valued", 0, "$qty"] } },
  qty: { $sum: "$qty" },
  lines: { $sum: 1 }
};
const EMPTY_TOTALS = { value: 0, unvaluedLines: 0, unvaluedQty: 0, qty: 0, lines: 0 };

const datedPipeline = (args, tz) => [
  { $match: consumptionRangeMatch(args) },
  { $addFields: { effDate: effectiveDateExpr(tz) } },
  { $match: { effDate: { $gte: args.from, $lte: args.to } } }
];

export const aggregateConsumption = async ({ scopeIds, from, to, window, tz, options = {}, withBreakdowns = true }) => {
  const facet = { totals: [{ $group: { _id: null, ...SUMS } }] };
  if (withBreakdowns) {
    facet.byDate = [{ $group: { _id: "$effDate", ...SUMS } }];
    facet.byItem = [{ $group: { _id: "$stockItemId", ...SUMS } }];
    facet.byKitchen = [{ $group: { _id: "$godownId", ...SUMS } }];
  }
  const [result] = await Consumption.aggregate([
    ...datedPipeline({ scopeIds, from, to, window }, tz),
    { $unwind: "$items" },
    {
      $project: {
        godownId: 1, effDate: 1, stockItemId: "$items.stockItemId",
        qty: { $ifNull: ["$items.qtyBaseUnit", 0] },
        valued: VALUED,
        amount: { $cond: [VALUED, "$items.amountAtIssue", 0] }
      }
    },
    { $facet: facet }
  ]).allowDiskUse(true).option(options);
  return {
    totals: result?.totals?.[0] || EMPTY_TOTALS,
    byDate: result?.byDate || [],
    byItem: result?.byItem || [],
    byKitchen: result?.byKitchen || []
  };
};

const countDailyUseLines = async ({ scopeIds, from, to, window, tz, options = {} }) => {
  const [row] = await DailyUsage.aggregate([
    ...datedPipeline({ scopeIds, from, to, window }, tz),
    { $group: { _id: null, lines: { $sum: { $size: { $ifNull: ["$items", []] } } } } }
  ]).option(options);
  return row?.lines || 0;
};

export const rankTopItems = (rows, limit = TOP_LIMIT) => {
  const ranked = rows
    .map((r) => ({ ...r, stockItemId: String(r._id), shown: round2(r.value) }))
    .sort((a, b) =>
      b.shown - a.shown || b.qty - a.qty || collator.compare(a.name, b.name) ||
      (a.stockItemId < b.stockItemId ? -1 : a.stockItemId > b.stockItemId ? 1 : 0));
  const top = ranked.slice(0, limit);
  const cutoff = top.length === limit ? top[limit - 1].shown : null;
  return {
    items: top.map((r, index) => ({
      rank: index + 1, stockItemId: r.stockItemId, name: r.name, unit: r.unit,
      value: r.shown, qty: round3(r.qty), unvaluedLines: r.unvaluedLines
    })),
    tiedBeyondLimit: cutoff === null ? 0 : ranked.slice(limit).filter((r) => r.shown === cutoff).length,
    unvaluedItemCount: ranked.filter((r) => r.unvaluedLines > 0).length
  };
};

const joinItemNames = async (byItem, options) => {
  const docs = await StockItem.find({ _id: { $in: byItem.map((r) => r._id) } })
    .select("name unitId").populate("unitId", "symbol").lean().maxTimeMS(options.maxTimeMS || 0);
  const meta = new Map(docs.map((d) => [String(d._id), { name: d.name, unit: d.unitId?.symbol || "" }]));
  return byItem.map((r) => ({ ...r, ...(meta.get(String(r._id)) || { name: "Deleted item", unit: "" }) }));
};

export const consumptionSection = async (ctx) => {
  const { params, tz, scopeIds } = ctx;
  const options = ctx.aggOptions();
  const [current, previous, dailyLines] = await Promise.all([
    ctx.consumption(),
    aggregateConsumption({ scopeIds, from: params.previous.from, to: params.previous.to, window: params.previous.window, tz, options, withBreakdowns: false }),
    countDailyUseLines({ scopeIds, from: params.from, to: params.to, window: params.window, tz, options })
  ]);

  const byDate = new Map(current.byDate.map((r) => [r._id, r]));
  const points = [];
  for (let day = params.from; day <= params.to; day = addDays(day, 1)) {
    const row = byDate.get(day);
    points.push({ date: day, value: round2(row?.value || 0), unvaluedLines: row?.unvaluedLines || 0 });
  }

  const prevValue = previous.totals.value;
  const deltaPct = prevValue === 0 ? null : round2(((current.totals.value - prevValue) / Math.abs(prevValue)) * 100);
  const total = round2(current.totals.value);
  const topItems = rankTopItems(await joinItemNames(current.byItem, options));

  return {
    kpis: {
      consumptionValue: {
        value: total,
        details: { unvaluedLineCount: current.totals.unvaluedLines, unvaluedQty: round3(current.totals.unvaluedQty), previousValue: round2(prevValue), deltaPct }
      },
      dailyUseLines: { value: dailyLines }
    },
    sections: {
      consumptionTrend: { points, total, previousTotal: round2(prevValue), deltaPct },
      topItems
    }
  };
};
```

Note: `.maxTimeMS(0)` means "no limit" in MongoDB, so passing 0 when unset is safe.

- [ ] **Step 4: Run** — PASS. If `deltaPct` differs by 0.01, check you divide unrounded totals (227.25 − 40) / 40 × 100 = 468.125 → `round2` → 468.13.

- [ ] **Step 5: Commit**

```bash
git add backend/src/executive/sections/consumption.js backend/src/tests/executiveConsumption.test.js
git commit -m "feat(executive): consumption value, trend and top items from amount at issue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Stock sections (value, low/out, health list, unpriced list)

**Files:**
- Create: `backend/src/executive/sections/stock.js`, `backend/src/executive/paginate.js`
- Test: `backend/src/tests/executiveStock.test.js`

**Interfaces:**
- Consumes: `kitchenDistributionPrices`, `purchaseOrderPrices`, `resolvePrice` (Task 17); `round2/round3`.
- Produces (`paginate.js`): `paginate(rows, page, pageSize) → { rows, total, page (clamped to last page), pageSize, pages }`; `compareIds(a, b)`; `collator`.
- Produces (`stock.js`):
  - `loadStockSnapshot(ctx) → { value, unpriced: Row[], low: Row[], out: Row[], perKitchen: Map<godownId, { lowOrOut }> }` where `Row = { _id, godownId, stockItemId, qty, threshold }` (raw value unrounded)
  - `stockSections(ctx) → { kpis: { stockValue, lowStock, outOfStock }, sections: { stockHealth, unpricedStock } }` — requires `ctx.stock` loader.

Payloads:

```
kpis.stockValue = { value, details: { unpricedItemCount, unpricedQty } }
kpis.lowStock = { value }, kpis.outOfStock = { value }
sections.stockHealth = { rows: [{ id, godownId, kitchen, stockItemId, item, unit, qty, threshold, state: "out"|"low", ratio }], total, page, pageSize, pages, outCount, lowCount }
sections.unpricedStock = { rows: [{ id, godownId, kitchen, stockItemId, item, unit, qty }], total, page, pageSize, pages, unpricedQty }
```

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveStock.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, kitchen, makeCtx, purchaseOrder, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { memo } from "../executive/context.js";
import { loadStockSnapshot, stockSections } from "../executive/sections/stock.js";
import { paginate } from "../executive/paginate.js";

let f;
before(startDb);
after(stopDb);

const ctxFor = async (query = {}, opts) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query }, opts);
  ctx.stock = memo(() => loadStockSnapshot(ctx));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal", "Oil"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const C = await kitchen("Kitchen C (closed)", false);
  await distribution("2026-10-01T05:00:00Z", [[A, items.Rice, 10, 45], [C, items.Rice, 100, 45]]);
  await purchaseOrder("2026-09-20T05:00:00Z", [[items.Rice, 100, 41]]);
  await stockRow(A, items.Rice, 10, 12);   // priced 45 → 450, low (10 ≤ 12)
  await stockRow(A, items.Oil, 3);         // unpriced
  await stockRow(A, items.Dal, -2, 5);     // out (negative)
  await stockRow(B, items.Rice, 2, 4);     // PO price 41 → 82, low (ratio 0.5)
  await stockRow(B, items.Dal, 5);         // unpriced
  await stockRow(B, items.Oil, 0, 0);      // out, not unpriced
  await stockRow(C, items.Rice, 100);      // inactive kitchen: excluded from "all"
  f = { items, A, B, C };
});

test("mixed priced and unpriced inventory across active kitchens", async () => {
  const { kpis } = await stockSections(await ctxFor());
  assert.equal(kpis.stockValue.value, 532);
  assert.deepEqual(kpis.stockValue.details, { unpricedItemCount: 2, unpricedQty: 8 });
  assert.equal(kpis.lowStock.value, 2);
  assert.equal(kpis.outOfStock.value, 2);
});

test("inactive kitchen is selectable and reported on its own", async () => {
  const { kpis } = await stockSections(await ctxFor({ godownId: String(f.C._id) }));
  assert.equal(kpis.stockValue.value, 4500);
});

test("health list: out-of-stock first, then lowest ratio, then names", async () => {
  const { sections } = await stockSections(await ctxFor());
  assert.deepEqual(sections.stockHealth.rows.map((r) => [r.state, r.kitchen, r.item]), [
    ["out", "Kitchen A", "Dal"],
    ["out", "Kitchen B", "Oil"],
    ["low", "Kitchen B", "Rice"],
    ["low", "Kitchen A", "Rice"]
  ]);
  assert.equal(sections.stockHealth.rows[2].ratio, 0.5);
  assert.equal(sections.stockHealth.outCount, 2);
  assert.equal(sections.stockHealth.lowCount, 2);
});

test("unpriced list sorted by kitchen then item", async () => {
  const { sections } = await stockSections(await ctxFor());
  assert.deepEqual(sections.unpricedStock.rows.map((r) => [r.kitchen, r.item, r.qty]), [["Kitchen A", "Oil", 3], ["Kitchen B", "Dal", 5]]);
  assert.equal(sections.unpricedStock.unpricedQty, 8);
});

test("pagination uses the context page and page size", async () => {
  const { sections } = await stockSections(await ctxFor({ healthPage: "2" }, { limits: { listPageSize: 3, comparisonPageSize: 3 } }));
  assert.equal(sections.stockHealth.page, 2);
  assert.equal(sections.stockHealth.rows.length, 1);
  assert.equal(sections.stockHealth.total, 4);
});

test("paginate clamps out-of-range pages", () => {
  assert.deepEqual(paginate([1, 2, 3], 9, 2), { rows: [3], total: 3, page: 2, pageSize: 2, pages: 2 });
  assert.deepEqual(paginate([], 1, 25), { rows: [], total: 0, page: 1, pageSize: 25, pages: 1 });
});

test("empty dataset", async () => {
  await clearDb();
  const { kpis, sections } = await stockSections(await ctxFor());
  assert.equal(kpis.stockValue.value, 0);
  assert.equal(sections.stockHealth.total, 0);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement**

`backend/src/executive/paginate.js`:

```js
export const collator = new Intl.Collator("en", { sensitivity: "base" });
export const compareIds = (a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

export const paginate = (rows, page, pageSize) => {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize, pages };
};
```

`backend/src/executive/sections/stock.js`:

```js
import { GodownStock } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { round2, round3 } from "../../utils/money.js";
import { kitchenDistributionPrices, purchaseOrderPrices, resolvePrice } from "../valuation.js";
import { collator, compareIds, paginate } from "../paginate.js";

/** Current stock for the scope: "all" = active kitchens only (README Decision 4). */
export const loadStockSnapshot = async (ctx) => {
  const godownIds = ctx.scopeIds || ctx.activeIds;
  const options = ctx.aggOptions();
  const [docs, kitchenMap, poMap] = await Promise.all([
    GodownStock.find({ godownId: { $in: godownIds } })
      .select("godownId stockItemId qtyBaseUnit thresholdBaseUnit").lean().maxTimeMS(ctx.maxTimeMS || 0),
    kitchenDistributionPrices({ godownIds, options }),
    purchaseOrderPrices({ options })
  ]);
  let value = 0;
  const unpriced = [];
  const low = [];
  const out = [];
  const perKitchen = new Map();
  for (const doc of docs) {
    const row = {
      _id: String(doc._id), godownId: String(doc.godownId), stockItemId: String(doc.stockItemId),
      qty: Number(doc.qtyBaseUnit) || 0, threshold: Number(doc.thresholdBaseUnit) || 0
    };
    const counts = perKitchen.get(row.godownId) || { lowOrOut: 0 };
    if (row.qty <= 0) {
      out.push(row);
      counts.lowOrOut += 1;
    } else {
      if (row.threshold > 0 && row.qty <= row.threshold) {
        low.push(row);
        counts.lowOrOut += 1;
      }
      const { price } = resolvePrice(kitchenMap, poMap, row.godownId, row.stockItemId);
      if (price === null) unpriced.push(row);
      else value += row.qty * price;
    }
    perKitchen.set(row.godownId, counts);
  }
  return { value, unpriced, low, out, perKitchen };
};

const itemMeta = async (rows, ctx) => {
  const ids = [...new Set(rows.map((r) => r.stockItemId))];
  const docs = await StockItem.find({ _id: { $in: ids } }).select("name unitId").populate("unitId", "symbol").lean().maxTimeMS(ctx.maxTimeMS || 0);
  return new Map(docs.map((d) => [String(d._id), { item: d.name, unit: d.unitId?.symbol || "" }]));
};

export const stockSections = async (ctx) => {
  const snap = await ctx.stock();
  const meta = await itemMeta([...snap.out, ...snap.low, ...snap.unpriced], ctx);
  const describe = (row) => ({
    id: row._id, godownId: row.godownId, kitchen: ctx.kitchenName(row.godownId),
    stockItemId: row.stockItemId, ...(meta.get(row.stockItemId) || { item: "Deleted item", unit: "" }),
    qty: round3(row.qty)
  });
  const byNames = (a, b) => collator.compare(a.item, b.item) || collator.compare(a.kitchen, b.kitchen) || compareIds(a.id, b.id);

  const outRows = snap.out.map((r) => ({ ...describe(r), threshold: round3(r.threshold), state: "out", ratio: null })).sort(byNames);
  const lowRows = snap.low.map((r) => ({ ...describe(r), threshold: round3(r.threshold), state: "low", ratio: round3(r.qty / r.threshold) }))
    .sort((a, b) => a.ratio - b.ratio || byNames(a, b));
  const unpricedRows = snap.unpriced.map(describe)
    .sort((a, b) => collator.compare(a.kitchen, b.kitchen) || collator.compare(a.item, b.item) || compareIds(a.id, b.id));
  const unpricedQty = round3(snap.unpriced.reduce((sum, r) => sum + r.qty, 0));
  const size = ctx.limits.listPageSize;

  return {
    kpis: {
      stockValue: { value: round2(snap.value), details: { unpricedItemCount: snap.unpriced.length, unpricedQty } },
      lowStock: { value: snap.low.length },
      outOfStock: { value: snap.out.length }
    },
    sections: {
      stockHealth: { ...paginate([...outRows, ...lowRows], ctx.params.pages.health, size), outCount: outRows.length, lowCount: lowRows.length },
      unpricedStock: { ...paginate(unpricedRows, ctx.params.pages.unpriced, size), unpricedQty }
    }
  };
};
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/executive/paginate.js backend/src/executive/sections/stock.js backend/src/tests/executiveStock.test.js
git commit -m "feat(executive): estimated stock value, stock health and unpriced stock lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Procurement and requests/transfers sections

**Files:**
- Create: `backend/src/executive/sections/procurement.js`, `backend/src/executive/sections/requestsTransfers.js`, `backend/src/executive/statuses.js`
- Test: `backend/src/tests/executiveProcurement.test.js`, `backend/src/tests/executiveRequests.test.js`

**Interfaces:**
- Consumes: `PRICE_RANGE` (Task 17), `AGE_BUCKETS` (Task 16), `addDays`, `round2/round3`.
- Produces (`statuses.js`): `INDENT_STATUSES`, `SUPPLY_STATUSES`, `REQUEST_STATUSES`, `TRANSFER_STATUSES`, `orderStatuses(statuses, rows: { _id, count, value? }[]) → { status, count, value? }[]` (appends `{ status: "other", ... }` only when unexpected statuses exist).
- Produces (`procurement.js`):
  - `aggregateDistributions(ctx) → { value, unpricedAllocationCount, distributionCount, byKitchen: Map<godownId, value> }` (raw)
  - `procurementSection(ctx) → { kpis: { stockReceivedValue, procurementSpend?, poAwaitingDistribution? }, sections: { procurement } }` — requires `ctx.distributions` loader.
- Produces (`requestsTransfers.js`):
  - `pendingRequestsByKitchen(ctx) → Map<godownId, count>`
  - `requestsTransfersSection(ctx) → { kpis: { pendingRequests, pendingSupplyRequests, openTransfers }, sections: { requestsTransfers } }`

Payloads:

```
kpis.stockReceivedValue = { value, details: { unpricedAllocationCount, distributionCount } }
kpis.procurementSpend = { value, details: { poCount } }                 // all only
kpis.poAwaitingDistribution = { value: count, details: { value } }       // all only
sections.procurement = {
  scope: "all"|"kitchen",
  stockReceived: { value, unpricedAllocationCount, distributionCount },
  supplyRequests: [{ status, count }],
  // all only:
  indents: [{ status, count, value }], spend: { value, poCount, daily: [{ date, value }] }, awaiting: { count, value }
}
kpis.pendingRequests = { value, details: { oldestAgeDays } }
kpis.pendingSupplyRequests = { value }
kpis.openTransfers = { value, details: { oldestAgeDays } }
sections.requestsTransfers = {
  requests: { byStatus: [{ status, count }], approvalRate, pendingAgeing: { total, buckets: [{ id, label, count }], oldestAgeDays } },
  transfers: { byStatus: [{ status, count }], openAgeing: { total, buckets, oldestAgeDays } }
}
```

`approvalRate` = approved ÷ (approved + rejected) × 100 rounded to 2 dp, `null` if both 0. Ages in days, 1 dp; buckets `[0,1) [1,3) [3,7) [7,∞)` days.

- [ ] **Step 1: Failing tests**

`backend/src/tests/executiveProcurement.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, indent, kitchen, makeCtx, purchaseOrder, seedCatalog, supplyRequest } from "./helpers/fixtures.js";
import { memo } from "../executive/context.js";
import { aggregateDistributions, procurementSection } from "../executive/sections/procurement.js";

let f;
before(startDb);
after(stopDb);
const ctxFor = async (query = {}) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query });
  ctx.distributions = memo(() => aggregateDistributions(ctx));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  // PO for 100 rice @ 40 received in range.
  await purchaseOrder("2026-10-02T05:00:00Z", [[items.Rice, 100, 40]], { status: "distributed" });
  // Original distribution: 60 to A, 40 left over.
  const first = await distribution("2026-10-02T06:00:00Z", [[A, items.Rice, 60, 40]], { leftovers: [{ stockItemId: items.Rice._id, qtyBaseUnit: 0 }] });
  // Leftover redistribution: the 40 go to B. Must not double count.
  await distribution("2026-10-05T06:00:00Z", [[B, items.Rice, 40, 40]], { leftoverSourceId: first._id });
  // Unpriced allocation and a zero-qty allocation (ignored entirely).
  await distribution("2026-10-06T06:00:00Z", [[A, items.Dal, 5, null], [A, items.Dal, 0, 10]]);
  // Out of range.
  await distribution("2026-10-11T06:00:00Z", [[A, items.Rice, 1, 999]]);
  await purchaseOrder("2026-09-01T05:00:00Z", [[items.Dal, 10, 30]], { status: "pending" });
  await purchaseOrder("2026-10-11T05:00:00Z", [[items.Dal, 1, 999]], { status: "pending" });
  await indent({ status: "pending", createdAt: "2026-10-03T05:00:00Z", totalAmount: 500 });
  await indent({ status: "stock_received", createdAt: "2026-10-04T05:00:00Z", totalAmount: 4000 });
  await indent({ status: "pending", createdAt: "2026-09-01T05:00:00Z", totalAmount: 1 });
  await supplyRequest(A, { status: "pending", createdAt: "2026-10-03T05:00:00Z" });
  await supplyRequest(B, { status: "received", createdAt: "2026-10-04T05:00:00Z" });
  f = { items, A, B };
});

test("leftover redistributions are not double-counted", async () => {
  const { kpis, sections } = await procurementSection(await ctxFor());
  assert.equal(kpis.stockReceivedValue.value, 4000);
  assert.equal(kpis.stockReceivedValue.details.unpricedAllocationCount, 1);
  assert.equal(kpis.stockReceivedValue.details.distributionCount, 3);
  assert.equal(sections.procurement.stockReceived.value, 4000);
});

test("all kitchens: spend is received PO value in range; awaiting distribution is current", async () => {
  const { kpis, sections } = await procurementSection(await ctxFor());
  assert.equal(kpis.procurementSpend.value, 4000);
  assert.equal(kpis.procurementSpend.details.poCount, 1);
  assert.equal(kpis.poAwaitingDistribution.value, 2);
  assert.equal(kpis.poAwaitingDistribution.details.value, 1299);
  assert.deepEqual(sections.procurement.indents, [
    { status: "pending", count: 1, value: 500 },
    { status: "purchased", count: 0, value: 0 },
    { status: "stock_received", count: 1, value: 4000 }
  ]);
  assert.equal(sections.procurement.spend.daily.length, 10);
  assert.equal(sections.procurement.spend.daily.find((d) => d.date === "2026-10-02").value, 4000);
});

test("single kitchen: only its received value; no spend KPIs", async () => {
  const a = await procurementSection(await ctxFor({ godownId: String(f.A._id) }));
  assert.equal(a.kpis.stockReceivedValue.value, 2400);
  assert.equal(a.kpis.procurementSpend, undefined);
  assert.equal(a.sections.procurement.scope, "kitchen");
  assert.deepEqual(a.sections.procurement.supplyRequests.find((s) => s.status === "pending"), { status: "pending", count: 1 });
  const b = await procurementSection(await ctxFor({ godownId: String(f.B._id) }));
  assert.equal(b.kpis.stockReceivedValue.value, 1600);
});

test("empty range", async () => {
  const { kpis } = await procurementSection(await ctxFor({ from: "2026-08-01", to: "2026-08-03" }));
  assert.equal(kpis.stockReceivedValue.value, 0);
  assert.equal(kpis.procurementSpend.value, 0);
});
```

`backend/src/tests/executiveRequests.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { kitchen, makeCtx, stockRequest, supplyRequest, transfer } from "./helpers/fixtures.js";
import { pendingRequestsByKitchen, requestsTransfersSection } from "../executive/sections/requestsTransfers.js";
import { orderStatuses } from "../executive/statuses.js";

let f;
before(startDb);
after(stopDb);
const NOW = new Date("2026-10-13T06:00:00Z");
const ctxFor = (query = {}) => makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query }, { now: NOW });

beforeEach(async () => {
  await clearDb();
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const C = await kitchen("Kitchen C");
  await stockRequest(A, { status: "pending", createdAt: "2026-10-13T00:00:00Z" });   // 0.25 d
  await stockRequest(A, { status: "pending", createdAt: "2026-10-11T06:00:00Z" });   // 2 d
  await stockRequest(B, { status: "pending", createdAt: "2026-10-01T06:00:00Z" });   // 12 d
  await stockRequest(B, { status: "approved", createdAt: "2026-10-02T06:00:00Z" });
  await stockRequest(B, { status: "approved", createdAt: "2026-10-03T06:00:00Z", requestType: "daily_usage" });
  await stockRequest(A, { status: "rejected", createdAt: "2026-10-04T06:00:00Z" });
  await stockRequest(A, { status: "approved", createdAt: "2026-09-01T06:00:00Z" });   // out of range
  await transfer(A, B, { status: "pending", createdAt: "2026-10-09T06:00:00Z" });     // 4 d
  await transfer(C, B, { status: "accepted", createdAt: "2026-10-05T06:00:00Z" });
  await transfer(B, C, { status: "rejected", createdAt: "2026-10-06T06:00:00Z" });
  await supplyRequest(A, { status: "pending", createdAt: "2026-10-03T05:00:00Z" });
  f = { A, B, C };
});

test("all kitchens", async () => {
  const { kpis, sections } = await requestsTransfersSection(await ctxFor());
  assert.equal(kpis.pendingRequests.value, 3);
  assert.equal(kpis.pendingRequests.details.oldestAgeDays, 12);
  assert.equal(kpis.pendingSupplyRequests.value, 1);
  assert.equal(kpis.openTransfers.value, 1);
  const r = sections.requestsTransfers.requests;
  assert.deepEqual(r.byStatus, [{ status: "pending", count: 1 }, { status: "approved", count: 2 }, { status: "rejected", count: 1 }]);
  assert.equal(r.approvalRate, 66.67);
  assert.deepEqual(r.pendingAgeing.buckets.map((b) => b.count), [1, 1, 0, 1]);
  assert.deepEqual(sections.requestsTransfers.transfers.byStatus, [
    { status: "pending", count: 1 }, { status: "accepted", count: 1 }, { status: "rejected", count: 1 }
  ]);
  assert.deepEqual(sections.requestsTransfers.transfers.openAgeing.buckets.map((b) => b.count), [0, 0, 1, 0]);
});

test("kitchen scope matches sender or receiver for transfers", async () => {
  const { kpis, sections } = await requestsTransfersSection(await ctxFor({ godownId: String(f.C._id) }));
  assert.equal(kpis.pendingRequests.value, 0);
  assert.equal(kpis.pendingRequests.details.oldestAgeDays, null);
  assert.equal(kpis.openTransfers.value, 0);
  assert.equal(sections.requestsTransfers.transfers.byStatus.reduce((s, x) => s + x.count, 0), 2);
  assert.equal(sections.requestsTransfers.requests.approvalRate, null);
});

test("pending requests by kitchen", async () => {
  const map = await pendingRequestsByKitchen(await ctxFor());
  assert.equal(map.get(String(f.A._id)), 2);
  assert.equal(map.get(String(f.B._id)), 1);
});

test("unexpected statuses are reported as other, never dropped", () => {
  assert.deepEqual(orderStatuses(["pending", "approved"], [{ _id: "approved", count: 2 }, { _id: "weird", count: 1 }]), [
    { status: "pending", count: 0 }, { status: "approved", count: 2 }, { status: "other", count: 1 }
  ]);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement `statuses.js`**

```js
export const INDENT_STATUSES = Object.freeze(["pending", "purchased", "stock_received"]);
export const SUPPLY_STATUSES = Object.freeze(["pending", "confirmed", "partially_received", "received", "rejected"]);
export const REQUEST_STATUSES = Object.freeze(["pending", "approved", "rejected"]);
export const TRANSFER_STATUSES = Object.freeze(["pending", "accepted", "rejected"]);

/** Fixed status order; counts for statuses outside the list are folded into "other". */
export const orderStatuses = (statuses, rows) => {
  const withValue = rows.some((r) => r.value !== undefined);
  const byId = new Map(rows.map((r) => [r._id, r]));
  const shape = (status, count, value) => (withValue ? { status, count, value } : { status, count });
  const out = statuses.map((s) => shape(s, byId.get(s)?.count || 0, byId.get(s)?.value || 0));
  const others = rows.filter((r) => !statuses.includes(r._id));
  if (others.length) {
    out.push(shape("other", others.reduce((s, r) => s + r.count, 0), others.reduce((s, r) => s + (r.value || 0), 0)));
  }
  return out;
};
```

- [ ] **Step 4: Implement `procurement.js`**

```js
import { Distribution, Indent, IndentRequest, PurchaseOrder } from "../../models/FlowModels.js";
import { round2 } from "../../utils/money.js";
import { addDays } from "../params.js";
import { INDENT_STATUSES, SUPPLY_STATUSES, orderStatuses } from "../statuses.js";

const priced = { $and: [{ $isNumber: "$price" }, { $gt: ["$price", 0] }, { $lte: ["$price", Number.MAX_VALUE] }] };

/** Every Distribution document counts once; Distribution.leftovers are never summed. */
export const aggregateDistributions = async (ctx) => {
  const { window } = ctx.params;
  const [result] = await Distribution.aggregate([
    { $match: { createdAt: { $gte: window.start, $lt: window.end } } },
    { $unwind: "$allocations" },
    ...(ctx.scopeIds ? [{ $match: { "allocations.godownId": { $in: ctx.scopeIds } } }] : []),
    { $project: { distributionId: "$_id", godownId: "$allocations.godownId", qty: { $ifNull: ["$allocations.qtyBaseUnit", 0] }, price: "$allocations.unitPrice" } },
    { $match: { qty: { $gt: 0 } } },
    { $addFields: { priced, lineValue: { $cond: [priced, { $multiply: ["$qty", "$price"] }, 0] } } },
    {
      $facet: {
        totals: [
          { $group: { _id: "$distributionId", value: { $sum: "$lineValue" }, unpriced: { $sum: { $cond: ["$priced", 0, 1] } } } },
          { $group: { _id: null, value: { $sum: "$value" }, unpriced: { $sum: "$unpriced" }, distributionCount: { $sum: 1 } } }
        ],
        byKitchen: [{ $group: { _id: "$godownId", value: { $sum: "$lineValue" } } }]
      }
    }
  ]).allowDiskUse(true).option(ctx.aggOptions());
  const totals = result?.totals?.[0] || { value: 0, unpriced: 0, distributionCount: 0 };
  return {
    value: totals.value,
    unpricedAllocationCount: totals.unpriced,
    distributionCount: totals.distributionCount,
    byKitchen: new Map((result?.byKitchen || []).map((r) => [String(r._id), r.value]))
  };
};

export const procurementSection = async (ctx) => {
  const { window, from, to } = ctx.params;
  const options = ctx.aggOptions();
  const inWindow = { $gte: window.start, $lt: window.end };
  const scope = ctx.scopeIds ? { godownId: { $in: ctx.scopeIds } } : {};
  const [dist, supplyRows] = await Promise.all([
    ctx.distributions(),
    IndentRequest.aggregate([{ $match: { createdAt: inWindow, ...scope } }, { $group: { _id: "$status", count: { $sum: 1 } } }]).option(options)
  ]);
  const stockReceived = { value: round2(dist.value), unpricedAllocationCount: dist.unpricedAllocationCount, distributionCount: dist.distributionCount };
  const kpis = { stockReceivedValue: { value: stockReceived.value, details: { unpricedAllocationCount: stockReceived.unpricedAllocationCount, distributionCount: stockReceived.distributionCount } } };
  const base = { stockReceived, supplyRequests: orderStatuses(SUPPLY_STATUSES, supplyRows) };
  if (ctx.scopeIds) return { kpis, sections: { procurement: { scope: "kitchen", ...base } } };

  const [indentRows, [spend], [awaiting]] = await Promise.all([
    Indent.aggregate([{ $match: { createdAt: inWindow } }, { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]).option(options),
    PurchaseOrder.aggregate([
      { $match: { receivedAt: inWindow } },
      {
        $facet: {
          total: [{ $group: { _id: null, value: { $sum: { $ifNull: ["$totalAmount", 0] } }, count: { $sum: 1 } } }],
          daily: [{ $group: { _id: { $dateToString: { date: "$receivedAt", format: "%Y-%m-%d", timezone: ctx.tz } }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]
        }
      }
    ]).option(options),
    PurchaseOrder.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]).option(options)
  ]);

  const dailyMap = new Map((spend?.daily || []).map((d) => [d._id, d.value]));
  const daily = [];
  for (let day = from; day <= to; day = addDays(day, 1)) daily.push({ date: day, value: round2(dailyMap.get(day) || 0) });
  const spendTotal = spend?.total?.[0] || { value: 0, count: 0 };
  const awaitingTotal = { count: awaiting?.count || 0, value: round2(awaiting?.value || 0) };

  kpis.procurementSpend = { value: round2(spendTotal.value), details: { poCount: spendTotal.count } };
  kpis.poAwaitingDistribution = { value: awaitingTotal.count, details: { value: awaitingTotal.value } };
  return {
    kpis,
    sections: {
      procurement: {
        scope: "all", ...base,
        indents: orderStatuses(INDENT_STATUSES, indentRows).map((r) => ({ ...r, value: round2(r.value) })),
        spend: { value: round2(spendTotal.value), poCount: spendTotal.count, daily },
        awaiting: awaitingTotal
      }
    }
  };
};
```

- [ ] **Step 5: Implement `requestsTransfers.js`**

```js
import { IndentRequest, Request, Transfer } from "../../models/FlowModels.js";
import { round2 } from "../../utils/money.js";
import { AGE_BUCKETS } from "../definitions.js";
import { REQUEST_STATUSES, TRANSFER_STATUSES, orderStatuses } from "../statuses.js";

const DAY_MS = 86_400_000;
const round1 = (n) => Math.round(n * 10) / 10;

const bucketExpr = {
  $switch: {
    branches: [
      { case: { $lt: ["$ageDays", 1] }, then: "lt1d" },
      { case: { $lt: ["$ageDays", 3] }, then: "1to3d" },
      { case: { $lt: ["$ageDays", 7] }, then: "3to7d" }
    ],
    default: "gt7d"
  }
};

const ageing = async (Model, match, now, options) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $project: { ageDays: { $divide: [{ $subtract: [now, "$createdAt"] }, DAY_MS] } } },
    { $group: { _id: bucketExpr, count: { $sum: 1 }, oldest: { $max: "$ageDays" } } }
  ]).option(options);
  const byId = new Map(rows.map((r) => [r._id, r]));
  const oldest = rows.length ? Math.max(...rows.map((r) => r.oldest)) : null;
  return {
    total: rows.reduce((s, r) => s + r.count, 0),
    buckets: AGE_BUCKETS.map((b) => ({ id: b.id, label: b.label, count: byId.get(b.id)?.count || 0 })),
    oldestAgeDays: oldest === null ? null : round1(oldest)
  };
};

export const pendingRequestsByKitchen = async (ctx) => {
  const rows = await Request.aggregate([{ $match: { status: "pending" } }, { $group: { _id: "$godownId", count: { $sum: 1 } } }]).option(ctx.aggOptions());
  return new Map(rows.map((r) => [String(r._id), r.count]));
};

export const requestsTransfersSection = async (ctx) => {
  const { window } = ctx.params;
  const options = ctx.aggOptions();
  const inWindow = { $gte: window.start, $lt: window.end };
  const kitchenScope = ctx.scopeIds ? { godownId: { $in: ctx.scopeIds } } : {};
  const transferScope = ctx.scopeIds ? { $or: [{ fromGodownId: { $in: ctx.scopeIds } }, { toGodownId: { $in: ctx.scopeIds } }] } : {};
  const byStatus = (Model, match) => Model.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]).option(options);

  const [requestRows, transferRows, pendingAgeing, openAgeing, pendingSupply] = await Promise.all([
    byStatus(Request, { createdAt: inWindow, ...kitchenScope }),
    byStatus(Transfer, { createdAt: inWindow, ...transferScope }),
    ageing(Request, { status: "pending", ...kitchenScope }, ctx.now, options),
    ageing(Transfer, { status: "pending", ...transferScope }, ctx.now, options),
    IndentRequest.countDocuments({ status: "pending", ...kitchenScope }).maxTimeMS(ctx.maxTimeMS || 0)
  ]);

  const requests = orderStatuses(REQUEST_STATUSES, requestRows);
  const approved = requests.find((r) => r.status === "approved").count;
  const rejected = requests.find((r) => r.status === "rejected").count;

  return {
    kpis: {
      pendingRequests: { value: pendingAgeing.total, details: { oldestAgeDays: pendingAgeing.oldestAgeDays } },
      pendingSupplyRequests: { value: pendingSupply },
      openTransfers: { value: openAgeing.total, details: { oldestAgeDays: openAgeing.oldestAgeDays } }
    },
    sections: {
      requestsTransfers: {
        requests: { byStatus: requests, approvalRate: approved + rejected === 0 ? null : round2((approved / (approved + rejected)) * 100), pendingAgeing },
        transfers: { byStatus: orderStatuses(TRANSFER_STATUSES, transferRows), openAgeing }
      }
    }
  };
};
```

- [ ] **Step 6: Run** — PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/executive/statuses.js backend/src/executive/sections/procurement.js backend/src/executive/sections/requestsTransfers.js \
  backend/src/tests/executiveProcurement.test.js backend/src/tests/executiveRequests.test.js
git commit -m "feat(executive): procurement pipeline and request/transfer ageing sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
