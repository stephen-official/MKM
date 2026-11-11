import { asyncRoute, typedErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import { authorize } from "../middleware/auth.js";
import { readOrderingSettings, writeOrderingSettings } from "../ordering/settings.js";

// Figures behind collaborative ordering: needed-by options, emergency period and the ordering window.
export const orderingSettingsRoutes = express.Router();
const errorPolicy = typedErrorPolicy({ fallbackMessage: "Ordering settings are unavailable", useErrorCode: true, publicCodeFallback: "SERVER_ERROR" });

orderingSettingsRoutes.get("/", authorize(["admin", "user"]), asyncRoute(async (_req, res) => {
   return res.json(await readOrderingSettings());
}, errorPolicy));

orderingSettingsRoutes.put("/", authorize(["super_admin"]), asyncRoute(async (req, res) => {

    return res.json(await writeOrderingSettings({ input: req.body.settings, expectedVersion: req.body.expectedVersion, actor: req.user.sub }));

}, errorPolicy));
