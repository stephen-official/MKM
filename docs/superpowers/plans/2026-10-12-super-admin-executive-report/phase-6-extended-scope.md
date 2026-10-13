# Phase 6 — Extended scope (formerly out of scope)

Your human partner asked for these to be included. Each task pair is independent and can be cut without affecting Phases 0–5:

| Feature | Tasks |
|---|---|
| Per-kitchen and per-user feature overrides (+ kitchen app) | 28, 29 |
| Super-admin user management | 30, 31 |
| PDF export | 32 |
| Scheduled / emailed reports | 33, 34 |

Read `README.md` Decisions 2, 4 and 7 first.

---

### Task 28: Per-kitchen and per-user overrides (backend)

**Design (extends Decision 2):**
- Overrides are documents in the same `featureflags` collection with `_id` `"kitchen:<godownId>"` or `"user:<userId>"`, plus `scope` and `targetId`. Their `flags` hold only explicit values; a missing key means "inherit".
- `changes` values for overrides are `true`, `false` or `null` (`null` = remove the override → inherit). The global document still accepts only booleans.
- Kitchen overrides accept only keys whose `audiences` include `"kitchen"` (`indent`, `transfer-stock`, `requests`, `consumption`); others → 400 `FEATURE_NOT_FOR_AUDIENCE`. User overrides accept admin keys for admins and kitchen keys for kitchen users; super-admin targets → 400 `CANNOT_OVERRIDE_SUPER_ADMIN`. Unknown target → 404 `TARGET_NOT_FOUND`.
- Effective flags: admin = defaults ⊕ global ⊕ `user:<id>`; kitchen user = defaults ⊕ `kitchen:<godownId>` ⊕ `user:<id>`. Same 5 s cache per document; same stale/503 rules.
- Audit rows use `scope: "kitchen"|"user"`, `targetId`, and `previous`/`next` may be `null` (inherit).

**Files:**
- Modify: `backend/src/models/FeatureModels.js` (fields `scope`, `targetId`; audit change values nullable)
- Modify: `backend/src/features/featureFlagService.js` (per-document cache, override write, new `resolveEffectiveFlags`)
- Modify: `backend/src/routes/featureRoutes.js` (override endpoints; kitchen `GET /api/features` returns effective flags)
- Test: `backend/src/tests/featureOverrides.test.js`

**Interfaces:**
- Produces (`featureFlagService.js`): `overrideId(scope, targetId)`, `loadFlagsDoc(id, { now? }) → { flags (stored, partial), version, updatedAt }`, `updateOverride({ actor, scope, targetId, expectedVersion, changes }) → { state, changed }`, `listOverrides(scope) → [{ scope, targetId, flags, version, updatedAt }]`; `resolveEffectiveFlags(user)` now returns flags for kitchen users too (still `null` for super_admin).
- HTTP (super_admin): `GET /api/features/overrides?scope=kitchen|user`, `GET /api/features/overrides/:scope/:targetId`, `PUT /api/features/overrides/:scope/:targetId` body `{ expectedVersion, changes }`.

- [ ] **Step 1: Failing tests**

`backend/src/tests/featureOverrides.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { invalidateFlagCache } from "../features/featureFlagService.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  invalidateFlagCache();
  const a = await createGodown("Kitchen A");
  const b = await createGodown("Kitchen B");
  ctx = {
    a, b,
    superAdmin: await createUser({ role: "super_admin" }),
    admin: await createUser({ role: "admin" }),
    admin2: await createUser({ role: "admin" }),
    cookA: await createUser({ role: "user", godownId: a._id }),
    cookA2: await createUser({ role: "user", godownId: a._id }),
    cookB: await createUser({ role: "user", godownId: b._id })
  };
});

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);
const put = (scope, id, body) => as("superAdmin", "put", `/api/features/overrides/${scope}/${id}`).send(body);

test("kitchen override disables a kitchen feature for that kitchen's users only", async () => {
  const res = await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { requests: false } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const blocked = await as("cookA", "get", "/api/requests");
  assert.equal(blocked.status, 403);
  assert.deepEqual(blocked.body, { code: "FEATURE_DISABLED", feature: "requests", message: "This feature is currently disabled." });
  assert.equal((await as("cookB", "get", "/api/requests")).status, 200);
  assert.equal((await as("admin", "get", "/api/requests")).status, 200, "kitchen override never affects admins");
  assert.equal((await as("cookA", "get", "/api/features")).body.flags.requests, false);
});

test("user override beats kitchen override; null restores inheritance", async () => {
  await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { requests: false } });
  await put("user", ctx.cookA2.user._id, { expectedVersion: 0, changes: { requests: true } });
  assert.equal((await as("cookA2", "get", "/api/requests")).status, 200);
  assert.equal((await as("cookA", "get", "/api/requests")).status, 403);
  await put("user", ctx.cookA2.user._id, { expectedVersion: 1, changes: { requests: null } });
  assert.equal((await as("cookA2", "get", "/api/requests")).status, 403);
});

test("per-admin override beats the global setting", async () => {
  await as("superAdmin", "put", "/api/features").send({ expectedVersion: 0, changes: { reports: false } });
  await put("user", ctx.admin2.user._id, { expectedVersion: 0, changes: { reports: true } });
  assert.equal((await as("admin", "get", "/api/reports/indents")).status, 403);
  assert.equal((await as("admin2", "get", "/api/reports/indents")).status, 200);
});

test("validation: audience, targets, super-admins, versions", async () => {
  assert.equal((await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { reports: false } })).body.code, "FEATURE_NOT_FOR_AUDIENCE");
  assert.equal((await put("user", ctx.cookA.user._id, { expectedVersion: 0, changes: { godowns: false } })).body.code, "FEATURE_NOT_FOR_AUDIENCE");
  assert.equal((await put("user", ctx.superAdmin.user._id, { expectedVersion: 0, changes: { reports: false } })).body.code, "CANNOT_OVERRIDE_SUPER_ADMIN");
  const missing = await put("kitchen", "65f0c0ffee0000000000abcd", { expectedVersion: 0, changes: { requests: false } });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, "TARGET_NOT_FOUND");
  assert.equal((await put("team", ctx.a._id, { expectedVersion: 0, changes: { requests: false } })).status, 400);
  await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { requests: false } });
  assert.equal((await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { consumption: false } })).status, 409);
  assert.equal((await put("kitchen", ctx.a._id, { expectedVersion: 1, changes: { requests: "off" } })).body.code, "INVALID_FEATURE_VALUE");
});

test("listing and audit show override scope and inherit values", async () => {
  await put("kitchen", ctx.a._id, { expectedVersion: 0, changes: { requests: false } });
  await put("kitchen", ctx.a._id, { expectedVersion: 1, changes: { requests: null } });
  const list = await as("superAdmin", "get", "/api/features/overrides?scope=kitchen");
  assert.equal(list.body.length, 1);
  assert.deepEqual(list.body[0].flags, {});
  const audit = await as("superAdmin", "get", `/api/features/audit?scope=kitchen&targetId=${ctx.a._id}`);
  assert.deepEqual(audit.body.items[0].changes, [{ key: "requests", previous: false, next: null }]);
  assert.deepEqual(audit.body.items[1].changes, [{ key: "requests", previous: null, next: false }]);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Model changes**

In `FeatureModels.js`:
- add to `featureFlagsSchema`: `scope: { type: String, enum: ["global", "kitchen", "user"], default: "global" }`, `targetId: { type: String, default: null }`, and `featureFlagsSchema.index({ scope: 1, targetId: 1 });`
- `changeSchema`: `previous: { type: Boolean, default: null }`, `next: { type: Boolean, default: null }` (no longer `required`).

- [ ] **Step 4: Service changes**

In `featureFlagService.js`:

1. Replace the single `cache` with a per-document map and generalise loading:

```js
const caches = new Map(); // id → { state, loadedAt }

export const invalidateFlagCache = (id) => {
  if (id) caches.delete(id);
  else caches.clear();
};

/** Stored (partial) flags for any flags document, cached like the global one. */
export const loadFlagsDoc = async (id, { now = Date.now() } = {}) => {
  const cached = caches.get(id);
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) return cached.state;
  try {
    const doc = await FeatureFlags.findById(id).lean();
    const flags = {};
    for (const key of FEATURE_KEYS) if (typeof doc?.flags?.[key] === "boolean") flags[key] = doc.flags[key];
    const state = { flags, version: doc?.version ?? 0, updatedAt: doc?.updatedAt ?? null };
    caches.set(id, { state, loadedAt: now });
    return state;
  } catch (error) {
    if (cached && now - cached.loadedAt < STALE_LIMIT_MS) {
      console.warn(`[features] using cached ${id}; reload failed: ${error.message}`);
      return cached.state;
    }
    throw unavailable();
  }
};

export const loadGlobalFlags = async (opts) => {
  const stored = await loadFlagsDoc(GLOBAL_FLAGS_ID, opts);
  return { ...stored, flags: { ...DEFAULT_FLAGS, ...stored.flags } };
};
```

Delete the old `toState`-based `loadGlobalFlags` and `let cache`. Keep `toState` for `updateGlobalFlags`'s return value. In `writeFlagsDocument` change the final `invalidateFlagCache();` to `invalidateFlagCache(id);`. The Task 10 tests still pass (they call `invalidateFlagCache()` with no argument, which clears all).

2. Allow `null` values for overrides. Change `validateChanges(changes)` to `validateChanges(changes, { allowNull = false } = {})` and its value check to:

```js
  const invalid = keys.filter((key) => !(typeof changes[key] === "boolean" || (allowNull && changes[key] === null)));
```

In `writeFlagsDocument` add an `allowNull = false` parameter, pass it to `validateChanges`, and compute `before` from stored values only when `allowNull` (overrides compare against stored, not defaults):

```js
      const before = allowNull ? {} : { ...baseFlags };
      for (const key of FEATURE_KEYS) if (typeof stored[key] === "boolean") before[key] = stored[key];
      const changed = Object.entries(changes)
        .filter(([key, next]) => (before[key] ?? null) !== next)
        .map(([key, next]) => ({ key, previous: before[key] ?? null, next }));
```

and build the update with `$unset` for `null`:

```js
      const $set = { ...extraFields };
      const $unset = {};
      for (const { key, next } of changed) {
        if (next === null) $unset[`flags.${key}`] = "";
        else $set[`flags.${key}`] = next;
      }
      const update = { $set, $inc: { version: 1 } };
      if (Object.keys($unset).length) update.$unset = $unset;
```

(use `update` in the `findOneAndUpdate` call).

3. Add override functions:

```js
import { FEATURES } from "./registry.js";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import mongoose from "mongoose";

const KITCHEN_KEYS = new Set(FEATURES.filter((f) => f.audiences.includes("kitchen")).map((f) => f.key));
const ADMIN_KEYS = new Set(FEATURES.filter((f) => f.audiences.includes("admin")).map((f) => f.key));

export const overrideId = (scope, targetId) => `${scope}:${String(targetId).toLowerCase()}`;

const resolveTarget = async (scope, targetId) => {
  if (!["kitchen", "user"].includes(scope)) throw new FeatureFlagError(400, "INVALID_SCOPE", 'scope must be "kitchen" or "user".');
  if (!mongoose.isValidObjectId(targetId)) throw new FeatureFlagError(404, "TARGET_NOT_FOUND", "No such kitchen or user.");
  if (scope === "kitchen") {
    if (!(await Godown.exists({ _id: targetId }))) throw new FeatureFlagError(404, "TARGET_NOT_FOUND", "No such kitchen.");
    return { allowed: KITCHEN_KEYS };
  }
  const user = await User.findById(targetId).select("role").lean();
  if (!user) throw new FeatureFlagError(404, "TARGET_NOT_FOUND", "No such user.");
  if (isSuperAdmin(user.role)) throw new FeatureFlagError(400, "CANNOT_OVERRIDE_SUPER_ADMIN", "Super-admins always see every feature.");
  return { allowed: isAdminRole(user.role) ? ADMIN_KEYS : KITCHEN_KEYS };
};

export const updateOverride = async ({ actor, scope, targetId, expectedVersion, changes }) => {
  validateChanges(changes, { allowNull: true });
  const { allowed } = await resolveTarget(scope, targetId);
  const wrong = Object.keys(changes).filter((key) => !allowed.has(key));
  if (wrong.length) throw new FeatureFlagError(400, "FEATURE_NOT_FOR_AUDIENCE", `Not applicable here: ${wrong.join(", ")}`, { keys: wrong });
  const id = overrideId(scope, targetId);
  const { doc, changed } = await writeFlagsDocument({
    id, scope, targetId: String(targetId).toLowerCase(), actor, expectedVersion, changes, allowNull: true,
    extraFields: { scope, targetId: String(targetId).toLowerCase() }
  });
  const flags = {};
  for (const key of FEATURE_KEYS) if (typeof doc?.flags?.[key] === "boolean") flags[key] = doc.flags[key];
  return { state: { flags, version: doc?.version ?? expectedVersion, updatedAt: doc?.updatedAt ?? null }, changed };
};

export const listOverrides = async (scope) => {
  const docs = await FeatureFlags.find({ scope }).sort({ targetId: 1 }).lean();
  return docs.map((d) => ({ scope: d.scope, targetId: d.targetId, flags: Object.fromEntries(Object.entries(d.flags || {}).filter(([k, v]) => FEATURE_KEYS.includes(k) && typeof v === "boolean")), version: d.version, updatedAt: d.updatedAt }));
};

