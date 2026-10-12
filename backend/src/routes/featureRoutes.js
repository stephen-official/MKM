import express from "express";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { FEATURES, describeFeature } from "../features/registry.js";
import {
  DEFAULT_FLAGS, FeatureFlagError, listAudit, loadGlobalFlags, resolveEffectiveFlags, updateGlobalFlags
} from "../features/featureFlagService.js";
import { isAdminRole, isSuperAdmin } from "../utils/roles.js";

export const featureRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);

const sendError = (res, error) => {
  if (error instanceof FeatureFlagError) return res.status(error.status).json({ code: error.code, message: error.message, ...error.details });
  console.error("[features]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong." });
};

const audienceOf = (role) => (isSuperAdmin(role) ? "super_admin" : isAdminRole(role) ? "admin" : "kitchen");

featureRoutes.get("/", async (req, res) => {
  try {
    const effective = await resolveEffectiveFlags(req.user);
    const version = isAdminRole(req.user.role) ? (await loadGlobalFlags()).version : 0;
    return res.json({ audience: audienceOf(req.user.role), flags: effective || { ...DEFAULT_FLAGS }, version, features: FEATURES });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.get("/admin", superAdminOnly, async (_req, res) => {
  try {
    const state = await loadGlobalFlags();
    return res.json({ ...state, features: FEATURES.map((f) => ({ ...f, routes: describeFeature(f.key) })) });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.put("/", superAdminOnly, async (req, res) => {
  try {
    const me = await User.findById(req.user.sub).select("name email").lean();
    const { state, changed } = await updateGlobalFlags({
      actor: { id: req.user.sub, name: me?.name, email: me?.email },
      expectedVersion: req.body?.expectedVersion,
      changes: req.body?.changes
    });
    return res.json({ ...state, changed });
  } catch (error) {
    return sendError(res, error);
  }
});

featureRoutes.get("/audit", superAdminOnly, async (req, res) => {
  try {
    const scope = ["global", "kitchen", "user"].includes(req.query.scope) ? req.query.scope : undefined;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId : undefined;
    return res.json(await listAudit({ page: req.query.page, scope, targetId }));
  } catch (error) {
    return sendError(res, error);
  }
});
