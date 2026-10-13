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
