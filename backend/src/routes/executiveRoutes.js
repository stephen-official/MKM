import { asyncRoute, typedErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import { authorize } from "../middleware/auth.js";
import { buildExecutiveReport } from "../executive/buildReport.js";
import { buildExcelWorkbook } from "../executive/excelExport.js";
import { buildExportReport, contentDisposition, exportFilename } from "../executive/exportCommon.js";
import { pdfBlocks, renderPdf } from "../executive/pdfExport.js";
import { ReportParamError, parseReportParams } from "../executive/params.js";

export const executiveRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);

const reportErrorPolicy = typedErrorPolicy({ isPublic: (error) => error instanceof ReportParamError || error?.code === "KITCHEN_NOT_FOUND", publicCodeFallback: null, fallbackCode: "INTERNAL_ERROR", fallbackMessage: "The report could not be generated." });

executiveRoutes.get("/summary", superAdminOnly, asyncRoute(async (req, res) => {

    const now = new Date();
    const params = parseReportParams(req.query, { now });
    const { failures: _failures, ...report } = await buildExecutiveReport(params, { now });
    res.set("Cache-Control", "no-store");
    return res.json(report);

}, reportErrorPolicy));

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const exportErrorPolicy = typedErrorPolicy({ isPublic: (error) => error instanceof ReportParamError || ["KITCHEN_NOT_FOUND", "EXPORT_TIMEOUT", "EXPORT_INCOMPLETE"].includes(error?.code), publicCodeFallback: null, fallbackCode: "INTERNAL_ERROR", fallbackMessage: "The report could not be generated." });

executiveRoutes.get("/export.xlsx", superAdminOnly, asyncRoute(async (req, res) => {

    const report = await buildExportReport(req.query);
    const buffer = await buildExcelWorkbook(report).xlsx.writeBuffer();
    const filename = exportFilename({ kitchen: report.meta.kitchen, from: report.meta.from, to: report.meta.to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: "xlsx" });
    res.set({ "Content-Type": XLSX_MIME, "Content-Disposition": contentDisposition(filename), "Cache-Control": "no-store" });
    return res.send(buffer);

}, exportErrorPolicy));

executiveRoutes.get("/export.pdf", superAdminOnly, asyncRoute(async (req, res) => {

    const report = await buildExportReport(req.query);
    const buffer = await renderPdf(pdfBlocks(report));
    const filename = exportFilename({ kitchen: report.meta.kitchen, from: report.meta.from, to: report.meta.to, generatedAt: report.meta.generatedAt, tz: report.meta.timezone, ext: "pdf" });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": contentDisposition(filename), "Cache-Control": "no-store" });
    return res.send(buffer);

}, exportErrorPolicy));
