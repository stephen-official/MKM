# Super-Admin Role, Feature Visibility & Executive Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `super_admin` role that inherits every admin capability, can switch admin-console (and, later, per-kitchen / per-user) features on and off with full audit history, and owns a kitchen-filterable Executive Report with Excel/PDF export, scheduled email delivery and user management.

**Architecture:** Backend (Express + Mongoose, `backend/src`) gains a role-helper module, a single declarative feature registry that maps every HTTP route to a feature (enforced by one `featureGate` middleware on every authenticated mount), a feature-flag service with optimistic concurrency and an append-only audit collection, and an `executive/` service that computes every report section from one parameter object so the JSON API, Excel and PDF exports share the same numbers. Admin-web (React 18 + Vite) gains role helpers, a feature-flags context that filters navigation and routes, and super-admin pages (Executive Report, Feature Visibility, Users, Report Schedules). Client-web only learns to respect per-kitchen feature overrides.

**Tech Stack:** Node 26 (ESM), Express 4, Mongoose 8, MongoDB (replica set — the app already uses transactions), node:test, supertest, mongodb-memory-server, exceljs, pdfkit, socket.io 4; React 18, react-router 6, Vite 5, vitest, lucide-react.

**Spec:** None — your human partner chose to skip the written spec. This README is the design of record: the **Decisions** sections below replace the spec, and every task argues from them. Executors read this README before any phase file.

---

## How this plan is organised

| File | Contents | Tasks |
|---|---|---|
| `README.md` (this file) | Global constraints, review focus, decisions (roles, flags, route mapping, metric definitions, valuation, export, performance), file map | — |
| `phase-0-foundations.md` | Make the backend testable (realtime module, DB test harness) | 1 |
| `phase-1-super-admin-role.md` | Role helpers, every direct role branch, auth flows, CLI, admin-web gate | 2–7 |
| `phase-2-feature-flags-backend.md` | Registry, route-coverage test, models, service, gate, API | 8–12 |
| `phase-3-feature-flags-ui.md` | Flags context, nav/route filtering, Feature Visibility page | 13–15 |
| `phase-4a-executive-data.md` | Params/TZ, definitions, valuation, `amountAtIssue`, consumption/stock/procurement/request sections | 16–21 |
| `phase-4b-executive-api.md` | Kitchen comparison, report assembly + API, indexes + performance, Excel export | 22–24 |
| `phase-5-executive-ui.md` | Report page, sections, export button | 25–27 |
| `phase-6-extended-scope.md` | Per-kitchen & per-user overrides (+ client-web), user management, PDF export, scheduled email reports | 28–34 |
| `phase-7-verification.md` | Full check, manual run-through, docs | 35 |

Phases 0–5 are the core feature and ship on their own. Phase 6 is the formerly out-of-scope work your human partner asked to include; each of its tasks can be cut independently without breaking phases 0–5.

## Global Constraints

- Role string values: `"super_admin"`, `"admin"`, `"user"` — exactly these, everywhere (DB enum, JWT, localStorage, tests).
- `super_admin` must pass every check that `admin` passes. No code path may compare `role === "admin"` / `role !== "admin"` directly after Phase 1; use `isAdminRole(role)` / `isSuperAdmin(role)`.
- Public `POST /api/auth/register` rejects `role` values `admin` and `super_admin` with **403**; any other non-`user` value with **400**.
- No production credentials committed. The super-admin CLI reads `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_PASSWORD` from the environment and has no defaults. Dev-only credentials are allowed only in `seed-dev.js` (which already refuses non-local databases).
- New error responses use `{ code, message, ...details }` with `code` in SCREAMING_SNAKE_CASE. Disabled feature payload is exactly `{ code: "FEATURE_DISABLED", feature: "<key>", message: "This feature is currently disabled." }` with HTTP **403**.
- Business timezone: `Asia/Kolkata` (env `BUSINESS_TZ` overrides). Currency: `INR`, displayed `₹` with `en-IN` grouping.
- Money rounding: round half away from zero to 2 decimals **once, at the end**; totals are computed from unrounded values, never by summing rounded values.
- Date-range parameters are business dates `YYYY-MM-DD`, inclusive on both ends; maximum span 366 days; `to` may not be after today (business TZ).
- All calculated stock values are labelled "Estimated" in API (`estimated: true`), UI, Excel and PDF.
- Frontend never computes report money totals; it formats numbers it receives from the API.
- Backend tests: `node:test` + `node:assert/strict` (existing convention), files `backend/src/tests/*.test.js`, helpers in `backend/src/tests/helpers/` (not matched by the test glob).
- Admin-web tests: `vitest`, files `admin-web/src/**/*.test.js(x)`, pure logic only (no DOM rendering library is added).
- Commit after every task with a Conventional Commit message ending with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Work happens on a feature branch (`feat/super-admin-executive-report`), never on `main`. The working tree currently has many uncommitted changes — the executor must ask your human partner how to handle them before branching (commit them first, or branch with them).

