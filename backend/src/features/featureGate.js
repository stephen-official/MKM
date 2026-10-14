import { classifyRoute } from "./registry.js";
import { FeatureFlagError, featureDisabledPayload, resolveEffectiveFlags } from "./featureFlagService.js";

/** Blocks routes owned by a feature that is disabled for the caller. Runs after authenticate. */
export const featureGate = async (req, res, next) => {
  const rule = classifyRoute(req.method, `${req.baseUrl}${req.path}`);
  // Fail closed: a path the registry does not know is either not a route (404 anyway) or a route
  // someone forgot to classify, which must not be reachable ungated.
  if (!rule) return res.status(404).json({ code: "NOT_FOUND", message: "Not found." });
  if (rule.type !== "feature") return next();
  try {
    const flags = await resolveEffectiveFlags(req.user);
    if (flags === null) return next();
    if (rule.features.some((key) => flags[key] !== false)) return next();
    return res.status(403).json(featureDisabledPayload(rule.features[0]));
  } catch (error) {
    if (error instanceof FeatureFlagError) return res.status(error.status).json({ code: error.code, message: error.message });
    return next(error);
  }
};