export const resolveEffectiveFlags = async (user) => {
  if (!user || isSuperAdmin(user.role)) return null;
  const own = await loadFlagsDoc(overrideId("user", user.sub));
  if (isAdminRole(user.role)) return { ...(await loadGlobalFlags()).flags, ...own.flags };
  const kitchen = user.godownId ? await loadFlagsDoc(overrideId("kitchen", user.godownId)) : { flags: {} };
  const effective = { ...DEFAULT_FLAGS };
  for (const key of KITCHEN_KEYS) {
    if (key in kitchen.flags) effective[key] = kitchen.flags[key];
    if (key in own.flags) effective[key] = own.flags[key];
  }
  return effective;
};
```

(Merge the imports with the existing ones at the top; remove the old `resolveEffectiveFlags`.)

Update the Task 10 test `effective flags: …` expectation: kitchen users now get an object (`assert.equal((await resolveEffectiveFlags({ role: "user", godownId: "g" })).reports, true)`), and the Task 11 test `global flags never gate kitchen users` still passes (global is not consulted for kitchens). Change `godownId: "g"` to a valid ObjectId string (`"65f0c0ffee0000000000abcd"`) since `overrideId` lower-cases it.

- [ ] **Step 5: Routes**

In `featureRoutes.js`:
- `GET /` — return `flags: effective || { ...DEFAULT_FLAGS }` (unchanged code works; kitchens now get real values) and `version: 0` for kitchens.
- add:

```js
featureRoutes.get("/overrides", superAdminOnly, async (req, res) => {
  try {
    if (!["kitchen", "user"].includes(req.query.scope)) return res.status(400).json({ code: "INVALID_SCOPE", message: 'scope must be "kitchen" or "user".' });
    return res.json(await listOverrides(req.query.scope));
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.get("/overrides/:scope/:targetId", superAdminOnly, async (req, res) => {
  try {
    if (!["kitchen", "user"].includes(req.params.scope)) return res.status(400).json({ code: "INVALID_SCOPE", message: 'scope must be "kitchen" or "user".' });
    return res.json(await loadFlagsDoc(overrideId(req.params.scope, req.params.targetId)));
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.put("/overrides/:scope/:targetId", superAdminOnly, async (req, res) => {
  try {
    const me = await User.findById(req.user.sub).select("name email").lean();
    const { state, changed } = await updateOverride({
      actor: { id: req.user.sub, name: me?.name, email: me?.email },
      scope: req.params.scope, targetId: req.params.targetId,
      expectedVersion: req.body?.expectedVersion, changes: req.body?.changes
    });
    return res.json({ ...state, changed });
  } catch (error) {
    return sendError(res, error);
  }
});
```

(Register `/overrides` routes before nothing conflicting — `/admin` and `/audit` are distinct literals.)

- [ ] **Step 6: Run** — `npm --prefix backend test` → PASS (all feature tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/FeatureModels.js backend/src/features/featureFlagService.js backend/src/routes/featureRoutes.js \
  backend/src/tests/featureOverrides.test.js backend/src/tests/featureFlagService.test.js
git commit -m "feat(features): per-kitchen and per-user overrides with inheritance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 29: Overrides UI (admin-web) and kitchen app support (client-web)

**Files:**
- Create: `admin-web/src/pages/features/OverridesPanel.jsx`, `admin-web/src/pages/features/overrides.js`, `admin-web/src/pages/features/overrides.test.js`
- Modify: `admin-web/src/pages/FeatureVisibilityPage.jsx` (tabs: "All admins" | "Per kitchen" | "Per user")
- Create: `client-web/src/features.js`, `client-web/src/features.test.js` (add vitest to client-web: `npm --prefix client-web install --save-dev vitest@2`, script `"test": "vitest run"`, and append `&& npm --prefix client-web test` to the root `test` script)
- Modify: `client-web/src/api.js` (FEATURE_DISABLED toast once per feature), `client-web/src/components/kitchen/KitchenBottomNav.jsx` (accept `hiddenTabs`), `client-web/src/components/ClientStore.jsx` (load flags, hide tabs, skip disabled fetches), `client-web/src/components/kitchen/KitchenMore.jsx` (hide Transfers / Activity entries)

**Interfaces:**
- Consumes: Task 28 endpoints; `GET /api/features` (kitchen audience).
- Produces (`admin-web/.../overrides.js`): `TRI_STATE = ["inherit", "shown", "hidden"]`, `toTri(value)`, `fromTri(tri)`, `overrideChanges(saved, edits)` (values `true|false|null`), `effectivePreview({ base, kitchen?, user? })`.
- Produces (`client-web/src/features.js`): `KITCHEN_TAB_FEATURES = { usage: "consumption", requests: "indent", activity: "consumption", transfers: "transfer-stock", "request-builder": "indent", "receive-delivery": "indent" }`, `hiddenTabs(flags) → Set<tabId>`, `fetchKitchenFlags() → Promise<flags>`, `isFeatureOn(flags, key)`.

- [ ] **Step 1: Failing tests**

`admin-web/src/pages/features/overrides.test.js`:

```js
import { describe, expect, it } from "vitest";
import { effectivePreview, fromTri, overrideChanges, toTri } from "./overrides.js";

describe("override helpers", () => {
  it("maps tri-state values", () => {
    expect(toTri(undefined)).toBe("inherit");
    expect(toTri(true)).toBe("shown");
    expect(toTri(false)).toBe("hidden");
    expect(fromTri("inherit")).toBe(null);
    expect(fromTri("hidden")).toBe(false);
  });
  it("sends only changed keys, using null for inherit", () => {
    expect(overrideChanges({ requests: false }, { requests: "inherit", consumption: "hidden" })).toEqual({ requests: null, consumption: false });
    expect(overrideChanges({ requests: false }, { requests: "hidden" })).toEqual({});
  });
  it("previews effective values: user > kitchen > base", () => {
    expect(effectivePreview({ base: { requests: true }, kitchen: { requests: false }, user: {} }).requests).toBe(false);
    expect(effectivePreview({ base: { requests: true }, kitchen: { requests: false }, user: { requests: true } }).requests).toBe(true);
  });
});
```

`client-web/src/features.test.js`:

```js
import { describe, expect, it } from "vitest";
import { hiddenTabs, isFeatureOn } from "./features.js";

describe("kitchen features", () => {
  it("hides tabs whose feature is off; unknown flags mean on", () => {
    expect([...hiddenTabs({ consumption: false, indent: true })].sort()).toEqual(["activity", "usage"]);
    expect(hiddenTabs(null).size).toBe(0);
    expect(isFeatureOn(undefined, "indent")).toBe(true);
  });
});
```

Run: `npm --prefix admin-web test && npm --prefix client-web test` → FAIL.

- [ ] **Step 2: Helpers**

`admin-web/src/pages/features/overrides.js`:

```js
export const TRI_STATE = ["inherit", "shown", "hidden"];
export const toTri = (value) => (value === true ? "shown" : value === false ? "hidden" : "inherit");
export const fromTri = (tri) => (tri === "shown" ? true : tri === "hidden" ? false : null);

export const overrideChanges = (saved, edits) =>
  Object.fromEntries(Object.entries(edits)
    .map(([key, tri]) => [key, fromTri(tri)])
    .filter(([key, value]) => (saved[key] ?? null) !== value));

export const effectivePreview = ({ base, kitchen = {}, user = {} }) => {
  const out = { ...base };
  for (const layer of [kitchen, user]) for (const [k, v] of Object.entries(layer)) if (typeof v === "boolean") out[k] = v;
  return out;
};
```

`client-web/src/features.js`:

```js
import { api } from "./api";

export const KITCHEN_TAB_FEATURES = Object.freeze({
  usage: "consumption",
  activity: "consumption",
  requests: "indent",
  "request-builder": "indent",
  "receive-delivery": "indent",
  transfers: "transfer-stock"
});

export const isFeatureOn = (flags, key) => !flags || flags[key] !== false;

export const hiddenTabs = (flags) =>
  new Set(Object.entries(KITCHEN_TAB_FEATURES).filter(([, key]) => !isFeatureOn(flags, key)).map(([tab]) => tab));

export const fetchKitchenFlags = async () => {
  const { data } = await api.get("/features");
  return data.flags;
};
```

Before relying on the tab map, verify it: run `grep -n "api\.\(get\|post\|put\|delete\)" client-web/src/components/ClientStore.jsx client-web/src/components/kitchen/*.jsx` and confirm each tab's calls belong to the mapped feature (README Decision 3 table). Current calls (as of `946682b`): usage → `/orders`, `/consumptions`, `/daily-usage` (consumption); requests/request-builder/receive-delivery → `/indent-requests…` (indent); transfers → `/user-transfers…` (transfer-stock); activity → `/consumptions/me`, `/daily-usage/me` (consumption). `POST /requests` (usage approval requests, feature `requests`) is not a tab: when disabled the server answers `FEATURE_DISABLED` and the toast below explains it.

Run the tests → PASS.

- [ ] **Step 3: Kitchen app wiring**

`client-web/src/api.js` — inside the response error interceptor, before the 401 handling:

```js
    if (error.response?.status === 403 && error.response.data?.code === "FEATURE_DISABLED") {
      const key = `mkm:feature-toast:${error.response.data.feature}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        toast.error("This feature is currently disabled for your kitchen.");
      }
    }
```

(import `{ toast } from "react-hot-toast"` — client-web already uses it in `Login.jsx`.)

`KitchenBottomNav.jsx` — add prop `hiddenTabs = new Set()` and filter: `{TABS.filter(({ id }) => !hiddenTabs.has(id)).map(...)}`.

`ClientStore.jsx`:
- `import { fetchKitchenFlags, hiddenTabs as computeHidden, isFeatureOn } from "../features";`
- state: `const [flags, setFlags] = useState(null);` and on mount (next to the other initial fetches): `fetchKitchenFlags().then(setFlags).catch(() => setFlags(null));` plus refetch on `window` `focus`.
- `const hidden = useMemo(() => computeHidden(flags), [flags]);`
- pass `hiddenTabs={hidden}` to `KitchenBottomNav`; pass `hidden` to `KitchenMore` so it hides its Transfers/Activity entries.
- guard navigation: at the top of `setActiveTab`, `if (hidden.has(nextView)) { toast.error("This feature is currently disabled for your kitchen."); return setActiveTabState("home"); }`; and an effect `useEffect(() => { if (hidden.has(activeTab)) setActiveTabState("home"); }, [hidden, activeTab]);`
- skip disabled fetches: wrap the initial loads — `if (isFeatureOn(flags, "indent")) fetchIndents();`, `if (isFeatureOn(flags, "consumption")) { fetch consumptions/me; fetch daily-usage/me }`, `if (isFeatureOn(flags, "requests")) fetch /requests` — and treat a disabled feature's list as `[]`.

Read `ClientStore.jsx` around the existing `useEffect` that performs the first loads before editing; keep its structure.

- [ ] **Step 4: Admin overrides panel**

`admin-web/src/pages/features/OverridesPanel.jsx`:

```jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { Banner, Button, DataTable, EmptyState, Field } from "../../components/ui/index.jsx";
import { useToast } from "../../useToast.js";
import { TRI_STATE, effectivePreview, overrideChanges, toTri } from "./overrides.js";

const TRI_LABEL = { inherit: "Inherit", shown: "Shown", hidden: "Hidden" };

/** scope: "kitchen" | "user". targets: [{ id, label, audience: "admin"|"kitchen", kitchenId? }] */
export function OverridesPanel({ scope, targets, features, globalFlags, onSaved }) {
  const { showToast } = useToast();
  const [targetId, setTargetId] = useState("");
  const [doc, setDoc] = useState(null);
  const [kitchenDoc, setKitchenDoc] = useState(null);
  const [edits, setEdits] = useState({});
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const target = targets.find((t) => t.id === targetId);
  const keys = useMemo(() => features.filter((f) => f.audiences.includes(target?.audience === "admin" ? "admin" : "kitchen")), [features, target]);

  const load = useCallback(async () => {
    if (!targetId) return;
    const { data } = await api.get(`/features/overrides/${scope}/${targetId}`);
    setDoc(data);
    setEdits({});
    setConflict(false);
    const kitchenId = target?.kitchenId;
    if (scope === "user" && target?.audience === "kitchen" && kitchenId) {
      setKitchenDoc((await api.get(`/features/overrides/kitchen/${kitchenId}`)).data);
    } else setKitchenDoc(null);
  }, [scope, targetId, target]);

  useEffect(() => { load().catch(() => showToast("Could not load overrides.", "error")); }, [load, showToast]);

  const changes = doc ? overrideChanges(doc.flags, edits) : {};
  const base = target?.audience === "admin" ? globalFlags : Object.fromEntries(keys.map((f) => [f.key, true]));
  const preview = effectivePreview({ base, kitchen: kitchenDoc?.flags || (scope === "kitchen" ? { ...doc?.flags } : {}), user: scope === "user" ? { ...doc?.flags } : {} });
  const previewAfter = effectivePreview({ base: preview, [scope === "kitchen" ? "kitchen" : "user"]: Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== null)) });

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/features/overrides/${scope}/${targetId}`, { expectedVersion: doc.version, changes });
      setDoc({ flags: data.flags, version: data.version, updatedAt: data.updatedAt });
      setEdits({});
      showToast("Overrides saved.", "success");
      onSaved?.();
    } catch (error) {
      if (error.response?.data?.code === "VERSION_CONFLICT") setConflict(true);
      else showToast(error.response?.data?.message || "Could not save overrides.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overrides">
      <Field label={scope === "kitchen" ? "Kitchen" : "User"}>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Choose…</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>
      {!targetId && <EmptyState title={`Choose a ${scope} to see its overrides`}>Overrides take priority over the general setting.</EmptyState>}
      {conflict && <Banner variant="warn">Someone else changed these overrides. <Button size="sm" variant="ghost" onClick={load}>Reload</Button></Banner>}
      {doc && (
        <>
          <DataTable>
            <thead><tr><th scope="col">Feature</th><th scope="col">Override</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {keys.map((f) => {
                const tri = edits[f.key] ?? toTri(doc.flags[f.key]);
                return (
                  <tr key={f.key}>
                    <th scope="row">{f.label}</th>
                    <td>
                      <select aria-label={`${f.label} override`} value={tri} onChange={(e) => setEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}>
                        {TRI_STATE.map((v) => <option key={v} value={v}>{TRI_LABEL[v]}</option>)}
                      </select>
                    </td>
                    <td>{previewAfter[f.key] === false ? "Hidden" : "Shown"}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          <div className="pager">
            <Button variant="ghost" disabled={!Object.keys(changes).length || saving} onClick={() => setEdits({})}>Discard</Button>
            <Button disabled={!Object.keys(changes).length || saving || conflict} onClick={save}>Save overrides</Button>
          </div>
        </>
      )}
    </div>
  );
}
```

In `FeatureVisibilityPage.jsx`, add scope tabs above the toggle table. `Tabs` takes `items: [{ value, label }]`, `value`, `onChange`:

```jsx
const [scope, setScope] = useState("global");
const [kitchens, setKitchens] = useState([]);
useEffect(() => { api.get("/inventory/godowns").then(({ data }) => setKitchens(data)).catch(() => setKitchens([])); }, []);
const kitchenTargets = kitchens.map((k) => ({ id: String(k._id), label: k.active === false ? `${k.name} (inactive)` : k.name, audience: "kitchen" }));
const SCOPE_TABS = [{ value: "global", label: "All admins" }, { value: "kitchen", label: "Per kitchen" }];
// …in the JSX, under the info banner:
<Tabs items={SCOPE_TABS} value={scope} onChange={setScope} label="Settings scope" />
{scope === "global" && (/* existing toggle-table Card */)}
{scope === "kitchen" && (
  <Card><OverridesPanel scope="kitchen" targets={kitchenTargets} features={admin.features} globalFlags={admin.flags} onSaved={() => loadAudit(1)} /></Card>
)}
```

The **Per user** tab is added in Task 31, once the Users API (Task 30) exists to list targets. If Tasks 30–31 are cut, ship per-kitchen only (per-user overrides remain available through the API).

Update the Task 15 table copy: the "Also used by" badge now reads "Kitchen app (set per kitchen)".

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run build` → PASS.
Manual: disable Requests for Kitchen A → a Kitchen A cook gets one toast when the app tries to use it, the Requests (supply) tab hides only if `indent` is disabled; disable Consumption for Kitchen A → the "Use" tab and Activity disappear on next focus; Kitchen B is unaffected; per-user override re-enables for one cook.

- [ ] **Step 6: Commit**

```bash
git add admin-web/src/pages/features admin-web/src/pages/FeatureVisibilityPage.jsx client-web package.json
git commit -m "feat(features): manage overrides per kitchen and per user; kitchen app respects them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 30: User management API (super-admin)

**Files:**
- Modify: `backend/src/utils/mailer.js` (shared transport, `mailer` object, invite email)
- Create: `backend/src/models/AdminAuditModels.js` (`UserAdminAudit`, append-only)
- Create: `backend/src/routes/userRoutes.js`
- Modify: `backend/src/app.js` (`PROTECTED_MOUNTS` += `["/api/users", userRoutes]`), `backend/src/routes/authRoutes.js` (use `mailer.sendResetEmail`)
- Test: `backend/src/tests/userRoutes.test.js`

**Interfaces:**
- Produces (`mailer.js`): `mailer = { sendResetEmail(email, token), sendInviteEmail({ email, name, token }), sendReportEmail({ to, bcc, subject, text, attachments }) }` (the last is implemented in Task 33; define it now as throwing `new Error("not implemented")`), plus the existing named `sendResetEmail` delegating to `mailer.sendResetEmail` for compatibility. Tests stub methods with `t.mock.method(mailer, "sendInviteEmail", …)`.
- HTTP (all super_admin):
  - `GET /api/users?q&role&godownId&active&page&pageSize` → `{ items: [{ _id, name, email, role, godownId, kitchenName, active, createdAt, updatedAt }], total, page, pageSize }` (`pageSize` default 25, max 100, or `all` → max 1000); never returns hashes or tokens; sorted name (case-insensitive) then `_id`.
  - `POST /api/users` `{ name, email, role, godownId?, confirmSuperAdmin? }` → `201 { user, inviteSent }`.
  - `PATCH /api/users/:id` `{ expectedUpdatedAt, name?, role?, godownId?, active?, confirmSuperAdmin? }` → `200 { user }`.
  - `POST /api/users/:id/send-reset` → `200 { sent }`.
  - `GET /api/users/audit?page` → `{ items, total, page, pageSize }`.
- Error codes: `INVALID_INPUT`, `EMAIL_EXISTS` (409), `KITCHEN_REQUIRED`, `INVALID_KITCHEN`, `CONFIRMATION_REQUIRED`, `CANNOT_MODIFY_SELF`, `LAST_SUPER_ADMIN` (409), `VERSION_CONFLICT` (409), `USER_NOT_FOUND` (404).

Rules: invites set a random unusable password and a reset token valid 24 h (the existing reset-password endpoint then works); a failed email still creates the user (`inviteSent: false`). Changing `role`, `godownId` or `active` clears the refresh token (access is re-checked on every request by `authenticate`, so it takes effect immediately). A super-admin cannot change their own role or deactivate themselves. The last active super-admin cannot be demoted or deactivated (checked inside a transaction). Creating or promoting to `super_admin` requires `confirmSuperAdmin: true`.

- [ ] **Step 1: Failing tests**

`backend/src/tests/userRoutes.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import mongoose from "mongoose";
import { mailer } from "../utils/mailer.js";
import { User } from "../models/User.js";
import { assertNotLastActiveSuperAdmin } from "../routes/userRoutes.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async (t) => {
  await clearDb();
  t.mock.method(mailer, "sendInviteEmail", async () => {});
  t.mock.method(mailer, "sendResetEmail", async () => {});
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    kitchen,
    root: await createUser({ role: "super_admin", name: "Root", email: "root@x.io" }),
    admin: await createUser({ role: "admin", name: "Amy", email: "amy@x.io" }),
    cook: await createUser({ role: "user", name: "cook", email: "cook@x.io", godownId: kitchen._id })
  };
});

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);

test("only super-admins can manage users", async () => {
  assert.equal((await as("admin", "get", "/api/users")).status, 403);
  assert.equal((await as("cook", "post", "/api/users").send({})).status, 403);
});

test("list is sorted, filtered and never leaks secrets", async () => {
  const res = await as("root", "get", "/api/users");
  assert.deepEqual(res.body.items.map((u) => u.name), ["Amy", "cook", "Root"]);
  for (const u of res.body.items) for (const secret of ["passwordHash", "refreshToken", "resetToken", "resetTokenExpiry"]) assert.equal(secret in u, false);
  assert.equal(res.body.items.find((u) => u.name === "cook").kitchenName, "Kitchen A");
  assert.equal((await as("root", "get", "/api/users?role=admin")).body.total, 1);
  assert.equal((await as("root", "get", "/api/users?q=AM")).body.items[0].email, "amy@x.io");
  assert.equal((await as("root", "get", `/api/users?q=${encodeURIComponent(".*")}`)).body.total, 0, "regex is escaped");
});

test("create users with invites; validation", async (t) => {
  const ok = await as("root", "post", "/api/users").send({ name: "New Cook", email: "New@X.io", role: "user", godownId: ctx.kitchen._id });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.inviteSent, true);
  assert.equal(ok.body.user.email, "new@x.io");
  assert.equal(mailer.sendInviteEmail.mock.callCount(), 1);
  const saved = await User.findOne({ email: "new@x.io" });
  assert.ok(saved.resetTokenExpiry > new Date(Date.now() + 23 * 3_600_000));

  assert.equal((await as("root", "post", "/api/users").send({ name: "Dup", email: "amy@x.io", role: "admin" })).body.code, "EMAIL_EXISTS");
  assert.equal((await as("root", "post", "/api/users").send({ name: "K", email: "k@x.io", role: "user" })).body.code, "KITCHEN_REQUIRED");
  assert.equal((await as("root", "post", "/api/users").send({ name: "S", email: "s@x.io", role: "super_admin" })).body.code, "CONFIRMATION_REQUIRED");
  assert.equal((await as("root", "post", "/api/users").send({ name: "S", email: "s@x.io", role: "super_admin", confirmSuperAdmin: true })).status, 201);

  t.mock.method(mailer, "sendInviteEmail", async () => { throw new Error("smtp down"); });
  const noMail = await as("root", "post", "/api/users").send({ name: "Z", email: "z@x.io", role: "admin" });
  assert.equal(noMail.status, 201);
  assert.equal(noMail.body.inviteSent, false);
});

test("role change revokes sessions and applies on the next request", async () => {
  const target = await User.findById(ctx.admin.user._id).lean();
  const res = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, role: "user", godownId: ctx.kitchen._id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await User.findById(target._id)).refreshToken, null);
  assert.equal((await as("admin", "get", "/api/consumptions")).status, 403);
});

test("concurrent edits conflict", async () => {
  const target = await User.findById(ctx.admin.user._id).lean();
  await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Amy A" });
  const stale = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Amy B" });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
});

test("guards: you cannot demote or deactivate yourself, but can rename yourself", async () => {
  const me = await User.findById(ctx.root.user._id).lean();
  assert.equal((await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, role: "admin" })).body.code, "CANNOT_MODIFY_SELF");
  assert.equal((await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, active: false })).body.code, "CANNOT_MODIFY_SELF");
  const renamed = await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, name: "Root 2" });
  assert.equal(renamed.status, 200);
});

test("assertNotLastActiveSuperAdmin: refuses to remove the last active super-admin", async () => {
  const session = await mongoose.startSession();
  try {
    // Only root is an active super-admin; removing root would leave none.
    await assert.rejects(
      session.withTransaction(() => assertNotLastActiveSuperAdmin(session, ctx.root.user._id, ctx.root.user._id)),
      (e) => e.code === "LAST_SUPER_ADMIN"
    );
    const two = await createUser({ role: "super_admin", email: "two@x.io" });
    await session.withTransaction(() => assertNotLastActiveSuperAdmin(session, two.user._id, ctx.root.user._id));
    await assert.rejects(
      session.withTransaction(() => assertNotLastActiveSuperAdmin(session, two.user._id, ctx.admin.user._id)),
      (e) => e.code === "FORBIDDEN",
      "an actor who is no longer an active super-admin is refused"
    );
  } finally {
    await session.endSession();
  }
});

test("two super-admins demoting each other at the same time leaves one super-admin", async () => {
  const two = await createUser({ role: "super_admin", email: "two@x.io" });
  const rootDoc = await User.findById(ctx.root.user._id).lean();
  const twoDoc = await User.findById(two.user._id).lean();
  const results = await Promise.all([
    as("root", "patch", `/api/users/${two.user._id}`).send({ expectedUpdatedAt: twoDoc.updatedAt, role: "admin" }),
    request(app).patch(`/api/users/${ctx.root.user._id}`).set("Authorization", `Bearer ${two.token}`)
      .send({ expectedUpdatedAt: rootDoc.updatedAt, role: "admin" })
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.body)));
  assert.equal(await User.countDocuments({ role: "super_admin", active: true }), 1);
});

test("audit rows record before/after without secrets", async () => {
  await as("root", "post", "/api/users").send({ name: "A2", email: "a2@x.io", role: "admin" });
  const audit = await as("root", "get", "/api/users/audit");
  assert.equal(audit.body.items[0].action, "create");
  assert.equal(JSON.stringify(audit.body.items[0]).includes("passwordHash"), false);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Mailer refactor**

`backend/src/utils/mailer.js`:

```js
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const createTransport = () => nodemailer.createTransport({ service: "gmail", auth: { user: env.emailUser, pass: env.emailPass } });
const from = () => `"Montessori Kitchen" <${env.emailUser}>`;
const resetLink = (token) => `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const mailer = {
  /** Password reset (15 minutes). */
  async sendResetEmail(email, token) {
    await createTransport().sendMail({
      from: from(), to: email, subject: "Password Reset Token",
      text: `Your reset token is: ${token}. Reset link: ${resetLink(token)}`,
      html: `<p>Your reset token is <strong>${escapeHtml(token)}</strong>.</p><p><a href="${resetLink(token)}">Reset your password</a>. This token expires in 15 minutes.</p>`
    });
  },
  /** New account invitation (24 hours). */
  async sendInviteEmail({ email, name, token }) {
    await createTransport().sendMail({
      from: from(), to: email, subject: "Your Montessori Kitchen account",
      text: `Hello ${name}, an account was created for you. Set your password with this token within 24 hours: ${token}. Link: ${resetLink(token)}`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>An account was created for you. Set your password within 24 hours using token <strong>${escapeHtml(token)}</strong> or <a href="${resetLink(token)}">this link</a>.</p>`
    });
  },
  async sendReportEmail() {
    throw new Error("sendReportEmail is implemented in Task 33");
  }
};

/** Kept for existing imports. */
export const sendResetEmail = (email, token) => mailer.sendResetEmail(email, token);
```

(This also resolves the existing `TODO` by using `env.frontendUrl`.) In `authRoutes.js` keep importing `sendResetEmail` — it now delegates — or switch to `mailer.sendResetEmail`; either is fine.

- [ ] **Step 4: Audit model**

`backend/src/models/AdminAuditModels.js`:

```js
import mongoose from "mongoose";

const userAdminAuditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorEmail: { type: String, default: "" },
    at: { type: Date, default: Date.now, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["create", "update", "send-reset"], required: true },
    before: { type: Object, default: null },
    after: { type: Object, default: null }
  },
  { versionKey: false }
);
userAdminAuditSchema.index({ at: -1, _id: -1 });

