# Phase 5 — Executive Report page (admin-web)

Read `README.md` Decisions 4, 6 and 7 first. Depends on Phase 3 (routing, `businessTime.js`) and Phase 4 (`/api/executive/summary`, `/api/executive/export.xlsx`).

**Before writing any chart or KPI tile code (Task 26), load the `dataviz` skill** and apply its palette/mark guidance to the CSS tokens in `executive.css` — the component structure below stays as written. All report numbers come from the API; the UI only formats them (Global Constraint).

---

### Task 25: URL parameters, stale-response guard, page shell and filters

**Files:**
- Create: `admin-web/src/pages/executive/reportParams.js`, `admin-web/src/pages/executive/reportParams.test.js`
- Create: `admin-web/src/pages/executive/requestTracker.js`, `admin-web/src/pages/executive/requestTracker.test.js`
- Create: `admin-web/src/pages/executive/format.js`, `admin-web/src/pages/executive/format.test.js`
- Create: `admin-web/src/pages/executive/useExecutiveReport.js`
- Create: `admin-web/src/pages/executive/ReportFilters.jsx`, `admin-web/src/pages/executive/executive.css`
- Modify (replace placeholder): `admin-web/src/pages/ExecutiveReportPage.jsx`

**Interfaces:**
- Consumes: `todayInBusinessTz`, `addDays`, `formatDateTime` (Task 13); `GET /api/inventory/godowns` (lookup, returns `{ _id, name, active }[]`); `GET /api/executive/summary`.
- Produces (`reportParams.js`):
  - `PRESETS = { "7d": 7, "30d": 30, "90d": 90 }`, `DEFAULT_PRESET = "30d"`, `MAX_SPAN_DAYS = 366`
  - `sanitizeReportParams(search: URLSearchParams, { today, kitchenIds?: Set<string> }) → { godownId, preset, from, to, pages: { health, unpriced, comparison }, kitchenReset: boolean, changed: boolean }`
  - `toSearchParams(state) → URLSearchParams` (defaults omitted: `godownId=all`, `range=30d`, pages = 1)
  - `toApiQuery(state) → { godownId, from, to, healthPage, unpricedPage, comparisonPage }`
  - `isDefault(state) → boolean`
- Produces (`requestTracker.js`): `createRequestTracker() → { start() → { id, signal, isLatest() }, cancel() }`.
- Produces (`format.js`): `formatMoney(n)`, `formatCount(n)`, `formatQty(n)`, `formatPct(n)`, `formatDays(n)`, `filenameFromDisposition(header)`.
- Produces (`useExecutiveReport.js`): `useExecutiveReport(apiQuery) → { status: "loading"|"ready"|"error", report, error, reload }` — keeps showing the previous report while a new one loads (`status: "loading"` with `report` set).

URL keys: `godownId`, `range` (`7d|30d|90d|custom`), `from`, `to` (only with `custom`), `healthPage`, `unpricedPage`, `comparisonPage`.

- [ ] **Step 1: Failing tests**

`admin-web/src/pages/executive/reportParams.test.js`:

```js
import { describe, expect, it } from "vitest";
import { isDefault, sanitizeReportParams, toApiQuery, toSearchParams } from "./reportParams.js";

const today = "2026-10-13";
const s = (q) => sanitizeReportParams(new URLSearchParams(q), { today });

describe("sanitizeReportParams", () => {
  it("defaults to all kitchens, last 30 days", () => {
    const r = s("");
    expect(r).toMatchObject({ godownId: "all", preset: "30d", from: "2026-09-14", to: "2026-10-13", changed: false, kitchenReset: false });
    expect(isDefault(r)).toBe(true);
  });
  it("presets ignore stray dates", () => {
    expect(s("range=7d&from=2020-01-01&to=2020-01-02")).toMatchObject({ preset: "7d", from: "2026-10-07", to: "2026-10-13", changed: true });
  });
  it("custom ranges are validated and fall back to the default", () => {
    expect(s("range=custom&from=2026-10-01&to=2026-10-05")).toMatchObject({ preset: "custom", from: "2026-10-01", to: "2026-10-05", changed: false });
    expect(s("range=custom&from=2026-10-05&to=2026-10-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2026-10-01&to=2026-10-20")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2025-01-01&to=2026-10-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2026-02-30&to=2026-03-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("from=2026-10-01&to=2026-10-05")).toMatchObject({ preset: "custom", changed: true });
    expect(s("range=yearly")).toMatchObject({ preset: "30d", changed: true });
  });
  it("kitchen ids are checked for shape and existence", () => {
    expect(s("godownId=not-an-id")).toMatchObject({ godownId: "all", kitchenReset: true, changed: true });
    const id = "65f0c0ffee0000000000abcd";
    expect(sanitizeReportParams(new URLSearchParams(`godownId=${id}`), { today })).toMatchObject({ godownId: id, kitchenReset: false });
    expect(sanitizeReportParams(new URLSearchParams(`godownId=${id}`), { today, kitchenIds: new Set(["x"]) })).toMatchObject({ godownId: "all", kitchenReset: true });
  });
  it("pages are positive integers", () => {
    expect(s("healthPage=3&unpricedPage=0&comparisonPage=x").pages).toEqual({ health: 3, unpriced: 1, comparison: 1 });
  });
});

describe("serialisation", () => {
  it("omits defaults from the URL", () => {
    expect(toSearchParams(s("")).toString()).toBe("");
    expect(toSearchParams(s("range=custom&from=2026-10-01&to=2026-10-05&healthPage=2")).toString())
      .toBe("range=custom&from=2026-10-01&to=2026-10-05&healthPage=2");
  });
  it("builds the API query", () => {
    expect(toApiQuery(s("range=7d"))).toEqual({ godownId: "all", from: "2026-10-07", to: "2026-10-13", healthPage: 1, unpricedPage: 1, comparisonPage: 1 });
  });
});
```

`admin-web/src/pages/executive/requestTracker.test.js`:

```js
import { describe, expect, it } from "vitest";
import { createRequestTracker } from "./requestTracker.js";

describe("request tracker (stale responses are ignored)", () => {
  it("only the most recent request is latest; older ones are aborted", () => {
    const tracker = createRequestTracker();
    const first = tracker.start();
    const second = tracker.start();
    expect(first.isLatest()).toBe(false);
    expect(first.signal.aborted).toBe(true);
    expect(second.isLatest()).toBe(true);
    tracker.cancel();
    expect(second.isLatest()).toBe(false);
    expect(second.signal.aborted).toBe(true);
  });
  it("a slow older response arriving last does not win", async () => {
    const tracker = createRequestTracker();
    let shown = null;
    const fetchAfter = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
    const load = async (ms, value) => {
      const req = tracker.start();
      const result = await fetchAfter(ms, value);
      if (req.isLatest()) shown = result;
    };
    await Promise.all([load(30, "old"), load(5, "new")]);
    expect(shown).toBe("new");
  });
});
```

`admin-web/src/pages/executive/format.test.js`:

```js
import { describe, expect, it } from "vitest";
import { filenameFromDisposition, formatCount, formatDays, formatMoney, formatPct, formatQty } from "./format.js";

describe("format", () => {
  it("money uses rupees with Indian grouping and two decimals", () => {
    expect(formatMoney(123456.7)).toBe("₹1,23,456.70");
    expect(formatMoney(-10)).toBe("-₹10.00");
    expect(formatMoney(null)).toBe("—");
  });
  it("counts, quantities, percentages, ages", () => {
    expect(formatCount(1234567)).toBe("12,34,567");
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatPct(468.13)).toBe("+468.1%");
    expect(formatPct(-3.04)).toBe("-3.0%");
    expect(formatPct(null)).toBe("—");
    expect(formatDays(0.25)).toBe("under 1 day");
    expect(formatDays(12)).toBe("12 days");
  });
  it("reads the export filename from Content-Disposition", () => {
    expect(filenameFromDisposition(`attachment; filename="a.xlsx"; filename*=UTF-8''Caf%C3%A9.xlsx`)).toBe("Café.xlsx");
    expect(filenameFromDisposition(`attachment; filename="a.xlsx"`)).toBe("a.xlsx");
    expect(filenameFromDisposition(undefined)).toBe(null);
  });
});
```

Run: `npm --prefix admin-web test` → FAIL.

- [ ] **Step 2: `reportParams.js`**

```js
import { addDays } from "../../businessTime.js";

export const PRESETS = Object.freeze({ "7d": 7, "30d": 30, "90d": 90 });
export const DEFAULT_PRESET = "30d";
export const MAX_SPAN_DAYS = 366;
const HEX_ID = /^[a-f0-9]{24}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isIsoDate = (value) => {
  const m = DATE_RE.exec(value || "");
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
};
const span = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
const page = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};
const presetRange = (preset, today) => ({ from: addDays(today, -(PRESETS[preset] - 1)), to: today });

export const sanitizeReportParams = (search, { today, kitchenIds } = {}) => {
  let changed = false;
  let kitchenReset = false;

  let godownId = search.get("godownId") || "all";
  if (godownId !== "all" && (!HEX_ID.test(godownId) || (kitchenIds && !kitchenIds.has(godownId.toLowerCase())))) {
    godownId = "all";
    kitchenReset = true;
    changed = true;
  }
  godownId = godownId.toLowerCase();

  const rawPreset = search.get("range");
  const from = search.get("from");
  const to = search.get("to");
  let preset = rawPreset;
  let range;
  const customValid = isIsoDate(from) && isIsoDate(to) && from <= to && to <= today && span(from, to) <= MAX_SPAN_DAYS;

  if (preset && PRESETS[preset]) {
    range = presetRange(preset, today);
    if (from || to) changed = true;
  } else if ((preset === "custom" || (!preset && (from || to))) && customValid) {
    if (!preset) changed = true;
    preset = "custom";
    range = { from, to };
  } else {
    if (preset || from || to) changed = true;
    preset = DEFAULT_PRESET;
    range = presetRange(preset, today);
  }

  const pages = { health: page(search.get("healthPage")), unpriced: page(search.get("unpricedPage")), comparison: page(search.get("comparisonPage")) };
  for (const [key, value] of [["healthPage", pages.health], ["unpricedPage", pages.unpriced], ["comparisonPage", pages.comparison]]) {
    if (search.has(key) && String(value) !== search.get(key)) changed = true;
  }
  return { godownId, preset, ...range, pages, kitchenReset, changed };
};

export const toSearchParams = (state) => {
  const out = new URLSearchParams();
  if (state.godownId !== "all") out.set("godownId", state.godownId);
  if (state.preset !== DEFAULT_PRESET) out.set("range", state.preset);
  if (state.preset === "custom") {
    out.set("from", state.from);
    out.set("to", state.to);
  }
  if (state.pages.health > 1) out.set("healthPage", String(state.pages.health));
  if (state.pages.unpriced > 1) out.set("unpricedPage", String(state.pages.unpriced));
  if (state.pages.comparison > 1) out.set("comparisonPage", String(state.pages.comparison));
  return out;
};

export const toApiQuery = (state) => ({
  godownId: state.godownId, from: state.from, to: state.to,
  healthPage: state.pages.health, unpricedPage: state.pages.unpriced, comparisonPage: state.pages.comparison
});

export const isDefault = (state) => toSearchParams(state).toString() === "";
```

- [ ] **Step 3: `requestTracker.js`**

```js
/** Ensures only the newest in-flight request may update the screen; older ones are aborted. */
export const createRequestTracker = () => {
  let current = 0;
  let controller = null;
  return {
    start() {
      controller?.abort();
      current += 1;
      controller = new AbortController();
      const id = current;
      return { id, signal: controller.signal, isLatest: () => id === current };
    },
    cancel() {
      controller?.abort();
      current += 1;
    }
  };
};
```

- [ ] **Step 4: `format.js`**

