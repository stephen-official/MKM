import express from "express";
import { authorize } from "../middleware/auth.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { ReportParamError, parseReportParams } from "../executive/params.js";

export const executiveRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);

export const sendReportError = (res, error) => {
  if (error instanceof ReportParamError || error?.code === "KITCHEN_NOT_FOUND") {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  console.error("[executive]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "The report could not be generated." });
};

executiveRoutes.get("/summary", superAdminOnly, async (req, res) => {
  try {
    const now = new Date();
    const params = parseReportParams(req.query, { now });
    const { failures: _failures, ...report } = await buildExecutiveReport(params, { now });
    res.set("Cache-Control", "no-store");
    return res.json(report);
  } catch (error) {
    return sendReportError(res, error);
  }
});
