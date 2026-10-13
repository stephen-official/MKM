import mongoose from "mongoose";
import { FEATURES, FEATURE_KEYS, isFeatureKey } from "./registry.js";
import { FeatureFlagAudit, FeatureFlags, GLOBAL_FLAGS_ID } from "../models/FeatureModels.js";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import { isAdminRole, isSuperAdmin } from "../utils/roles.js";
import { clampPage } from "../utils/pagination.js";

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

const caches = new Map(); // id -> { state, loadedAt }

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

export const validateChanges = (changes, { allowNull = false } = {}) => {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new FeatureFlagError(400, "NO_CHANGES", "Provide at least one feature change.");
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) throw new FeatureFlagError(400, "NO_CHANGES", "Provide at least one feature change.");
  const unknown = keys.filter((key) => !isFeatureKey(key));
  if (unknown.length) throw new FeatureFlagError(400, "UNKNOWN_FEATURE_KEY", `Unknown feature: ${unknown.join(", ")}`, { keys: unknown });
  const invalid = keys.filter((key) => !(typeof changes[key] === "boolean" || (allowNull && changes[key] === null)));
  if (invalid.length) {
    const message = allowNull ? "Feature values must be true, false or null." : "Feature values must be true or false.";
    throw new FeatureFlagError(400, "INVALID_FEATURE_VALUE", message, { keys: invalid });
  }
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
export const writeFlagsDocument = async ({ id, scope, targetId = null, actor, expectedVersion, changes, baseFlags = DEFAULT_FLAGS, extraFields = {}, allowNull = false }) => {
  validateChanges(changes, { allowNull });
  validateVersion(expectedVersion);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const current = await FeatureFlags.findById(id).session(session).lean();
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== expectedVersion) throw conflict(currentVersion);

      const stored = current?.flags || {};
      const before = allowNull ? {} : { ...baseFlags };
      for (const key of FEATURE_KEYS) if (typeof stored[key] === "boolean") before[key] = stored[key];
      const changed = Object.entries(changes)
        .filter(([key, next]) => (before[key] ?? null) !== next)
        .map(([key, next]) => ({ key, previous: before[key] ?? null, next }));
      if (!changed.length) {
        result = { doc: current, changed };
        return;
      }

      const $set = { ...extraFields };
      const $unset = {};
      for (const { key, next } of changed) {
        if (next === null) $unset[`flags.${key}`] = "";
        else $set[`flags.${key}`] = next;
      }
      const update = { $set, $inc: { version: 1 } };
      if (Object.keys($unset).length) update.$unset = $unset;
      let doc;
      try {
        doc = await FeatureFlags.findOneAndUpdate(
          { _id: id, version: expectedVersion },
          update,
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
    invalidateFlagCache(id);
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
  return docs.map((d) => ({
    scope: d.scope,
    targetId: d.targetId,
    flags: Object.fromEntries(Object.entries(d.flags || {}).filter(([k, v]) => FEATURE_KEYS.includes(k) && typeof v === "boolean")),
    version: d.version,
    updatedAt: d.updatedAt
  }));
};

/** null = caller is not subject to feature gating (super-admins). */
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

export const listAudit = async ({ page = 1, scope, targetId } = {}) => {
  const safePage = clampPage(page);
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
