# Phase 1 — Super-admin role

Read `README.md` (Decision 1) first. Depends on Phase 0.

---

### Task 2: Role helpers, User enum, `authorize` expansion

**Files:**
- Create: `backend/src/utils/roles.js`
- Modify: `backend/src/models/User.js:8`
- Modify: `backend/src/middleware/auth.js:23-26`
- Test: `backend/src/tests/roles.test.js`

**Interfaces:**
- Produces (`backend/src/utils/roles.js`): `ROLES` (`{ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" }`), `ALL_ROLES`, `PRIVILEGED_ROLES`, `isSuperAdmin(role) → boolean`, `isAdminRole(role) → boolean`, `isKitchenRole(role) → boolean`, `expandAllowedRoles(roles: string[]) → string[]`.
- Produces: `authorize(roles)` — unchanged signature; any list containing `"admin"` also admits `"super_admin"`.

- [ ] **Step 1: Write the failing tests**

`backend/src/tests/roles.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_ROLES, PRIVILEGED_ROLES, ROLES, expandAllowedRoles, isAdminRole, isKitchenRole, isSuperAdmin
} from "../utils/roles.js";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";

test("role constants are the exact strings used everywhere", () => {
  assert.deepEqual(ROLES, { SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
  assert.deepEqual([...ALL_ROLES].sort(), ["admin", "super_admin", "user"]);
  assert.deepEqual([...PRIVILEGED_ROLES].sort(), ["admin", "super_admin"]);
});

test("role predicates", () => {
  assert.equal(isSuperAdmin("super_admin"), true);
  assert.equal(isSuperAdmin("admin"), false);
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("super_admin"), true);
  assert.equal(isAdminRole("user"), false);
  assert.equal(isAdminRole(undefined), false);
  assert.equal(isKitchenRole("user"), true);
  assert.equal(isKitchenRole("super_admin"), false);
});

test("expandAllowedRoles adds super_admin only where admin is allowed", () => {
  assert.deepEqual(expandAllowedRoles(["admin"]).sort(), ["admin", "super_admin"]);
  assert.deepEqual(expandAllowedRoles(["user", "admin"]).sort(), ["admin", "super_admin", "user"]);
  assert.deepEqual(expandAllowedRoles(["user"]), ["user"]);
  assert.deepEqual(expandAllowedRoles(["super_admin"]), ["super_admin"]);
});

const run = (middleware, role) => {
  let status = null;
  let nextCalled = false;
  const res = { status: (code) => { status = code; return { json: () => res }; } };
  middleware({ user: role ? { role } : undefined }, res, () => { nextCalled = true; });
  return { status, nextCalled };
};

test("authorize admits super_admin wherever admin is admitted", () => {
  assert.equal(run(authorize(["admin"]), "super_admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), "admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), "user").status, 403);
  assert.equal(run(authorize(["user"]), "super_admin").status, 403);
  assert.equal(run(authorize(["super_admin"]), "admin").status, 403);
  assert.equal(run(authorize(["super_admin"]), "super_admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), null).status, 403);
});

test("the User model accepts super_admin and rejects unknown roles", () => {
  const ok = new User({ name: "S", email: "s@x.io", passwordHash: "h", role: "super_admin" });
  assert.equal(ok.validateSync(), undefined);
  const bad = new User({ name: "S", email: "s@x.io", passwordHash: "h", role: "owner" });
  assert.ok(bad.validateSync()?.errors?.role);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm --prefix backend test`
Expected: FAIL — `Cannot find module '../utils/roles.js'`.

- [ ] **Step 3: Implement**

`backend/src/utils/roles.js`:

```js
export const ROLES = Object.freeze({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
export const ALL_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]);
/** Roles that can never be self-registered. */
export const PRIVILEGED_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN;
/** Admin-tier: everything an admin may do, a super-admin may do too. */
export const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
export const isKitchenRole = (role) => role === ROLES.USER;

export const expandAllowedRoles = (roles) =>
  roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SUPER_ADMIN) ? [...roles, ROLES.SUPER_ADMIN] : [...roles];
```

`backend/src/models/User.js` line 8:

```js
    role: { type: String, enum: ALL_ROLES, required: true },
```
and add `import { ALL_ROLES } from "../utils/roles.js";` under the mongoose import.

`backend/src/middleware/auth.js` — add `import { expandAllowedRoles } from "../utils/roles.js";` and replace `authorize`:

```js
export const authorize = (roles) => {
  const allowed = expandAllowedRoles(roles);
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
};
```

- [ ] **Step 4: Run tests**

Run: `npm --prefix backend test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/roles.js backend/src/models/User.js backend/src/middleware/auth.js backend/src/tests/roles.test.js
git commit -m "feat(auth): add super_admin role and admin-tier authorize expansion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Replace every direct role branch + guard test

**Files:**
- Modify: `backend/src/routes/operationsRoutes.js` lines 76, 817, 1054, 1090, 1168, 1208 (line numbers as of `946682b`; re-grep before editing)
- Modify: `backend/src/routes/indentRequestRoutes.js` lines 114, 194, 195
- Test: `backend/src/tests/superAdminBranches.test.js`, `backend/src/tests/roleGuard.test.js`

**Interfaces:**
- Consumes: `isAdminRole`, `isKitchenRole` (Task 2); `startDb/clearDb/stopDb`, `createUser`, `createGodown` (Task 1).

- [ ] **Step 1: Write the guard test (fails today)**

`backend/src/tests/roleGuard.test.js`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SCANNED = ["backend/src", "admin-web/src", "client-web/src"];
const ALLOWED = new Set(["backend/src/utils/roles.js", "admin-web/src/roles.js"]);
const DIRECT = /\brole\s*[!=]==?\s*["'](admin|super_admin)["']|["'](admin|super_admin)["']\s*[!=]==?\s*[\w.]*role\b/;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return ["node_modules", "tests", "dist"].includes(entry.name) ? [] : walk(full);
  return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
});

test("no code compares a role to admin/super_admin directly", () => {
  const offenders = [];
  for (const base of SCANNED) {
    for (const file of walk(path.join(root, base))) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (ALLOWED.has(rel)) continue;
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (DIRECT.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(offenders, [], `Use isAdminRole/isSuperAdmin instead:\n${offenders.join("\n")}`);
});
```

- [ ] **Step 2: Write the behaviour tests**