## Review Focus

Failure modes the decisions imply but that are easy to miss; each has a pinned test in the owning task.

1. **Consumption recorded before this change has no `amountAtIssue`.** The report must show "₹X valued + N unvalued lines", never a misleading ₹0. → Task 19 test `all kitchens: value from amountAtIssue, returns net off, unvalued lines counted not priced`; Task 26 `KpiGrid` shows the "Missing prices" badge and the unvalued-lines detail.
2. **Consumptions created by request approval store a non-ISO `date`** (a `Date` cast to string, or a free-form `targetDate`). They must fall back to the business date of `createdAt`, not disappear. → Task 19 test `non-ISO consumption dates fall back to createdAt business date`.
3. **The operations router is mounted twice (`/api` and `/api/operations`).** A disabled feature must be blocked on both prefixes. → Task 11 test `alias prefix is gated identically`.
4. **A super-admin who is deactivated or demoted mid-session** must lose access on the very next request (authenticate re-reads the DB) and must not keep receiving `admins` socket events after reconnect. → Task 3 test `demoted super-admin is forbidden on next request`; Task 4 test for `roomsFor`.
5. **Fast filter changes on the report page** must never let an older response overwrite a newer one. → Task 25 test `stale responses are ignored`.

---

## Decision 1 — Roles

| Role | Console | Capabilities |
|---|---|---|
| `super_admin` | admin-web | Everything `admin` can do, never feature-gated, plus Executive Report, Feature Visibility, Users, Report Schedules |
| `admin` | admin-web | Existing behaviour; subject to admin-audience feature flags (+ per-user overrides in Phase 6) |
| `user` (kitchen) | client-web | Existing behaviour; subject only to per-kitchen and per-user overrides (Phase 6); global flags never affect kitchens |

- `authorize([... "admin" ...])` automatically admits `super_admin` (expansion inside `authorize`), so existing route declarations stay correct. `authorize(["super_admin"])` admits only super-admins.
- Every direct branch found in the audit (below) is rewritten with helpers. Complete list as of commit `946682b`:

| File:line | Current | Becomes |
|---|---|---|
| `backend/src/server.js:50` | `user.role === "admin"` → join `admins` | `roomsFor(user)` from `realtime.js` (`isAdminRole`) |
| `backend/src/routes/operationsRoutes.js:76` | `role === "user" ? own : body` | `isKitchenRole(role)` (unchanged semantics) |
| `backend/src/routes/operationsRoutes.js:817` | `role === "admin" ? {} : own` | `isAdminRole(role)` |
| `backend/src/routes/operationsRoutes.js:1054` | `role === "user"` filter | `isKitchenRole(role)` |
| `backend/src/routes/operationsRoutes.js:1090` | `role === "admin" ? fromGodownId : own` | `isAdminRole(role)` |
| `backend/src/routes/operationsRoutes.js:1168` | `role === "user"` filter | `isKitchenRole(role)` |
| `backend/src/routes/operationsRoutes.js:1208` | `role === "admin" ? {} : own` | `isAdminRole(role)` |
| `backend/src/routes/indentRequestRoutes.js:114,194,195` | `role === "user"` | `isKitchenRole(role)` |
| `backend/src/routes/authRoutes.js:20-21` | rejects `admin` only | rejects `PRIVILEGED_ROLES` |
| `backend/src/models/User.js:8` | enum `admin,user` | enum `super_admin,admin,user` |
| `admin-web/src/App.jsx:82` | `role !== "admin"` | `!isAdminRole(role)` |
| `admin-web/src/pages/AuthPage.jsx:53` | `data.role !== "admin"` | `!isAdminRole(data.role)` |
| `client-web/src/pages/Login.jsx` | stores any role | unchanged — client-web has no role branches, so a super-admin behaves there exactly as an admin does today (verified in Task 7) |