const appendOnly = function (next) { next(new Error("User audit entries are append-only")); };
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "findOneAndDelete", "deleteMany"]) userAdminAuditSchema.pre(op, appendOnly);
userAdminAuditSchema.pre("deleteOne", { document: true, query: true }, appendOnly);
userAdminAuditSchema.pre("save", function (next) { return this.isNew ? next() : next(new Error("User audit entries are append-only")); });

export const UserAdminAudit = mongoose.model("UserAdminAudit", userAdminAuditSchema, "useradminaudits");
```

- [ ] **Step 5: Routes**

`backend/src/routes/userRoutes.js`:

```js
import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import { UserAdminAudit } from "../models/AdminAuditModels.js";
import { ALL_ROLES, ROLES, isSuperAdmin } from "../utils/roles.js";
import { createResetToken, hashResetToken } from "../utils/tokens.js";
import { mailer } from "../utils/mailer.js";

export const userRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);
userRoutes.use(superAdminOnly);

const INVITE_TTL_MS = 24 * 3_600_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_FIELDS = "name email role godownId active createdAt updatedAt";

class UserAdminError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new UserAdminError(status, code, message); };
const sendError = (res, error) => {
  if (error instanceof UserAdminError) return res.status(error.status).json({ code: error.code, message: error.message });
  if (error?.code === 11000) return res.status(409).json({ code: "EMAIL_EXISTS", message: "That email is already in use." });
  console.error("[users]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong." });
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const safe = (u) => u && ({ _id: u._id, name: u.name, email: u.email, role: u.role, godownId: u.godownId?._id ?? u.godownId ?? null, kitchenName: u.godownId?.name ?? null, active: u.active, createdAt: u.createdAt, updatedAt: u.updatedAt });
const snapshot = (u) => u && ({ name: u.name, email: u.email, role: u.role, godownId: u.godownId ? String(u.godownId._id ?? u.godownId) : null, active: u.active });