```js
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

export const formatMoney = (n) => (isNum(n) ? money.format(n) : "—");
export const formatCount = (n) => (isNum(n) ? count.format(n) : "—");
export const formatQty = (n) => (isNum(n) ? qty.format(n) : "—");
export const formatPct = (n) => (isNum(n) ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—");
export const formatDays = (n) => {
  if (!isNum(n)) return "—";
  if (n < 1) return "under 1 day";
  const days = Math.floor(n);
  return `${days} day${days === 1 ? "" : "s"}`;
};

export const filenameFromDisposition = (header) => {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { /* fall through */ }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
};
```

(`Intl` `en-IN` INR formatting yields `₹1,23,456.70` and `-₹10.00` in Node ≥ 20 and evergreen browsers; if your Node prints a narrow no-break space or different sign placement, the test tells you — adjust the test only if the browser output matches the new expectation.)

Run: `npm --prefix admin-web test` → the three new test files PASS.

- [ ] **Step 5: `useExecutiveReport.js`**

```js
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { createRequestTracker } from "./requestTracker.js";

export const useExecutiveReport = (apiQuery) => {
  const key = JSON.stringify(apiQuery);
  // useState initialiser (not a ref read during render) keeps the react-hooks v7 rules happy.
  const [tracker] = useState(createRequestTracker);
  const [state, setState] = useState({ status: "loading", report: null, error: null });

  const load = useCallback(async () => {
    const req = tracker.start();
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const { data } = await api.get("/executive/summary", { params: JSON.parse(key), signal: req.signal });
      if (req.isLatest()) setState({ status: "ready", report: data, error: null });
    } catch (error) {
      if (!req.isLatest() || error.code === "ERR_CANCELED") return;
      setState((prev) => ({ ...prev, status: "error", error: error.response?.data || { code: "NETWORK_ERROR", message: "Could not reach the server." } }));
    }
  }, [key, tracker]);

  useEffect(() => {
    load();
    return () => tracker.cancel();
  }, [load, tracker]);

  return { ...state, reload: load };
};
```

- [ ] **Step 6: Filters component**

`admin-web/src/pages/executive/ReportFilters.jsx`:

```jsx
import { RotateCcw } from "lucide-react";
import { Button, DateField, Field } from "../../components/ui/index.jsx";
import { PRESETS } from "./reportParams.js";

const PRESET_LABELS = { "7d": "7 days", "30d": "30 days", "90d": "90 days", custom: "Custom" };

export function ReportFilters({ state, kitchens, today, onChange, onReset, canReset, disabled }) {
  const active = kitchens.filter((k) => k.active !== false);
  const inactive = kitchens.filter((k) => k.active === false);
  return (
    <div className="exec-filters" role="group" aria-label="Report filters">
      <Field label="Kitchen" className="exec-filters__kitchen">
        <select
          value={state.godownId}
          disabled={disabled}
          onChange={(e) => onChange({ godownId: e.target.value })}
        >
          <option value="all">All kitchens</option>
          {active.length > 0 && (
            <optgroup label="Active">
              {active.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
            </optgroup>
          )}
          {inactive.length > 0 && (
            <optgroup label="Inactive">
              {inactive.map((k) => <option key={k._id} value={k._id}>{k.name} (inactive)</option>)}
            </optgroup>
          )}
        </select>
      </Field>
      <div className="exec-filters__range" role="radiogroup" aria-label="Date range">
        {[...Object.keys(PRESETS), "custom"].map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={state.preset === preset}
            className={`exec-chip${state.preset === preset ? " exec-chip--on" : ""}`}
            disabled={disabled}
            onClick={() => onChange(preset === "custom" ? { preset, from: state.from, to: state.to } : { preset })}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      {state.preset === "custom" && (
        <div className="exec-filters__dates">
          <Field label="From">
            <DateField value={state.from} max={state.to} onChange={(e) => e.target.value && onChange({ preset: "custom", from: e.target.value, to: state.to })} disabled={disabled} />
          </Field>
          <Field label="To">
            <DateField value={state.to} min={state.from} max={today} onChange={(e) => e.target.value && onChange({ preset: "custom", from: state.from, to: e.target.value })} disabled={disabled} />
          </Field>
        </div>
      )}
      {canReset && (
        <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled}>
          <RotateCcw size={14} aria-hidden="true" /> Reset filters
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Page shell**

`admin-web/src/pages/ExecutiveReportPage.jsx` (sections are filled in by Task 26; until then render the raw KPI list so the page is testable):

```jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Banner, ErrorState, LoadingState, PageHeader } from "../components/ui/index.jsx";
import { formatDateTime, todayInBusinessTz } from "../businessTime.js";
import { ReportFilters } from "./executive/ReportFilters.jsx";
import { isDefault, sanitizeReportParams, toApiQuery, toSearchParams } from "./executive/reportParams.js";
import { useExecutiveReport } from "./executive/useExecutiveReport.js";
import { ReportBody } from "./executive/ReportBody.jsx";
import { ExportButtons } from "./executive/ExportButtons.jsx";
import "./executive/executive.css";