Task 3 adds a guard test that greps the source tree and fails if `role === "admin"`, `role !== "admin"`, `role == "admin"` or `role != "admin"` reappears outside `utils/roles.js` / `src/roles.js`.

## Decision 2 — Feature flags

**Keys (exact):** `inventory`, `indent`, `purchase-orders`, `stock-distribution`, `godowns`, `transfer-stock`, `requests`, `consumption`, `reports`, `product-ledger`. Unknown keys are rejected with 400 `UNKNOWN_FEATURE_KEY`. Super-admin pages (`executive-report`, `feature-visibility`, `users`, `report-schedules`) are not flags and cannot be disabled.

**Audiences:** each key declares `audiences`: admin-only keys are `["admin"]`; `indent`, `transfer-stock`, `requests`, `consumption` are `["admin","kitchen"]` (kitchen side only becomes switchable in Phase 6).

**Effective flags for a request:**
- `super_admin` → no gating.
- `admin` → defaults ⊕ global document ⊕ that user's override (Phase 6).
- `user` → defaults ⊕ that kitchen's override ⊕ that user's override (Phase 6). Before Phase 6 kitchen users are never gated.
- Default for every key: `true` (enabled).

**Storage:** collection `featureflags`, single document `_id: "global"` (string `_id` makes the singleton unique by construction), fields `flags: Map<string, boolean>`, `version: Number`, `updatedAt`. Phase 6 stores overrides in the same collection with `_id: "kitchen:<godownId>"` / `"user:<userId>"`, plus `scope` and `targetId`; an override's `flags` hold only explicit values (missing = inherit).

**Writes:** `PUT /api/features` body `{ expectedVersion: number, changes: { [key]: boolean } }`.
- Validates keys and boolean values; drops keys whose value would not change; if nothing changes → 200 with current state, no audit row, version unchanged.
- In one transaction: `findOneAndUpdate({ _id: "global", version: expectedVersion }, { $set: { "flags.<k>": v, ... }, $inc: { version: 1 } }, { upsert: expectedVersion === 0, returnDocument: "before" })` + insert audit row. Only the submitted keys are touched.
- Version mismatch (no match, or duplicate-key on upsert because the doc exists) → 409 `{ code: "VERSION_CONFLICT", currentVersion, message }`.

**Missing document:** read returns defaults with `version: 0`; first write must send `expectedVersion: 0`.

**Database unavailable:** the service caches the last successfully loaded document per process. Reads go to cache if younger than 5 s; otherwise reload. If a reload fails and the cached copy is younger than 5 minutes, it is used and a warning logged. If it fails and there is no usable copy, gated routes respond 503 `{ code: "FEATURE_FLAGS_UNAVAILABLE", message: "Feature settings are temporarily unavailable." }` (fail closed). Ungated routes and super-admins are unaffected. `GET /api/features` responds 503 with the same payload.

**When changes take effect:**
- Server, same process: immediately (write invalidates the cache).
- Server, other processes: within 5 seconds (cache TTL).
- Admin-web: on next refetch — app load, window focus, every 60 s while the tab is visible, and immediately after any `FEATURE_DISABLED` response (the app then refetches and redirects away from the disabled page). No page refresh needed.
- Client-web (Phase 6): same rules.

**Audit (append-only):** collection `featureflagaudits`, one document per effective write: `{ actorId, actorName, actorEmail, at, scope: "global"|"kitchen"|"user", targetId|null, versionBefore, versionAfter, changes: [{ key, previous, next }] }`. `previous` is the effective stored value before the write (default `true` when absent). Model hooks throw on every update/delete/replace operation; there is no API to modify it. Listed via `GET /api/features/audit?page=` (25 per page, sorted `at` desc, `_id` desc).

## Decision 3 — Feature → route mapping

Canonical paths are written with the `/api` prefix. Any path beginning `/api/operations/` is normalised to `/api/` before matching (same router, second mount). The registry in `backend/src/features/registry.js` is the single source of truth; the route-coverage test (Task 9) fails if any Express route is not classified.