const actorOf = async (req) => {
  const me = await User.findById(req.user.sub).select("email").lean();
  return { actorId: req.user.sub, actorEmail: me?.email || "" };
};

const validateKitchen = async (role, godownId) => {
  if (role !== ROLES.USER) return null;
  if (!godownId) fail(400, "KITCHEN_REQUIRED", "Kitchen accounts need a kitchen.");
  if (!mongoose.isValidObjectId(godownId) || !(await Godown.exists({ _id: godownId, active: true }))) fail(400, "INVALID_KITCHEN", "Choose an active kitchen.");
  return godownId;
};

/**
 * Run inside the write transaction whenever a super-admin is about to lose access.
 * Every such transaction increments one shared lock document, so two concurrent demotions
 * conflict and one is retried; the retry re-checks that the actor is still an active
 * super-admin and that another active super-admin remains.
 */
export const assertNotLastActiveSuperAdmin = async (session, targetId, actorId) => {
  await mongoose.connection.collection("locks").updateOne({ _id: "super-admin-guard" }, { $inc: { n: 1 } }, { upsert: true, session });
  const actor = await User.findOne({ _id: actorId, role: ROLES.SUPER_ADMIN, active: true }).session(session).lean();
  if (!actor) fail(403, "FORBIDDEN", "Your access has changed. Sign in again.");
  const others = await User.countDocuments({ role: ROLES.SUPER_ADMIN, active: true, _id: { $ne: targetId } }).session(session);
  if (others === 0) fail(409, "LAST_SUPER_ADMIN", "At least one active super-admin must remain.");
};

const issueToken = async (user, ttlMs) => {
  const token = createResetToken();
  user.resetToken = hashResetToken(token);
  user.resetTokenExpiry = new Date(Date.now() + ttlMs);
  await user.save();
  return token;
};

userRoutes.get("/", async (req, res) => {
  try {
    const filter = {};
    if (ALL_ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (mongoose.isValidObjectId(req.query.godownId)) filter.godownId = req.query.godownId;
    if (req.query.active === "true" || req.query.active === "false") filter.active = req.query.active === "true";
    const q = String(req.query.q || "").trim();
    if (q) filter.$or = [{ name: { $regex: escapeRegex(q), $options: "i" } }, { email: { $regex: escapeRegex(q), $options: "i" } }];
    const pageSize = req.query.pageSize === "all" ? 1000 : Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [items, total] = await Promise.all([
      User.find(filter).select(SAFE_FIELDS).populate("godownId", "name").collation({ locale: "en", strength: 2 })
        .sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      User.countDocuments(filter)
    ]);
    return res.json({ items: items.map(safe), total, page, pageSize });
  } catch (error) {
    return sendError(res, error);
  }
});

userRoutes.get("/audit", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [items, total] = await Promise.all([
      UserAdminAudit.find().sort({ at: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      UserAdminAudit.countDocuments()
    ]);
    return res.json({ items, total, page, pageSize: 25 });
  } catch (error) {
    return sendError(res, error);
  }
});

userRoutes.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").toLowerCase().trim();
    const role = req.body?.role;
    if (!name || name.length > 100) fail(400, "INVALID_INPUT", "Name is required (100 characters max).");
    if (!EMAIL.test(email)) fail(400, "INVALID_INPUT", "A valid email is required.");
    if (!ALL_ROLES.includes(role)) fail(400, "INVALID_INPUT", "Choose a valid role.");
    if (isSuperAdmin(role) && req.body?.confirmSuperAdmin !== true) fail(400, "CONFIRMATION_REQUIRED", "Confirm that this account should be a super-admin.");
    const godownId = await validateKitchen(role, req.body?.godownId);
    if (await User.exists({ email })) fail(409, "EMAIL_EXISTS", "That email is already in use.");

    const user = await User.create({
      name, email, role, godownId, active: true,
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10)
    });
    const token = await issueToken(user, INVITE_TTL_MS);
    let inviteSent = true;
    try {
      await mailer.sendInviteEmail({ email, name, token });
    } catch (error) {
      inviteSent = false;
      console.error(`[users] invite email to ${email} failed: ${error.message}`);
    }
    await UserAdminAudit.create({ ...(await actorOf(req)), targetUserId: user._id, action: "create", before: null, after: snapshot(user) });
    const created = await User.findById(user._id).select(SAFE_FIELDS).populate("godownId", "name").lean();
    return res.status(201).json({ user: safe(created), inviteSent });
  } catch (error) {
    return sendError(res, error);
  }
});

userRoutes.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) fail(404, "USER_NOT_FOUND", "No such user.");
    let result;
    await session.withTransaction(async () => {
      const user = await User.findById(req.params.id).session(session);
      if (!user) fail(404, "USER_NOT_FOUND", "No such user.");
      const expected = req.body?.expectedUpdatedAt ? new Date(req.body.expectedUpdatedAt).getTime() : NaN;
      if (expected !== user.updatedAt.getTime()) fail(409, "VERSION_CONFLICT", "This account was changed by someone else. Reload and try again.");
      const before = snapshot(user);
      const self = String(user._id) === String(req.user.sub);
      const { name, role, godownId, active } = req.body;

      if (name !== undefined) {
        const clean = String(name).trim();
        if (!clean || clean.length > 100) fail(400, "INVALID_INPUT", "Name is required (100 characters max).");
        user.name = clean;
      }
      const nextRole = role ?? user.role;
      if (role !== undefined) {
        if (!ALL_ROLES.includes(role)) fail(400, "INVALID_INPUT", "Choose a valid role.");
        if (self && role !== user.role) fail(400, "CANNOT_MODIFY_SELF", "You cannot change your own role.");
        if (isSuperAdmin(role) && !isSuperAdmin(user.role) && req.body?.confirmSuperAdmin !== true) fail(400, "CONFIRMATION_REQUIRED", "Confirm that this account should be a super-admin.");
      }
      if (active !== undefined && typeof active !== "boolean") fail(400, "INVALID_INPUT", "active must be true or false.");
      if (self && active === false) fail(400, "CANNOT_MODIFY_SELF", "You cannot deactivate your own account.");

      const losingSuper = isSuperAdmin(user.role) && user.active && (!isSuperAdmin(nextRole) || active === false);
      if (losingSuper) await assertNotLastActiveSuperAdmin(session, user._id, req.user.sub);

      const accessChanged = (role !== undefined && role !== user.role) || (active !== undefined && active !== user.active) ||
        (godownId !== undefined && String(godownId || "") !== String(user.godownId || ""));
      user.role = nextRole;
      user.godownId = nextRole === ROLES.USER ? await validateKitchen(nextRole, godownId ?? user.godownId) : null;
      if (active !== undefined) user.active = active;
      if (accessChanged) user.refreshToken = null;
      await user.save({ session });
      await UserAdminAudit.create([{ ...(await actorOf(req)), targetUserId: user._id, action: "update", before, after: snapshot(user) }], { session });
      result = user._id;
    });
    const updated = await User.findById(result).select(SAFE_FIELDS).populate("godownId", "name").lean();
    return res.json({ user: safe(updated) });
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
});

userRoutes.post("/:id/send-reset", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) fail(404, "USER_NOT_FOUND", "No such user.");
    const user = await User.findById(req.params.id);
    if (!user) fail(404, "USER_NOT_FOUND", "No such user.");
    const token = await issueToken(user, INVITE_TTL_MS);
    let sent = true;
    try {
      await mailer.sendInviteEmail({ email: user.email, name: user.name, token });
    } catch (error) {
      sent = false;
      console.error(`[users] reset email to ${user.email} failed: ${error.message}`);
    }
    await UserAdminAudit.create({ ...(await actorOf(req)), targetUserId: user._id, action: "send-reset", before: null, after: null });
    return res.json({ sent });
  } catch (error) {
    return sendError(res, error);
  }
});
```

Mount: `["/api/users", userRoutes]` in `PROTECTED_MOUNTS` (the registry already classifies `/api/users*` as `open`).

- [ ] **Step 6: Run** — `npm --prefix backend test` → PASS. The concurrent-demotion test must pass reliably; if it is flaky, the lock-document write is missing from the transaction — do not add retries or sleeps to the test.

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/mailer.js backend/src/models/AdminAuditModels.js backend/src/routes/userRoutes.js backend/src/routes/authRoutes.js \
  backend/src/app.js backend/src/tests/userRoutes.test.js
git commit -m "feat(users): super-admin user management with invites, guards and audit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 31: Users page (admin-web)

**Files:**
- Create: `admin-web/src/pages/UsersPage.jsx`, `admin-web/src/pages/users/UserForm.jsx`, `admin-web/src/pages/users/userForm.js`, `admin-web/src/pages/users/userForm.test.js`
- Modify: `admin-web/src/components/navItems.js` (`SUPER_NAV` += `{ label: "Users", path: "/users", icon: Users, section: "Executive" }`), `admin-web/src/App.jsx` (`routeMap["/users"]`), `admin-web/src/features/featureNav.test.js` (expected super paths now include `/users`), `admin-web/src/pages/FeatureVisibilityPage.jsx` (Per user overrides tab)

**Interfaces:**
- Consumes: Task 30 HTTP API.
- Produces (`userForm.js`): `validateUserForm({ name, email, role, godownId, confirmSuperAdmin }) → { [field]: message }`, `patchFromForm(original, form) → body` (only changed fields + `expectedUpdatedAt`).

- [ ] **Step 1: Failing test**

`admin-web/src/pages/users/userForm.test.js`:

```js
import { describe, expect, it } from "vitest";
import { patchFromForm, validateUserForm } from "./userForm.js";

