import express from "express";
import { authorize } from "../middleware/auth.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { buildExcelWorkbook } from "../executive/excelExport.js";
import { buildExportReport, contentDisposition, exportFilename } from "../executive/exportCommon.js";
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

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const exportError = (res, error) => {
  if (error?.code === "EXPORT_TIMEOUT" || error?.code === "EXPORT_INCOMPLETE") {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  return sendReportError(res, error);
};

executiveRoutes.get("/export.xlsx", superAdminOnly, async (req, res) => {
  try {
    const report = await buildExportReport(req.query);
    const buffer = await buildExcelWorkbook(report).xlsx.writeBuffer();
    const filename = exportFilename({ kitchen: report.meta.kitchen, from: report.meta.from, to: report.meta.to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: "xlsx" });
    res.set({ "Content-Type": XLSX_MIME, "Content-Disposition": contentDisposition(filename), "Cache-Control": "no-store" });
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return exportError(res, error);
  }
});