export function ExecutiveReportPage() {
  const [search, setSearch] = useSearchParams();
  const [kitchens, setKitchens] = useState(null);
  const [kitchenError, setKitchenError] = useState(false);
  const today = todayInBusinessTz();

  useEffect(() => {
    let cancelled = false;
    api.get("/inventory/godowns")
      .then(({ data }) => { if (!cancelled) setKitchens([...data].sort((a, b) => a.name.localeCompare(b.name))); })
      .catch(() => { if (!cancelled) setKitchenError(true); });
    return () => { cancelled = true; };
  }, []);

  const kitchenIds = useMemo(() => (kitchens ? new Set(kitchens.map((k) => String(k._id).toLowerCase())) : undefined), [kitchens]);
  const state = useMemo(() => sanitizeReportParams(search, { today, kitchenIds }), [search, today, kitchenIds]);

  // Replace an invalid or non-canonical URL with the safe one (no extra history entry).
  useEffect(() => {
    if (state.changed) setSearch(toSearchParams(state), { replace: true });
  }, [state, setSearch]);

  const apiQuery = useMemo(() => toApiQuery(state), [state]);
  const { status, report, error, reload } = useExecutiveReport(apiQuery);

  // Any filter change returns every list to page 1.
  const update = (patch) => setSearch(toSearchParams({ ...state, ...patch, pages: { health: 1, unpriced: 1, comparison: 1 } }));
  const setPage = (key, value) => setSearch(toSearchParams({ ...state, pages: { ...state.pages, [key]: value } }));

  const kitchenName = report?.meta?.kitchen?.name;
  return (
    <div className="exec-page">
      <PageHeader
        title="Executive Report"
        subtitle={report ? `${kitchenName} · ${report.meta.from} to ${report.meta.to} · Data updated at ${formatDateTime(report.meta.generatedAt)}` : "Loading…"}
        actions={<ExportButtons apiQuery={apiQuery} disabled={!report} />}
      />
      <ReportFilters
        state={state}
        kitchens={kitchens || []}
        today={today}
        onChange={update}
        onReset={() => setSearch(new URLSearchParams())}
        canReset={!isDefault(state)}
        disabled={false}
      />
      {state.kitchenReset && <Banner variant="warn">The selected kitchen no longer exists, so the report shows all kitchens.</Banner>}
      {kitchenError && <Banner variant="warn">The kitchen list could not be loaded. You can still view all kitchens.</Banner>}
      {status === "error" && error?.code === "KITCHEN_NOT_FOUND" && (
        <Banner variant="warn">That kitchen was removed. Choose another kitchen or reset the filters.</Banner>
      )}
      {!report && status === "loading" && <LoadingState label="Building the report…" />}
      {!report && status === "error" && <ErrorState message={error?.message || "The report could not be loaded."} onRetry={reload} />}
      {report && (
        <div aria-busy={status === "loading"} className={status === "loading" ? "exec-stale" : undefined}>
          {status === "error" && <Banner variant="alert">Refreshing failed: {error?.message}. Showing the previous result.</Banner>}
          <ReportBody report={report} onSelectKitchen={(id) => update({ godownId: id })} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
```

Create a temporary `admin-web/src/pages/executive/ReportBody.jsx` (replaced in Task 26):

```jsx
export function ReportBody({ report }) {
  return <pre className="exec-debug">{JSON.stringify(report.kpis, null, 2)}</pre>;
}
```

and a temporary `admin-web/src/pages/executive/ExportButtons.jsx` (replaced in Task 27):

```jsx
export function ExportButtons() {
  return null;
}
```

`admin-web/src/pages/executive/executive.css` (base layout; Task 26 adds section styles):

```css
.exec-page { display: flex; flex-direction: column; gap: 12px; }
.exec-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.exec-filters__kitchen select { min-width: 220px; max-width: 100%; }
.exec-filters__range { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.exec-filters__dates { display: flex; gap: 8px; flex-wrap: wrap; }
.exec-chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--ink-soft); font: inherit; font-size: 13px; cursor: pointer; }
.exec-chip--on { background: var(--teal-600); border-color: var(--teal-600); color: var(--white); }
.exec-chip:focus-visible { outline: 2px solid var(--teal-600); outline-offset: 2px; }
.exec-stale { opacity: 0.6; transition: opacity 120ms; }
.exec-debug { font-size: 12px; white-space: pre-wrap; }
@media (max-width: 640px) { .exec-filters__kitchen, .exec-filters__kitchen select { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .exec-stale { transition: none; } }
```

- [ ] **Step 8: Verify**

Run: `npm --prefix admin-web test && npm --prefix admin-web run lint && npm --prefix admin-web run build` → PASS.

Manual (super-admin): `/executive-report` loads KPIs JSON; switching kitchens updates the URL (`?godownId=…`) and data; `?range=custom&from=2026-13-01` is replaced by the default URL; a bookmarked `?godownId=<deleted id>` shows the "no longer exists" banner and all kitchens; Reset clears the URL; rapidly switching kitchens never ends on the wrong kitchen's numbers (check `meta.kitchen.name` against the selector).

- [ ] **Step 9: Commit**

```bash
git add admin-web/src/pages/ExecutiveReportPage.jsx admin-web/src/pages/executive
git commit -m "feat(admin-web): executive report shell with safe URL filters and stale-response guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Report sections (KPIs, chart, lists, comparison)

**Files:**
- Create: `admin-web/src/pages/executive/{Section.jsx,InfoTip.jsx,KpiGrid.jsx,TrendChart.jsx,TopItems.jsx,StockHealth.jsx,UnpricedStock.jsx,Procurement.jsx,RequestsTransfers.jsx,KitchenComparison.jsx,Pager.jsx}`
- Create: `admin-web/src/pages/executive/chartScale.js`, `admin-web/src/pages/executive/chartScale.test.js`
- Modify (replace temporary): `admin-web/src/pages/executive/ReportBody.jsx`
- Modify: `admin-web/src/pages/executive/executive.css` (append)

**Interfaces:**
- Consumes: report shape from Task 22; `format.js` (Task 25); `Badge`, `Banner`, `Card`, `DataTable`, `EmptyState`, `Button` from UI primitives.
- Produces: `ReportBody({ report, onSelectKitchen(id), onPage(key, page) })`; `chartScale.niceMax(n) → number`, `chartScale.linePath(points, { width, height, max, min }) → string`.

- [ ] **Step 1: Load the `dataviz` skill**, then write the failing chart-scale test:

`admin-web/src/pages/executive/chartScale.test.js`:

```js
import { describe, expect, it } from "vitest";
import { linePath, niceMax, niceMin } from "./chartScale.js";

describe("chart scale", () => {
  it("rounds the axis maximum up to a readable number", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(87)).toBe(100);
    expect(niceMax(1234)).toBe(1500);
    expect(niceMax(227.25)).toBe(250);
  });
  it("only goes below zero when data does", () => {
    expect(niceMin(5)).toBe(0);
    expect(niceMin(-10)).toBe(-20);
  });
  it("draws a path across the full width", () => {
    const d = linePath([{ value: 0 }, { value: 10 }], { width: 100, height: 50, max: 10, min: 0 });
    expect(d).toBe("M0,50 L100,0");
    expect(linePath([{ value: 5 }], { width: 100, height: 50, max: 10, min: 0 })).toBe("M50,25");
  });
});
```

Run: FAIL.

- [ ] **Step 2: `chartScale.js`**

```js
const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export const niceMax = (value) => {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = STEPS.find((s) => s * magnitude >= value);
  return step * magnitude;
};

export const niceMin = (value) => (value >= 0 ? 0 : -niceMax(-value));

export const linePath = (points, { width, height, max, min }) => {
  if (!points.length) return "";
  const range = max - min || 1;
  const y = (v) => Math.round((height - ((v - min) / range) * height) * 100) / 100;
  if (points.length === 1) return `M${width / 2},${y(points[0].value)}`;
  const x = (i) => Math.round(((i / (points.length - 1)) * width) * 100) / 100;
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
};
```

Run: PASS.

- [ ] **Step 3: Building blocks**

`Section.jsx`:

```jsx
import { Card, EmptyState } from "../../components/ui/index.jsx";

/** Per-section frame: title, optional note, error and empty states handled here once. */
export function Section({ title, note, section, isEmpty, emptyText, children, actions }) {
  return (
    <Card className="exec-section">
      <header className="exec-section__head">
        <h2 className="exec-section__title">{title}</h2>
        {actions}
      </header>
      {note && <p className="exec-section__note">{note}</p>}
      {section?.status === "error" ? (
        <EmptyState title="This section could not be loaded.">The rest of the report is unaffected. Try refreshing in a moment.</EmptyState>
      ) : isEmpty ? (
        <EmptyState title="Nothing to show">{emptyText}</EmptyState>
      ) : children}
    </Card>
  );
}
```

`InfoTip.jsx`:

```jsx
import { useId, useState } from "react";
import { Info } from "lucide-react";

export function InfoTip({ label, text }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="exec-tip">
      <button
        type="button"
        className="exec-tip__btn"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && <span role="tooltip" id={id} className="exec-tip__body">{text}</span>}
    </span>
  );
}
```

`Pager.jsx`:

```jsx
import { Button } from "../../components/ui/index.jsx";

export function Pager({ page, pages, total, onPage, label }) {
  if (pages <= 1) return <p className="exec-count">{total} {label}</p>;
  return (
    <nav className="pager" aria-label={`${label} pages`}>
      <span className="exec-count">{total} {label}</span>
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page} of {pages}</span>
      <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}
```

- [ ] **Step 4: KPI grid with estimate and missing-data indicators**

`KpiGrid.jsx`:

```jsx
import { Badge } from "../../components/ui/index.jsx";
import { InfoTip } from "./InfoTip.jsx";
import { formatCount, formatDays, formatMoney, formatPct, formatQty } from "./format.js";

const valueText = (kpi) => (kpi.format === "money" ? formatMoney(kpi.value) : formatCount(kpi.value));

const detailLine = (kpi) => {
  const d = kpi.details || {};
  switch (kpi.id) {
    case "stockValue":
      return d.unpricedItemCount ? `${formatCount(d.unpricedItemCount)} items without a price (${formatQty(d.unpricedQty)} base units) excluded` : "All stocked items priced";
    case "consumptionValue":
      return [
        d.deltaPct === null ? "No previous-period value to compare" : `${formatPct(d.deltaPct)} vs previous period (${formatMoney(d.previousValue)})`,
        d.unvaluedLineCount ? `${formatCount(d.unvaluedLineCount)} unvalued lines not included` : null
      ].filter(Boolean).join(" · ");
    case "pendingRequests":
    case "openTransfers":
      return d.oldestAgeDays === null || d.oldestAgeDays === undefined ? "None waiting" : `Oldest waiting ${formatDays(d.oldestAgeDays)}`;
    case "stockReceivedValue":
      return d.unpricedAllocationCount ? `${formatCount(d.unpricedAllocationCount)} unpriced allocations excluded` : `${formatCount(d.distributionCount)} distributions`;
    case "procurementSpend":
      return `${formatCount(d.poCount)} purchase orders`;
    case "poAwaitingDistribution":
      return `${formatMoney(d.value)} awaiting distribution`;
    default:
      return null;
  }
};

const hasMissingData = (kpi) =>
  (kpi.id === "stockValue" && kpi.details?.unpricedItemCount > 0) ||
  (kpi.id === "consumptionValue" && kpi.details?.unvaluedLineCount > 0) ||
  (kpi.id === "stockReceivedValue" && kpi.details?.unpricedAllocationCount > 0);

export function KpiGrid({ kpis, definitions }) {
  const textFor = (id) => definitions.find((d) => d.id === id)?.text || "";
  return (
    <ul className="exec-kpis" aria-label="Key figures">
      {kpis.map((kpi) => (
        <li key={kpi.id} className="exec-kpi">
          <div className="exec-kpi__label">
            {kpi.label}
            <InfoTip label={kpi.label} text={textFor(kpi.id)} />
          </div>
          {kpi.status === "error" ? (
            <p className="exec-kpi__value exec-kpi__value--na">Not available</p>
          ) : (
            <p className="exec-kpi__value">{valueText(kpi)}</p>
          )}
          <div className="exec-kpi__tags">
            <Badge variant="neutral">{kpi.kind === "snapshot" ? "Current" : "In period"}</Badge>
            {kpi.estimated && <Badge variant="info">Estimated</Badge>}
            {hasMissingData(kpi) && <Badge variant="warn">Missing prices</Badge>}
          </div>
          {kpi.status === "ok" && <p className="exec-kpi__detail">{detailLine(kpi)}</p>}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Trend chart (inline SVG + accessible table)**

`TrendChart.jsx`:

```jsx
import { linePath, niceMax, niceMin } from "./chartScale.js";
import { formatMoney, formatPct } from "./format.js";

const W = 640;
const H = 180;

export function TrendChart({ data }) {
  const values = data.points.map((p) => p.value);
  const max = niceMax(Math.max(0, ...values));
  const min = niceMin(Math.min(0, ...values));
  const zeroY = H - ((0 - min) / (max - min)) * H;
  const unvalued = data.points.reduce((s, p) => s + p.unvaluedLines, 0);
  return (
    <figure className="exec-chart">
      <figcaption className="exec-chart__caption">
        Total {formatMoney(data.total)}{data.deltaPct !== null && ` · ${formatPct(data.deltaPct)} vs previous period`}
        {unvalued > 0 && ` · ${unvalued} unvalued lines not plotted`}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="exec-chart__svg" role="img"
        aria-label={`Daily consumption value from ${data.points[0]?.date} to ${data.points.at(-1)?.date}`}>
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} className="exec-chart__axis" />
        <path d={linePath(data.points, { width: W, height: H, max, min })} className="exec-chart__line" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="exec-chart__scale" aria-hidden="true">
        <span>{formatMoney(max)}</span><span>{data.points[0]?.date}</span><span>{data.points.at(-1)?.date}</span>
      </div>
      <details className="exec-chart__table">
        <summary>Show the daily values</summary>
        <table className="table">
          <thead><tr><th scope="col">Date</th><th scope="col">Value</th><th scope="col">Unvalued lines</th></tr></thead>
          <tbody>{data.points.map((p) => <tr key={p.date}><td>{p.date}</td><td>{formatMoney(p.value)}</td><td>{p.unvaluedLines}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
```

- [ ] **Step 6: Lists and tables**

`TopItems.jsx`:

```jsx
import { DataTable } from "../../components/ui/index.jsx";
import { formatMoney, formatQty } from "./format.js";

export function TopItems({ data }) {
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col" className="num">Value</th><th scope="col" className="num">Quantity</th></tr></thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.stockItemId}>
              <td>{i.rank}</td>
              <td>{i.name}{i.unvaluedLines > 0 && <small className="exec-muted"> · {i.unvaluedLines} unvalued</small>}</td>
              <td className="num">{formatMoney(i.value)}</td>
              <td className="num">{formatQty(i.qty)} {i.unit}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {data.tiedBeyondLimit > 0 && <p className="exec-section__note">{data.tiedBeyondLimit} more item(s) tie with #10 and are not shown.</p>}
    </>
  );
}
```

`StockHealth.jsx`:

```jsx
import { Badge, DataTable } from "../../components/ui/index.jsx";
import { formatQty } from "./format.js";
import { Pager } from "./Pager.jsx";

export function StockHealth({ data, onPage }) {
  return (
    <>
      <p className="exec-section__note">{data.outCount} out of stock · {data.lowCount} below threshold</p>
      <DataTable>
        <thead><tr><th scope="col">Status</th><th scope="col">Kitchen</th><th scope="col">Item</th><th scope="col" className="num">Quantity</th><th scope="col" className="num">Threshold</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td><Badge variant={r.state === "out" ? "alert" : "warn"}>{r.state === "out" ? "Out of stock" : "Low"}</Badge></td>
              <td>{r.kitchen}</td>
              <td>{r.item}</td>
              <td className="num">{formatQty(r.qty)} {r.unit}</td>
              <td className="num">{r.threshold ? `${formatQty(r.threshold)} ${r.unit}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="items" onPage={onPage} />
    </>
  );
}
```

`UnpricedStock.jsx`:

```jsx
import { DataTable } from "../../components/ui/index.jsx";
import { formatQty } from "./format.js";
import { Pager } from "./Pager.jsx";

export function UnpricedStock({ data, onPage }) {
  return (
    <>
      <DataTable>
        <thead><tr><th scope="col">Kitchen</th><th scope="col">Item</th><th scope="col" className="num">Quantity</th></tr></thead>
        <tbody>
          {data.rows.map((r) => <tr key={r.id}><td>{r.kitchen}</td><td>{r.item}</td><td className="num">{formatQty(r.qty)} {r.unit}</td></tr>)}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="unpriced items" onPage={onPage} />
    </>
  );
}
```

`Procurement.jsx`:

```jsx
import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatMoney } from "./format.js";

const label = (s) => s.replace(/_/g, " ");

const StatusTable = ({ caption, rows, withValue }) => (
  <DataTable>
    <caption className="exec-caption">{caption}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th>{withValue && <th scope="col" className="num">Value</th>}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.status}><td className="exec-status">{label(r.status)}</td><td className="num">{formatCount(r.count)}</td>{withValue && <td className="num">{formatMoney(r.value)}</td>}</tr>)}</tbody>
  </DataTable>
);

export function Procurement({ data }) {
  return (
    <div className="exec-split">
      <dl className="exec-facts">
        <div><dt>Stock received value</dt><dd>{formatMoney(data.stockReceived.value)}</dd></div>
        <div><dt>Distributions</dt><dd>{formatCount(data.stockReceived.distributionCount)}</dd></div>
        {data.scope === "all" && (
          <>
            <div><dt>Procurement spend</dt><dd>{formatMoney(data.spend.value)} ({formatCount(data.spend.poCount)} POs)</dd></div>
            <div><dt>Awaiting distribution</dt><dd>{formatCount(data.awaiting.count)} POs · {formatMoney(data.awaiting.value)}</dd></div>
          </>
        )}
      </dl>
      {data.scope === "all" && <StatusTable caption="Indents created in period" rows={data.indents} withValue />}
      <StatusTable caption="Supply requests created in period" rows={data.supplyRequests} />
    </div>
  );
}
```

`RequestsTransfers.jsx`:

```jsx
import { DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatDays } from "./format.js";

const Ageing = ({ title, ageing }) => (
  <DataTable>
    <caption className="exec-caption">{title} — oldest {formatDays(ageing.oldestAgeDays)}</caption>
    <thead><tr><th scope="col">Waiting</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{ageing.buckets.map((b) => <tr key={b.id}><td>{b.label}</td><td className="num">{formatCount(b.count)}</td></tr>)}</tbody>
  </DataTable>
);

const ByStatus = ({ title, rows }) => (
  <DataTable>
    <caption className="exec-caption">{title}</caption>
    <thead><tr><th scope="col">Status</th><th scope="col" className="num">Count</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.status}><td className="exec-status">{r.status}</td><td className="num">{formatCount(r.count)}</td></tr>)}</tbody>
  </DataTable>
);

export function RequestsTransfers({ data }) {
  const { requests, transfers } = data;
  return (
    <div className="exec-split">
      <ByStatus title="Requests created in period" rows={requests.byStatus} />
      <p className="exec-section__note">Approval rate: {requests.approvalRate === null ? "no decisions in period" : `${requests.approvalRate}%`}</p>
      <Ageing title="Pending requests (current)" ageing={requests.pendingAgeing} />
      <ByStatus title="Transfers created in period" rows={transfers.byStatus} />
      <Ageing title="Open transfers (current)" ageing={transfers.openAgeing} />
    </div>
  );
}
```

`KitchenComparison.jsx`:

```jsx
import { Badge, DataTable } from "../../components/ui/index.jsx";
import { formatCount, formatMoney } from "./format.js";
import { Pager } from "./Pager.jsx";

export function KitchenComparison({ data, onSelectKitchen, onPage }) {
  return (
    <>
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Kitchen</th><th scope="col" className="num">Consumption value</th><th scope="col" className="num">Unvalued lines</th>
            <th scope="col" className="num">Low / out (current)</th><th scope="col" className="num">Pending requests</th><th scope="col" className="num">Stock received</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.godownId}>
              <th scope="row">
                {r.deleted ? r.kitchen : (
                  <button type="button" className="exec-link" onClick={() => onSelectKitchen(r.godownId)}>{r.kitchen}</button>
                )}
                {!r.active && !r.deleted && <Badge variant="neutral">Inactive</Badge>}
              </th>
              <td className="num">{formatMoney(r.consumptionValue)}</td>
              <td className="num">{formatCount(r.unvaluedLines)}</td>
              <td className="num">{r.lowOrOutOfStock === null ? "—" : formatCount(r.lowOrOutOfStock)}</td>
              <td className="num">{formatCount(r.pendingRequests)}</td>
              <td className="num">{formatMoney(r.stockReceivedValue)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager page={data.page} pages={data.pages} total={data.total} label="kitchens" onPage={onPage} />
    </>
  );
}
```

- [ ] **Step 7: Assemble `ReportBody.jsx`**

```jsx
import { Banner } from "../../components/ui/index.jsx";
import { KpiGrid } from "./KpiGrid.jsx";
import { Section } from "./Section.jsx";
import { TrendChart } from "./TrendChart.jsx";
import { TopItems } from "./TopItems.jsx";
import { StockHealth } from "./StockHealth.jsx";
import { UnpricedStock } from "./UnpricedStock.jsx";
import { Procurement } from "./Procurement.jsx";
import { RequestsTransfers } from "./RequestsTransfers.jsx";
import { KitchenComparison } from "./KitchenComparison.jsx";

export function ReportBody({ report, onSelectKitchen, onPage }) {
  const { meta, kpis, sections: s } = report;
  const data = (section) => (section?.status === "ok" ? section.data : null);
  const trend = data(s.consumptionTrend);
  const top = data(s.topItems);
  const health = data(s.stockHealth);
  const unpriced = data(s.unpricedStock);
  return (
    <>
      <Banner variant="info">{meta.notes.historicalStock} Values marked “Estimated” use the latest known price.</Banner>
      <KpiGrid kpis={kpis} definitions={meta.definitions} />
      <div className="exec-grid">
        <Section title="Consumption trend" section={s.consumptionTrend}
          isEmpty={trend && trend.points.every((p) => p.value === 0 && p.unvaluedLines === 0)}
          emptyText="No consumption was recorded in this period.">
          {trend && <TrendChart data={trend} />}
        </Section>
        <Section title="Top consumed items" section={s.topItems} isEmpty={top && top.items.length === 0} emptyText="No consumption was recorded in this period.">
          {top && <TopItems data={top} />}
        </Section>
        <Section title="Stock health" note="Current stock, not as of the end of the period." section={s.stockHealth}
          isEmpty={health && health.total === 0} emptyText="Every item is above its threshold.">
          {health && <StockHealth data={health} onPage={(p) => onPage("health", p)} />}
        </Section>
        <Section title="Items without a price" note="Excluded from the estimated stock value." section={s.unpricedStock}
          isEmpty={unpriced && unpriced.total === 0} emptyText="Every stocked item has a price.">
          {unpriced && <UnpricedStock data={unpriced} onPage={(p) => onPage("unpriced", p)} />}
        </Section>
        <Section title="Procurement" section={s.procurement}>
          {data(s.procurement) && <Procurement data={data(s.procurement)} />}
        </Section>
        <Section title="Requests and transfers" section={s.requestsTransfers}>
          {data(s.requestsTransfers) && <RequestsTransfers data={data(s.requestsTransfers)} />}
        </Section>
        {s.kitchenComparison && (
          <Section title="Kitchen comparison" note="Select a kitchen to open its report." section={s.kitchenComparison}
            isEmpty={data(s.kitchenComparison)?.total === 0} emptyText="No kitchens have activity in this period.">
            {data(s.kitchenComparison) && <KitchenComparison data={data(s.kitchenComparison)} onSelectKitchen={onSelectKitchen} onPage={(p) => onPage("comparison", p)} />}
          </Section>
        )}
      </div>
    </>
  );
}
```

Append to `executive.css` (then refine colours per the `dataviz` skill using existing `theme.css` tokens only):

```css
.exec-kpis { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.exec-kpi { background: var(--surface, var(--white)); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.exec-kpi__label { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); }
.exec-kpi__value { font-size: 24px; font-weight: 650; font-variant-numeric: tabular-nums; color: var(--ink); }
.exec-kpi__value--na { font-size: 16px; color: var(--muted); }
.exec-kpi__tags { display: flex; gap: 4px; flex-wrap: wrap; }
.exec-kpi__detail { font-size: 12px; color: var(--ink-soft); }
.exec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 12px; }
.exec-section__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.exec-section__title { font-size: 16px; font-weight: 650; }
.exec-section__note { font-size: 12px; color: var(--muted); margin: 4px 0 8px; }
.exec-tip { position: relative; display: inline-flex; }
.exec-tip__btn { border: 0; background: none; padding: 2px; color: var(--muted); cursor: help; border-radius: 4px; }
.exec-tip__btn:focus-visible { outline: 2px solid var(--teal-600); }
.exec-tip__body { position: absolute; z-index: 20; top: 100%; left: 0; width: min(280px, 80vw); padding: 8px 10px; border-radius: var(--radius); background: var(--ink); color: var(--white); font-size: 12px; line-height: 1.4; }
.exec-chart__svg { width: 100%; height: 180px; display: block; }
.exec-chart__line { stroke: var(--teal-600); stroke-width: 2; }
.exec-chart__axis { stroke: var(--border); stroke-width: 1; }
.exec-chart__scale { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); }
.exec-chart__caption { font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; }
.exec-chart__table { margin-top: 8px; font-size: 13px; }
.exec-split { display: flex; flex-direction: column; gap: 10px; }
.exec-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 0; }
.exec-facts dt { font-size: 12px; color: var(--muted); }
.exec-facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.exec-caption { text-align: left; font-size: 13px; font-weight: 600; padding: 4px 0; }
.exec-status { text-transform: capitalize; }
.exec-link { border: 0; background: none; padding: 0; color: var(--teal-700); text-decoration: underline; cursor: pointer; font: inherit; text-align: left; }
.exec-muted, .exec-count { color: var(--muted); font-size: 12px; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
```

Delete the `.exec-debug` rule.

- [ ] **Step 8: Verify**

Run: `npm --prefix admin-web test && npm --prefix admin-web run lint && npm --prefix admin-web run build` → PASS.

Manual (dev seed data):
- All KPIs render; "Estimated" badge on stock value; "Missing prices" appears when unpriced/unvalued counts > 0; hovering/focusing ⓘ shows the definition; keyboard Tab reaches every ⓘ.
- Stock health and unpriced lists page through; URL gains `healthPage=2`; changing kitchen resets pages.
- Clicking a kitchen in the comparison opens that kitchen's report; inactive kitchens show the badge; deleted kitchens are not clickable.
- Stop MongoDB mid-session and change a filter: the previous report stays with an error banner.
- Resize to 360 px wide: no horizontal page scroll (tables scroll inside `.table-wrap`).

- [ ] **Step 9: Commit**

```bash
git add admin-web/src/pages/executive
git commit -m "feat(admin-web): executive report sections with definitions, estimates and paging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27: Export button

**Files:**
- Modify (replace temporary): `admin-web/src/pages/executive/ExportButtons.jsx`
- Create: `admin-web/src/pages/executive/download.js`, `admin-web/src/pages/executive/download.test.js`

**Interfaces:**
- Consumes: `GET /api/executive/export.xlsx` (Task 24); `filenameFromDisposition` (Task 25).
- Produces: `readBlobError(error) → Promise<{ code, message } | null>`; `ExportButtons({ apiQuery, disabled })` (Phase 6 Task 32 adds a PDF button here by extending `FORMATS`).

- [ ] **Step 1: Failing test**

`admin-web/src/pages/executive/download.test.js`:

```js
import { describe, expect, it } from "vitest";
import { readBlobError } from "./download.js";

describe("readBlobError", () => {
  it("parses JSON error bodies returned as blobs", async () => {
    const data = new Blob([JSON.stringify({ code: "EXPORT_TIMEOUT", message: "Too long" })], { type: "application/json" });
    expect(await readBlobError({ response: { data } })).toEqual({ code: "EXPORT_TIMEOUT", message: "Too long" });
  });
  it("returns null for non-JSON or missing bodies", async () => {
    expect(await readBlobError({ response: { data: new Blob(["<html>"], { type: "text/html" }) } })).toBe(null);
    expect(await readBlobError({})).toBe(null);
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement**

`download.js`:

```js
/** With responseType "blob", error bodies arrive as Blobs; read them back as JSON. */
export const readBlobError = async (error) => {
  const data = error?.response?.data;
  if (!(data instanceof Blob) || !data.type.includes("json")) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
};

export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
```

`ExportButtons.jsx`:

```jsx
import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "../../api.js";
import { Button } from "../../components/ui/index.jsx";
import { useToast } from "../../useToast.js";
import { filenameFromDisposition } from "./format.js";
import { readBlobError, saveBlob } from "./download.js";

export const FORMATS = [{ id: "xlsx", label: "Excel", path: "/executive/export.xlsx" }];

export function ExportButtons({ apiQuery, disabled }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);

  const run = async (format) => {
    setBusy(format.id);
    try {
      const { godownId, from, to } = apiQuery;
      const res = await api.get(format.path, { params: { godownId, from, to }, responseType: "blob", timeout: 45_000 });
      saveBlob(res.data, filenameFromDisposition(res.headers["content-disposition"]) || `executive-report.${format.id}`);
    } catch (error) {
      const body = await readBlobError(error);
      showToast(body?.message || "The export could not be created. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  return FORMATS.map((format) => (
    <Button key={format.id} variant="ghost" disabled={disabled || busy !== null} onClick={() => run(format)} aria-busy={busy === format.id}>
      <Download size={15} aria-hidden="true" /> {busy === format.id ? "Preparing…" : `Export ${format.label}`}
    </Button>
  ));
}
```

Vitest runs in Node, which has a global `Blob` — the test needs no DOM.

- [ ] **Step 3: Verify**

Run: `npm --prefix admin-web test && npm --prefix admin-web run lint && npm --prefix admin-web run build` → PASS.

Manual: Export Excel for "All kitchens · 30 days" → file named `MKM-Executive-Report_All-Kitchens_<from>_to_<to>_generated-…-IST.xlsx`; open it: the Summary KPI values equal the KPI tiles on screen to the paisa; Stock health sheet row count equals the on-screen total (or shows the "Showing 5,000 of N" note). Choose a single kitchen → comparison sheet says "Not applicable".

- [ ] **Step 4: Commit**

```bash
git add admin-web/src/pages/executive/ExportButtons.jsx admin-web/src/pages/executive/download.js admin-web/src/pages/executive/download.test.js
git commit -m "feat(admin-web): download the executive report as Excel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
