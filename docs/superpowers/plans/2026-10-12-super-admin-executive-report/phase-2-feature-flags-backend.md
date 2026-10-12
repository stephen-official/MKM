# Phase 2 — Feature flags (backend)

Read `README.md` Decisions 2 and 3 first. Depends on Phases 0–1.

---

### Task 8: Feature registry and route classifier

**Files:**
- Create: `backend/src/features/registry.js`
- Test: `backend/src/tests/featureRegistry.test.js`

**Interfaces:**
- Produces:
  - `FEATURES: ReadonlyArray<{ key, label, navPath, audiences: ("admin"|"kitchen")[] }>`
  - `FEATURE_KEYS: string[]`, `isFeatureKey(key) → boolean`
  - `ROUTE_RULES: ReadonlyArray<{ method, path, type: "feature"|"lookup"|"open", features?: string[], kind?: "read"|"mutation", side?: "admin"|"kitchen"|"both" }>`
  - `normalizePath(path) → string` (strips query, trailing `/`, rewrites `/api/operations/...` → `/api/...`)
  - `classifyRoute(method, path) → rule | null` (first matching rule; `HEAD` is treated as `GET`; `OPTIONS` → `{ type: "open" }`)
  - `describeFeature(key) → { reads: string[], mutations: string[], kitchen: string[], sharedWith: { route, features }[] }` (strings are `"GET /api/..."`)

- [ ] **Step 1: Failing tests**

`backend/src/tests/featureRegistry.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { FEATURE_KEYS, ROUTE_RULES, classifyRoute, describeFeature, isFeatureKey, normalizePath } from "../features/registry.js";

test("feature keys are exactly the admin modules", () => {
  assert.deepEqual(FEATURE_KEYS, [
    "inventory", "indent", "purchase-orders", "stock-distribution", "godowns",
    "transfer-stock", "requests", "consumption", "reports", "product-ledger"
  ]);
  assert.equal(isFeatureKey("executive-report"), false);
  assert.equal(isFeatureKey("__proto__"), false);
});

test("every feature rule references known keys", () => {
  for (const rule of ROUTE_RULES.filter((r) => r.type === "feature")) {
    assert.ok(rule.features.length > 0, `${rule.method} ${rule.path}`);
    for (const key of rule.features) assert.ok(isFeatureKey(key), `${rule.method} ${rule.path}: ${key}`);
    assert.ok(["read", "mutation"].includes(rule.kind));
  }
});

test("normalizePath folds the operations alias, query strings and trailing slashes", () => {
  assert.equal(normalizePath("/api/operations/requests/"), "/api/requests");
  assert.equal(normalizePath("/api/operations"), "/api");
  assert.equal(normalizePath("/api/requests?x=1"), "/api/requests");
});

const cases = [
  ["GET", "/api/inventory/stock-items", "lookup"],
  ["GET", "/api/inventory/godowns", "lookup"],
  ["POST", "/api/inventory/stock-items", "inventory"],
  ["PUT", "/api/inventory/units/abc", "inventory"],
  ["DELETE", "/api/inventory/units/abc", "inventory"],
  ["GET", "/api/inventory/units/export/excel", "inventory"],
  ["POST", "/api/inventory/stock-items/upload-image", "inventory"],
  ["GET", "/api/procurement/purchase-orders", "purchase-orders|stock-distribution"],
  ["POST", "/api/procurement/purchase-orders", "purchase-orders"],
  ["GET", "/api/procurement/distributions/leftovers", "stock-distribution"],
  ["GET", "/api/procurement/distributions/abc/details", "stock-distribution"],
  ["GET", "/api/godown-stocks", "lookup"],
  ["GET", "/api/operations/godown-stocks", "lookup"],
  ["POST", "/api/procurement/godown-stocks/abc/threshold", "godowns"],
  ["GET", "/api/requests", "requests"],
  ["GET", "/api/operations/requests", "requests"],
  ["POST", "/api/requests/abc/approve", "requests"],
  ["PATCH", "/api/daily-usage/abc", "consumption"],
  ["POST", "/api/daily-usage", "consumption"],
  ["GET", "/api/product-ledger/godowns", "product-ledger"],
  ["GET", "/api/product-ledger/abc", "product-ledger"],
  ["GET", "/api/reports/indents/export/excel", "reports"],
  ["HEAD", "/api/reports/indents", "reports"],
  ["GET", "/api/notifications", "open"],
  ["POST", "/api/auth/login", "open"],
  ["GET", "/api/features", "open"],
  ["PUT", "/api/features", "open"],
  ["GET", "/api/executive/summary", "open"],
  ["OPTIONS", "/api/requests", "open"]
];

test("classifyRoute", () => {
  for (const [method, path, expected] of cases) {
    const rule = classifyRoute(method, path);
    assert.ok(rule, `${method} ${path} is unclassified`);
    const actual = rule.type === "feature" ? rule.features.join("|") : rule.type;
    assert.equal(actual, expected, `${method} ${path}`);
  }
  assert.equal(classifyRoute("GET", "/api/definitely-not-a-route"), null);
});

test("describeFeature lists reads, mutations, kitchen routes and shared rules", () => {
  const po = describeFeature("purchase-orders");
  assert.ok(po.mutations.includes("POST /api/procurement/purchase-orders"));
  assert.deepEqual(po.sharedWith, [{ route: "GET /api/procurement/purchase-orders", features: ["purchase-orders", "stock-distribution"] }]);
  const transfers = describeFeature("transfer-stock");
  assert.ok(transfers.kitchen.includes("POST /api/user-transfers/:id/accept"));
});
```

- [ ] **Step 2: Run** — `npm --prefix backend test` → FAIL (module missing).

- [ ] **Step 3: Implement**

`backend/src/features/registry.js`:

