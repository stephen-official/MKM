import { asyncRoute, typedErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import { notifyKitchens } from "../realtime.js";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { FEATURES, describeFeature } from "../features/registry.js";
import {
  DEFAULT_FLAGS, FLAG_SCOPES, FeatureFlagError, OVERRIDE_SCOPES, listAudit, listOverrides, loadFlagsDoc, loadGlobalFlags, overrideId,
  resolveEffectiveFlags, updateGlobalFlags, updateOverride
} from "../features/featureFlagService.js";
import { isAdminRole, isSuperAdmin } from "../utils/roles.js";

export const featureRoutes = express.Router();
// A successful flag change re-shapes the kitchen app, so every kitchen reloads its flags.
featureRoutes.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => { if (res.statusCode < 300) notifyKitchens("flags"); });
  next();
});
const superAdminOnly = authorize(["super_admin"]);

const errorPolicy = typedErrorPolicy({ isPublic: (error) => error instanceof FeatureFlagError, flattenDetails: true, fallbackCode: "INTERNAL_ERROR", fallbackMessage: "Something went wrong." });

const audienceOf = (role) => (isSuperAdmin(role) ? "super_admin" : isAdminRole(role) ? "admin" : "kitchen");

featureRoutes.get("/", asyncRoute(async (req, res) => {

    const effective = await resolveEffectiveFlags(req.user);
    const loadVersion = async () => (await loadGlobalFlags()).version;
    // Super-admins are never gated, so a flags outage must not block them either.
    const version = isSuperAdmin(req.user.role) ? await loadVersion().catch(() => 0)
      : isAdminRole(req.user.role) ? await loadVersion() : 0;
    return res.json({ audience: audienceOf(req.user.role), flags: effective || { ...DEFAULT_FLAGS }, version, features: FEATURES });

}, errorPolicy));

featureRoutes.get("/admin", superAdminOnly, asyncRoute(async (_req, res) => {

    const state = await loadGlobalFlags();
    return res.json({ ...state, features: FEATURES.map((f) => ({ ...f, routes: describeFeature(f.key) })) });

}, errorPolicy));

featureRoutes.put("/", superAdminOnly, asyncRoute(async (req, res) => {

    const me = await User.findById(req.user.sub).select("name email").lean();
    const { state, changed } = await updateGlobalFlags({
      actor: { id: req.user.sub, name: me?.name, email: me?.email },
      expectedVersion: req.body?.expectedVersion,
      changes: req.body?.changes
    });
    return res.json({ ...state, changed });

}, errorPolicy));

featureRoutes.get("/audit", superAdminOnly, asyncRoute(async (req, res) => {

    const scope = FLAG_SCOPES.includes(req.query.scope) ? req.query.scope : undefined;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId : undefined;
    return res.json(await listAudit({ page: req.query.page, scope, targetId }));

}, errorPolicy));

const isOverrideScope = (scope) => OVERRIDE_SCOPES.includes(scope);
const invalidScope = (res) => res.status(400).json({ code: "INVALID_SCOPE", message: 'scope must be "kitchen" or "user".' });

featureRoutes.get("/overrides", superAdminOnly, asyncRoute(async (req, res) => {

    if (!isOverrideScope(req.query.scope)) return invalidScope(res);
    return res.json(await listOverrides(req.query.scope));

}, errorPolicy));

featureRoutes.get("/overrides/:scope/:targetId", superAdminOnly, asyncRoute(async (req, res) => {

    if (!isOverrideScope(req.params.scope)) return invalidScope(res);
    // Reject junk ids before they reach the cache (every distinct id would otherwise get an entry).
    if (!mongoose.isValidObjectId(req.params.targetId)) {
      return res.status(404).json({ code: "TARGET_NOT_FOUND", message: "No such kitchen or user." });
    }
    return res.json(await loadFlagsDoc(overrideId(req.params.scope, req.params.targetId)));

}, errorPolicy));

featureRoutes.put("/overrides/:scope/:targetId", superAdminOnly, asyncRoute(async (req, res) => {

    const me = await User.findById(req.user.sub).select("name email").lean();
    const { state, changed } = await updateOverride({
      actor: { id: req.user.sub, name: me?.name, email: me?.email },
      scope: req.params.scope,
      targetId: req.params.targetId,
      expectedVersion: req.body?.expectedVersion,
      changes: req.body?.changes
    });
    return res.json({ ...state, changed });

}, errorPolicy));