**Rule semantics:** a route rule lists `features: [...]` and is allowed when **any** listed feature is enabled for the caller (this is how dependencies are expressed). `lookup` and `open` routes are never gated (`lookup` = shared reference data other modules depend on; `open` = auth, self-service, notifications, super-admin APIs).

| Feature | Nav item → frontend route | Read endpoints | Mutation endpoints | Kitchen-side endpoints (gated only by kitchen/user overrides, Phase 6) | Depends on / shared |
|---|---|---|---|---|---|
| `inventory` | Inventory Info → `/inventory-info` | `GET /api/inventory/:type/export/excel` | `POST /api/inventory/stock-items/upload-image`, `POST /api/inventory/:type`, `PUT /api/inventory/:type/:id`, `DELETE /api/inventory/:type/:id` | — | Lists `GET /api/inventory/{stock-items,godowns,stock-groups,units}` stay **lookup** (used by Indent, POs, Distribution, Transfers, Godowns, Consumption, kitchen app) |
| `indent` | Indent → `/indent` | `GET /api/indent-requests`, `GET /api/procurement/indents`, `GET /api/procurement/indents/:id/preview` | `POST /api/procurement/indents`, `POST /api/procurement/indents/:id/mark-purchased`, `PATCH /api/indent-requests/:id/confirm`, `PATCH /api/indent-requests/:id/select-item`, `PATCH /api/indent-requests/:id/reject` | `GET /api/indent-requests/me`, `POST /api/indent-requests`, `PUT /api/indent-requests/:id`, `DELETE /api/indent-requests/:id`, `POST /api/indent-requests/:id/receive` | uses lookups |
| `purchase-orders` | Purchase Orders → `/purchase-orders` | `GET /api/procurement/purchase-orders/purchased-indents` | `POST /api/procurement/purchase-orders` | — | `GET /api/procurement/purchase-orders` allowed if **purchase-orders OR stock-distribution** |
| `stock-distribution` | Stock Distribution → `/stock-distribution` | `GET /api/procurement/distributions/logs`, `GET /api/procurement/distributions/:id/details`, `GET /api/procurement/distributions/leftovers` | `POST /api/procurement/distributions` | — | needs PO list (shared rule above) + lookups |
| `godowns` | Godowns → `/godowns` | `GET /api/procurement/godown-stocks`, `GET /api/procurement/godown-stocks/:godownId` | `POST /api/procurement/godown-stocks/:id/threshold`, `DELETE /api/procurement/godown-stocks/:id` | — | `GET /api/godown-stocks` is **lookup** (Godowns + Transfer pages + kitchen app) |
| `transfer-stock` | Transfer Stock → `/transfer-stock` | `GET /api/transfers` | `POST /api/transfers` | `GET /api/transfers`, `POST /api/transfers`, `GET /api/user-transfers/incoming`, `GET /api/user-transfers/history`, `POST /api/user-transfers`, `POST /api/user-transfers/:id/accept`, `POST /api/user-transfers/:id/reject` | lookups |
| `requests` | Requests → `/requests` | `GET /api/requests` | `POST /api/requests/:id/approve`, `POST /api/requests/:id/reject` | `GET /api/requests`, `POST /api/requests` | — |
| `consumption` | Consumption → `/consumption` | `GET /api/consumptions`, `GET /api/daily-usage` | `PATCH /api/consumptions/:id`, `DELETE /api/consumptions/:id`, `PATCH /api/daily-usage/:id`, `DELETE /api/daily-usage/:id`, `POST /api/orders`, `POST /api/consumptions` | `GET /api/consumptions/me`, `GET /api/daily-usage/me`, `POST /api/orders`, `POST /api/consumptions`, `POST /api/daily-usage` | lookups |
| `reports` | Reports → `/reports` | `GET /api/reports/:entity`, `GET /api/reports/:entity/export/excel`, `GET /api/reports/:entity/export/excel/:id` | — | — | — |
| `product-ledger` | Product Ledger → `/product-ledger` | `GET /api/product-ledger/godowns`, `GET /api/product-ledger/products`, `GET /api/product-ledger/:productId`, `GET /api/product-ledger/:productId/export/excel` | — | — | — |

