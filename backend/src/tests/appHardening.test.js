import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { User } from "../models/User.js";
import { asyncRoute, fail, legacyErrorPolicy, typedErrorPolicy } from "../shared/httpErrors.js";

let app;
let errorHandler;
before(async () => {
  await startDb();
  ({ app, errorHandler } = await import("../app.js"));
});
beforeEach(clearDb);
after(stopDb);

test("a rejected async route handler becomes a JSON 500 instead of an unhandled rejection", async () => {
  // Importing app.js must make every Express router forward async failures to the error handler.
  const probe = express();
  const router = express.Router();
  router.get("/boom", async () => {
    throw new Error("database is down");
  });
  probe.use(router);
  probe.use(errorHandler);
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = await request(probe).get("/boom");
    assert.equal(res.status, 500);
    assert.equal(res.body.message, "Internal Server Error");
    assert.equal(res.body.error, undefined, "internal error text must not leak to clients");
  } finally {
    console.error = originalError;
  }
});

test("the global handler preserves declared legacy JSON and export-text contracts", async () => {
  const probe = express();
  probe.get("/stock", asyncRoute(async () => { throw new Error("Insufficient stock"); }, legacyErrorPolicy({ status: 400 })));
  probe.get("/export", asyncRoute(async () => { throw new Error("internal details"); }, legacyErrorPolicy({ status: 400, text: true, message: "Export failed" })));
  probe.get("/typed", asyncRoute(async () => { throw Object.assign(fail(409, "Changed", "VERSION_CONFLICT"), { details: { currentVersion: 2 } }); }, typedErrorPolicy({ flattenDetails: true })));
  probe.use(errorHandler);
  assert.deepEqual((await request(probe).get("/stock")).body, { error: "Insufficient stock" });
  const exported = await request(probe).get("/export");
  assert.equal(exported.status, 400);
  assert.equal(exported.text, "Export failed");
  assert.match(exported.headers["content-type"], /text\/html/);
  assert.deepEqual((await request(probe).get("/typed")).body, { code: "VERSION_CONFLICT", message: "Changed", currentVersion: 2 });
});

test("login with a non-string email is a 400, not a crash", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: 1, password: "x" });
  assert.equal(res.status, 400);
});

test("forgot-password and reset-password reject non-string input with a 400", async () => {
  assert.equal((await request(app).post("/api/auth/forgot-password").send({ email: { $ne: "" } })).status, 400);
  assert.equal((await request(app).post("/api/auth/reset-password").send({ token: { a: 1 }, newPassword: "Passw0rd!long" })).status, 400);
});

test("inventory search treats regex characters literally", async () => {
  await createGodown("Main (North)");
  await createGodown("Mainland");
  const { token } = await createUser({ role: "admin" });
  const res = await request(app).get("/api/inventory/godowns").query({ q: "(North" }).set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((row) => row.name), ["Main (North)"]);
});

test("public registration is closed: kitchen accounts are created by a super-admin", async () => {
  const godown = await createGodown("K");
  const register = await request(app).post("/api/auth/register").send({ name: "N", email: "n@x.io", password: "Passw0rd!", godownId: godown._id });
  // With the routes gone, these paths fall through to the authenticated /api mounts (401) — never a 2xx.
  assert.ok([401, 404].includes(register.status), `register answered ${register.status}`);
  const godowns = await request(app).get("/api/auth/register-godowns");
  assert.ok([401, 404].includes(godowns.status), `register-godowns answered ${godowns.status}`);
  assert.equal(await User.countDocuments({}), 0);
});

// Keep last: it uses up this process's auth rate-limit allowance for one client address.
test("the auth rate limit counts the client address the proxy saw, not a spoofable header prefix", async () => {
  // Behind one proxy, X-Forwarded-For is "<whatever the client sent>, <real client ip>".
  let last;
  for (let i = 0; i < 101; i += 1) {
    last = await request(app).post("/api/auth/login").set("X-Forwarded-For", `10.0.0.${i % 250}, 203.0.113.7`).send({});
  }
  assert.equal(last.status, 429);
});