```js
// Single source of truth for feature visibility: which feature owns which HTTP route.
// featureGate enforces it, the admin UI renders it, and featureRouteCoverage.test.js
// fails if an Express route is missing here or a rule here matches no route.

export const FEATURES = Object.freeze([
  { key: "inventory", label: "Inventory Info", navPath: "/inventory-info", audiences: ["admin"] },
  { key: "indent", label: "Indent", navPath: "/indent", audiences: ["admin", "kitchen"] },
  { key: "purchase-orders", label: "Purchase Orders", navPath: "/purchase-orders", audiences: ["admin"] },
  { key: "stock-distribution", label: "Stock Distribution", navPath: "/stock-distribution", audiences: ["admin"] },
  { key: "godowns", label: "Godowns", navPath: "/godowns", audiences: ["admin"] },
  { key: "transfer-stock", label: "Transfer Stock", navPath: "/transfer-stock", audiences: ["admin", "kitchen"] },
  { key: "requests", label: "Requests", navPath: "/requests", audiences: ["admin", "kitchen"] },
  { key: "consumption", label: "Consumption", navPath: "/consumption", audiences: ["admin", "kitchen"] },
  { key: "reports", label: "Reports", navPath: "/reports", audiences: ["admin"] },
  { key: "product-ledger", label: "Product Ledger", navPath: "/product-ledger", audiences: ["admin"] }
]);

export const FEATURE_KEYS = FEATURES.map((feature) => feature.key);
const KEY_SET = new Set(FEATURE_KEYS);
export const isFeatureKey = (key) => typeof key === "string" && KEY_SET.has(key);

const feature = (method, path, features, kind, side = "admin") =>
  ({ method, path, type: "feature", features, kind, side });
const lookup = (method, path) => ({ method, path, type: "lookup" });
const open = (method, path) => ({ method, path, type: "open" });

// Order matters only where a literal segment and a :param share a position
// (product-ledger/godowns before product-ledger/:productId): first match wins.
export const ROUTE_RULES = Object.freeze([
  // --- open: auth, self-service, notifications, super-admin APIs ---
  open("GET", "/api/health"),
  open("*", "/api/auth/*"),
  open("GET", "/api/my-kitchen-stock"),
  open("GET", "/api/procurement/stock-balance"),
  open("GET", "/api/procurement/my-stock"),
  open("GET", "/api/notifications"),
  open("*", "/api/features/*"),
  open("*", "/api/features"),
  open("*", "/api/executive/*"),
  open("*", "/api/users/*"),
  open("*", "/api/users"),
  open("*", "/api/report-schedules/*"),
  open("*", "/api/report-schedules"),

  // --- shared lookups (other modules depend on them) ---
  lookup("GET", "/api/inventory/:type"),
  lookup("GET", "/api/godown-stocks"),

  // --- inventory ---
  feature("GET", "/api/inventory/:type/export/excel", ["inventory"], "read"),
  feature("POST", "/api/inventory/stock-items/upload-image", ["inventory"], "mutation"),
  feature("POST", "/api/inventory/:type", ["inventory"], "mutation"),
  feature("PUT", "/api/inventory/:type/:id", ["inventory"], "mutation"),
  feature("DELETE", "/api/inventory/:type/:id", ["inventory"], "mutation"),

  // --- indent (admin) + supply requests (kitchen) ---
  feature("GET", "/api/indent-requests/me", ["indent"], "read", "kitchen"),
  feature("GET", "/api/indent-requests", ["indent"], "read"),
  feature("POST", "/api/indent-requests", ["indent"], "mutation", "kitchen"),
  feature("PATCH", "/api/indent-requests/:id/confirm", ["indent"], "mutation"),
  feature("PATCH", "/api/indent-requests/:id/select-item", ["indent"], "mutation"),
  feature("PATCH", "/api/indent-requests/:id/reject", ["indent"], "mutation"),
  feature("POST", "/api/indent-requests/:id/receive", ["indent"], "mutation", "both"),
  feature("PUT", "/api/indent-requests/:id", ["indent"], "mutation", "kitchen"),
  feature("DELETE", "/api/indent-requests/:id", ["indent"], "mutation", "both"),
  feature("GET", "/api/procurement/indents", ["indent"], "read"),
  feature("GET", "/api/procurement/indents/:id/preview", ["indent"], "read"),
  feature("POST", "/api/procurement/indents", ["indent"], "mutation"),
  feature("POST", "/api/procurement/indents/:id/mark-purchased", ["indent"], "mutation"),

  // --- purchase orders (list shared with stock distribution) ---
  feature("GET", "/api/procurement/purchase-orders/purchased-indents", ["purchase-orders"], "read"),
  feature("GET", "/api/procurement/purchase-orders", ["purchase-orders", "stock-distribution"], "read"),
  feature("POST", "/api/procurement/purchase-orders", ["purchase-orders"], "mutation"),

  // --- stock distribution ---
  feature("GET", "/api/procurement/distributions/logs", ["stock-distribution"], "read"),
  feature("GET", "/api/procurement/distributions/leftovers", ["stock-distribution"], "read"),
  feature("GET", "/api/procurement/distributions/:id/details", ["stock-distribution"], "read"),
  feature("POST", "/api/procurement/distributions", ["stock-distribution"], "mutation"),

  // --- godowns ---
  feature("GET", "/api/procurement/godown-stocks", ["godowns"], "read"),
  feature("GET", "/api/procurement/godown-stocks/:godownId", ["godowns"], "read"),
  feature("POST", "/api/procurement/godown-stocks/:id/threshold", ["godowns"], "mutation"),
  feature("DELETE", "/api/procurement/godown-stocks/:id", ["godowns"], "mutation"),

  // --- transfers ---
  feature("GET", "/api/transfers", ["transfer-stock"], "read", "both"),
  feature("POST", "/api/transfers", ["transfer-stock"], "mutation", "both"),
  feature("GET", "/api/user-transfers/incoming", ["transfer-stock"], "read", "kitchen"),
  feature("GET", "/api/user-transfers/history", ["transfer-stock"], "read", "kitchen"),
  feature("POST", "/api/user-transfers", ["transfer-stock"], "mutation", "kitchen"),
  feature("POST", "/api/user-transfers/:id/accept", ["transfer-stock"], "mutation", "kitchen"),
  feature("POST", "/api/user-transfers/:id/reject", ["transfer-stock"], "mutation", "kitchen"),

  // --- requests ---
  feature("GET", "/api/requests", ["requests"], "read", "both"),
  feature("POST", "/api/requests", ["requests"], "mutation", "kitchen"),
  feature("POST", "/api/requests/:id/approve", ["requests"], "mutation"),
  feature("POST", "/api/requests/:id/reject", ["requests"], "mutation"),

  // --- consumption & daily usage ---
  feature("GET", "/api/consumptions/me", ["consumption"], "read", "kitchen"),
  feature("GET", "/api/consumptions", ["consumption"], "read"),
  feature("POST", "/api/consumptions", ["consumption"], "mutation", "both"),
  feature("POST", "/api/orders", ["consumption"], "mutation", "both"),
  feature("PATCH", "/api/consumptions/:id", ["consumption"], "mutation"),
  feature("DELETE", "/api/consumptions/:id", ["consumption"], "mutation"),
  feature("GET", "/api/daily-usage/me", ["consumption"], "read", "both"),
  feature("GET", "/api/daily-usage", ["consumption"], "read"),
  feature("POST", "/api/daily-usage", ["consumption"], "mutation", "both"),
  feature("PATCH", "/api/daily-usage/:id", ["consumption"], "mutation"),
  feature("DELETE", "/api/daily-usage/:id", ["consumption"], "mutation"),

  // --- reports ---
  feature("GET", "/api/reports/:entity/export/excel/:id", ["reports"], "read"),
  feature("GET", "/api/reports/:entity/export/excel", ["reports"], "read"),
  feature("GET", "/api/reports/:entity", ["reports"], "read"),

  // --- product ledger ---
  feature("GET", "/api/product-ledger/godowns", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/products", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/:productId/export/excel", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/:productId", ["product-ledger"], "read")
]);

export const normalizePath = (raw) => {
  let path = String(raw || "").split("?")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/api/operations") return "/api";
  if (path.startsWith("/api/operations/")) return `/api/${path.slice("/api/operations/".length)}`;
  return path;
};

const compile = (pattern) => {
  const wildcard = pattern.endsWith("/*");
  const base = wildcard ? pattern.slice(0, -2) : pattern;
  const body = base
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${body}${wildcard ? "(?:/.*)?" : ""}$`);
};