**Lookup (never gated):** `GET /api/inventory/:type` (all four types), `GET /api/godown-stocks`.
**Open (never gated):** `GET /api/health`, everything under `/api/auth/*`, `GET /api/my-kitchen-stock`, `GET /api/procurement/stock-balance`, `GET /api/procurement/my-stock`, `GET /api/notifications`, `/api/features*`, `/api/executive/*`, `/api/users*`, `/api/report-schedules*` (the last four are super-admin-only by `authorize`).

Note: the Consumption page also calls `/api/daily-usage/:id` routes that live in `operationsRoutes` (mounted at `/api` before `dailyUsageRoutes`) — same feature, so mount order does not matter for gating.

## Decision 4 — Executive Report metric definitions

All definitions live in code in `backend/src/executive/definitions.js` and are served with every response (`meta.definitions`), shown as UI tooltips and written to the export's "Definitions" sheet. Text below is normative.

**Common rules**
- **Scope `godownId`:** `"all"` or the id of an existing kitchen (active or inactive). Unknown/deleted id → 404 `KITCHEN_NOT_FOUND`; malformed → 400 `INVALID_KITCHEN`.
- **Period metrics** use the inclusive business-date range `[from, to]`, converted to the UTC half-open instant window `[start(from), start(to + 1 day))` in `BUSINESS_TZ`.
- **Snapshot metrics** describe "now" regardless of range and are labelled "Current".
- **Inactive kitchens:** included in every period metric (history is history) and selectable in the kitchen selector under an "Inactive" group. Snapshot stock metrics for "All kitchens" include **active kitchens only**.
- **Deleted kitchens** (records referencing a godown id that no longer exists): included in "All kitchens" period totals and shown in the comparison table as `Deleted kitchen (…<last 6 chars of id>)`; not selectable.
- **Rejected records** contribute 0 to every value metric and are only counted in status breakdowns. This project has no "cancelled" status; hard-deleted records (e.g. deleted indent requests) cannot be reported and are not.
- **Default range:** last 30 days including today. **Future dates:** rejected by API (`FUTURE_DATE`); UI date pickers cap at today.
- **Sorting:** every list declares a total order ending with `_id` ascending, so ties are deterministic.

**Effective consumption date:** `Consumption.date` if it matches `^\d{4}-\d{2}-\d{2}$`, otherwise the business date of `createdAt`.

| Id | Label | Kind | Definition |
|---|---|---|---|
| `stockValue` | Estimated stock value | Snapshot | Σ over kitchen stock rows in scope with `qtyBaseUnit > 0` and a valid price: `qtyBaseUnit × price` (valuation rules, Decision 5). Returns `unpricedItemCount` (rows with qty > 0 and no price) and `unpricedQty` (Σ their base-unit qty). |
| `lowStock` | Items below threshold | Snapshot | Stock rows with `thresholdBaseUnit > 0` and `0 < qtyBaseUnit ≤ thresholdBaseUnit` (same `≤` as the existing low-stock alert). |
| `outOfStock` | Out of stock | Snapshot | Stock rows with `qtyBaseUnit ≤ 0`. |
| `consumptionValue` | Consumption value | Period | Σ `Consumption.items.amountAtIssue` over consumptions whose effective date is in range, for lines where `amountAtIssue` is a finite number. Negative-quantity lines (returns via negative request approvals) net off. Returns `unvaluedLineCount` and `unvaluedQty` for lines without `amountAtIssue`. Never recomputed from current prices. |
| (part of `consumptionValue`) | Previous period | Period | Same as above for the immediately preceding range of equal length, returned as `details.previousValue` and `details.deltaPct = (current − previous) / |previous| × 100` (2 dp), `null` when previous is 0. |
| `dailyUseLines` | Daily-use issues | Period | Count of `DailyUsage.items` lines with `date` (or `createdAt` fallback) in range. Not valued (no price data exists). |
| `pendingRequests` | Pending requests | Snapshot | `Request.status = "pending"` (both `stock_request` and `daily_usage`), kitchen-scoped by `godownId`. |
| `pendingSupplyRequests` | Supply requests awaiting confirmation | Snapshot | `IndentRequest.status = "pending"`. |
| `openTransfers` | Open transfers | Snapshot | `Transfer.status = "pending"`; kitchen scope matches `fromGodownId` OR `toGodownId`. |
| `procurementSpend` | Procurement spend (received value) | Period, **All kitchens only** | Σ `PurchaseOrder.totalAmount` for POs whose `receivedAt` business date is in range. `totalAmount` is the existing received value: Σ `(receivedQty || orderedQty) × unitPrice`. |
| `stockReceivedValue` | Stock received value | Period | Σ over `Distribution.allocations` in scope with `Distribution.createdAt` in range, `qtyBaseUnit > 0` and valid `unitPrice`: `qtyBaseUnit × unitPrice`. Allocations without a valid price are counted (`unpricedAllocationCount`). Leftover redistributions are separate `Distribution` documents whose allocations are new movements; `Distribution.leftovers` are never summed, so nothing is double-counted. |
| `poAwaitingDistribution` | POs awaiting distribution | Snapshot, All only | `PurchaseOrder.status = "pending"`; count and Σ `totalAmount`. |

