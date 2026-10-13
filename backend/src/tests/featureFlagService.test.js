import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { FeatureFlagAudit, FeatureFlags } from "../models/FeatureModels.js";
import { Godown } from "../models/InventoryModels.js";
import {
  DEFAULT_FLAGS, invalidateFlagCache, listAudit, listOverrides, loadGlobalFlags, resolveEffectiveFlags, updateGlobalFlags,
  updateOverride
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
  const warn = t.mock.method(console, "warn", () => {});
  assert.equal((await loadGlobalFlags({ now: t0 + 6000 + 10_000 })).version, 7, "stale fallback");
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /using cached global; reload failed: db down/);
  await assert.rejects(loadGlobalFlags({ now: t0 + 6000 + 6 * 60_000 }),
    (e) => e.status === 503 && e.code === "FEATURE_FLAGS_UNAVAILABLE");
});

test("a pre-write cached copy is not served as stale after an invalidation", async (t) => {
  const t0 = Date.now();
  await loadGlobalFlags({ now: t0 });
  t.mock.method(FeatureFlags, "findById", () => ({
    lean: async () => { invalidateFlagCache("global"); throw new Error("db down"); }
  }));
  const warn = t.mock.method(console, "warn", () => {});
  await assert.rejects(loadGlobalFlags({ now: t0 + 10_000 }), (e) => e.status === 503 && e.code === "FEATURE_FLAGS_UNAVAILABLE");
  assert.equal(warn.mock.callCount(), 0, "no stale copy was used");
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

test("effective flags: super_admin is not gated; kitchen users get flags; admins get global", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  assert.equal(await resolveEffectiveFlags({ role: "super_admin" }), null);
  assert.equal((await resolveEffectiveFlags({ role: "user", godownId: "65f0c0ffee0000000000abcd" })).reports, true);
  assert.equal((await resolveEffectiveFlags({ role: "admin" })).reports, false);
});

test("a load that started before a write cannot repopulate the cache with pre-write state", async (t) => {
  await FeatureFlags.create({ _id: "global", flags: { reports: false }, version: 1 });
  const realFindById = FeatureFlags.findById.bind(FeatureFlags);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  t.mock.method(FeatureFlags, "findById", (...args) => {
    calls += 1;
    if (calls > 1) return realFindById(...args);
    // First load: reads the pre-write document immediately, but only resolves once released.
    const pre = realFindById(...args).lean();
    return { lean: async () => { const doc = await pre; await gate; return doc; } };
  });

  const inFlight = loadGlobalFlags();
  await new Promise((resolve) => setImmediate(resolve));
  await updateGlobalFlags({ actor, expectedVersion: 1, changes: { reports: true } });
  release();
  assert.equal((await inFlight).version, 1, "the in-flight caller still gets what it read");

  const after = await loadGlobalFlags();
  assert.equal(after.version, 2, "the stale in-flight result was not cached over the write");
  assert.equal(after.flags.reports, true);
});

test("two writers at an existing version: exactly one wins and the loser sees the real current version", async () => {
  await updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } });
  const results = await Promise.allSettled([
    updateGlobalFlags({ actor, expectedVersion: 1, changes: { inventory: false } }),
    updateGlobalFlags({ actor, expectedVersion: 1, changes: { godowns: false } })
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const lost = results.find((r) => r.status === "rejected");
  assert.equal(lost.reason.code, "VERSION_CONFLICT");
  assert.equal(lost.reason.details.currentVersion, 2);
  assert.equal((await loadGlobalFlags()).version, 2);
  assert.equal(await FeatureFlagAudit.countDocuments(), 2);
});

test("a duplicate-key race reports the re-read current version, not a guess", async (t) => {
  await FeatureFlags.create({ _id: "global", flags: {}, version: 4 });
  const realFindById = FeatureFlags.findById.bind(FeatureFlags);
  let first = true;
  t.mock.method(FeatureFlags, "findById", (...args) => {
    if (!first) return realFindById(...args);
    first = false;
    // The transactional read still sees "no document", so the upsert hits the existing _id.
    return { session: () => ({ lean: async () => null }) };
  });
  await assert.rejects(updateGlobalFlags({ actor, expectedVersion: 0, changes: { reports: false } }),
    (e) => e.status === 409 && e.code === "VERSION_CONFLICT" && e.details.currentVersion === 4);
});

test("cached flag objects are frozen so callers cannot corrupt the cache", async () => {
  await FeatureFlags.create({ _id: "global", flags: { reports: false }, version: 2 });
  const { loadFlagsDoc } = await import("../features/featureFlagService.js");
  const stored = await loadFlagsDoc("global");
  assert.ok(Object.isFrozen(stored));
  assert.ok(Object.isFrozen(stored.flags));
  assert.throws(() => { stored.flags.reports = true; }, TypeError);
  assert.throws(() => { stored.version = 99; }, TypeError);
  assert.equal((await loadFlagsDoc("global")).flags.reports, false);
});

test("listAudit rejects an unknown scope and matches targetId case-insensitively", async () => {
  const kitchen = await Godown.create({ name: "K" });
  await updateOverride({ actor, scope: "kitchen", targetId: kitchen._id, expectedVersion: 0, changes: { requests: false } });
  await assert.rejects(listAudit({ scope: "team" }), (e) => e.status === 400 && e.code === "INVALID_SCOPE");
  await assert.rejects(listAudit({ scope: { $ne: "global" } }), (e) => e.code === "INVALID_SCOPE");
  const upper = String(kitchen._id).toUpperCase();
  assert.equal((await listAudit({ scope: "kitchen", targetId: upper })).total, 1);
  assert.equal((await listAudit({ targetId: { $ne: "x" } })).total, 0, "non-string targetId is stringified, not passed to Mongo as an operator");
});

test("listOverrides marks entries whose target no longer exists", async () => {
  const kept = await Godown.create({ name: "Kept" });
  const removed = await Godown.create({ name: "Removed" });
  await updateOverride({ actor, scope: "kitchen", targetId: kept._id, expectedVersion: 0, changes: { requests: false } });
  await updateOverride({ actor, scope: "kitchen", targetId: removed._id, expectedVersion: 0, changes: { requests: false } });
  await Godown.deleteOne({ _id: removed._id });
  const list = await listOverrides("kitchen");
  const byId = Object.fromEntries(list.map((entry) => [entry.targetId, entry.targetExists]));
  assert.deepEqual(byId, { [String(kept._id)]: true, [String(removed._id)]: false });
});