const COMPILED = ROUTE_RULES.map((rule) => ({ rule, regex: compile(rule.path) }));
const OPTIONS_RULE = Object.freeze({ method: "OPTIONS", path: "*", type: "open" });

export const classifyRoute = (method, path) => {
  const verb = String(method || "").toUpperCase() === "HEAD" ? "GET" : String(method || "").toUpperCase();
  if (verb === "OPTIONS") return OPTIONS_RULE;
  const normalized = normalizePath(path);
  const hit = COMPILED.find(({ rule, regex }) => (rule.method === "*" || rule.method === verb) && regex.test(normalized));
  return hit ? hit.rule : null;
};

export const describeFeature = (key) => {
  const label = (rule) => `${rule.method} ${rule.path}`;
  const own = ROUTE_RULES.filter((rule) => rule.type === "feature" && rule.features.includes(key));
  return {
    reads: own.filter((r) => r.kind === "read" && r.side !== "kitchen").map(label),
    mutations: own.filter((r) => r.kind === "mutation" && r.side !== "kitchen").map(label),
    kitchen: own.filter((r) => r.side === "kitchen" || r.side === "both").map(label),
    sharedWith: own.filter((r) => r.features.length > 1).map((r) => ({ route: label(r), features: [...r.features] }))
  };
};
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/registry.js backend/src/tests/featureRegistry.test.js
git commit -m "feat(features): declarative feature-to-route registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Mount table in app.js + route-coverage test

**Files:**
- Modify: `backend/src/app.js:113-135` (mounting block)
- Test: `backend/src/tests/featureRouteCoverage.test.js`

**Interfaces:**
- Produces from `app.js`: `PROTECTED_MOUNTS: [mountPath, router][]` (in original order) and `PUBLIC_MOUNTS`. Later tasks append routers here (`featureRoutes` Task 12, `executiveRoutes` Task 22, Phase 6 routers).
- Task 11 inserts `featureGate` into the loop; this task only restructures.

- [ ] **Step 1: Restructure mounting (behaviour-preserving)**

Replace the block from `app.use("/api/auth", authLimiter, authRoutes);` through `app.use("/api/product-ledger", authenticate, productLedgerRoutes);` with:

```js
export const PUBLIC_MOUNTS = [["/api/auth", authRoutes]];

// Order is significant and matches the previous app.use() calls: operationsRoutes is
// mounted at both /api and /api/operations (featureGate normalises the alias).
export const PROTECTED_MOUNTS = [
  ["/api/inventory", inventoryRoutes],
  ["/api/procurement", procurementRoutes],
  ["/api", operationsRoutes],
  ["/api/reports", reportRoutes],
  ["/api/operations", operationsRoutes],
  ["/api/indent-requests", indentRequestRoutes],
  ["/api/daily-usage", dailyUsageRoutes],
  ["/api/product-ledger", productLedgerRoutes]
];

app.use("/api/auth", authLimiter, authRoutes);
for (const [mountPath, router] of PROTECTED_MOUNTS) app.use(mountPath, authenticate, router);
```

Run: `npm --prefix backend test` → all existing tests still PASS.

- [ ] **Step 2: Write the coverage test**

`backend/src/tests/featureRouteCoverage.test.js`:

```js
import assert from "node:assert/strict";
import { before, test } from "node:test";
import { ROUTE_RULES, classifyRoute, normalizePath } from "../features/registry.js";

let routes;
before(async () => {
  const { PROTECTED_MOUNTS, PUBLIC_MOUNTS } = await import("../app.js");
  routes = [];
  for (const [mount, router] of [...PUBLIC_MOUNTS, ...PROTECTED_MOUNTS]) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        if (method === "_all") continue;
        routes.push({ method: method.toUpperCase(), path: `${mount === "/" ? "" : mount}${layer.route.path}` });
      }
    }
  }
  routes.push({ method: "GET", path: "/api/health" });
});

test("every Express route is classified by the feature registry", () => {
  const missing = routes.filter((r) => !classifyRoute(r.method, r.path)).map((r) => `${r.method} ${r.path}`);
  assert.deepEqual([...new Set(missing)], []);
});

test("every registry rule matches at least one real route (no stale rules)", () => {
  const isWildcardOpen = (rule) => rule.type === "open" && (rule.path.endsWith("/*") || rule.method === "*");
  const stale = ROUTE_RULES.filter((rule) => !isWildcardOpen(rule)).filter((rule) =>
    !routes.some((r) => (rule.method === r.method) && classifyRoute(r.method, r.path) === rule)
  ).map((rule) => `${rule.method} ${rule.path}`);
  assert.deepEqual(stale, []);
});

test("routes reachable through /api/operations classify the same as through /api", () => {
  for (const r of routes.filter((x) => x.path.startsWith("/api/operations/"))) {
    assert.equal(classifyRoute(r.method, r.path), classifyRoute(r.method, normalizePath(r.path)));
  }
});
```

