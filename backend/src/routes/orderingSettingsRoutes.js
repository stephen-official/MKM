import express from "express";
import { authorize } from "../middleware/auth.js";
import { readOrderingSettings, writeOrderingSettings } from "../ordering/settings.js";

// Figures behind collaborative ordering: needed-by options, emergency period and the ordering window.
export const orderingSettingsRoutes = express.Router();
const sendError = (res, error) => res.status(error.status || 500)
  .json({ code: error.code || "SERVER_ERROR", message: error.status ? error.message : "Ordering settings are unavailable" });

orderingSettingsRoutes.get("/", authorize(["admin", "user"]), async (_req, res) => {
  try { return res.json(await readOrderingSettings()); }
  catch (error) { return sendError(res, error); }
});

orderingSettingsRoutes.put("/", authorize(["super_admin"]), async (req, res) => {
  try {
    return res.json(await writeOrderingSettings({ input: req.body.settings, expectedVersion: req.body.expectedVersion, actor: req.user.sub }));
  } catch (error) { return sendError(res, error); }
});
