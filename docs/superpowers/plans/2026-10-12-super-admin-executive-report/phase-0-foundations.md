# Phase 0 — Foundations (testability)

Read `README.md` first. Every later phase depends on this one.

**Why:** `operationsRoutes.js` imports `io` from `server.js`, and `server.js` connects to MongoDB and calls `listen()` at import time. Importing `app.js` in a test therefore starts the real server. Integration tests (required by later tasks) need `app` importable with no side effects and a disposable MongoDB that supports transactions (the routes use `session.withTransaction`, which needs a replica set).

---

### Task 1: Realtime module + test harness

**Files:**
- Create: `backend/src/realtime.js`
- Modify: `backend/src/server.js` (whole file — io creation and room join)
- Modify: `backend/src/routes/operationsRoutes.js:5` (import line only)
- Modify: `backend/src/app.js:95` (morgan line)
- Modify: `backend/package.json` (scripts + devDependencies)
- Create: `backend/src/tests/helpers/db.js`, `backend/src/tests/helpers/auth.js`
- Test: `backend/src/tests/app.smoke.test.js`

**Interfaces:**
- Produces: `io` (object with `.to(room)` returning chainable `{ to, emit }`), `setIo(server)`, `roomsFor(user) → string[]` from `backend/src/realtime.js`. In this task `roomsFor` keeps today's rule (`role === "admin"` → `["admins"]`); Task 4 switches it to `isAdminRole`.
- Produces: `startDb()`, `clearDb()`, `stopDb()` from `tests/helpers/db.js`; `createUser({ role, godownId, email, password, active, name }) → { user, token, refreshToken, password }` and `createGodown(name, { active }) → Godown doc` from `tests/helpers/auth.js`.
- Produces: `app` remains `export { app }` from `backend/src/app.js` (check the bottom of the file; if it is `export const app`, keep it).

- [ ] **Step 1: Branch and install dev dependencies**

Ask your human partner how to handle the existing uncommitted changes (see README Global Constraints), then:

```bash
cd /Users/gayani/MKM
git checkout -b feat/super-admin-executive-report
npm --prefix backend install --save-dev supertest@7 mongodb-memory-server@10
```

Expected: both appear under `devDependencies` in `backend/package.json`. The first test run downloads a `mongod` binary (~100 MB) into `~/.cache/mongodb-binaries`; it needs network once.

- [ ] **Step 2: Update the backend test script**

In `backend/package.json` replace the `test` script:

```json
"test": "NODE_ENV=test node --test --test-concurrency=2 src/tests/*.test.js",
"test:perf": "NODE_ENV=test PERF=1 node --test --test-concurrency=1 src/tests/executivePerf.test.js"
```

(`helpers/` files are not matched by `src/tests/*.test.js`.)

- [ ] **Step 3: Write the failing smoke test**

`backend/src/tests/app.smoke.test.js`:

```js
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";

let app;
before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
beforeEach(clearDb);
after(stopDb);

test("app is importable without starting the HTTP server", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("protected routes require a token", async () => {
  const res = await request(app).get("/api/requests");
  assert.equal(res.status, 401);
});

test("a route that emits socket events works before io is attached", async () => {
  const godown = await createGodown("Smoke Kitchen");
  const { token } = await createUser({ role: "user", godownId: godown._id });
  const res = await request(app)
    .post("/api/requests")
    .set("Authorization", `Bearer ${token}`)
    .send({ targetDate: "2026-10-12", reason: "smoke", items: [] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm --prefix backend test`
Expected: FAIL — `Cannot find module './helpers/db.js'`.

- [ ] **Step 5: Write the helpers**

`backend/src/tests/helpers/db.js`:

```js
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet = null;

/** Starts a single-node replica set (transactions need one) and connects mongoose. */
export const startDb = async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await mongoose.connect(replSet.getUri());
};

/** Empties every collection but keeps indexes, so unique constraints still apply. */
export const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

/** Builds every registered model's indexes; call after importing the models under test. */
export const syncAllIndexes = async () => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
};

export const stopDb = async () => {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
};
```

`backend/src/tests/helpers/auth.js`:

```js
import bcrypt from "bcryptjs";
import { User } from "../../models/User.js";
import { Godown } from "../../models/InventoryModels.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";

let counter = 0;

export const createGodown = (name, { active = true } = {}) => Godown.create({ name, active });

/** Creates a user with a low bcrypt cost (fast) and returns valid tokens for it. */
export const createUser = async ({
  role = "admin",
  godownId = null,
  email,
  password = "Passw0rd!",
  active = true,
  name
} = {}) => {
  counter += 1;
  const user = await User.create({
    name: name || `${role} ${counter}`,
    email: email || `${role}.${counter}.${Date.now()}@test.local`,
    passwordHash: await bcrypt.hash(password, 4),
    role,
    godownId,
    active
  });
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();
  return { user, token, refreshToken, password };
};
```

- [ ] **Step 6: Create the realtime module**

`backend/src/realtime.js`:

```js
// The socket.io server is created by server.js, but routes need to emit events
// without importing server.js (which would start listening). Routes import `io`
// from here; until setIo() runs (tests, scripts) every emit is a no-op.
let instance = null;

const noop = { to: () => noop, emit: () => false };

export const setIo = (server) => {
  instance = server;
};

export const io = {
  to: (room) => (instance ? instance.to(room) : noop),
  emit: (...args) => (instance ? instance.emit(...args) : false)
};

/** Rooms a connected socket joins. Admin-tier users share "admins"; kitchens join their godown room. */
export const roomsFor = (user) => {
  if (user?.role === "admin") return ["admins"];
  return user?.godownId ? [String(user.godownId)] : [];
};
```

- [ ] **Step 7: Point server.js and operationsRoutes.js at it**

In `backend/src/server.js`:
- add `import { roomsFor, setIo } from "./realtime.js";`
- after `const io = new Server(server, { ... });` add `setIo(io);`
- replace the `io.on("connection", ...)` body with:

```js
io.on("connection", (socket) => {
  for (const room of roomsFor(socket.data.user)) socket.join(room);
});
```

- keep `export { io };` at the bottom (harmless; nothing else should import it after this task).

In `backend/src/routes/operationsRoutes.js` line 5 replace
`import { io } from "../server.js";` with `import { io } from "../realtime.js";`

Then confirm nothing else imports the server:

Run: `grep -rn "from \"../server.js\"\|from \"./server.js\"" backend/src`
Expected: no output.

- [ ] **Step 8: Silence request logging in tests**

In `backend/src/app.js` replace `app.use(morgan("dev"));` with:

```js
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
```

- [ ] **Step 9: Run the tests**

Run: `npm --prefix backend test`
Expected: all tests PASS (3 new + the existing `authSecurity`, `env`, `indentRequestRoutes` tests).

- [ ] **Step 10: Start the real server once to prove nothing regressed**

Run: `npm --prefix backend run dev` (needs local MongoDB as in the project README), wait for `Backend running with authenticated realtime updates`, then stop it with Ctrl+C.
Expected: starts without errors. If no local MongoDB is available, say so in the task report instead of skipping silently.

- [ ] **Step 11: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/realtime.js backend/src/server.js \
  backend/src/routes/operationsRoutes.js backend/src/app.js backend/src/tests/helpers backend/src/tests/app.smoke.test.js
git commit -m "test(backend): make app importable and add in-memory MongoDB harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