- [ ] **Step 3: Run**

Run: `npm --prefix backend test`
Expected: PASS. If the first test lists a route, add a rule for it to `registry.js` in the right section (feature/lookup/open) — never weaken the test. If the second lists a rule, the route was renamed; fix the rule path.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.js backend/src/tests/featureRouteCoverage.test.js
git commit -m "test(features): every Express route must be classified by the registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Feature models and flag service

**Files:**
- Create: `backend/src/models/FeatureModels.js`, `backend/src/features/featureFlagService.js`
- Test: `backend/src/tests/featureFlagService.test.js`

**Interfaces:**
- Consumes: `FEATURE_KEYS`, `isFeatureKey` (Task 8).
- Produces (`FeatureModels.js`): `FeatureFlags` (collection `featureflags`), `FeatureFlagAudit` (collection `featureflagaudits`), `GLOBAL_FLAGS_ID = "global"`.
- Produces (`featureFlagService.js`):
  - `DEFAULT_FLAGS` — `{ [key]: true }`
  - `class FeatureFlagError extends Error { status, code, details }`
  - `loadGlobalFlags({ now? }) → Promise<{ flags, version, updatedAt }>` (cache TTL 5 s, stale fallback ≤ 5 min, else throws `FeatureFlagError(503, "FEATURE_FLAGS_UNAVAILABLE")`)
  - `invalidateFlagCache()`
  - `updateGlobalFlags({ actor: { id, name, email }, expectedVersion, changes }) → Promise<{ state, changed: { key, previous, next }[] }>`
  - `resolveEffectiveFlags(user) → Promise<flags | null>` — `null` means "this caller is not gated" (super_admin; kitchen users until Phase 6)
  - `listAudit({ page, scope?, targetId? }) → Promise<{ items, total, page, pageSize: 25 }>`

- [ ] **Step 1: Failing tests**

`backend/src/tests/featureFlagService.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { FeatureFlagAudit, FeatureFlags } from "../models/FeatureModels.js";
import {
  DEFAULT_FLAGS, invalidateFlagCache, listAudit, loadGlobalFlags, resolveEffectiveFlags, updateGlobalFlags
} from "../features/featureFlagService.js";

const actor = { id: new mongoose.Types.ObjectId(), name: "Root", email: "root@x.io" };

before(async () => { await startDb(); await syncAllIndexes(); });
beforeEach(async () => { await clearDb(); invalidateFlagCache(); });
after(stopDb);

test("missing document means every feature is enabled at version 0", async () => {
  const state = await loadGlobalFlags();
  assert.deepEqual(state.flags, DEFAULT_FLAGS);
  assert.equal(state.version, 0);
});

test("first write creates the singleton; only submitted keys change", async () => {
  const { state, changed } = await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  assert.equal(state.version, 1);
  assert.equal(state.flags.reports, false);
  assert.equal(state.flags.inventory, true);
  assert.deepEqual(changed, [{ key: "reports", previous: true, next: false }]);
  assert.equal(await FeatureFlags.countDocuments(), 1);
  assert.equal((await FeatureFlags.findOne().lean())._id, "global");

  await updateGlobalFlags({ actor, expectedVersion: 1, changes: { inventory: false } });
  const reread = await loadGlobalFlags();
  assert.equal(reread.flags.reports, false, "earlier key untouched by later partial update");
  assert.equal(reread.flags.inventory, false);
  assert.equal(reread.version, 2);
});

test("unknown keys, non-boolean values, empty changes and bad versions are rejected", async () => {
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: { billing: false } }),
    (e) => e.status === 400 && e.code === "UNKNOWN_FEATURE_KEY" && e.details.keys[0] === "billing");
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: "no" } }),
    (e) => e.status === 400 && e.code === "INVALID_FEATURE_VALUE");
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: {} }),
    (e) => e.code === "NO_CHANGES");
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: -1, changes: { reports: false } }),
    (e) => e.code === "INVALID_VERSION");
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: { ["__proto__"]: false } }),
    (e) => e.code === "UNKNOWN_FEATURE_KEY");
  assert.equal(await FeatureFlags.countDocuments(), 0);
  assert.equal(await FeatureFlagAudit.countDocuments(), 0);
});

test("stale version is a 409 conflict carrying the current version", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: { inventory: false } }),
    (e) => e.status === 409 && e.code === "VERSION_CONFLICT" && e.details.currentVersion === 1);
});

test("concurrent writers with the same version: exactly one wins", async () => {
  const results = await Promise.allSettled([
    updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } }),
    updateGlobalFlags({ actor, expectedVersion: 0, changes: { inventory: false } }),
    updateGlobalFlags({ actor, expectedVersion: 0, changes: { godowns: false } })
  ]);
  const ok = results.filter((r) => r.status === "fulfilled");
  const conflicts = results.filter((r) => r.status === "rejected" && r.reason.code === "VERSION_CONFLICT");
  assert.equal(ok.length, 1);
  assert.equal(conflicts.length, 2);
  assert.equal((await loadGlobalFlags()).version, 1);
  assert.equal(await FeatureFlagAudit.countDocuments(), 1);
});

test("no-op change returns current state without bumping version or auditing", async () => {
  const res = await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: true } });
  assert.equal(res.state.version, 0);
  assert.deepEqual(res.changed, []);
  assert.equal(await FeatureFlagAudit.countDocuments(), 0);
});

test("each write appends one audit row with previous and new values", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false, inventory: false } });
  await updateGlobalFlags({ actor, expectedVersion: 1, changes: { reports: true } });
  const page = await listAudit({ page: 1 });
  assert.equal(page.total, 2);
  assert.equal(page.pageSize, 25);
  const [latest, first] = page.items;
  assert.deepEqual(latest.changes, [{ key: "reports", previous: false, next: true }]);
  assert.equal(latest.versionBefore, 1);
  assert.equal(latest.versionAfter, 2);
  assert.equal(latest.actorEmail, "root@x.io");
  assert.equal(latest.scope, "global");
  assert.deepEqual(first.changes.map((c) => c.key).sort(), ["inventory", "reports"]);
});

test("audit rows cannot be updated or deleted through the model", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  const row = await FeatureFlagAudit.findOne();
  await assert.rejects(FeatureFlagAudit.updateOne({ _id: row._id }, { actorEmail: "x" }), /append-only/);
  await assert.rejects(FeatureFlagAudit.deleteMany({}), /append-only/);
  await assert.rejects(FeatureFlagAudit.findOneAndUpdate({ _id: row._id }, { actorEmail: "x" }), /append-only/);
  await assert.rejects(row.deleteOne(), /append-only/);
  row.actorEmail = "x";
  await assert.rejects(row.save(), /append-only/);
});

test("cache: served for 5 s, then reloaded; stale copy used for up to 5 min when DB fails", async (t) => {
  const t0 = Date.now();
  await loadGlobalFlags({ now: t0 });
  await FeatureFlags.create({ _id: "global", flags: { reports: false }, version: 7 });
  assert.equal((await loadGlobalFlags({ now: t0 + 1000 })).version, 0, "cached");
  assert.equal((await loadGlobalFlags({ now: t0 + 6000 })).version, 7, "reloaded after TTL");

  t.mock.method(FeatureFlags, "findById", () => ({ lean: async () => { throw new Error("db down"); } }));
  assert.equal((await loadGlobalFlags({ now: t0 + 6000 + 10_000 })).version, 7, "stale fallback");
  await assert.rejects(loadGlobalFlags({ now: t0 + 6000 + 6 * 60_000 }),
    (e) => e.status === 503 && e.code === "FEATURE_FLAGS_UNAVAILABLE");
});

test("no cached copy and DB down → 503", async (t) => {
  t.mock.method(FeatureFlags, "findById", () => ({ lean: async () => { throw new Error("db down"); } }));
  await assert.rejects(loadGlobalFlags(), (e) => e.code === "FEATURE_FLAGS_UNAVAILABLE");
});

test("unknown keys stored in the DB are ignored on read", async () => {
  await FeatureFlags.create({ _id: "global", flags: { legacy: false, reports: false }, version: 3 });
  const state = await loadGlobalFlags();
  assert.equal("legacy" in state.flags, false);
  assert.equal(state.flags.reports, false);
});

test("effective flags: super_admin and kitchen users are not gated; admins get global", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  assert.equal(await resolveEffectiveFlags({ role: "super_admin" }), null);
  assert.equal(await resolveEffectiveFlags({ role: "user", godownId: "g" }), null);
  assert.equal((await resolveEffectiveFlags({ role: "admin" })).reports, false);
});
```