describe("user form", () => {
  it("validates", () => {
    expect(validateUserForm({ name: "", email: "x", role: "user" })).toEqual({ name: "Enter a name.", email: "Enter a valid email.", godownId: "Choose a kitchen." });
    expect(validateUserForm({ name: "A", email: "a@b.co", role: "super_admin" })).toEqual({ confirmSuperAdmin: "Tick to confirm super-admin access." });
    expect(validateUserForm({ name: "A", email: "a@b.co", role: "admin" })).toEqual({});
  });
  it("sends only changed fields with the version", () => {
    const original = { _id: "1", name: "A", role: "admin", godownId: null, active: true, updatedAt: "t1" };
    expect(patchFromForm(original, { name: "A", role: "user", godownId: "g", active: true })).toEqual({ expectedUpdatedAt: "t1", role: "user", godownId: "g" });
    expect(patchFromForm(original, { name: "B", role: "admin", godownId: "", active: false })).toEqual({ expectedUpdatedAt: "t1", name: "B", active: false });
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement `userForm.js`**

```js
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUserForm = ({ name, email, role, godownId, confirmSuperAdmin }) => {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Enter a name.";
  if (email !== undefined && !EMAIL.test(String(email || "").trim())) errors.email = "Enter a valid email.";
  if (role === "user" && !godownId) errors.godownId = "Choose a kitchen.";
  if (role === "super_admin" && confirmSuperAdmin !== true) errors.confirmSuperAdmin = "Tick to confirm super-admin access.";
  return errors;
};

export const patchFromForm = (original, form) => {
  const body = { expectedUpdatedAt: original.updatedAt };
  if (form.name.trim() !== original.name) body.name = form.name.trim();
  if (form.role !== original.role) body.role = form.role;
  const nextKitchen = form.role === "user" ? form.godownId || null : null;
  if (String(nextKitchen || "") !== String(original.godownId || "")) body.godownId = nextKitchen;
  if (form.active !== original.active) body.active = form.active;
  if (form.confirmSuperAdmin) body.confirmSuperAdmin = true;
  return body;
};
```

Note: when editing an existing super-admin, `validateUserForm` must not demand the confirmation tick again — call it with `confirmSuperAdmin: true` when `original.role === "super_admin"`.

- [ ] **Step 3: UI**

`admin-web/src/pages/users/UserForm.jsx`:

```jsx
import { useState } from "react";
import { Button, Field, Modal } from "../../components/ui/index.jsx";
import { validateUserForm } from "./userForm.js";

const ROLE_LABEL = { user: "Kitchen user", admin: "Admin", super_admin: "Super-admin" };

export function UserForm({ title, initial, kitchens, isNew, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const submit = (event) => {
    event.preventDefault();
    const found = validateUserForm({ ...form, email: isNew ? form.email : undefined, confirmSuperAdmin: initial.role === "super_admin" ? true : form.confirmSuperAdmin });
    setErrors(found);
    if (!Object.keys(found).length) onSubmit(form);
  };
  const error = (key) => errors[key] && <span className="field__error" role="alert">{errors[key]}</span>;
  return (
    <Modal title={title} onClose={onCancel} actions={(
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" form="user-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </>
    )}>
      <form id="user-form" onSubmit={submit} className="form-grid" noValidate>
        <Field label="Name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} />{error("name")}</Field>
        {isNew && <Field label="Email"><input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />{error("email")}</Field>}
        <Field label="Role">
          <select value={form.role} onChange={(e) => set({ role: e.target.value })}>
            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {form.role === "user" && (
          <Field label="Kitchen">
            <select value={form.godownId || ""} onChange={(e) => set({ godownId: e.target.value })}>
              <option value="">Choose…</option>
              {kitchens.filter((k) => k.active !== false).map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
            </select>
            {error("godownId")}
          </Field>
        )}
        {form.role === "super_admin" && initial.role !== "super_admin" && (
          <label className="checkbox">
            <input type="checkbox" checked={!!form.confirmSuperAdmin} onChange={(e) => set({ confirmSuperAdmin: e.target.checked })} />
            This person should have full access, including user management and feature settings.
            {error("confirmSuperAdmin")}
          </label>
        )}
        {!isNew && (
          <label className="checkbox">
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Account active
          </label>
        )}
        {isNew && <p className="exec-section__note">They will receive an email to set their password (valid 24 hours).</p>}
      </form>
    </Modal>
  );
}
```

`admin-web/src/pages/UsersPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Banner, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { formatDateTime } from "../businessTime.js";
import { UserForm } from "./users/UserForm.jsx";
import { patchFromForm } from "./users/userForm.js";

const ROLE_BADGE = { super_admin: ["info", "Super-admin"], admin: ["neutral", "Admin"], user: ["neutral", "Kitchen"] };
const EMPTY = { name: "", email: "", role: "user", godownId: "", active: true, confirmSuperAdmin: false };

export function UsersPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ q: "", role: "", active: "", page: 1 });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
      setData((await api.get("/users", { params })).data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load users.");
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/inventory/godowns").then(({ data: rows }) => setKitchens(rows)).catch(() => setKitchens([])); }, []);

  const save = async (form) => {
    setBusy(true);
    try {
      if (editing.isNew) {
        const { data: res } = await api.post("/users", { ...form, godownId: form.role === "user" ? form.godownId : undefined });
        setNotice(res.inviteSent ? `Invitation sent to ${res.user.email}.` : `Account created, but the invitation email failed. Use “Send password link” to retry.`);
      } else {
        await api.patch(`/users/${editing.user._id}`, patchFromForm(editing.user, form));
        showToast("Account updated.", "success");
      }
      setEditing(null);
      load();
    } catch (e) {
      const body = e.response?.data;
      showToast(body?.code === "VERSION_CONFLICT" ? "Someone else changed this account. The list has been reloaded." : body?.message || "Could not save.", "error");
      if (body?.code === "VERSION_CONFLICT") { setEditing(null); load(); }
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (user) => {
    try {
      const { data: res } = await api.post(`/users/${user._id}/send-reset`);
      showToast(res.sent ? `Password link sent to ${user.email}.` : "The email could not be sent.", res.sent ? "success" : "error");
    } catch (e) {
      showToast(e.response?.data?.message || "Could not send the link.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts, change roles and kitchens, and deactivate access."
        actions={<Button onClick={() => setEditing({ isNew: true, user: EMPTY })}>Add user</Button>} />
      {notice && <Banner variant="info">{notice}</Banner>}
      <div className="exec-filters">
        <input aria-label="Search by name or email" placeholder="Search name or email" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} />
        <select aria-label="Role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}>
          <option value="">All roles</option><option value="super_admin">Super-admins</option><option value="admin">Admins</option><option value="user">Kitchen users</option>
        </select>
        <select aria-label="Status" value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value, page: 1 })}>
          <option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option>
        </select>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <LoadingState />}
      {data && (
        <Card>
          {data.total === 0 ? <EmptyState title="No users match these filters" /> : (
            <DataTable>
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Kitchen</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <th scope="row">{u.name}</th>
                    <td>{u.email}</td>
                    <td><Badge variant={ROLE_BADGE[u.role][0]}>{ROLE_BADGE[u.role][1]}</Badge></td>
                    <td>{u.kitchenName || "—"}</td>
                    <td>{u.active ? "Active" : <Badge variant="warn">Inactive</Badge>}</td>
                    <td>{formatDateTime(u.updatedAt)}</td>
                    <td className="row-actions">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ isNew: false, user: u })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => sendReset(u)}>Send password link</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          <div className="pager">
            <Button size="sm" variant="ghost" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>Previous</Button>
            <span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <Button size="sm" variant="ghost" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>Next</Button>
          </div>
        </Card>
      )}
      {editing && (
        <UserForm
          title={editing.isNew ? "Add user" : `Edit ${editing.user.name}`}
          initial={editing.isNew ? EMPTY : { ...editing.user, godownId: editing.user.godownId || "", confirmSuperAdmin: false }}
          kitchens={kitchens}
          isNew={editing.isNew}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
```

Add minimal CSS to `styles.css` if `.form-grid`, `.checkbox`, `.field__error`, `.row-actions`, `.sr-only` do not exist (`grep -n "\.sr-only\|\.form-grid\|\.checkbox" admin-web/src/styles.css` first):

```css
.form-grid { display: grid; gap: 12px; }
.checkbox { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; }
.field__error { display: block; margin-top: 4px; font-size: 12px; color: var(--danger-strong); }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

Wire `SUPER_NAV`, `routeMap`, and update `featureNav.test.js` expectation to `["/executive-report", "/feature-visibility", "/users"]`.

Then add the **Per user** tab to `FeatureVisibilityPage.jsx` (Task 29 left it out):

```jsx
const [users, setUsers] = useState([]);
useEffect(() => { api.get("/users", { params: { pageSize: "all" } }).then(({ data }) => setUsers(data.items)).catch(() => setUsers([])); }, []);
const userTargets = users.filter((u) => u.role !== "super_admin").map((u) => ({
  id: String(u._id),
  label: `${u.name} (${u.role === "admin" ? "admin" : u.kitchenName || "kitchen"})`,
  audience: u.role === "admin" ? "admin" : "kitchen",
  kitchenId: u.godownId ? String(u.godownId) : null
}));
// SCOPE_TABS gains { value: "user", label: "Per user" } and:
{scope === "user" && (
  <Card><OverridesPanel scope="user" targets={userTargets} features={admin.features} globalFlags={admin.flags} onSaved={() => loadAudit(1)} /></Card>
)}
```

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run build` → PASS. Manual: create a kitchen user (email arrives with token when SMTP is configured; otherwise "invitation email failed" notice), sign in via reset flow; change an admin to kitchen user → their next action is refused; try to deactivate yourself → error toast.

- [ ] **Step 5: Commit**

```bash
git add admin-web/src/pages/UsersPage.jsx admin-web/src/pages/users admin-web/src/components/navItems.js admin-web/src/App.jsx \
  admin-web/src/features/featureNav.test.js admin-web/src/styles.css admin-web/src/pages/FeatureVisibilityPage.jsx
git commit -m "feat(admin-web): super-admin users page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 32: PDF export

**Decisions:** generated server-side with `pdfkit` from the same `buildExportReport()` data as Excel, so totals match. Built-in PDF fonts cannot draw `₹`, so money in the PDF is written `INR 1,23,456.70` (stated on the cover). Lists are capped at 200 rows per section in the PDF with a "Showing 200 of N — use the Excel export for the full list" note. A4 portrait, page numbers in the footer. Same filename convention with `.pdf`.

**Files:**
- Modify: `backend/package.json` (`pdfkit@0.15`)
- Create: `backend/src/executive/pdfExport.js`
- Modify: `backend/src/routes/executiveRoutes.js` (`GET /export.pdf`)
- Modify: `admin-web/src/pages/executive/ExportButtons.jsx` (`FORMATS` += `{ id: "pdf", label: "PDF", path: "/executive/export.pdf" }`)
- Test: `backend/src/tests/executivePdf.test.js`

**Interfaces:**
- Produces: `PDF_LIST_LIMIT = 200`, `pdfBlocks(report) → Block[]` where `Block = { type: "title"|"meta"|"heading"|"kpi"|"note"|"table", ... }` (pure; tested), `renderPdf(blocks) → Promise<Buffer>`, `formatInr(n) → "INR 1,23,456.70"`.

- [ ] **Step 1: Install** — `npm --prefix backend install pdfkit@0.15`

- [ ] **Step 2: Failing test**

`backend/src/tests/executivePdf.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { buildExportReport } from "../executive/exportCommon.js";
import { PDF_LIST_LIMIT, formatInr, pdfBlocks, renderPdf } from "../executive/pdfExport.js";

let app;
let superAdmin;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Main Kitchen");
  await distribution("2026-10-02T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await stockRow(A, items.Rice, 10, 20);
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 40.5]] });
  superAdmin = await createUser({ role: "super_admin" });
});

test("formatInr", () => {
  assert.equal(formatInr(123456.7), "INR 1,23,456.70");
  assert.equal(formatInr(-5), "-INR 5.00");
});

test("PDF blocks carry the same KPI values as the report", async () => {
  const report = await buildExportReport({ from: "2026-10-01", to: "2026-10-10" }, { now: new Date("2026-10-13T06:00:00Z") });
  const blocks = pdfBlocks(report);
  const kpis = blocks.filter((b) => b.type === "kpi");
  for (const k of report.kpis) {
    const block = kpis.find((b) => b.id === k.id);
    assert.equal(block.raw, k.value, k.id);
  }
  assert.ok(blocks.some((b) => b.type === "meta" && b.text.includes("Asia/Kolkata")));
  assert.ok(blocks.some((b) => b.type === "note" && b.text.includes("current")));
});

test("long lists are capped with a note", () => {
  const rows = Array.from({ length: PDF_LIST_LIMIT + 5 }, (_, i) => ({ id: String(i), kitchen: "K", item: `I${i}`, unit: "kg", qty: 0, threshold: 1, state: "out", ratio: null }));
  const report = {
    meta: { kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-02", timezone: "Asia/Kolkata", currency: "INR", generatedAt: "2026-10-13T06:00:00Z", definitions: [], notes: { historicalStock: "Stock figures are current.", unvaluedConsumption: "n" } },
    kpis: [],
    sections: { stockHealth: { status: "ok", data: { rows, total: rows.length } } }
  };
  const table = pdfBlocks(report).find((b) => b.type === "table" && b.title === "Stock health");
  assert.equal(table.rows.length, PDF_LIST_LIMIT);
  assert.match(table.note, /Showing 200 of 205/);
});

test("renders a real PDF over HTTP", async () => {
  const res = await request(app).get("/api/executive/export.pdf").query({ from: "2026-10-01", to: "2026-10-10" })
    .set("Authorization", `Bearer ${superAdmin.token}`).buffer(true)
    .parse((r, cb) => { const c = []; r.on("data", (d) => c.push(d)); r.on("end", () => cb(null, Buffer.concat(c))); });
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "application/pdf");
  assert.equal(res.body.subarray(0, 5).toString(), "%PDF-");
  assert.match(res.headers["content-disposition"], /\.pdf"/);
  const direct = await renderPdf([{ type: "title", text: "x" }]);
  assert.equal(direct.subarray(0, 5).toString(), "%PDF-");
});
```

Run → FAIL.

- [ ] **Step 3: Implement** `backend/src/executive/pdfExport.js`:

```js
import PDFDocument from "pdfkit";
import { formatGeneratedAt } from "./exportCommon.js";

export const PDF_LIST_LIMIT = 200;
const num = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-IN");

export const formatInr = (n) => (typeof n === "number" ? `${n < 0 ? "-" : ""}INR ${num.format(Math.abs(n))}` : "—");
const kpiText = (k) => (k.status !== "ok" ? "Not available" : k.format === "money" ? formatInr(k.value) : count.format(k.value));

const capped = (title, columns, rows, total) => ({
  type: "table", title, columns,
  rows: rows.slice(0, PDF_LIST_LIMIT),
  note: total > Math.min(rows.length, PDF_LIST_LIMIT)
    ? `Showing ${count.format(Math.min(rows.length, PDF_LIST_LIMIT))} of ${count.format(total)} — use the Excel export for the full list.`
    : null
});

/** Pure description of the document, so content can be tested without parsing PDF bytes. */
export const pdfBlocks = ({ meta, kpis, sections }) => {
  const blocks = [
    { type: "title", text: "Executive Report" },
    { type: "meta", text: `${meta.kitchen.name}${meta.kitchen.active === false ? " (inactive)" : ""} · ${meta.from} to ${meta.to} (inclusive)` },
    { type: "meta", text: `Generated ${formatGeneratedAt(meta.generatedAt, meta.timezone)} · Timezone ${meta.timezone} · Amounts in INR` },
    { type: "note", text: meta.notes.historicalStock },
    { type: "heading", text: "Key figures" },
    ...kpis.map((k) => ({ type: "kpi", id: k.id, label: `${k.label}${k.estimated ? " (estimated)" : ""}`, text: kpiText(k), raw: k.status === "ok" ? k.value : null }))
  ];
  const s = sections;
  if (s.topItems?.status === "ok") {
    blocks.push(capped("Top consumed items", ["#", "Item", "Value", "Quantity"],
      s.topItems.data.items.map((i) => [String(i.rank), i.name, formatInr(i.value), `${i.qty} ${i.unit}`]), s.topItems.data.items.length));
  }
  if (s.stockHealth?.status === "ok") {
    blocks.push(capped("Stock health", ["Status", "Kitchen", "Item", "Qty", "Threshold"],
      s.stockHealth.data.rows.map((r) => [r.state === "out" ? "Out" : "Low", r.kitchen, r.item, `${r.qty} ${r.unit}`, r.threshold ? `${r.threshold} ${r.unit}` : "—"]), s.stockHealth.data.total));
  }
  if (s.unpricedStock?.status === "ok") {
    blocks.push(capped("Items without a price", ["Kitchen", "Item", "Qty"],
      s.unpricedStock.data.rows.map((r) => [r.kitchen, r.item, `${r.qty} ${r.unit}`]), s.unpricedStock.data.total));
  }
  if (s.kitchenComparison?.status === "ok") {
    blocks.push(capped("Kitchen comparison", ["Kitchen", "Consumption", "Unvalued", "Low/out", "Pending", "Received"],
      s.kitchenComparison.data.rows.map((r) => [r.kitchen, formatInr(r.consumptionValue), String(r.unvaluedLines), r.lowOrOutOfStock === null ? "—" : String(r.lowOrOutOfStock), String(r.pendingRequests), formatInr(r.stockReceivedValue)]),
      s.kitchenComparison.data.total));
  }
  blocks.push({ type: "heading", text: "Definitions" });
  for (const d of meta.definitions) blocks.push({ type: "note", text: `${d.label}: ${d.text}` });
  return blocks;
};

export const renderPdf = (blocks) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: "Executive Report" } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  const width = doc.page.width - 96;

  for (const block of blocks) {
    if (block.type === "title") doc.font("Helvetica-Bold").fontSize(20).text(block.text).moveDown(0.3);
    else if (block.type === "meta") doc.font("Helvetica").fontSize(10).fillColor("#444").text(block.text).fillColor("#000");
    else if (block.type === "heading") doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).text(block.text).moveDown(0.3);
    else if (block.type === "note") doc.font("Helvetica-Oblique").fontSize(9).text(block.text, { width }).moveDown(0.2);
    else if (block.type === "kpi") {
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).text(block.label, 48, y, { width: width * 0.6 });
      doc.font("Helvetica-Bold").text(block.text, 48 + width * 0.6, y, { width: width * 0.4, align: "right" });
      doc.moveDown(0.2);
    } else if (block.type === "table") {
      doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).text(block.title, 48);
      if (block.note) doc.font("Helvetica-Oblique").fontSize(9).text(block.note);
      const colW = width / block.columns.length;
      const row = (cells, bold) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const y = doc.y;
        cells.forEach((cell, i) => doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).text(String(cell), 48 + i * colW, y, { width: colW - 4, ellipsis: true, lineBreak: false }));
        doc.y = y + 13;
      };
      row(block.columns, true);
      for (const r of block.rows) row(r, false);
      doc.x = 48;
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#666").text(`Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, { width, align: "center", lineBreak: false });
  }
  doc.end();
});
```

Route (in `executiveRoutes.js`, next to the Excel route):

```js
import { pdfBlocks, renderPdf } from "../executive/pdfExport.js";