**Sections**

| Section | Content | Order / limits |
|---|---|---|
| KPIs | All KPI ids above that apply to the scope | fixed order as in table |
| Consumption trend | One point per business date in range (zero-filled): valued amount, unvalued line count | date asc |
| Top consumed items | Per stock item: valued amount, qty, unvalued lines | value desc, qty desc, name asc (case-insensitive), `stockItemId` asc; exactly 10 returned; `tiedBeyondLimit` = number of further items whose value equals the 10th |
| Stock health | Out-of-stock and low-stock rows: kitchen, item, qty, threshold, unit, ratio | out-of-stock first; then `qty/threshold` asc; item name asc; kitchen name asc; `_id` asc. Page size 25 (`healthPage`), total returned. Export: up to 5,000 rows |
| Unpriced stock | Rows counted in `unpricedItemCount` | kitchen name asc, item name asc, `_id` asc; page size 25 (`unpricedPage`); export up to 5,000 |
| Procurement | All: indents created in range by status (`pending`, `purchased`, `stock_received`), PO spend, `poAwaitingDistribution`, distributed value, daily spend series by `receivedAt`. Kitchen: `stockReceivedValue`, distributions count, supply requests created in range by status (`pending`, `confirmed`, `partially_received`, `received`, `rejected`) | status order as listed |
| Requests & transfers | Requests created in range by status (`pending`/`approved`/`rejected`), approval rate = approved ÷ (approved + rejected), `null` if both 0; current pending ageing buckets `<1d`, `1–3d`, `3–7d`, `>7d` from `createdAt`; oldest pending age; transfers created in range by status (`pending`/`accepted`/`rejected`); open-transfer ageing (same buckets) | — |
| Kitchen comparison | All only. One row per kitchen that is active or has period activity: consumption value, unvalued lines, low + out-of-stock (active only, else `null`), pending requests, stock received value | consumption value desc, kitchen name asc, `godownId` asc; page size 25 (`comparisonPage`). Rows are rounded individually and the KPI is rounded once from the unrounded total, so Σ rows may differ from the KPI by at most ₹0.005 per row (tested). |

Each section is computed independently; a failing section returns `{ status: "error", code: "SECTION_FAILED" }` while the others still render.

`meta`: `{ kitchen: { id, name, active } | { id: "all", name: "All kitchens" }, from, to, timezone, currency: "INR", generatedAt (ISO), definitions }`. The UI shows "Data updated at" = `generatedAt` in business TZ.

## Decision 5 — Valuation

Price for kitchen K, item I (used for stock value and for pricing new consumption lines):
1. Latest `Distribution.allocations` entry with `godownId = K`, `stockItemId = I`, `qtyBaseUnit > 0` and `unitPrice` a finite number > 0, latest by `Distribution.createdAt` desc then `_id` desc → `source: "kitchen-distribution"`.
2. Else latest `PurchaseOrder.items` line for I with finite `unitPrice > 0`, latest by `receivedAt` desc, `createdAt` desc, `_id` desc → `source: "purchase-order"`.
3. Else unpriced (`price: null`, `source: null`).

Invalid, missing, zero or negative prices are never used. Historical consumption value uses only `amountAtIssue`.