- [ ] **Step 2: Run** — FAIL (modules missing).

- [ ] **Step 3: Implement the models**

`backend/src/models/FeatureModels.js`:

```js
import mongoose from "mongoose";

export const GLOBAL_FLAGS_ID = "global";

// One document per scope. A string _id makes the global singleton unique by construction.
const featureFlagsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    flags: { type: Map, of: Boolean, default: () => new Map() },
    version: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

export const FeatureFlags = mongoose.model("FeatureFlags", featureFlagsSchema, "featureflags");

const changeSchema = new mongoose.Schema(
  { key: { type: String, required: true }, previous: { type: Boolean, required: true }, next: { type: Boolean, required: true } },
  { _id: false }
);

const featureFlagAuditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    at: { type: Date, default: Date.now, required: true },
    scope: { type: String, enum: ["global", "kitchen", "user"], required: true },
    targetId: { type: String, default: null },
    versionBefore: { type: Number, required: true },
    versionAfter: { type: Number, required: true },
    changes: { type: [changeSchema], required: true }
  },
  { versionKey: false }
);
featureFlagAuditSchema.index({ at: -1, _id: -1 });
featureFlagAuditSchema.index({ scope: 1, targetId: 1, at: -1 });

const appendOnly = function (next) {
  next(new Error("Feature flag audit entries are append-only"));
};
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "findOneAndDelete", "deleteMany"]) {
  featureFlagAuditSchema.pre(op, appendOnly);
}
featureFlagAuditSchema.pre("deleteOne", { document: true, query: true }, appendOnly);
featureFlagAuditSchema.pre("save", function (next) {
  if (!this.isNew) return next(new Error("Feature flag audit entries are append-only"));
  return next();
});

export const FeatureFlagAudit = mongoose.model("FeatureFlagAudit", featureFlagAuditSchema, "featureflagaudits");
```

- [ ] **Step 4: Implement the service**

`backend/src/features/featureFlagService.js`:

```js
import mongoose from "mongoose";
import { FEATURE_KEYS, isFeatureKey } from "./registry.js";
import { FeatureFlagAudit, FeatureFlags, GLOBAL_FLAGS_ID } from "../models/FeatureModels.js";
import { isAdminRole, isSuperAdmin } from "../utils/roles.js";

export const CACHE_TTL_MS = 5_000;
export const STALE_LIMIT_MS = 5 * 60_000;
export const AUDIT_PAGE_SIZE = 25;
export const DEFAULT_FLAGS = Object.freeze(Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])));

export class FeatureFlagError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const unavailable = () =>
  new FeatureFlagError(503, "FEATURE_FLAGS_UNAVAILABLE", "Feature settings are temporarily unavailable.");

/** Stored flags (plain object or Map) merged over defaults; keys no longer in the registry are dropped. */
const toState = (doc) => {
  const stored = doc?.flags instanceof Map ? Object.fromEntries(doc.flags) : (doc?.flags || {});
  const flags = { ...DEFAULT_FLAGS };
  for (const key of FEATURE_KEYS) if (typeof stored[key] === "boolean") flags[key] = stored[key];
  return { flags, version: doc?.version ?? 0, updatedAt: doc?.updatedAt ?? null };
};

let cache = null; // { state, loadedAt }

export const invalidateFlagCache = () => {
  cache = null;
};

export const loadGlobalFlags = async ({ now = Date.now() } = {}) => {
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.state;
  try {
    const doc = await FeatureFlags.findById(GLOBAL_FLAGS_ID).lean();
    const state = toState(doc);
    cache = { state, loadedAt: now };
    return state;
  } catch (error) {
    if (cache && now - cache.loadedAt < STALE_LIMIT_MS) {
      console.warn(`[features] using cached flags; reload failed: ${error.message}`);
      return cache.state;
    }
    throw unavailable();
  }
};

export const validateChanges = (changes) => {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new FeatureFlagError(400, "NO_CHANGES", "Provide at least one feature change.");
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) throw new FeatureFlagError(400, "NO_CHANGES", "Provide at least one feature change.");
  const unknown = keys.filter((key) => !isFeatureKey(key));
  if (unknown.length) throw new FeatureFlagError(400, "UNKNOWN_FEATURE_KEY", `Unknown feature: ${unknown.join(", ")}`, { keys: unknown });
  const invalid = keys.filter((key) => typeof changes[key] !== "boolean");
  if (invalid.length) throw new FeatureFlagError(400, "INVALID_FEATURE_VALUE", "Feature values must be true or false.", { keys: invalid });
};

const validateVersion = (expectedVersion) => {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new FeatureFlagError(400, "INVALID_VERSION", "expectedVersion must be a non-negative integer.");
  }
};

const conflict = (currentVersion) =>
  new FeatureFlagError(409, "VERSION_CONFLICT", "These settings were changed by someone else. Reload and try again.", { currentVersion });

/**
 * Applies `changes` to one flags document atomically with its audit row.
 * Shared by the global document and (Phase 6) per-kitchen / per-user overrides.
 */
export const writeFlagsDocument = async ({ id, scope, targetId = null, actor, expectedVersion, changes, baseFlags = DEFAULT_FLAGS, extraFields = {} }) => {
  validateChanges(changes);
  validateVersion(expectedVersion);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const current = await FeatureFlags.findById(id).session(session).lean();
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== expectedVersion) throw conflict(currentVersion);

      const stored = current?.flags || {};
      const before = { ...baseFlags };
      for (const key of FEATURE_KEYS) if (typeof stored[key] === "boolean") before[key] = stored[key];
      const changed = Object.entries(changes)
        .filter(([key, next]) => before[key] !== next)
        .map(([key, next]) => ({ key, previous: before[key], next }));
      if (!changed.length) {
        result = { doc: current, changed };
        return;
      }

      const $set = { ...extraFields };
      for (const { key, next } of changed) $set[`flags.${key}`] = next;
      let doc;
      try {
        doc = await FeatureFlags.findOneAndUpdate(
          { _id: id, version: expectedVersion },
          { $set, $inc: { version: 1 } },
          { upsert: expectedVersion === 0, new: true, session, lean: true }
        );
      } catch (error) {
        if (error?.code === 11000) throw conflict(currentVersion + 1);
        throw error;
      }
      if (!doc) throw conflict(currentVersion);

      await FeatureFlagAudit.create([{
        actorId: actor.id, actorName: actor.name || "", actorEmail: actor.email || "",
        scope, targetId, versionBefore: expectedVersion, versionAfter: doc.version, changes: changed
      }], { session });
      result = { doc, changed };
    });
    invalidateFlagCache();
    return result;
  } catch (error) {
    if (error instanceof FeatureFlagError) throw error;
    if (error?.code === 11000) throw conflict(expectedVersion + 1);
    throw error;
  } finally {
    await session.endSession();
  }
};

export const updateGlobalFlags = async ({ actor, expectedVersion, changes }) => {
  const { doc, changed } = await writeFlagsDocument({ id: GLOBAL_FLAGS_ID, scope: "global", actor, expectedVersion, changes });
  return { state: toState(doc), changed };
};

/** null = caller is not subject to feature gating. */
export const resolveEffectiveFlags = async (user) => {
  if (!user || isSuperAdmin(user.role)) return null;
  if (isAdminRole(user.role)) return (await loadGlobalFlags()).flags;
  return null; // kitchen users: gated only by overrides (Phase 6, Task 28)
};

export const listAudit = async ({ page = 1, scope, targetId } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const filter = {};
  if (scope) filter.scope = scope;
  if (targetId) filter.targetId = String(targetId);
  const [items, total] = await Promise.all([
    FeatureFlagAudit.find(filter).sort({ at: -1, _id: -1 }).skip((safePage - 1) * AUDIT_PAGE_SIZE).limit(AUDIT_PAGE_SIZE).lean(),
    FeatureFlagAudit.countDocuments(filter)
  ]);
  return { items, total, page: safePage, pageSize: AUDIT_PAGE_SIZE };
};

export const featureDisabledPayload = (feature) => ({
  code: "FEATURE_DISABLED",
  feature,
  message: "This feature is currently disabled."
});
```

Note on the concurrent-writers test: competing transactions hit a write conflict; `withTransaction` retries the callback, which re-reads the bumped version and throws `VERSION_CONFLICT`. If the test is flaky, the bug is real — do not add sleeps.

- [ ] **Step 5: Run** — `npm --prefix backend test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/FeatureModels.js backend/src/features/featureFlagService.js backend/src/tests/featureFlagService.test.js
git commit -m "feat(features): versioned singleton flags with append-only audit and cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `featureGate` middleware on every protected mount

**Files:**
- Create: `backend/src/features/featureGate.js`
- Modify: `backend/src/app.js` (mount loop from Task 9)
- Test: `backend/src/tests/featureGate.test.js`

**Interfaces:**
- Consumes: `classifyRoute` (Task 8), `resolveEffectiveFlags`, `featureDisabledPayload`, `FeatureFlagError` (Task 10).
- Produces: `featureGate(req, res, next)` — uses `req.baseUrl + req.path`; must run after `authenticate`.

- [ ] **Step 1: Failing tests**

`backend/src/tests/featureGate.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { FeatureFlags } from "../models/FeatureModels.js";
import { invalidateFlagCache, updateGlobalFlags } from "../features/featureFlagService.js";