executiveRoutes.get("/export.pdf", superAdminOnly, async (req, res) => {
  try {
    const report = await buildExportReport(req.query);
    const buffer = await renderPdf(pdfBlocks(report));
    const filename = exportFilename({ kitchen: report.meta.kitchen, from: report.meta.from, to: report.meta.to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: "pdf" });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": contentDisposition(filename), "Cache-Control": "no-store" });
    return res.send(buffer);
  } catch (error) {
    return exportError(res, error);
  }
});
```

Admin-web: add the PDF entry to `FORMATS` in `ExportButtons.jsx`.

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run build` → PASS. Manual: download the PDF, open it: cover lines, KPIs equal the screen, page numbers present, long lists show the cap note.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/executive/pdfExport.js backend/src/routes/executiveRoutes.js \
  backend/src/tests/executivePdf.test.js admin-web/src/pages/executive/ExportButtons.jsx
git commit -m "feat(executive): PDF export from the same report data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 33: Scheduled email reports (backend)

**Decisions:**
- A schedule = `{ name, godownId ("all" | id), rangePreset: "last-7-days"|"last-30-days"|"previous-month", cadence: "daily"|"weekly"|"monthly", dayOfWeek (0=Sun…6, weekly only), dayOfMonth (1–28, monthly only), time "HH:mm" (business TZ), recipients (1–20 valid emails, de-duplicated, lower-cased), format: "xlsx"|"pdf", active }`.
- Ranges end **yesterday** (complete days): last-7-days = 7 days ending yesterday; last-30-days = 30 days ending yesterday; previous-month = the whole previous calendar month (business TZ).
- Runner: in-process, enabled only when `REPORT_SCHEDULER_ENABLED=true`. Every 60 s it claims due schedules atomically (`findOneAndUpdate` on `nextRunAt ≤ now` and lock free/expired → `lockedUntil = now + 15 min`), so several server instances never double-send. Up to 10 schedules per tick, run sequentially.
- Each run builds the report via `buildExportReport` (same numbers as the screen), renders Excel or PDF, refuses attachments over 10 MB (`ATTACHMENT_TOO_LARGE`), and emails it with recipients in **Bcc** (recipients do not see each other). A `ReportRun` row records `success|failed`, error code, range, filename, recipient count.
- After every run (success or failure) `nextRunAt = computeNextRun(schedule, now)` — missed occurrences while the server was down are skipped, never replayed in bulk; the run that fires covers the preset range relative to its own run time. "Run now" sets `nextRunAt = now`.
- A schedule whose kitchen was deleted fails with `KITCHEN_NOT_FOUND` on each run and stays visible as failed until edited.

**Files:**
- Modify: `backend/src/executive/params.js` (add `zonedInstant(dateStr, "HH:mm", tz)`; `startOfBusinessDay` delegates to it)
- Create: `backend/src/executive/schedule.js` (pure: `computeNextRun`, `rangeForPreset`, `validateSchedule`)
- Create: `backend/src/models/ReportScheduleModels.js` (`ReportSchedule`, `ReportRun`)
- Create: `backend/src/jobs/reportScheduler.js` (`runDueSchedules({ now, mailer, limit })`, `startReportScheduler({ intervalMs })`)
- Create: `backend/src/routes/reportScheduleRoutes.js`
- Modify: `backend/src/utils/mailer.js` (`sendReportEmail`), `backend/src/server.js` (start when enabled), `backend/src/app.js` (`PROTECTED_MOUNTS` += `["/api/report-schedules", reportScheduleRoutes]`), `backend/src/config/env.js` (`reportSchedulerEnabled`)
- Test: `backend/src/tests/reportSchedule.test.js`, `backend/src/tests/reportScheduler.test.js`

**Interfaces:**
- `zonedInstant(dateStr, time, tz?) → Date`
- `computeNextRun(schedule, after: Date, tz?) → Date` (strictly after `after`)
- `rangeForPreset(preset, runAt: Date, tz?) → { from, to }`
- `validateSchedule(input) → { value } | throws { status: 400, code: "INVALID_SCHEDULE", fields: { [field]: message } }`
- `runDueSchedules({ now = new Date(), mailer, limit = 10 }) → Promise<{ ran: number }>`
- HTTP (super_admin): `GET /api/report-schedules`, `POST /api/report-schedules`, `PATCH /api/report-schedules/:id` (`expectedVersion`), `DELETE /api/report-schedules/:id`, `POST /api/report-schedules/:id/run`, `GET /api/report-schedules/:id/runs?page`.

- [ ] **Step 1: Failing tests (pure)**

`backend/src/tests/reportSchedule.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { computeNextRun, rangeForPreset, validateSchedule } from "../executive/schedule.js";
import { zonedInstant } from "../executive/params.js";

test("zonedInstant converts business wall-clock time to UTC", () => {
  assert.equal(zonedInstant("2026-10-13", "07:30").toISOString(), "2026-10-13T02:00:00.000Z");
  assert.equal(zonedInstant("2026-07-01", "09:00", "Europe/London").toISOString(), "2026-07-01T08:00:00.000Z");
});

test("daily: later today if the time has not passed, else tomorrow", () => {
  const s = { cadence: "daily", time: "07:30" };
  assert.equal(computeNextRun(s, new Date("2026-10-13T01:00:00Z")).toISOString(), "2026-10-13T02:00:00.000Z");
  assert.equal(computeNextRun(s, new Date("2026-10-13T02:00:00Z")).toISOString(), "2026-10-14T02:00:00.000Z", "strictly after");
});

test("weekly and monthly", () => {
  // 2026-10-13 is a Tuesday.
  assert.equal(computeNextRun({ cadence: "weekly", dayOfWeek: 1, time: "08:00" }, new Date("2026-10-13T06:00:00Z")).toISOString(), "2026-10-19T02:30:00.000Z");
  assert.equal(computeNextRun({ cadence: "monthly", dayOfMonth: 1, time: "06:00" }, new Date("2026-10-13T06:00:00Z")).toISOString(), "2026-11-01T00:30:00.000Z");
  assert.equal(computeNextRun({ cadence: "monthly", dayOfMonth: 28, time: "06:00" }, new Date("2027-02-01T00:00:00Z")).toISOString(), "2027-02-28T00:30:00.000Z");
});

test("ranges end yesterday in business time", () => {
  const runAt = new Date("2026-10-13T02:00:00Z"); // 07:30 IST on 13 Oct
  assert.deepEqual(rangeForPreset("last-7-days", runAt), { from: "2026-10-06", to: "2026-10-12" });
  assert.deepEqual(rangeForPreset("last-30-days", runAt), { from: "2026-09-13", to: "2026-10-12" });
  assert.deepEqual(rangeForPreset("previous-month", runAt), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(rangeForPreset("previous-month", new Date("2027-01-01T01:00:00Z")), { from: "2026-12-01", to: "2026-12-31" });
});

test("validation", () => {
  const good = { name: "Weekly", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: 1, time: "08:00", recipients: ["A@x.io", "a@x.io", "b@x.io"], format: "xlsx" };
  assert.deepEqual(validateSchedule(good).value.recipients, ["a@x.io", "b@x.io"]);
  const fields = (input) => { try { validateSchedule(input); return null; } catch (e) { return Object.keys(e.fields).sort(); } };
  assert.deepEqual(fields({ ...good, time: "25:00", recipients: [], format: "doc", dayOfWeek: 9 }), ["dayOfWeek", "format", "recipients", "time"]);
  assert.deepEqual(fields({ ...good, cadence: "monthly", dayOfMonth: 31 }), ["dayOfMonth"]);
  assert.deepEqual(fields({ ...good, recipients: Array.from({ length: 21 }, (_, i) => `u${i}@x.io`) }), ["recipients"]);
  assert.deepEqual(fields({ ...good, godownId: "nope" }), ["godownId"]);
});
```

Run → FAIL.

- [ ] **Step 2: `zonedInstant` + `schedule.js`**

In `params.js` add (and make `startOfBusinessDay(dateStr, tz)` return `zonedInstant(dateStr, "00:00", tz)`):

```js
export const zonedInstant = (dateStr, time, tz = BUSINESS_TZ) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const guess = naive - offsetMinutes(naive, tz) * 60_000;
  return new Date(naive - offsetMinutes(guess, tz) * 60_000);
};
```

`backend/src/executive/schedule.js`:

```js
import mongoose from "mongoose";
import { BUSINESS_TZ, addDays, businessDateOf, zonedInstant } from "./params.js";

export const PRESETS = Object.freeze(["last-7-days", "last-30-days", "previous-month"]);
export const CADENCES = Object.freeze(["daily", "weekly", "monthly"]);
export const FORMATS = Object.freeze(["xlsx", "pdf"]);
export const MAX_RECIPIENTS = 20;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

export const computeNextRun = (schedule, after, tz = BUSINESS_TZ) => {
  let day = businessDateOf(after, tz);
  for (let i = 0; i < 400; i += 1, day = addDays(day, 1)) {
    const matches = schedule.cadence === "daily"
      || (schedule.cadence === "weekly" && weekday(day) === schedule.dayOfWeek)
      || (schedule.cadence === "monthly" && Number(day.slice(8, 10)) === schedule.dayOfMonth);
    if (!matches) continue;
    const at = zonedInstant(day, schedule.time, tz);
    if (at > after) return at;
  }
  throw new Error("No next run within 400 days");
};

export const rangeForPreset = (preset, runAt, tz = BUSINESS_TZ) => {
  const today = businessDateOf(runAt, tz);
  const yesterday = addDays(today, -1);
  if (preset === "last-7-days") return { from: addDays(today, -7), to: yesterday };
  if (preset === "last-30-days") return { from: addDays(today, -30), to: yesterday };
  const firstOfThisMonth = `${today.slice(0, 7)}-01`;
  const lastOfPrevious = addDays(firstOfThisMonth, -1);
  return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious };
};

export const validateSchedule = (input) => {
  const fields = {};
  const name = String(input?.name || "").trim();
  if (!name || name.length > 100) fields.name = "Enter a name (100 characters max).";
  const godownId = input?.godownId === "all" ? "all" : String(input?.godownId || "").toLowerCase();
  if (godownId !== "all" && !(/^[a-f0-9]{24}$/.test(godownId) && mongoose.isValidObjectId(godownId))) fields.godownId = "Choose a kitchen or all kitchens.";
  if (!PRESETS.includes(input?.rangePreset)) fields.rangePreset = "Choose a report period.";
  if (!CADENCES.includes(input?.cadence)) fields.cadence = "Choose how often to send.";
  if (input?.cadence === "weekly" && !(Number.isInteger(input?.dayOfWeek) && input.dayOfWeek >= 0 && input.dayOfWeek <= 6)) fields.dayOfWeek = "Choose a day of the week.";
  if (input?.cadence === "monthly" && !(Number.isInteger(input?.dayOfMonth) && input.dayOfMonth >= 1 && input.dayOfMonth <= 28)) fields.dayOfMonth = "Choose a day from 1 to 28.";
  if (!TIME.test(String(input?.time || ""))) fields.time = "Enter a time as HH:MM (24-hour).";
  if (!FORMATS.includes(input?.format)) fields.format = "Choose Excel or PDF.";
  const recipients = [...new Set((Array.isArray(input?.recipients) ? input.recipients : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS || recipients.some((e) => !EMAIL.test(e))) {
    fields.recipients = `Add 1 to ${MAX_RECIPIENTS} valid email addresses.`;
  }
  if (Object.keys(fields).length) throw Object.assign(new Error("Check the highlighted fields."), { status: 400, code: "INVALID_SCHEDULE", fields });
  return {
    value: {
      name, godownId, rangePreset: input.rangePreset, cadence: input.cadence,
      dayOfWeek: input.cadence === "weekly" ? input.dayOfWeek : null,
      dayOfMonth: input.cadence === "monthly" ? input.dayOfMonth : null,
      time: input.time, recipients, format: input.format, active: input.active !== false
    }
  };
};
```