**`amountAtIssue` going forward (Task 18):** every code path that creates or edits a `Consumption` stores `unitPriceAtIssue` (valuation price at that moment, or `null`) and `amountAtIssue = round2(qty × unitPriceAtIssue)` (or `null`). Edits keep the line's original `unitPriceAtIssue` and recompute the amount; lines added in an edit are priced at edit time. Request approvals also start storing `date` as business `YYYY-MM-DD`. **Existing records are not backfilled** (a backfill would invent historical prices); they appear as unvalued lines. A backfill script is out of scope unless approved.

## Decision 6 — Historical stock limitation

`GodownStock` holds **current** stock only. Selecting a historical range never yields stock as it was at the end of that range; every stock metric is labelled "Current" and the UI shows the note "Stock figures are current, not as of the end of the selected period." Reconstructing historical stock (replaying ledger movements or periodic snapshots) is out of scope unless approved.

## Decision 7 — Exports

- Generated **server-side** (`exceljs` already in backend; `pdfkit` added in Phase 6) from the same `buildExecutiveReport()` result as the JSON API, with export page sizes. Totals therefore match by construction; Task 24 asserts it.
- `GET /api/executive/export.xlsx?godownId&from&to` (super-admin). Phase 6 adds `export.pdf`.
- Sheets: `Summary` (kitchen, range, generated at, timezone, currency, all KPIs, unpriced/unvalued/excluded counts, historical-stock note), `Definitions`, `Consumption trend`, `Top items`, `Stock health`, `Unpriced stock`, `Procurement`, `Requests & transfers`, `Kitchen comparison` (All only).
- Limits: list sheets ≤ 5,000 rows each; when truncated the first row reads `Showing 5,000 of N rows`. Comparison ≤ 1,000 rows.
- Timeout: all export aggregations run with `maxTimeMS: 25000`; overall budget 30 s; on timeout → 504 `{ code: "EXPORT_TIMEOUT" }`.
- Filename: `MKM-Executive-Report_<Kitchen-Name-Slug|All-Kitchens>_<from>_to_<to>_generated-<YYYYMMDD-HHmm>-IST.xlsx` (`IST` literal is the TZ abbreviation for `Asia/Kolkata`; other TZs use the IANA name with `/` → `-`). Sent with `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`.

## Decision 8 — Performance

- Indexes (Task 23): Consumption `{godownId,date}`, `{date}`, `{godownId,createdAt}`, `{createdAt}`; DailyUsage `{godownId,date}`, `{createdAt}`; Distribution `{"allocations.godownId","allocations.stockItemId",createdAt:-1}`, `{createdAt}`; PurchaseOrder `{status}`, `{receivedAt}`, `{"items.stockItemId",receivedAt:-1}`; Request `{status,godownId,createdAt}`, `{godownId,createdAt}`, `{createdAt}`; Transfer `{status,createdAt}`, `{fromGodownId,status}`, `{toGodownId,status}`, `{createdAt}`; Indent `{createdAt}`, `{status}`; IndentRequest `{status,godownId,createdAt}`, `{godownId,createdAt}`; audit collections `{at:-1,_id:-1}`.
- Every period query starts with a `$match` on an indexed field; no `$lookup` before `$match`; per-line `$unwind` only after the document-level `$match`; `$group` keys bounded by items × kitchens; lists paginated with `$facet` + `$skip/$limit`.
- **Targets** (production-sized fixture, mongodb-memory-server on a dev laptop): `GET /api/executive/summary` p95 ≤ 1.5 s for one kitchen, ≤ 3 s for all kitchens; Excel export ≤ 10 s.
- **Fixture (assumed production size — replace with real `db.collection.countDocuments()` numbers before running the perf test if they are larger):** 40 kitchens, 1,200 stock items, 48,000 stock rows, 29,200 consumptions (~175k lines, 1 year), 3,000 distributions × 40 allocations, 1,500 POs × 30 lines, 15,000 requests, 6,000 transfers, 4,000 indent requests.
- **Caching:** none by default. Only if the perf test misses the target: in-process LRU, TTL 60 s, max 100 entries, key `godownId|from|to|healthPage|unpricedPage|comparisonPage`; `generatedAt` then reflects cache time (Task 23 documents the switch).

## File map