let app;
let admin;
let superAdmin;
let kitchenUser;
const actor = { id: new mongoose.Types.ObjectId(), name: "t", email: "t@x.io" };
let version = 0;
const disable = async (...keys) => {
  const { state } = await updateGlobalFlags({ actor, expectedVersion: version, changes: Object.fromEntries(keys.map((k) => [k, false])) });
  version = state.version;
};

before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
beforeEach(async () => {
  await clearDb();
  invalidateFlagCache();
  version = 0;
  admin = await createUser({ role: "admin" });
  superAdmin = await createUser({ role: "super_admin" });
  const godown = await createGodown("K1");
  kitchenUser = await createUser({ role: "user", godownId: godown._id });
});
after(stopDb);

const call = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${who.token}`);
const DISABLED = { code: "FEATURE_DISABLED", feature: "requests", message: "This feature is currently disabled." };

test("disabled feature blocks admin reads with the standard payload", async () => {
  await disable("requests");
  const res = await call(admin, "get", "/api/requests");
  assert.equal(res.status, 403);
  assert.deepEqual(res.body, DISABLED);
});

test("alias prefix is gated identically", async () => {
  await disable("requests");
  const res = await call(admin, "get", "/api/operations/requests");
  assert.equal(res.status, 403);
  assert.deepEqual(res.body, DISABLED);
});

test("disabled feature blocks mutations before the handler runs", async () => {
  await disable("inventory");
  const res = await call(admin, "post", "/api/inventory/stock-groups").send({ name: "Should not exist" });
  assert.equal(res.status, 403);
  assert.equal(res.body.feature, "inventory");
  assert.equal(await mongoose.connection.db.collection("stockgroups").countDocuments(), 0);
  await disable("requests");
  const approve = await call(admin, "post", `/api/requests/${new mongoose.Types.ObjectId()}/approve`);
  assert.equal(approve.status, 403, "mutation blocked before the handler's 400 'Request not found'");
});

test("super_admin bypasses every flag", async () => {
  await disable("requests", "inventory", "reports");
  assert.equal((await call(superAdmin, "get", "/api/requests")).status, 200);
  assert.equal((await call(superAdmin, "get", "/api/reports/indents")).status, 200);
  assert.equal((await call(superAdmin, "post", "/api/inventory/stock-groups").send({ name: "ok" })).status, 201);
});

test("shared lookups stay available when their owning page is disabled", async () => {
  await disable("inventory", "godowns");
  assert.equal((await call(admin, "get", "/api/inventory/stock-items")).status, 200);
  assert.equal((await call(admin, "get", "/api/godown-stocks")).status, 200);
  assert.equal((await call(admin, "get", "/api/procurement/godown-stocks")).status, 403);
});

test("dependency: PO list stays readable while Stock Distribution is enabled", async () => {
  await disable("purchase-orders");
  assert.equal((await call(admin, "get", "/api/procurement/purchase-orders")).status, 200);
  assert.equal((await call(admin, "post", "/api/procurement/purchase-orders").send({})).status, 403);
  assert.equal((await call(admin, "get", "/api/procurement/purchase-orders/purchased-indents")).status, 403);
  await disable("stock-distribution");
  const both = await call(admin, "get", "/api/procurement/purchase-orders");
  assert.equal(both.status, 403);
  assert.equal(both.body.feature, "purchase-orders");
});

test("global flags never gate kitchen users", async () => {
  await disable("requests");
  assert.equal((await call(kitchenUser, "get", "/api/requests")).status, 200);
});

test("open routes are never gated", async () => {
  await disable(...["inventory", "indent", "purchase-orders", "stock-distribution", "godowns", "transfer-stock", "requests", "consumption", "reports", "product-ledger"]);
  assert.equal((await call(admin, "get", "/api/notifications")).status, 200);
  assert.equal((await call(admin, "get", "/api/auth/me")).status, 200);
});

test("flags unavailable with no cached copy → 503 on gated routes only", async (t) => {
  invalidateFlagCache();
  t.mock.method(FeatureFlags, "findById", () => ({ lean: async () => { throw new Error("down"); } }));
  const gated = await call(admin, "get", "/api/requests");
  assert.equal(gated.status, 503);
  assert.equal(gated.body.code, "FEATURE_FLAGS_UNAVAILABLE");
  assert.equal((await call(admin, "get", "/api/notifications")).status, 200);
  assert.equal((await call(superAdmin, "get", "/api/requests")).status, 200);
});
```

- [ ] **Step 2: Run** — FAIL (no gating yet: 200s where 403 expected).

- [ ] **Step 3: Implement**

`backend/src/features/featureGate.js`:

```js
import { classifyRoute } from "./registry.js";
import { FeatureFlagError, featureDisabledPayload, resolveEffectiveFlags } from "./featureFlagService.js";

/** Blocks routes owned by a feature that is disabled for the caller. Runs after authenticate. */
export const featureGate = async (req, res, next) => {
  const rule = classifyRoute(req.method, `${req.baseUrl}${req.path}`);
  if (!rule || rule.type !== "feature") return next();
  try {
    const flags = await resolveEffectiveFlags(req.user);
    if (flags === null) return next();
    if (rule.features.some((key) => flags[key] !== false)) return next();
    return res.status(403).json(featureDisabledPayload(rule.features[0]));
  } catch (error) {
    if (error instanceof FeatureFlagError) return res.status(error.status).json({ code: error.code, message: error.message });
    return next(error);
  }
};
```

`backend/src/app.js`: import `{ featureGate } from "./features/featureGate.js"` and change the loop to:

```js
for (const [mountPath, router] of PROTECTED_MOUNTS) app.use(mountPath, authenticate, featureGate, router);
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/featureGate.js backend/src/app.js backend/src/tests/featureGate.test.js
git commit -m "feat(features): enforce feature flags on every protected route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Feature flags API

**Files:**
- Create: `backend/src/routes/featureRoutes.js`
- Modify: `backend/src/app.js` (`PROTECTED_MOUNTS` gets `["/api/features", featureRoutes]`)
- Test: `backend/src/tests/featureRoutes.test.js`

**Interfaces:**
- Consumes: Task 8, Task 10.
- Produces HTTP:
  - `GET /api/features` (any authenticated) → `{ audience: "super_admin"|"admin"|"kitchen", flags, version, features: FEATURES }` — `flags` is all-true for super_admin and (until Phase 6) kitchen users.
  - `GET /api/features/admin` (super_admin) → `{ flags, version, updatedAt, features: [{ ...FEATURE, routes: describeFeature(key) }] }`
  - `PUT /api/features` (super_admin) body `{ expectedVersion, changes }` → `200 { flags, version, updatedAt, changed }`; errors per Decision 2.
  - `GET /api/features/audit?page=&scope=&targetId=` (super_admin) → `{ items, total, page, pageSize }`

- [ ] **Step 1: Failing tests**

`backend/src/tests/featureRoutes.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { invalidateFlagCache } from "../features/featureFlagService.js";