Run the pure tests → PASS. Run the full backend suite — `executiveParams` tests must still pass after the `startOfBusinessDay` refactor.

- [ ] **Step 3: Models**

`backend/src/models/ReportScheduleModels.js`:

```js
import mongoose from "mongoose";

const reportScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    godownId: { type: String, required: true }, // "all" or a kitchen id
    rangePreset: { type: String, enum: ["last-7-days", "last-30-days", "previous-month"], required: true },
    cadence: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    dayOfWeek: { type: Number, default: null },
    dayOfMonth: { type: Number, default: null },
    time: { type: String, required: true },
    recipients: { type: [String], required: true },
    format: { type: String, enum: ["xlsx", "pdf"], required: true },
    active: { type: Boolean, default: true },
    nextRunAt: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, enum: ["success", "failed", null], default: null },
    lastError: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 }
  },
  { timestamps: true, versionKey: false }
);
reportScheduleSchema.index({ active: 1, nextRunAt: 1 });

const reportRunSchema = new mongoose.Schema(
  {
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportSchedule", required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    errorCode: { type: String, default: null },
    from: String,
    to: String,
    filename: { type: String, default: null },
    recipientCount: { type: Number, default: 0 }
  },
  { versionKey: false }
);
reportRunSchema.index({ scheduleId: 1, startedAt: -1 });

export const ReportSchedule = mongoose.model("ReportSchedule", reportScheduleSchema, "reportschedules");
export const ReportRun = mongoose.model("ReportRun", reportRunSchema, "reportruns");
```

- [ ] **Step 4: Mailer `sendReportEmail`**

Replace the Task 30 stub in `mailer.js`:

```js
  /** Scheduled report: recipients in Bcc so they do not see each other. */
  async sendReportEmail({ bcc, subject, text, attachment }) {
    await createTransport().sendMail({ from: from(), to: env.emailUser, bcc, subject, text, attachments: [attachment] });
  }
```

- [ ] **Step 5: Failing runner tests**

`backend/src/tests/reportScheduler.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { consumption, kitchen, seedCatalog } from "./helpers/fixtures.js";
import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import { runDueSchedules } from "../jobs/reportScheduler.js";

const NOW = new Date("2026-10-13T02:00:00Z");
let sent;
const fakeMailer = { sendReportEmail: async (msg) => { sent.push(msg); } };

before(async () => { await startDb(); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  sent = [];
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Main Kitchen");
  await consumption(A, { date: "2026-10-10", createdAt: "2026-10-10T05:00:00Z", lines: [[items.Rice, 1, 40]] });
});

const schedule = (extra = {}) => ReportSchedule.create({
  name: "Weekly", godownId: "all", rangePreset: "last-7-days", cadence: "daily", time: "07:30",
  recipients: ["a@x.io", "b@x.io"], format: "xlsx", nextRunAt: new Date(NOW.getTime() - 1000), createdBy: new mongoose.Types.ObjectId(), ...extra
});

test("a due schedule runs once, emails an attachment in Bcc and advances", async () => {
  const s = await schedule();
  const { ran } = await runDueSchedules({ now: NOW, mailer: fakeMailer });
  assert.equal(ran, 1);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].bcc, ["a@x.io", "b@x.io"]);
  assert.match(sent[0].attachment.filename, /^MKM-Executive-Report_All-Kitchens_2026-10-06_to_2026-10-12_.*\.xlsx$/);
  assert.ok(sent[0].attachment.content.length > 0);
  const after1 = await ReportSchedule.findById(s._id).lean();
  assert.equal(after1.lastStatus, "success");
  assert.equal(after1.lockedUntil, null);
  assert.equal(after1.nextRunAt.toISOString(), "2026-10-14T02:00:00.000Z");
  assert.equal(await ReportRun.countDocuments({ status: "success" }), 1);
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0, "not due again");
});

test("two concurrent ticks never send twice", async () => {
  await schedule();
  const [a, b] = await Promise.all([runDueSchedules({ now: NOW, mailer: fakeMailer }), runDueSchedules({ now: NOW, mailer: fakeMailer })]);
  assert.equal(a.ran + b.ran, 1);
  assert.equal(sent.length, 1);
});

test("failures are recorded and the schedule still advances", async () => {
  const s = await schedule({ godownId: "65f0c0ffee0000000000abcd" });
  await runDueSchedules({ now: NOW, mailer: fakeMailer });
  const doc = await ReportSchedule.findById(s._id).lean();
  assert.equal(doc.lastStatus, "failed");
  assert.equal(doc.lastError, "KITCHEN_NOT_FOUND");
  assert.ok(doc.nextRunAt > NOW);
  assert.equal(sent.length, 0);
});

test("mail failure is a failed run", async () => {
  await schedule();
  await runDueSchedules({ now: NOW, mailer: { sendReportEmail: async () => { throw new Error("smtp"); } } });
  assert.equal((await ReportRun.findOne().lean()).errorCode, "EMAIL_FAILED");
});

test("inactive and locked schedules are skipped", async () => {
  await schedule({ active: false });
  await schedule({ lockedUntil: new Date(NOW.getTime() + 60_000) });
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 0);
});

test("a lock left by a crashed run expires", async () => {
  await schedule({ lockedUntil: new Date(NOW.getTime() - 1) });
  assert.equal((await runDueSchedules({ now: NOW, mailer: fakeMailer })).ran, 1);
});
```

Run → FAIL.

- [ ] **Step 6: Runner**

`backend/src/jobs/reportScheduler.js`:

```js
import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import { buildExportReport, exportFilename } from "../executive/exportCommon.js";
import { buildExcelWorkbook } from "../executive/excelExport.js";
import { pdfBlocks, renderPdf } from "../executive/pdfExport.js";
import { computeNextRun, rangeForPreset } from "../executive/schedule.js";
import { mailer as defaultMailer } from "../utils/mailer.js";

const LOCK_MS = 15 * 60_000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf" };

const claimNext = (now) => ReportSchedule.findOneAndUpdate(
  { active: true, nextRunAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
  { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
  { sort: { nextRunAt: 1 }, new: true }
);

const runOne = async (schedule, now, mailer) => {
  const { from, to } = rangeForPreset(schedule.rangePreset, now);
  const run = { scheduleId: schedule._id, startedAt: new Date(), from, to, recipientCount: schedule.recipients.length };
  try {
    const report = await buildExportReport({ godownId: schedule.godownId, from, to }, { now });
    const content = schedule.format === "pdf"
      ? await renderPdf(pdfBlocks(report))
      : Buffer.from(await buildExcelWorkbook(report).xlsx.writeBuffer());
    if (content.length > MAX_ATTACHMENT_BYTES) throw Object.assign(new Error("Attachment too large"), { code: "ATTACHMENT_TOO_LARGE" });
    const filename = exportFilename({ kitchen: report.meta.kitchen, from, to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: schedule.format });
    try {
      await mailer.sendReportEmail({
        bcc: schedule.recipients,
        subject: `${schedule.name}: ${report.meta.kitchen.name}, ${from} to ${to}`,
        text: `Attached is the Montessori Kitchen executive report for ${report.meta.kitchen.name}, ${from} to ${to} (${report.meta.timezone}). Values marked estimated use the latest known prices.`,
        attachment: { filename, content, contentType: MIME[schedule.format] }
      });
    } catch (error) {
      throw Object.assign(error, { code: "EMAIL_FAILED" });
    }
    return { ...run, status: "success", filename, errorCode: null };
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "RUN_FAILED";
    console.error(`[schedules] ${schedule._id} failed: ${code} ${error.message}`);
    return { ...run, status: "failed", filename: null, errorCode: code };
  }
};

export const runDueSchedules = async ({ now = new Date(), mailer = defaultMailer, limit = 10 } = {}) => {
  let ran = 0;
  while (ran < limit) {
    const schedule = await claimNext(now);
    if (!schedule) break;
    const result = await runOne(schedule, now, mailer);
    await ReportRun.create({ ...result, finishedAt: new Date() });
    await ReportSchedule.updateOne({ _id: schedule._id }, {
      $set: {
        lastRunAt: now, lastStatus: result.status, lastError: result.errorCode,
        nextRunAt: computeNextRun(schedule, now), lockedUntil: null
      }
    });
    ran += 1;
  }
  return { ran };
};

export const startReportScheduler = ({ intervalMs = 60_000 } = {}) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueSchedules();
    } catch (error) {
      console.error("[schedules] tick failed:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
};
```

`env.js`: add `reportSchedulerEnabled: process.env.REPORT_SCHEDULER_ENABLED === "true",`.
`server.js`: inside `connectDB().then(...)` after `listen`, add:

```js
    if (env.reportSchedulerEnabled) {
      const { startReportScheduler } = await import("./jobs/reportScheduler.js");
      startReportScheduler();
      console.log("Report scheduler started");
    }
```

(make the `.then` callback `async`).

- [ ] **Step 7: Routes**

`backend/src/routes/reportScheduleRoutes.js`:

```js
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import { computeNextRun, validateSchedule } from "../executive/schedule.js";

export const reportScheduleRoutes = express.Router();
reportScheduleRoutes.use(authorize(["super_admin"]));

const sendError = (res, error) => {
  if (error?.code === "INVALID_SCHEDULE") return res.status(400).json({ code: error.code, message: error.message, fields: error.fields });
  if (error?.status) return res.status(error.status).json({ code: error.code, message: error.message });
  console.error("[schedules]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong." });
};
const notFound = () => Object.assign(new Error("No such schedule."), { status: 404, code: "SCHEDULE_NOT_FOUND" });
const findOr404 = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const doc = await ReportSchedule.findById(id).lean();
  if (!doc) throw notFound();
  return doc;
};

reportScheduleRoutes.get("/", async (_req, res) => {
  try { return res.json(await ReportSchedule.find().sort({ name: 1, _id: 1 }).lean()); } catch (e) { return sendError(res, e); }
});

reportScheduleRoutes.post("/", async (req, res) => {
  try {
    const { value } = validateSchedule(req.body);
    const doc = await ReportSchedule.create({ ...value, createdBy: req.user.sub, nextRunAt: computeNextRun(value, new Date()) });
    return res.status(201).json(doc);
  } catch (e) { return sendError(res, e); }
});

reportScheduleRoutes.patch("/:id", async (req, res) => {
  try {
    const current = await findOr404(req.params.id);
    const { value } = validateSchedule({ ...current, ...req.body });
    const updated = await ReportSchedule.findOneAndUpdate(
      { _id: current._id, version: req.body?.expectedVersion },
      { $set: { ...value, nextRunAt: computeNextRun(value, new Date()) }, $inc: { version: 1 } },
      { new: true }
    ).lean();
    if (!updated) return res.status(409).json({ code: "VERSION_CONFLICT", message: "This schedule was changed by someone else. Reload and try again." });
    return res.json(updated);
  } catch (e) { return sendError(res, e); }
});

reportScheduleRoutes.delete("/:id", async (req, res) => {
  try {
    const current = await findOr404(req.params.id);
    await ReportSchedule.deleteOne({ _id: current._id });
    return res.status(204).end();
  } catch (e) { return sendError(res, e); }
});

reportScheduleRoutes.post("/:id/run", async (req, res) => {
  try {
    const current = await findOr404(req.params.id);
    await ReportSchedule.updateOne({ _id: current._id }, { $set: { nextRunAt: new Date() } });
    return res.status(202).json({ queued: true, message: "The report will be sent within a minute." });
  } catch (e) { return sendError(res, e); }
});

reportScheduleRoutes.get("/:id/runs", async (req, res) => {
  try {
    const current = await findOr404(req.params.id);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [items, total] = await Promise.all([
      ReportRun.find({ scheduleId: current._id }).sort({ startedAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      ReportRun.countDocuments({ scheduleId: current._id })
    ]);
    return res.json({ items, total, page, pageSize: 25 });
  } catch (e) { return sendError(res, e); }
});
```

Mount in `PROTECTED_MOUNTS`. Add a short HTTP test block to `reportScheduler.test.js`:

