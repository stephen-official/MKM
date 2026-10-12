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