let app;
let admin;
let superAdmin;
let kitchenUser;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
beforeEach(async () => {
  await clearDb();
  invalidateFlagCache();
  admin = await createUser({ role: "admin" });
  superAdmin = await createUser({ role: "super_admin", name: "Root", email: "root@x.io" });
  kitchenUser = await createUser({ role: "user", godownId: (await createGodown("K"))._id });
});
after(stopDb);

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${who.token}`);

test("everyone can read their effective flags", async () => {
  const res = await as(admin, "get", "/api/features");
  assert.equal(res.status, 200);
  assert.equal(res.body.audience, "admin");
  assert.equal(res.body.version, 0);
  assert.equal(res.body.flags.reports, true);
  assert.equal(res.body.features.length, 10);
  assert.equal((await as(kitchenUser, "get", "/api/features")).body.audience, "kitchen");
  assert.equal((await as(superAdmin, "get", "/api/features")).body.audience, "super_admin");
});

test("only super_admin can read admin view, write and read audit", async () => {
  for (const [method, url] of [["get", "/api/features/admin"], ["put", "/api/features"], ["get", "/api/features/audit"]]) {
    assert.equal((await as(admin, method, url).send({})).status, 403, `${method} ${url}`);
    assert.equal((await as(kitchenUser, method, url).send({})).status, 403, `${method} ${url}`);
  }
});

test("admin view includes the route mapping", async () => {
  const res = await as(superAdmin, "get", "/api/features/admin");
  const po = res.body.features.find((f) => f.key === "purchase-orders");
  assert.ok(po.routes.mutations.includes("POST /api/procurement/purchase-orders"));
});

test("PUT updates, audits, and the change is visible to admins immediately", async () => {
  const put = await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { reports: false } });
  assert.equal(put.status, 200);
  assert.equal(put.body.version, 1);
  assert.deepEqual(put.body.changed, [{ key: "reports", previous: true, next: false }]);
  assert.equal((await as(admin, "get", "/api/features")).body.flags.reports, false);
  assert.equal((await as(admin, "get", "/api/reports/indents")).status, 403);

  const audit = await as(superAdmin, "get", "/api/features/audit?page=1");
  assert.equal(audit.body.total, 1);
  assert.equal(audit.body.items[0].actorEmail, "root@x.io");
});

test("PUT errors use the documented codes", async () => {
  const unknown = await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { billing: true } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, "UNKNOWN_FEATURE_KEY");
  assert.deepEqual(unknown.body.keys, ["billing"]);

  await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { reports: false } });
  const stale = await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { inventory: false } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
  assert.equal(stale.body.currentVersion, 1);

  const missingVersion = await as(superAdmin, "put", "/api/features").send({ changes: { reports: true } });
  assert.equal(missingVersion.body.code, "INVALID_VERSION");
});

test("audit page parameter is sanitised", async () => {
  const res = await as(superAdmin, "get", "/api/features/audit?page=-4");
  assert.equal(res.status, 200);
  assert.equal(res.body.page, 1);
});
```

- [ ] **Step 2: Run** — FAIL (404s).

- [ ] **Step 3: Implement**

`backend/src/routes/featureRoutes.js`:

```js
import express from "express";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { FEATURES, describeFeature } from "../features/registry.js";
import {
  DEFAULT_FLAGS, FeatureFlagError, listAudit, loadGlobalFlags, resolveEffectiveFlags, updateGlobalFlags
} from "../features/featureFlagService.js";
import { isAdminRole, isSuperAdmin } from "../utils/roles.js";

export const featureRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);

const sendError = (res, error) => {
  if (error instanceof FeatureFlagError) return res.status(error.status).json({ code: error.code, message: error.message, ...error.details });
  console.error("[features]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong." });
};

const audienceOf = (role) => (isSuperAdmin(role) ? "super_admin" : isAdminRole(role) ? "admin" : "kitchen");

featureRoutes.get("/", async (req, res) => {
  try {
    const effective = await resolveEffectiveFlags(req.user);
    const version = isAdminRole(req.user.role) ? (await loadGlobalFlags()).version : 0;
    return res.json({ audience: audienceOf(req.user.role), flags: effective || { ...DEFAULT_FLAGS }, version, features: FEATURES });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.get("/admin", superAdminOnly, async (_req, res) => {
  try {
    const state = await loadGlobalFlags();
    return res.json({ ...state, features: FEATURES.map((f) => ({ ...f, routes: describeFeature(f.key) })) });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.put("/", superAdminOnly, async (req, res) => {
  try {
    const me = await User.findById(req.user.sub).select("name email").lean();
    const { state, changed } = await updateGlobalFlags({
      actor: { id: req.user.sub, name: me?.name, email: me?.email },
      expectedVersion: req.body?.expectedVersion,
      changes: req.body?.changes
    });
    return res.json({ ...state, changed });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.get("/audit", superAdminOnly, async (req, res) => {
  try {
    const scope = ["global", "kitchen", "user"].includes(req.query.scope) ? req.query.scope : undefined;
    return res.json(await listAudit({ page: req.query.page, scope, targetId: req.query.targetId }));
  } catch (error) {
    return sendError(res, error);
  }
});
```

`backend/src/app.js`: import `{ featureRoutes } from "./routes/featureRoutes.js"` and append `["/api/features", featureRoutes]` to `PROTECTED_MOUNTS`.

- [ ] **Step 4: Run** — PASS (including the coverage test from Task 9 — `/api/features*` rules are `open`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/featureRoutes.js backend/src/app.js backend/src/tests/featureRoutes.test.js
git commit -m "feat(features): feature visibility API with audit history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
