import express from "express";
import ExcelJS from "exceljs";
import { authorize } from "../middleware/auth.js";
import { 
  Consumption, 
  Distribution, 
  Indent, 
  PurchaseOrder, 
  Request, 
  Transfer 
} from "../models/FlowModels.js";

export const reportRoutes = express.Router();
const adminOnly = authorize(["admin"]);

const sources = {
  indents: Indent,
  "purchase-orders": PurchaseOrder,
  distributions: Distribution,
  transfers: Transfer,
  requests: Request,
  consumptions: Consumption
};

/**
 * Enhanced Helper to populate top-level refs AND deep-nested stock item data
 */
const getDeepPopulateFields = (Model) => {
  const paths = Model.schema.paths;
  const fields = [];

  if (paths.createdBy) fields.push({ path: "createdBy", select: "name" });
  if (paths.userId) fields.push({ path: "userId", select: "name" });
  if (paths.fromGodownId) fields.push({ path: "fromGodownId", select: "name" });
  if (paths.toGodownId) fields.push({ path: "toGodownId", select: "name" });
  if (paths.godownId) fields.push({ path: "godownId", select: "name" });

  if (paths.items) {
    fields.push({
      path: "items.stockItemId",
      select: "name unitId stockGroupId", 
      populate: [
        { path: "unitId", select: "symbol" },
        { path: "stockGroupId", select: "name" }
      ]
    });
  }

  if (paths.allocations) {
    fields.push({ 
      path: "allocations.stockItemId", 
      select: "name stockGroupId unitId",
      populate: [
        { path: "stockGroupId", select: "name" },
        { path: "unitId", select: "symbol" }
      ]
    });
    fields.push({ path: "allocations.godownId", select: "name" });
  }

  return fields;
};

/**
 * Utility to build MongoDB date range query
 */
const buildDateQuery = (startDate, endDate) => {
  let query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); 
      query.createdAt.$lte = end;
    }
  }
  return query;
};

// --- 1. PREVIEW ROUTE (Updated with Date Filtering) ---
reportRoutes.get("/:entity", adminOnly, async (req, res) => {
  try {
    const { entity } = req.params;
    const { startDate, endDate } = req.query;
    
    const Model = sources[entity];
    if (!Model) return res.status(404).json({ message: "Invalid report entity" });

    const query = buildDateQuery(startDate, endDate);
    const populateFields = getDeepPopulateFields(Model);

    const data = await Model.find(query)
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .lean();

    res.json(data);
  } catch (error) {
    console.error("Report Load Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// --- 2. SINGLE EXPORT ROUTE ---
reportRoutes.get("/:entity/export/excel/:id", adminOnly, async (req, res) => {
  try {
    const Model = sources[req.params.entity];
    if (!Model) return res.status(404).send("Invalid entity");

    const populateFields = getDeepPopulateFields(Model);
    const row = await Model.findById(req.params.id)
      .populate(populateFields)
      .lean();

    if (!row) return res.status(404).send("Record not found");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report Detail");

    sheet.addRow(["REPORT SUMMARY"]).font = { bold: true, size: 14 };
    sheet.addRow(["Entity Type", req.params.entity.toUpperCase()]);
    sheet.addRow(["Document No", row.indentNo || row.orderNo || row.transferNo || row.distributionNo || row.consumptionNo || row._id]);
    sheet.addRow(["Created By", row.createdBy?.name || row.userId?.name || "N/A"]);
    sheet.addRow(["Date", new Date(row.createdAt).toLocaleDateString('en-GB')]);
    sheet.addRow(["Status", (row.status || "COMPLETED").toUpperCase()]);
    sheet.addRow(["Total Amount", `₹${row.totalAmount || 0}`]);
    sheet.addRow([]); 

    sheet.addRow(["STOCK ITEMS LIST"]).font = { bold: true, size: 12 };
    const itemHeaderRow = sheet.addRow(["Item Name", "Group", "Qty", "Unit", "Price/Unit", "Total"]);
    itemHeaderRow.font = { bold: true };
    itemHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } });

    const items = row.items || row.allocations || [];
    items.forEach(item => {
      const qty = item.quantity || item.orderedQty || item.receivedQty || item.qtyBaseUnit || 0;
      const unitPrice = item.unitPrice || 0;
      sheet.addRow([
        item.stockItemId?.name || "Unknown Item",
        item.stockItemId?.stockGroupId?.name || "General",
        qty,
        item.stockItemId?.unitId?.symbol || "-",
        unitPrice,
        item.amount || (qty * unitPrice) || 0
      ]);
    });

    sheet.columns.forEach(col => col.width = 22);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Report_${req.params.id}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.status(200).end(); 
  } catch (error) {
    console.error("Single Export error:", error);
    res.status(500).send("Export failed");
  }
});

// --- 3. BULK EXPORT ROUTE (Updated with Date Filtering) ---
reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
  try {
    const { entity } = req.params;
    const { startDate, endDate } = req.query;

    const Model = sources[entity];
    if (!Model) return res.status(404).send("Invalid entity");

    const query = buildDateQuery(startDate, endDate);
    const populateFields = getDeepPopulateFields(Model);

    const rows = await Model.find(query)
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bulk Report");

    sheet.columns = [
      { header: "DATE", key: "createdAt", width: 15 },
      { header: "ID / NO", key: "docNo", width: 25 },
      { header: "USER", key: "userName", width: 20 },
      { header: "STATUS", key: "status", width: 15 },
      { header: "TOTAL AMOUNT", key: "totalAmount", width: 15 }
    ];

    rows.forEach(r => {
      sheet.addRow({
        createdAt: new Date(r.createdAt).toLocaleDateString('en-GB'),
        docNo: r.indentNo || r.orderNo || r.transferNo || r.distributionNo || r.consumptionNo || r._id,
        userName: r.createdBy?.name || r.userId?.name || "N/A",
        status: r.status || "COMPLETED",
        totalAmount: r.totalAmount || 0
      });
    });
    
    sheet.getRow(1).font = { bold: true };

    const fileName = `${entity}_bulk_${startDate || 'start'}_to_${endDate || 'end'}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error("Bulk Export error:", error);
    res.status(500).send("Bulk Export failed");
  }
});