`backend/src/tests/superAdminBranches.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { GodownStock, IndentRequest, Notification, Request, Transfer } from "../models/FlowModels.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { User } from "../models/User.js";

let app;
let ctx;
before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  const a = await createGodown("Kitchen A");
  const b = await createGodown("Kitchen B");
  const c = await createGodown("Kitchen C");
  const group = await StockGroup.create({ name: "Grains" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const rice = await StockItem.create({ name: "Rice", stockGroupId: group._id, unitId: unit._id });
  const stockA = await GodownStock.create({ godownId: a._id, stockItemId: rice._id, qtyBaseUnit: 50 });
  await GodownStock.create({ godownId: b._id, stockItemId: rice._id, qtyBaseUnit: 20 });
  const userA = await createUser({ role: "user", godownId: a._id });
  const userB = await createUser({ role: "user", godownId: b._id });
  const admin = await createUser({ role: "admin" });
  const superAdmin = await createUser({ role: "super_admin" });
  ctx = { a, b, c, rice, stockA, userA, userB, admin, superAdmin };
});

const as = (who) => (method, url) =>
  request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);

test("GET /requests: super_admin sees every kitchen's requests, like admin", async () => {
  await Request.create([
    { godownId: ctx.a._id, userId: ctx.userA.user._id, targetDate: "2026-10-01", reason: "r", items: [] },
    { godownId: ctx.b._id, userId: ctx.userB.user._id, targetDate: "2026-10-01", reason: "r", items: [] }
  ]);
  assert.equal((await as("superAdmin")("get", "/api/requests")).body.length, 2);
  assert.equal((await as("admin")("get", "/api/requests")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/requests")).body.length, 1);
});

test("GET /transfers, /godown-stocks, /notifications are unfiltered for super_admin", async () => {
  await Transfer.create([
    { fromGodownId: ctx.a._id, toGodownId: ctx.b._id, createdBy: ctx.admin.user._id, items: [] },
    { fromGodownId: ctx.c._id, toGodownId: ctx.b._id, createdBy: ctx.admin.user._id, items: [] }
  ]);
  await Notification.create([
    { type: "t", payload: { godownId: String(ctx.a._id) } },
    { type: "t", payload: { godownId: String(ctx.b._id) } }
  ]);
  assert.equal((await as("superAdmin")("get", "/api/transfers")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/transfers")).body.length, 1);
  assert.equal((await as("superAdmin")("get", "/api/godown-stocks")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/godown-stocks")).body.length, 1);
  assert.equal((await as("superAdmin")("get", "/api/notifications")).body.length, 2);
  assert.equal((await as("userA")("get", "/api/notifications")).body.length, 1);
});

test("the /api/operations alias behaves the same", async () => {
  await Request.create({ godownId: ctx.b._id, userId: ctx.userB.user._id, targetDate: "2026-10-01", reason: "r", items: [] });
  assert.equal((await as("superAdmin")("get", "/api/operations/requests")).body.length, 1);
});

test("POST /transfers: super_admin chooses the source kitchen, like admin", async () => {
  const res = await as("superAdmin")("post", "/api/transfers").send({
    fromGodownId: ctx.a._id, toGodownId: ctx.b._id, items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 5 }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(String(res.body.fromGodownId), String(ctx.a._id));
});

test("POST /consumptions: super_admin records against the kitchen in the body", async () => {
  const res = await as("superAdmin")("post", "/api/consumptions").send({
    godownId: ctx.a._id, date: "2026-10-12", items: [{ stockRecordId: ctx.stockA._id, qtyBaseUnit: 2 }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(String(res.body.godownId._id), String(ctx.a._id));
});

test("indent requests: super_admin is not subject to kitchen ownership rules", async () => {
  const supply = await IndentRequest.create({
    godownId: ctx.a._id, userId: ctx.userA.user._id, status: "confirmed",
    items: [{ stockItemId: ctx.rice._id, qtyBaseUnit: 4, status: "approved" }]
  });
  const received = await as("superAdmin")("post", `/api/indent-requests/${supply._id}/receive`)
    .send({ items: [{ stockItemId: ctx.rice._id, receivedQty: 4 }] });
  assert.equal(received.status, 200, JSON.stringify(received.body));
  const deleted = await as("superAdmin")("delete", `/api/indent-requests/${supply._id}`);
  assert.equal(deleted.status, 200);
});

test("admin-only routes admit super_admin; user-only routes reject it exactly like admin", async () => {
  for (const url of ["/api/consumptions", "/api/procurement/indents", "/api/reports/indents", "/api/product-ledger/godowns", "/api/daily-usage"]) {
    assert.equal((await as("superAdmin")("get", url)).status, 200, url);
  }
  const create = await as("superAdmin")("post", "/api/requests").send({ targetDate: "2026-10-01", reason: "x", items: [] });
  assert.equal(create.status, 403);
  const adminCreate = await as("admin")("post", "/api/requests").send({ targetDate: "2026-10-01", reason: "x", items: [] });
  assert.equal(adminCreate.status, 403);
});

test("demoted super-admin is forbidden on next request; deactivated is unauthorised", async () => {
  await User.updateOne({ _id: ctx.superAdmin.user._id }, { role: "user" });
  assert.equal((await as("superAdmin")("get", "/api/consumptions")).status, 403);
  await User.updateOne({ _id: ctx.superAdmin.user._id }, { role: "super_admin", active: false });
  assert.equal((await as("superAdmin")("get", "/api/consumptions")).status, 401);
});
```

- [ ] **Step 3: Run to verify failures**

Run: `npm --prefix backend test`
Expected: `roleGuard` FAILS listing the operationsRoutes/indentRequestRoutes/admin-web lines; `superAdminBranches` FAILS on the requests/transfers/godown-stocks/notifications/POST transfers/indent tests (super_admin currently filtered like a kitchen or rejected by the `role === "user"` checks — note `GET /requests` gives `{userId: super}` filter → 0 rows).

- [ ] **Step 4: Rewrite the branches**

Add to the imports of `backend/src/routes/operationsRoutes.js`:

```js
import { isAdminRole, isKitchenRole } from "../utils/roles.js";
```

Make exactly these replacements (search for the left-hand text):

| Find | Replace with |
|---|---|
| `const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;` | `const godownId = isKitchenRole(req.user.role) ? req.user.godownId : req.body.godownId;` |
| `const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };` | `const filter = isAdminRole(req.user.role) ? {} : { userId: req.user.sub };` |
| `if (req.user.role === "user") {` (two places: transfers list, godown-stocks list) | `if (isKitchenRole(req.user.role)) {` |
| `req.user.role === "admin"` (inside `sourceGodownId` ternary) | `isAdminRole(req.user.role)` |
| `const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };` | `const filter = isAdminRole(req.user.role) ? {} : { "payload.godownId": req.user.godownId };` |

