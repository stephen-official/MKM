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