**Backend — create**
- `backend/src/realtime.js` — late-bound socket.io handle + `roomsFor(user)`
- `backend/src/utils/roles.js` — role constants and helpers
- `backend/src/jobs/create-super-admin.js` — idempotent CLI + exported `ensureSuperAdmin`
- `backend/src/features/registry.js` — feature keys, audiences, route rules, `classifyRoute`
- `backend/src/features/featureFlagService.js` — read/cache/write global flags (+ overrides in Phase 6)
- `backend/src/features/featureGate.js` — middleware
- `backend/src/models/FeatureModels.js` — `FeatureFlags`, `FeatureFlagAudit` (+ `FeatureOverride` Phase 6)
- `backend/src/routes/featureRoutes.js`
- `backend/src/utils/money.js` — `round2`, `round3`
- `backend/src/executive/params.js` — parse/validate query, TZ helpers
- `backend/src/executive/definitions.js`, `context.js`, `paginate.js`, `statuses.js`
- `backend/src/executive/valuation.js`
- `backend/src/executive/sections/*.js` — `consumption.js`, `stock.js`, `procurement.js`, `requestsTransfers.js`, `comparison.js`
- `backend/src/executive/buildReport.js` — orchestrates sections
- `backend/src/executive/exportCommon.js`, `excelExport.js` (+ `pdfExport.js`, `schedule.js` Phase 6)
- `backend/src/routes/executiveRoutes.js`
- Phase 6: `backend/src/routes/userRoutes.js`, `backend/src/models/AdminAuditModels.js`, `backend/src/models/ReportScheduleModels.js`, `backend/src/executive/schedule.js`, `backend/src/jobs/reportScheduler.js`, `backend/src/routes/reportScheduleRoutes.js`
- Tests: `backend/src/tests/helpers/{db.js,auth.js,fixtures.js,perfFixture.js}` and the `*.test.js` files named in each task

**Backend — modify**
- `backend/src/server.js`, `backend/src/app.js`, `backend/src/middleware/auth.js`, `backend/src/models/User.js`, `backend/src/models/FlowModels.js`, `backend/src/models/DailyUsageModel.js`, `backend/src/routes/{authRoutes,operationsRoutes,indentRequestRoutes}.js`, `backend/src/jobs/seed-dev.js`, `backend/src/utils/mailer.js` (Phase 6), `backend/package.json`

**Admin-web — create**
- `admin-web/src/roles.js`
- `admin-web/src/features/FeatureFlagsContext.jsx`, `admin-web/src/features/featureNav.js`, `admin-web/src/features/FeatureDisabledPage.jsx`
- `admin-web/src/pages/FeatureVisibilityPage.jsx`, `admin-web/src/pages/features/{FeatureToggleTable.jsx,FeatureAuditList.jsx,diff.js}`
- `admin-web/src/businessTime.js`
- `admin-web/src/pages/ExecutiveReportPage.jsx`, `admin-web/src/pages/executive/{reportParams.js,requestTracker.js,useExecutiveReport.js,format.js,chartScale.js,download.js,ReportFilters.jsx,ReportBody.jsx,ExportButtons.jsx,KpiGrid.jsx,TrendChart.jsx,TopItems.jsx,StockHealth.jsx,UnpricedStock.jsx,Procurement.jsx,RequestsTransfers.jsx,KitchenComparison.jsx,Section.jsx,InfoTip.jsx,Pager.jsx,executive.css}`
- Phase 6: `admin-web/src/pages/UsersPage.jsx` (+ `users/`), `admin-web/src/pages/ReportSchedulesPage.jsx` (+ `schedules/`), `admin-web/src/pages/features/{OverridesPanel.jsx,overrides.js}`
- Tests: `*.test.js` beside the modules

**Admin-web — modify:** `App.jsx`, `api.js`, `main.jsx` (provider), `pages/AuthPage.jsx`, `components/navItems.js`, `components/Layout.jsx`, `package.json`, `styles.css`

**Client-web — modify (Task 29 only):** `package.json` (vitest), `src/api.js`, `src/components/kitchen/KitchenBottomNav.jsx`, `src/components/kitchen/KitchenMore.jsx`, `src/components/ClientStore.jsx`; create `src/features.js`, `src/features.test.js`

**Root:** `package.json` (`test` runs admin-web tests too), `README.md` (docs)
