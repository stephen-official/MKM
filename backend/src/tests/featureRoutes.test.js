import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { invalidateFlagCache } from "../features/featureFlagService.js";
import { FeatureFlags } from "../models/FeatureModels.js";

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
  assert.equal(res.body.features.length, 11);
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

test("audit page is capped so a huge page cannot overflow skip", async () => {
  const res = await as(superAdmin, "get", "/api/features/audit?page=100000000000000000000");
  assert.equal(res.status, 200);
  assert.equal(res.body.page, 10000);
});

test("audit filters ignore object-shaped query params instead of passing them to Mongo", async () => {
  await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { reports: false } });
  const res = await as(superAdmin, "get", "/api/features/audit?targetId[$ne]=x&scope[$ne]=global");
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
});

test("GET /api/features is a 503 for an admin when the flags cannot be read", async (t) => {
  t.mock.method(FeatureFlags, "findById", () => ({ lean: async () => { throw new Error("db down"); } }));
  const warn = t.mock.method(console, "warn", () => {});
  const res = await as(admin, "get", "/api/features");
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "FEATURE_FLAGS_UNAVAILABLE");
  assert.equal(warn.mock.callCount(), 0, "no stale copy existed, so nothing to warn about");
});

test("GET /api/features still works for a super-admin when the flags cannot be read", async (t) => {
  t.mock.method(FeatureFlags, "findById", () => ({ lean: async () => { throw new Error("db down"); } }));
  t.mock.method(console, "warn", () => {});
  const res = await as(superAdmin, "get", "/api/features");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.audience, "super_admin");
  assert.ok(Object.values(res.body.flags).every((on) => on === true));
});

test("PUT rejects non-boolean values and empty change sets with their own codes", async () => {
  const invalid = await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes: { reports: "no" } });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_FEATURE_VALUE");
  assert.deepEqual(invalid.body.keys, ["reports"]);

  for (const changes of [{}, undefined, [], null]) {
    const none = await as(superAdmin, "put", "/api/features").send({ expectedVersion: 0, changes });
    assert.equal(none.status, 400, JSON.stringify(changes));
    assert.equal(none.body.code, "NO_CHANGES", JSON.stringify(changes));
  }
  assert.equal(await FeatureFlags.countDocuments(), 0);
});
