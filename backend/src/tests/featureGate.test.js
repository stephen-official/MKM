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