In `backend/src/routes/indentRequestRoutes.js` add `import { isKitchenRole } from "../utils/roles.js";` and replace the three `req.user.role === "user"` occurrences with `isKitchenRole(req.user.role)`.

Run: `grep -rn "role ===\|role !==" backend/src --include='*.js' | grep -v tests/`
Expected: only `utils/roles.js` lines remain. (`server.js` and `realtime.js` are handled in Task 4; admin-web in Task 7 — the guard test keeps failing until then. That is expected; note it in the task report.)

- [ ] **Step 5: Run tests**

Run: `npm --prefix backend test`
Expected: `superAdminBranches` PASS. `roleGuard` still FAILS only on `backend/src/realtime.js`, `admin-web/src/App.jsx`, `admin-web/src/pages/AuthPage.jsx`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/operationsRoutes.js backend/src/routes/indentRequestRoutes.js backend/src/tests/superAdminBranches.test.js backend/src/tests/roleGuard.test.js
git commit -m "feat(auth): give super_admin every admin branch in operations and supply requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Socket rooms for super-admin

**Files:**
- Modify: `backend/src/realtime.js` (`roomsFor`)
- Test: `backend/src/tests/realtime.test.js`

**Interfaces:**
- Consumes: `isAdminRole` (Task 2). Produces: `roomsFor(user) → string[]`.

- [ ] **Step 1: Failing test**

`backend/src/tests/realtime.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { io, roomsFor, setIo } from "../realtime.js";

test("admin-tier users join the admins room only", () => {
  assert.deepEqual(roomsFor({ role: "admin", godownId: null }), ["admins"]);
  assert.deepEqual(roomsFor({ role: "super_admin", godownId: null }), ["admins"]);
  assert.deepEqual(roomsFor({ role: "super_admin", godownId: "abc" }), ["admins"]);
});

test("kitchen users join their kitchen room; a user without a kitchen joins nothing", () => {
  assert.deepEqual(roomsFor({ role: "user", godownId: "g1" }), ["g1"]);
  assert.deepEqual(roomsFor({ role: "user", godownId: null }), []);
  assert.deepEqual(roomsFor(undefined), []);
});

test("emits are no-ops before setIo and delegate after", () => {
  assert.equal(io.to("admins").to("g1").emit("x", {}), false);
  const calls = [];
  const fake = { to: (room) => { calls.push(room); return fake; }, emit: (event) => { calls.push(event); return true; } };
  setIo(fake);
  io.to("admins").emit("ping");
  assert.deepEqual(calls, ["admins", "ping"]);
  setIo(null);
});
```

- [ ] **Step 2: Run** — `npm --prefix backend test` → FAIL on `super_admin` rows.

- [ ] **Step 3: Implement** — in `backend/src/realtime.js` add `import { isAdminRole } from "./utils/roles.js";` and change the first line of `roomsFor` to:

```js
  if (isAdminRole(user?.role)) return ["admins"];
```