```js
test("HTTP: create, conflict, run-now, history (super-admin only)", async () => {
  const { app } = await import("../app.js");
  const request = (await import("supertest")).default;
  const { createUser } = await import("./helpers/auth.js");
  const root = await createUser({ role: "super_admin" });
  const admin = await createUser({ role: "admin" });
  const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${who.token}`);
  const body = { name: "Daily", godownId: "all", rangePreset: "last-7-days", cadence: "daily", time: "07:30", recipients: ["a@x.io"], format: "pdf" };
  assert.equal((await as(admin, "get", "/api/report-schedules")).status, 403);
  const bad = await as(root, "post", "/api/report-schedules").send({ ...body, time: "7am" });
  assert.equal(bad.body.code, "INVALID_SCHEDULE");
  assert.ok(bad.body.fields.time);
  const created = await as(root, "post", "/api/report-schedules").send(body);
  assert.equal(created.status, 201);
  const edited = await as(root, "patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 1, name: "Daily 2" });
  assert.equal(edited.status, 200);
  assert.equal((await as(root, "patch", `/api/report-schedules/${created.body._id}`).send({ expectedVersion: 1, name: "x" })).status, 409);
  assert.equal((await as(root, "post", `/api/report-schedules/${created.body._id}/run`)).status, 202);
  assert.equal((await as(root, "get", `/api/report-schedules/${created.body._id}/runs`)).body.total, 0);
});
```

- [ ] **Step 8: Run** — `npm --prefix backend test` → PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/executive/params.js backend/src/executive/schedule.js backend/src/models/ReportScheduleModels.js backend/src/jobs/reportScheduler.js \
  backend/src/routes/reportScheduleRoutes.js backend/src/utils/mailer.js backend/src/server.js backend/src/app.js backend/src/config/env.js \
  backend/src/tests/reportSchedule.test.js backend/src/tests/reportScheduler.test.js
git commit -m "feat(executive): scheduled email reports with safe multi-instance claiming

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 34: Report Schedules page (admin-web)

**Files:**
- Create: `admin-web/src/pages/ReportSchedulesPage.jsx`, `admin-web/src/pages/schedules/ScheduleForm.jsx`, `admin-web/src/pages/schedules/scheduleText.js`, `admin-web/src/pages/schedules/scheduleText.test.js`
- Modify: `navItems.js` (`SUPER_NAV` += `{ label: "Report Schedules", path: "/report-schedules", icon: CalendarClock, section: "Executive" }`), `App.jsx` (`routeMap`), `featureNav.test.js` (append `/report-schedules`)

**Interfaces:**
- Consumes: Task 33 HTTP API.
- Produces (`scheduleText.js`): `describeSchedule(s) → "Every Monday at 08:00 IST · last 7 days · Excel · 2 recipients"`, `parseRecipients(text) → string[]` (splits on commas, semicolons, whitespace, new lines).

- [ ] **Step 1: Failing test**

`admin-web/src/pages/schedules/scheduleText.test.js`:

```js
import { describe, expect, it } from "vitest";
import { describeSchedule, parseRecipients } from "./scheduleText.js";

describe("schedule text", () => {
  it("describes cadence, time, period, format and recipients", () => {
    expect(describeSchedule({ cadence: "weekly", dayOfWeek: 1, time: "08:00", rangePreset: "last-7-days", format: "xlsx", recipients: ["a", "b"] }))
      .toBe("Every Monday at 08:00 IST · last 7 days · Excel · 2 recipients");
    expect(describeSchedule({ cadence: "monthly", dayOfMonth: 1, time: "06:00", rangePreset: "previous-month", format: "pdf", recipients: ["a"] }))
      .toBe("Monthly on day 1 at 06:00 IST · previous month · PDF · 1 recipient");
    expect(describeSchedule({ cadence: "daily", time: "07:30", rangePreset: "last-30-days", format: "pdf", recipients: ["a"] }))
      .toBe("Every day at 07:30 IST · last 30 days · PDF · 1 recipient");
  });
  it("parses recipient lists", () => {
    expect(parseRecipients("a@x.io, b@x.io;c@x.io\n d@x.io  ")).toEqual(["a@x.io", "b@x.io", "c@x.io", "d@x.io"]);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement `scheduleText.js`**

```js
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIOD = { "last-7-days": "last 7 days", "last-30-days": "last 30 days", "previous-month": "previous month" };
const FORMAT = { xlsx: "Excel", pdf: "PDF" };

export const describeSchedule = (s) => {
  const when = s.cadence === "daily" ? "Every day" : s.cadence === "weekly" ? `Every ${DAYS[s.dayOfWeek]}` : `Monthly on day ${s.dayOfMonth}`;
  const n = s.recipients.length;
  return `${when} at ${s.time} IST · ${PERIOD[s.rangePreset]} · ${FORMAT[s.format]} · ${n} recipient${n === 1 ? "" : "s"}`;
};

export const parseRecipients = (text) => String(text || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
```

- [ ] **Step 3: UI**

`admin-web/src/pages/schedules/ScheduleForm.jsx`:

```jsx
import { useState } from "react";
import { Button, Field, Modal } from "../../components/ui/index.jsx";
import { parseRecipients } from "./scheduleText.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const EMPTY_SCHEDULE = {
  name: "", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: 1, dayOfMonth: 1,
  time: "08:00", format: "xlsx", recipients: [], active: true
};

export function ScheduleForm({ title, initial, kitchens, busy, serverErrors = {}, onCancel, onSubmit }) {
  const [form, setForm] = useState({ ...initial, recipientsText: initial.recipients.join("\n") });
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const err = (key) => serverErrors[key] && <span className="field__error" role="alert">{serverErrors[key]}</span>;
  const submit = (event) => {
    event.preventDefault();
    const { recipientsText, ...rest } = form;
    onSubmit({
      ...rest,
      recipients: parseRecipients(recipientsText),
      dayOfWeek: rest.cadence === "weekly" ? Number(rest.dayOfWeek) : null,
      dayOfMonth: rest.cadence === "monthly" ? Number(rest.dayOfMonth) : null
    });
  };
  const active = kitchens.filter((k) => k.active !== false);
  const inactive = kitchens.filter((k) => k.active === false);
  return (
    <Modal title={title} onClose={onCancel} wide actions={(
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" form="schedule-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </>
    )}>
      <form id="schedule-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} />{err("name")}</Field>
        <Field label="Kitchen">
          <select value={form.godownId} onChange={(e) => set({ godownId: e.target.value })}>
            <option value="all">All kitchens</option>
            {active.length > 0 && <optgroup label="Active">{active.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}</optgroup>}
            {inactive.length > 0 && <optgroup label="Inactive">{inactive.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}</optgroup>}
          </select>
          {err("godownId")}
        </Field>
        <Field label="Report period">
          <select value={form.rangePreset} onChange={(e) => set({ rangePreset: e.target.value })}>
            <option value="last-7-days">Last 7 days</option>
            <option value="last-30-days">Last 30 days</option>
            <option value="previous-month">Previous calendar month</option>
          </select>
          {err("rangePreset")}
        </Field>
        <Field label="Frequency">
          <select value={form.cadence} onChange={(e) => set({ cadence: e.target.value })}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
          {err("cadence")}
        </Field>
        {form.cadence === "weekly" && (
          <Field label="Day of the week">
            <select value={form.dayOfWeek} onChange={(e) => set({ dayOfWeek: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            {err("dayOfWeek")}
          </Field>
        )}
        {form.cadence === "monthly" && (
          <Field label="Day of the month">
            <select value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })}>
              {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <small className="exec-muted">Days 29–31 are not offered so every month has a run.</small>
            {err("dayOfMonth")}
          </Field>
        )}
        <Field label="Time (IST)"><input type="time" step="60" value={form.time} onChange={(e) => set({ time: e.target.value })} />{err("time")}</Field>
        <fieldset className="checkbox">
          <legend className="field__label">Format</legend>
          <label><input type="radio" name="format" checked={form.format === "xlsx"} onChange={() => set({ format: "xlsx" })} /> Excel</label>
          <label><input type="radio" name="format" checked={form.format === "pdf"} onChange={() => set({ format: "pdf" })} /> PDF</label>
          {err("format")}
        </fieldset>
        <Field label="Recipients">
          <textarea rows={4} value={form.recipientsText} onChange={(e) => set({ recipientsText: e.target.value })} />
          <small className="exec-muted">Separate addresses with commas or new lines. Up to 20. Recipients are Bcc’d and do not see each other.</small>
          {err("recipients")}
        </Field>
        <label className="checkbox"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
      </form>
    </Modal>
  );
}
```

`admin-web/src/pages/ReportSchedulesPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Banner, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { formatDateTime } from "../businessTime.js";
import { EMPTY_SCHEDULE, ScheduleForm } from "./schedules/ScheduleForm.jsx";
import { describeSchedule } from "./schedules/scheduleText.js";

export function ReportSchedulesPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [editing, setEditing] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [history, setHistory] = useState(null);

  const load = useCallback(async () => {
    try {
      setSchedules((await api.get("/report-schedules")).data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load schedules.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/inventory/godowns").then(({ data }) => setKitchens(data)).catch(() => setKitchens([])); }, []);

  const kitchenName = (id) => (id === "all" ? "All kitchens" : kitchens.find((k) => String(k._id) === id)?.name || "Removed kitchen");

  const save = async (body) => {
    setBusy(true);
    setServerErrors({});
    try {
      if (editing._id) await api.patch(`/report-schedules/${editing._id}`, { ...body, expectedVersion: editing.version });
      else await api.post("/report-schedules", body);
      showToast("Schedule saved.", "success");
      setEditing(null);
      load();
    } catch (e) {
      const res = e.response?.data;
      if (res?.code === "INVALID_SCHEDULE") setServerErrors(res.fields || {});
      else if (res?.code === "VERSION_CONFLICT") { showToast("Someone else changed this schedule. The list has been reloaded.", "error"); setEditing(null); load(); }
      else showToast(res?.message || "Could not save the schedule.", "error");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (s) => {
    try {
      const { data } = await api.post(`/report-schedules/${s._id}/run`);
      showToast(data.message, "success");
    } catch (e) {
      showToast(e.response?.data?.message || "Could not queue the run.", "error");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/report-schedules/${deleting._id}`);
      setDeleting(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || "Could not delete.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (s) => {
    try {
      setHistory({ schedule: s, runs: (await api.get(`/report-schedules/${s._id}/runs`)).data });
    } catch {
      showToast("Could not load the run history.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Report Schedules" subtitle="Email the executive report automatically."
        actions={<Button onClick={() => { setServerErrors({}); setEditing({ ...EMPTY_SCHEDULE }); }}>New schedule</Button>} />
      <Banner variant="info">Schedules run only on servers started with REPORT_SCHEDULER_ENABLED=true. Reports cover complete days up to yesterday.</Banner>
      {error && <ErrorState message={error} onRetry={load} />}
      {!schedules && !error && <LoadingState />}
      {schedules && (
        <Card>
          {schedules.length === 0 ? <EmptyState title="No scheduled reports yet">Create one to email the report on a regular basis.</EmptyState> : (
            <DataTable>
              <thead><tr><th scope="col">Name</th><th scope="col">Kitchen</th><th scope="col">Schedule</th><th scope="col">Next run</th><th scope="col">Last run</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s._id}>
                    <th scope="row">{s.name}{!s.active && <> <Badge variant="neutral">Paused</Badge></>}</th>
                    <td>{kitchenName(s.godownId)}</td>
                    <td>{describeSchedule(s)}</td>
                    <td>{s.active ? formatDateTime(s.nextRunAt) : "—"}</td>
                    <td>
                      {s.lastStatus ? <Badge variant={s.lastStatus === "success" ? "success" : "alert"}>{s.lastStatus}</Badge> : "Never"}
                      {s.lastError && <small className="exec-muted"> {s.lastError}</small>}
                      {s.lastRunAt && <div className="exec-muted">{formatDateTime(s.lastRunAt)}</div>}
                    </td>
                    <td className="row-actions">
                      <Button size="sm" variant="ghost" onClick={() => { setServerErrors({}); setEditing(s); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => runNow(s)} disabled={!s.active}>Run now</Button>
                      <Button size="sm" variant="ghost" onClick={() => openHistory(s)}>History</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(s)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      )}
      {editing && (
        <ScheduleForm title={editing._id ? `Edit ${editing.name}` : "New schedule"} initial={editing} kitchens={kitchens}
          busy={busy} serverErrors={serverErrors} onCancel={() => setEditing(null)} onSubmit={save} />
      )}
      {deleting && (
        <ConfirmDialog title="Delete schedule?" message={`“${deleting.name}” will stop sending. Past run history is kept.`}
          confirmLabel="Delete" variant="danger" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
      )}
      {history && (
        <Modal title={`Runs: ${history.schedule.name}`} wide onClose={() => setHistory(null)}>
          {history.runs.total === 0 ? <EmptyState title="No runs yet" /> : (
            <DataTable>
              <thead><tr><th scope="col">When</th><th scope="col">Period</th><th scope="col">Result</th><th scope="col">File</th></tr></thead>
              <tbody>
                {history.runs.items.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDateTime(r.startedAt)}</td>
                    <td>{r.from} to {r.to}</td>
                    <td><Badge variant={r.status === "success" ? "success" : "alert"}>{r.status}</Badge>{r.errorCode && <small className="exec-muted"> {r.errorCode}</small>}</td>
                    <td>{r.filename || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Modal>
      )}
    </>
  );
}
```

`exec-muted` lives in `executive.css`, which is imported by the Executive Report page only; import `./executive/executive.css` at the top of this page too (or move `.exec-muted` to `styles.css`).

Wire `SUPER_NAV`, `routeMap["/report-schedules"] = <ReportSchedulesPage />`, and update the `featureNav.test.js` expectation to `["/executive-report", "/feature-visibility", "/users", "/report-schedules"]` (drop `/users` if Tasks 30–31 were cut).

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run build` → PASS. Manual with `REPORT_SCHEDULER_ENABLED=true` and SMTP configured: create a daily schedule 2 minutes ahead → email arrives with the attachment, the row shows Last run "success" and the next run tomorrow; "Run now" sends within a minute; set an invalid kitchen via the DB → "failed KITCHEN_NOT_FOUND". Without SMTP: runs show `EMAIL_FAILED`.

- [ ] **Step 5: Commit**

```bash
git add admin-web/src/pages/ReportSchedulesPage.jsx admin-web/src/pages/schedules admin-web/src/components/navItems.js admin-web/src/App.jsx admin-web/src/features/featureNav.test.js
git commit -m "feat(admin-web): manage scheduled executive report emails

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