(Role changes take effect on the socket at its next connection, because rooms are joined at handshake; access tokens are short-lived and the client reconnects on refresh. Document this in Task 35's README section.)

- [ ] **Step 4: Run** — PASS (guard test now fails only on admin-web files).

- [ ] **Step 5: Commit**

```bash
git add backend/src/realtime.js backend/src/tests/realtime.test.js
git commit -m "feat(realtime): super_admin joins the admins socket room

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Auth flows — registration, login, refresh, inactive, logout

**Files:**
- Modify: `backend/src/routes/authRoutes.js:18-21` (registration role check) and add `POST /logout`
- Test: `backend/src/tests/authSuperAdmin.test.js`

**Interfaces:**
- Consumes: `PRIVILEGED_ROLES` (Task 2).
- Produces: `POST /api/auth/logout` (Bearer token required) → `204`, clears the stored refresh token so `/api/auth/refresh` with it returns 401.

- [ ] **Step 1: Failing tests**

`backend/src/tests/authSuperAdmin.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { User } from "../models/User.js";

let app;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
beforeEach(clearDb);
after(stopDb);

const register = (body) => request(app).post("/api/auth/register").send({ name: "N", email: "n@x.io", password: "Passw0rd!", ...body });

test("public registration rejects privileged roles", async () => {
  const godown = await createGodown("K");
  assert.equal((await register({ role: "super_admin", godownId: godown._id })).status, 403);
  assert.equal((await register({ role: "admin", godownId: godown._id })).status, 403);
  assert.equal((await register({ role: "manager", godownId: godown._id })).status, 400);
  assert.equal(await User.countDocuments({}), 0);
});

test("super_admin can log in, refresh and keeps its role in new tokens", async () => {
  const { user, password } = await createUser({ role: "super_admin", email: "boss@x.io" });
  const login = await request(app).post("/api/auth/login").send({ email: "boss@x.io", password });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, "super_admin");
  assert.equal(jwt.decode(login.body.accessToken).role, "super_admin");

  const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
  assert.equal(refresh.status, 200);
  assert.equal(jwt.decode(refresh.body.accessToken).role, "super_admin");

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${refresh.body.accessToken}`);
  assert.equal(me.body.role, "super_admin");
  assert.equal(String(me.body._id), String(user._id));
});

test("inactive super_admin cannot log in, refresh or call APIs", async () => {
  const { user, token, refreshToken, password } = await createUser({ role: "super_admin", email: "off@x.io" });
  await User.updateOne({ _id: user._id }, { active: false });
  assert.equal((await request(app).post("/api/auth/login").send({ email: "off@x.io", password })).status, 401);
  assert.equal((await request(app).post("/api/auth/refresh").send({ refreshToken })).status, 401);
  assert.equal((await request(app).get("/api/consumptions").set("Authorization", `Bearer ${token}`)).status, 401);
});

test("logout revokes the refresh token for any role", async () => {
  for (const role of ["super_admin", "admin"]) {
    const { token, refreshToken } = await createUser({ role });
    const out = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    assert.equal(out.status, 204);
    assert.equal((await request(app).post("/api/auth/refresh").send({ refreshToken })).status, 401);
  }
  assert.equal((await request(app).post("/api/auth/logout")).status, 401);
});
```

- [ ] **Step 2: Run** — `npm --prefix backend test` → FAIL: `super_admin` registration returns 400 not 403; `/logout` returns 404.

- [ ] **Step 3: Implement**

In `backend/src/routes/authRoutes.js` add `import { PRIVILEGED_ROLES } from "../utils/roles.js";` and replace line 20:

```js
  if (PRIVILEGED_ROLES.includes(role)) return res.status(403).json({ message: "Privileged accounts cannot be created through public registration" });
```

Add after the `/refresh` route:

```js
// --- Logout: revoke the refresh token so it cannot mint new access tokens ---
authRoutes.post("/logout", authenticate, async (req, res) => {
  await User.updateOne({ _id: req.user.sub }, { $set: { refreshToken: null } });
  return res.status(204).end();
});
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/authRoutes.js backend/src/tests/authSuperAdmin.test.js
git commit -m "feat(auth): reject privileged self-registration and add logout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Idempotent super-admin CLI + dev seed account

**Files:**
- Create: `backend/src/jobs/create-super-admin.js`
- Modify: `backend/package.json` (script), `backend/src/jobs/seed-dev.js:65`
- Test: `backend/src/tests/createSuperAdmin.test.js`

**Interfaces:**
- Produces: `ensureSuperAdmin({ email, name, password, promote = false, resetPassword = false }) → Promise<{ status: "created"|"unchanged"|"promoted"|"password-reset", userId }>`; throws `Error` with `code` `INVALID_INPUT` or `ROLE_CONFLICT`.

- [ ] **Step 1: Failing tests**

`backend/src/tests/createSuperAdmin.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import bcrypt from "bcryptjs";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { ensureSuperAdmin } from "../jobs/create-super-admin.js";
import { User } from "../models/User.js";

before(startDb);
beforeEach(clearDb);
after(stopDb);

const input = { email: "Root@Example.com", name: "Root", password: "Sup3rSecret!" };

test("creates once, then is a no-op", async () => {
  const first = await ensureSuperAdmin(input);
  assert.equal(first.status, "created");
  const second = await ensureSuperAdmin(input);
  assert.equal(second.status, "unchanged");
  assert.equal(await User.countDocuments({ role: "super_admin" }), 1);
  const user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Sup3rSecret!", user.passwordHash), true);
});

test("does not change the password unless asked", async () => {
  await ensureSuperAdmin(input);
  await ensureSuperAdmin({ ...input, password: "Different1!" });
  let user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Sup3rSecret!", user.passwordHash), true);
  const res = await ensureSuperAdmin({ ...input, password: "Different1!", resetPassword: true });
  assert.equal(res.status, "password-reset");
  user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Different1!", user.passwordHash), true);
  assert.equal(user.refreshToken, null);
});

test("refuses to promote an existing account without --promote", async () => {
  await createUser({ role: "admin", email: "root@example.com" });
  await assert.rejects(ensureSuperAdmin(input), (err) => err.code === "ROLE_CONFLICT");
  const res = await ensureSuperAdmin({ ...input, promote: true });
  assert.equal(res.status, "promoted");
  const user = await User.findOne({ email: "root@example.com" });
  assert.equal(user.role, "super_admin");
  assert.equal(user.godownId, null);
  assert.equal(user.refreshToken, null);
});

test("validates input", async () => {
  await assert.rejects(ensureSuperAdmin({ ...input, email: "" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, email: "not-an-email" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, password: "short" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, name: "  " }), (err) => err.code === "INVALID_INPUT");
});
```

- [ ] **Step 2: Run** — FAIL (module missing).

- [ ] **Step 3: Implement**

`backend/src/jobs/create-super-admin.js`:

```js
// Creates (or safely re-runs for) the super-admin account.
// Credentials come only from the environment; nothing is hard-coded.
//   SUPER_ADMIN_EMAIL=... SUPER_ADMIN_NAME=... SUPER_ADMIN_PASSWORD=... npm --prefix backend run create-super-admin
// Flags: --promote (turn an existing account with that email into super_admin)
//        --reset-password (replace the password of an existing super_admin)
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { User } from "../models/User.js";
import { ROLES } from "../utils/roles.js";
import { isValidPassword } from "../routes/authRoutes.js";

const fail = (code, message) => Object.assign(new Error(message), { code });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ensureSuperAdmin = async ({ email, name, password, promote = false, resetPassword = false }) => {
  const normalized = String(email || "").toLowerCase().trim();
  const cleanName = String(name || "").trim();
  if (!EMAIL.test(normalized)) throw fail("INVALID_INPUT", "SUPER_ADMIN_EMAIL must be a valid email address");
  if (!cleanName) throw fail("INVALID_INPUT", "SUPER_ADMIN_NAME is required");
  if (!isValidPassword(password)) throw fail("INVALID_INPUT", "SUPER_ADMIN_PASSWORD must be at least 8 characters");

  const existing = await User.findOne({ email: normalized });
  if (!existing) {
    const user = await User.create({
      name: cleanName, email: normalized, role: ROLES.SUPER_ADMIN, godownId: null, active: true,
      passwordHash: await bcrypt.hash(password, 10)
    });
    return { status: "created", userId: String(user._id) };
  }

  if (existing.role !== ROLES.SUPER_ADMIN) {
    if (!promote) throw fail("ROLE_CONFLICT", `${normalized} already exists with role "${existing.role}". Re-run with --promote to make it super_admin.`);
    existing.role = ROLES.SUPER_ADMIN;
    existing.godownId = null;
    existing.active = true;
    existing.refreshToken = null;
    await existing.save();
    return { status: "promoted", userId: String(existing._id) };
  }

  if (resetPassword) {
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.refreshToken = null;
    await existing.save();
    return { status: "password-reset", userId: String(existing._id) };
  }
  return { status: "unchanged", userId: String(existing._id) };
};

const main = async () => {
  const { connectDB } = await import("../config/db.js");
  await connectDB();
  try {
    const result = await ensureSuperAdmin({
      email: process.env.SUPER_ADMIN_EMAIL,
      name: process.env.SUPER_ADMIN_NAME,
      password: process.env.SUPER_ADMIN_PASSWORD,
      promote: process.argv.includes("--promote"),
      resetPassword: process.argv.includes("--reset-password")
    });
    console.log(`Super-admin ${result.status} (${result.userId})`);
    process.exitCode = 0;
  } catch (error) {
    console.error(`Super-admin not created: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

`backend/package.json` scripts — add:

```json
"create-super-admin": "node src/jobs/create-super-admin.js"
```

`backend/src/jobs/seed-dev.js` — after the `const admin = await User.create(...)` line (line 65) add the local-only account (this file already refuses non-local databases):

```js
  await User.create({ name: "Dev Super Admin", email: "superadmin@example.com", passwordHash: await hash("Super@123"), role: "super_admin" });
```

and change the final `console.log` to mention `superadmin@example.com / Super@123`.

- [ ] **Step 4: Run** — PASS. Also check secrets did not leak: `git grep -n "SUPER_ADMIN_PASSWORD=" -- ':!docs'` → no output.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs/create-super-admin.js backend/src/jobs/seed-dev.js backend/package.json backend/src/tests/createSuperAdmin.test.js
git commit -m "feat(auth): idempotent env-driven super-admin CLI and dev seed account

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Admin-web role gate, logout call, vitest

**Files:**
- Create: `admin-web/src/roles.js`, `admin-web/src/roles.test.js`
- Modify: `admin-web/package.json` (vitest + `test` script), root `package.json` (`test`)
- Modify: `admin-web/src/App.jsx:60-64,82-86`, `admin-web/src/pages/AuthPage.jsx:53`, `admin-web/src/api.js` (add `logout`)

**Interfaces:**
- Produces (`admin-web/src/roles.js`): `ROLES`, `isAdminRole(role)`, `isSuperAdmin(role)` — same semantics as backend.
- Produces (`admin-web/src/api.js`): `logout() → Promise<void>` (best-effort server revoke, then `clearSession()`).
- Produces: `App` session state `{ loggedIn, role }`; Phase 3 reads `session.role`.

Client-web has no role branches (verified: only `Login.jsx` stores `data.role`), so a super-admin there behaves exactly as an admin does today. No client-web change in this task.

- [ ] **Step 1: Install vitest and wire scripts**

```bash
npm --prefix admin-web install --save-dev vitest@2
```

`admin-web/package.json` scripts: add `"test": "vitest run"`.
Root `package.json` scripts: change `"test"` to `"npm --prefix backend test && npm --prefix admin-web test"`.

- [ ] **Step 2: Failing test**

`admin-web/src/roles.test.js`:

```js
import { describe, expect, it } from "vitest";
import { ROLES, isAdminRole, isSuperAdmin } from "./roles.js";

describe("roles", () => {
  it("matches backend role strings", () => {
    expect(ROLES).toEqual({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
  });
  it("treats super_admin as admin-tier", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("admin")).toBe(false);
  });
});
```

Run: `npm --prefix admin-web test` → FAIL (module missing).

- [ ] **Step 3: Implement**

`admin-web/src/roles.js`:

```js
export const ROLES = Object.freeze({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN;
/** Admin-tier roles may use this console. */
export const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
```

`admin-web/src/api.js` — after `clearSession`:

```js
/** Revokes the refresh token server-side when possible, then forgets the session locally. */
export const logout = async () => {
  try {
    if (localStorage.getItem(KEYS.access)) await api.post("/auth/logout");
  } catch {
    // Best effort: an expired or offline session is still cleared locally.
  } finally {
    clearSession();
  }
};
```

`admin-web/src/pages/AuthPage.jsx` — import `{ isAdminRole } from "../roles.js"` and change line 53 to `if (!isAdminRole(data.role)) {`.

`admin-web/src/App.jsx`:
- import `{ clearSession, logout, SESSION_EXPIRED_EVENT } from "./api.js"` (keep `clearSession` only if still used; lint will tell you) and `{ isAdminRole } from "./roles.js"`.
- `handleLogout` becomes:

```js
  const handleLogout = async () => {
    await logout();
    setExpired(false);
    setSession({ loggedIn: false, role: null });
  };
```

- line 82 `session.role !== "admin"` → `!isAdminRole(session.role)`; line 85 text → `This web app is for administrators only. Please sign in with an admin account.`

- [ ] **Step 4: Run everything**

Run: `npm test && npm run lint`
Expected: backend PASS including `roleGuard` (no offenders left), admin-web PASS, lint clean (warnings allowed only where they already existed).

- [ ] **Step 5: Manual check**

Run `npm run dev:backend` and `npm run dev:admin`; with the dev seed (`npm --prefix backend run seed` is the non-dev seed — use `node backend/src/jobs/seed-dev.js` only against a local DB) sign in as `superadmin@example.com` / `Super@123`: every existing admin page loads; sign out; confirm in MongoDB that the user's `refreshToken` is `null`.

- [ ] **Step 6: Commit**

```bash
git add admin-web/package.json admin-web/package-lock.json package.json admin-web/src/roles.js admin-web/src/roles.test.js \
  admin-web/src/api.js admin-web/src/App.jsx admin-web/src/pages/AuthPage.jsx
git commit -m "feat(admin-web): admit super_admin, revoke session on logout, add vitest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
