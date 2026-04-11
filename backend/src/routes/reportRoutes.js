// // // // // import express from "express";
// // // // // import ExcelJS from "exceljs";
// // // // // import { authorize } from "../middleware/auth.js";
// // // // // import { Consumption, Distribution, Indent, PurchaseOrder, Request, Transfer } from "../models/FlowModels.js";

// // // // // export const reportRoutes = express.Router();
// // // // // const adminOnly = authorize(["admin"]);

// // // // // const sources = {
// // // // //   indents: Indent,
// // // // //   "purchase-orders": PurchaseOrder,
// // // // //   distributions: Distribution,
// // // // //   transfers: Transfer,
// // // // //   requests: Request,
// // // // //   consumptions: Consumption
// // // // // };

// // // // // reportRoutes.get("/:entity", adminOnly, async (req, res) => {
// // // // //   const Model = sources[req.params.entity];
// // // // //   if (!Model) return res.status(404).json({ message: "Invalid report entity" });
// // // // //   res.json(await Model.find().sort({ createdAt: -1 }));
// // // // // });

// // // // // reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
// // // // //   const Model = sources[req.params.entity];
// // // // //   if (!Model) return res.status(404).json({ message: "Invalid report entity" });
// // // // //   const rows = await Model.find().lean();
// // // // //   const workbook = new ExcelJS.Workbook();
// // // // //   const sheet = workbook.addWorksheet(req.params.entity);
// // // // //   if (rows.length > 0) {
// // // // //     sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 26 }));
// // // // //     rows.forEach((row) => sheet.addRow(row));
// // // // //   }
// // // // //   res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// // // // //   res.setHeader("Content-Disposition", `attachment; filename=${req.params.entity}.xlsx`);
// // // // //   await workbook.xlsx.write(res);
// // // // //   res.end();
// // // // // });





// // // // import express from "express";
// // // // import ExcelJS from "exceljs";
// // // // import { authorize } from "../middleware/auth.js";
// // // // import { Consumption, Distribution, Indent, PurchaseOrder, Request, Transfer } from "../models/FlowModels.js";

// // // // export const reportRoutes = express.Router();
// // // // const adminOnly = authorize(["admin"]);

// // // // const sources = {
// // // //   indents: Indent,
// // // //   "purchase-orders": PurchaseOrder,
// // // //   distributions: Distribution,
// // // //   transfers: Transfer,
// // // //   requests: Request,
// // // //   consumptions: Consumption
// // // // };

// // // // // Helper function to safely determine which fields to populate based on the model schema
// // // // const getSafePopulateFields = (Model) => {
// // // //   const paths = Model.schema.paths;
// // // //   const fields = [];
// // // //   if (paths.createdBy) fields.push({ path: "createdBy", select: "name" });
// // // //   if (paths.userId) fields.push({ path: "userId", select: "name" });
// // // //   if (paths.fromGodownId) fields.push({ path: "fromGodownId", select: "name" });
// // // //   if (paths.toGodownId) fields.push({ path: "toGodownId", select: "name" });
// // // //   if (paths.godownId) fields.push({ path: "godownId", select: "name" });
// // // //   return fields;
// // // // };

// // // // // PREVIEW ROUTE: Dynamic Safe Populate for UI Table
// // // // reportRoutes.get("/:entity", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const Model = sources[req.params.entity];
// // // //     if (!Model) return res.status(404).json({ message: "Invalid report entity" });

// // // //     let query = Model.find().sort({ createdAt: -1 });
// // // //     const populateFields = getSafePopulateFields(Model);

// // // //     if (populateFields.length > 0) {
// // // //       query = query.populate(populateFields);
// // // //     }

// // // //     const data = await query.lean();
// // // //     res.json(data);
// // // //   } catch (error) {
// // // //     console.error("Report Load Error:", error);
// // // //     res.status(500).json({ message: "Internal Server Error" });
// // // //   }
// // // // });

// // // // // SINGLE EXPORT ROUTE: Safe Populate for individual XLSX download
// // // // reportRoutes.get("/:entity/export/excel/:id", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const Model = sources[req.params.entity];
// // // //     if (!Model) return res.status(404).send("Invalid entity");

// // // //     let query = Model.findById(req.params.id);
// // // //     const populateFields = getSafePopulateFields(Model);

// // // //     if (populateFields.length > 0) {
// // // //       query = query.populate(populateFields);
// // // //     }

// // // //     const row = await query.lean();
// // // //     if (!row) return res.status(404).send("Record not found");

// // // //     const workbook = new ExcelJS.Workbook();
// // // //     const sheet = workbook.addWorksheet("Report Detail");

// // // //     // Flattening the data for a clean Excel sheet
// // // //     const displayData = {
// // // //       ...row,
// // // //       Admin: row.createdBy?.name || row.userId?.name || "System",
// // // //       Date: new Date(row.createdAt).toLocaleDateString('en-GB'),
// // // //       From: row.fromGodownId?.name || "N/A",
// // // //       To: row.toGodownId?.name || row.godownId?.name || "N/A"
// // // //     };

// // // //     // Remove complex nested objects and internal keys
// // // //     ["items", "createdBy", "userId", "fromGodownId", "toGodownId", "godownId", "_id", "__v", "updatedAt"].forEach(k => delete displayData[k]);

// // // //     sheet.columns = Object.keys(displayData).map(k => ({
// // // //       header: k.toUpperCase().replace(/([A-Z])/g, ' $1').trim(),
// // // //       key: k,
// // // //       width: 25
// // // //     }));

// // // //     sheet.addRow(displayData);

// // // //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// // // //     res.setHeader("Content-Disposition", `attachment; filename=Report_${req.params.id}.xlsx`);
// // // //     await workbook.xlsx.write(res);
// // // //     res.end();
// // // //   } catch (error) {
// // // //     console.error("Single Export Error:", error);
// // // //     res.status(500).send("Export failed");
// // // //   }
// // // // });

// // // // // BULK EXPORT ROUTE: Safe Populate for full entity XLSX download
// // // // reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const Model = sources[req.params.entity];
// // // //     if (!Model) return res.status(404).send("Invalid entity");

// // // //     let query = Model.find().sort({ createdAt: -1 });
// // // //     const populateFields = getSafePopulateFields(Model);

// // // //     if (populateFields.length > 0) {
// // // //       query = query.populate(populateFields);
// // // //     }

// // // //     const rows = await query.lean();
// // // //     const workbook = new ExcelJS.Workbook();
// // // //     const sheet = workbook.addWorksheet(req.params.entity);

// // // //     if (rows.length > 0) {
// // // //       // Create headers based on the first row's flattened keys
// // // //       const sampleRow = rows[0];
// // // //       const keys = Object.keys(sampleRow).filter(k => !["items", "__v"].includes(k));
      
// // // //       sheet.columns = keys.map(k => ({ header: k.toUpperCase(), key: k, width: 20 }));

// // // //       rows.forEach(row => {
// // // //         const formattedRow = { ...row };
// // // //         // Flatten Admin and Dates for each row in the bulk export
// // // //         if (row.createdBy) formattedRow.createdBy = row.createdBy.name;
// // // //         if (row.userId) formattedRow.userId = row.userId.name;
// // // //         if (row.godownId) formattedRow.godownId = row.godownId.name;
// // // //         formattedRow.createdAt = new Date(row.createdAt).toLocaleDateString('en-GB');
        
// // // //         sheet.addRow(formattedRow);
// // // //       });
// // // //     }

// // // //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// // // //     res.setHeader("Content-Disposition", `attachment; filename=${req.params.entity}_report.xlsx`);
// // // //     await workbook.xlsx.write(res);
// // // //     res.end();
// // // //   } catch (error) {
// // // //     console.error("Bulk Export Error:", error);
// // // //     res.status(500).send("Bulk Export failed");
// // // //   }
// // // // });







// // // import express from "express";
// // // import ExcelJS from "exceljs";
// // // import { authorize } from "../middleware/auth.js";
// // // import { Consumption, Distribution, Indent, PurchaseOrder, Request, Transfer } from "../models/FlowModels.js";

// // // export const reportRoutes = express.Router();
// // // const adminOnly = authorize(["admin"]);

// // // const sources = {
// // //   indents: Indent,
// // //   "purchase-orders": PurchaseOrder,
// // //   distributions: Distribution,
// // //   transfers: Transfer,
// // //   requests: Request,
// // //   consumptions: Consumption
// // // };

// // // /**
// // //  * Helper function to safely determine which fields to populate 
// // //  * based on the specific model schema to avoid StrictPopulateError.
// // //  */
// // // const getSafePopulateFields = (Model) => {
// // //   const paths = Model.schema.paths;
// // //   const fields = [];
// // //   if (paths.createdBy) fields.push({ path: "createdBy", select: "name" });
// // //   if (paths.userId) fields.push({ path: "userId", select: "name" });
// // //   if (paths.fromGodownId) fields.push({ path: "fromGodownId", select: "name" });
// // //   if (paths.toGodownId) fields.push({ path: "toGodownId", select: "name" });
// // //   if (paths.godownId) fields.push({ path: "godownId", select: "name" });
// // //   return fields;
// // // };

// // // // --- PREVIEW ROUTE: Dynamic Safe Populate for UI Table ---
// // // reportRoutes.get("/:entity", adminOnly, async (req, res) => {
// // //   try {
// // //     const Model = sources[req.params.entity];
// // //     if (!Model) return res.status(404).json({ message: "Invalid report entity" });

// // //     let query = Model.find().sort({ createdAt: -1 });
// // //     const populateFields = getSafePopulateFields(Model);

// // //     if (populateFields.length > 0) {
// // //       query = query.populate(populateFields);
// // //     }

// // //     const data = await query.lean();
// // //     res.json(data);
// // //   } catch (error) {
// // //     console.error("Report Load Error:", error);
// // //     res.status(500).json({ message: "Internal Server Error" });
// // //   }
// // // });

// // // // --- SINGLE EXPORT ROUTE: Full detail with Stock Items List ---
// // // reportRoutes.get("/:entity/export/excel/:id", adminOnly, async (req, res) => {
// // //   try {
// // //     const Model = sources[req.params.entity];
// // //     if (!Model) return res.status(404).send("Invalid entity");

// // //     // Populate user and nested stock item names
// // //     const row = await Model.findById(req.params.id)
// // //       .populate("createdBy userId", "name")
// // //       .populate("items.stockItemId", "name") 
// // //       .lean();

// // //     if (!row) return res.status(404).send("Record not found");

// // //     const workbook = new ExcelJS.Workbook();
// // //     const sheet = workbook.addWorksheet("Report Detail");

// // //     // --- SECTION 1: HEADER INFO ---
// // //     sheet.addRow(["REPORT SUMMARY"]).font = { bold: true, size: 14 };
// // //     sheet.addRow(["Entity Type", req.params.entity.toUpperCase()]);
// // //     sheet.addRow(["Document No", row.indentNo || row.orderNo || row.transferNo || "N/A"]);
// // //     sheet.addRow(["Admin", row.createdBy?.name || row.userId?.name || "System"]);
// // //     sheet.addRow(["Date", new Date(row.createdAt).toLocaleDateString('en-GB')]);
// // //     sheet.addRow(["Status", row.status]);
// // //     sheet.addRow(["Total Amount", row.totalAmount || 0]);
// // //     sheet.addRow([]); // Spacer row

// // //     // --- SECTION 2: STOCK ITEMS TABLE ---
// // //     sheet.addRow(["STOCK ITEMS LIST"]).font = { bold: true, size: 12 };
// // //     const itemHeaderRow = sheet.addRow(["Item Name", "Ordered Qty", "Received Qty", "Unit Price", "Amount"]);
// // //     itemHeaderRow.font = { bold: true };
// // //     itemHeaderRow.eachCell((cell) => {
// // //       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
// // //     });

// // //     if (row.items && row.items.length > 0) {
// // //       row.items.forEach(item => {
// // //         sheet.addRow([
// // //           item.stockItemId?.name || "Unknown Item",
// // //           item.orderedQty || 0,
// // //           item.receivedQty || 0,
// // //           item.unitPrice || 0,
// // //           item.amount || 0
// // //         ]);
// // //       });
// // //     } else {
// // //       sheet.addRow(["No items found in this record"]);
// // //     }

// // //     sheet.columns.forEach(col => col.width = 20);

// // //     // --- CRITICAL: Set headers and end stream properly ---
// // //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// // //     res.setHeader("Content-Disposition", `attachment; filename=Report_${req.params.id}.xlsx`);
    
// // //     await workbook.xlsx.write(res);
// // //     res.status(200).end(); 
// // //   } catch (error) {
// // //     console.error("Single Export error:", error);
// // //     if (!res.headersSent) res.status(500).send("Export failed");
// // //   }
// // // });

// // // // --- BULK EXPORT ROUTE: High-level overview of all records ---
// // // reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
// // //   try {
// // //     const Model = sources[req.params.entity];
// // //     if (!Model) return res.status(404).send("Invalid entity");

// // //     let query = Model.find().sort({ createdAt: -1 });
// // //     const populateFields = getSafePopulateFields(Model);

// // //     if (populateFields.length > 0) {
// // //       query = query.populate(populateFields);
// // //     }

// // //     const rows = await query.lean();
// // //     const workbook = new ExcelJS.Workbook();
// // //     const sheet = workbook.addWorksheet(req.params.entity);

// // //     if (rows.length > 0) {
// // //       const sampleRow = rows[0];
// // //       const keys = Object.keys(sampleRow).filter(k => !["items", "__v"].includes(k));
// // //       sheet.columns = keys.map(k => ({ header: k.toUpperCase(), key: k, width: 20 }));

// // //       rows.forEach(row => {
// // //         const formattedRow = { ...row };
// // //         // Flatten nested objects to names for Excel readability
// // //         if (row.createdBy) formattedRow.createdBy = row.createdBy.name;
// // //         if (row.userId) formattedRow.userId = row.userId.name;
// // //         if (row.godownId) formattedRow.godownId = row.godownId.name;
// // //         formattedRow.createdAt = new Date(row.createdAt).toLocaleDateString('en-GB');
// // //         sheet.addRow(formattedRow);
// // //       });
// // //     }

// // //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// // //     res.setHeader("Content-Disposition", `attachment; filename=${req.params.entity}_bulk.xlsx`);
    
// // //     await workbook.xlsx.write(res);
// // //     res.status(200).end();
// // //   } catch (error) {
// // //     console.error("Bulk Export error:", error);
// // //     if (!res.headersSent) res.status(500).send("Bulk Export failed");
// // //   }
// // // });











// // import express from "express";
// // import ExcelJS from "exceljs";
// // import { authorize } from "../middleware/auth.js";
// // import { 
// //   Consumption, 
// //   Distribution, 
// //   Indent, 
// //   PurchaseOrder, 
// //   Request, 
// //   Transfer 
// // } from "../models/FlowModels.js";

// // export const reportRoutes = express.Router();
// // const adminOnly = authorize(["admin"]);

// // const sources = {
// //   indents: Indent,
// //   "purchase-orders": PurchaseOrder,
// //   distributions: Distribution,
// //   transfers: Transfer,
// //   requests: Request,
// //   consumptions: Consumption
// // };

// // /**
// //  * Enhanced Helper to populate top-level refs AND nested stock items
// //  */
// // const getDeepPopulateFields = (Model) => {
// //   const paths = Model.schema.paths;
// //   const fields = [];

// //   // Top-level populates
// //   if (paths.createdBy) fields.push({ path: "createdBy", select: "name" });
// //   if (paths.userId) fields.push({ path: "userId", select: "name" });
// //   if (paths.fromGodownId) fields.push({ path: "fromGodownId", select: "name" });
// //   if (paths.toGodownId) fields.push({ path: "toGodownId", select: "name" });
// //   if (paths.godownId) fields.push({ path: "godownId", select: "name" });

// //   // NESTED POPULATE FOR STOCK ITEM NAMES
// //   // This covers 'items' array (Indent, PO, Transfer, Request, Consumption)
// //   if (paths.items) {
// //     fields.push({
// //       path: "items.stockItemId",
// //       select: "name unitId",
// //       populate: { path: "unitId", select: "symbol" }
// //     });
// //   }

// //   // Handle Distribution model specifically (uses 'allocations' and 'leftovers')
// //   if (paths.allocations) {
// //     fields.push({ path: "allocations.stockItemId", select: "name" });
// //     fields.push({ path: "allocations.godownId", select: "name" });
// //   }

// //   return fields;
// // };

// // // --- 1. PREVIEW ROUTE: Now with Item Names populated ---
// // reportRoutes.get("/:entity", adminOnly, async (req, res) => {
// //   try {
// //     const Model = sources[req.params.entity];
// //     if (!Model) return res.status(404).json({ message: "Invalid report entity" });

// //     const populateFields = getDeepPopulateFields(Model);
// //     const data = await Model.find()
// //       .populate(populateFields)
// //       .sort({ createdAt: -1 })
// //       .lean();

// //     res.json(data);
// //   } catch (error) {
// //     console.error("Report Load Error:", error);
// //     res.status(500).json({ message: "Internal Server Error" });
// //   }
// // });

// // // --- 2. SINGLE EXPORT ROUTE: Detailed Excel with Item Names ---
// // reportRoutes.get("/:entity/export/excel/:id", adminOnly, async (req, res) => {
// //   try {
// //     const Model = sources[req.params.entity];
// //     if (!Model) return res.status(404).send("Invalid entity");

// //     const populateFields = getDeepPopulateFields(Model);
// //     const row = await Model.findById(req.params.id)
// //       .populate(populateFields)
// //       .lean();

// //     if (!row) return res.status(404).send("Record not found");

// //     const workbook = new ExcelJS.Workbook();
// //     const sheet = workbook.addWorksheet("Report Detail");

// //     // HEADER INFO
// //     sheet.addRow(["REPORT SUMMARY"]).font = { bold: true, size: 14 };
// //     sheet.addRow(["Entity Type", req.params.entity.toUpperCase()]);
// //     sheet.addRow(["Document No", row.indentNo || row.orderNo || row.transferNo || row._id]);
// //     sheet.addRow(["Created By", row.createdBy?.name || row.userId?.name || "N/A"]);
// //     sheet.addRow(["Date", new Date(row.createdAt).toLocaleDateString('en-GB')]);
// //     sheet.addRow(["Status", (row.status || "N/A").toUpperCase()]);
// //     sheet.addRow(["Total Amount", `₹${row.totalAmount || 0}`]);
// //     sheet.addRow([]); 

// //     // STOCK ITEMS TABLE
// //     sheet.addRow(["STOCK ITEMS LIST"]).font = { bold: true, size: 12 };
// //     const itemHeaderRow = sheet.addRow(["Item Name", "Qty", "Unit", "Price/Unit", "Total"]);
// //     itemHeaderRow.font = { bold: true };
// //     itemHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } });

// //     // Dynamic data mapping for different models
// //     const items = row.items || row.allocations || [];
    
// //     if (items.length > 0) {
// //       items.forEach(item => {
// //         sheet.addRow([
// //           item.stockItemId?.name || "Unknown Item",
// //           item.quantity || item.orderedQty || item.receivedQty || item.qtyBaseUnit || 0,
// //           item.stockItemId?.unitId?.symbol || "-",
// //           item.unitPrice || 0,
// //           item.amount || (item.qtyBaseUnit * item.unitPrice) || 0
// //         ]);
// //       });
// //     }

// //     sheet.columns.forEach(col => col.width = 22);

// //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// //     res.setHeader("Content-Disposition", `attachment; filename=Report_${req.params.id}.xlsx`);
    
// //     await workbook.xlsx.write(res);
// //     res.status(200).end(); 
// //   } catch (error) {
// //     console.error("Single Export error:", error);
// //     res.status(500).send("Export failed");
// //   }
// // });

// // // --- 3. BULK EXPORT ROUTE ---
// // reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
// //   try {
// //     const Model = sources[req.params.entity];
// //     if (!Model) return res.status(404).send("Invalid entity");

// //     const populateFields = getDeepPopulateFields(Model);
// //     const rows = await Model.find()
// //       .populate(populateFields)
// //       .sort({ createdAt: -1 })
// //       .lean();

// //     const workbook = new ExcelJS.Workbook();
// //     const sheet = workbook.addWorksheet("Bulk Report");

// //     if (rows.length > 0) {
// //       // Define Columns
// //       sheet.columns = [
// //         { header: "DATE", key: "createdAt", width: 15 },
// //         { header: "ID / NO", key: "docNo", width: 25 },
// //         { header: "USER", key: "userName", width: 20 },
// //         { header: "STATUS", key: "status", width: 15 },
// //         { header: "TOTAL AMOUNT", key: "totalAmount", width: 15 }
// //       ];

// //       rows.forEach(r => {
// //         sheet.addRow({
// //           createdAt: new Date(r.createdAt).toLocaleDateString('en-GB'),
// //           docNo: r.indentNo || r.orderNo || r._id,
// //           userName: r.createdBy?.name || r.userId?.name || "N/A",
// //           status: r.status,
// //           totalAmount: r.totalAmount || 0
// //         });
// //       });
// //     }

// //     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
// //     res.setHeader("Content-Disposition", `attachment; filename=${req.params.entity}_bulk.xlsx`);
// //     await workbook.xlsx.write(res);
// //     res.status(200).end();
// //   } catch (error) {
// //     res.status(500).send("Bulk Export failed");
// //   }
// // });





// // 9-4-2026



// import express from "express";
// import ExcelJS from "exceljs";
// import { authorize } from "../middleware/auth.js";
// import { 
//   Consumption, 
//   Distribution, 
//   Indent, 
//   PurchaseOrder, 
//   Request, 
//   Transfer 
// } from "../models/FlowModels.js";

// export const reportRoutes = express.Router();
// const adminOnly = authorize(["admin"]);

// const sources = {
//   indents: Indent,
//   "purchase-orders": PurchaseOrder,
//   distributions: Distribution,
//   transfers: Transfer,
//   requests: Request,
//   consumptions: Consumption
// };

// /**
//  * Enhanced Helper to populate top-level refs AND deep-nested stock item data
//  * (Includes Stock Item -> Unit and Stock Item -> Stock Group)
//  */
// const getDeepPopulateFields = (Model) => {
//   const paths = Model.schema.paths;
//   const fields = [];

//   // 1. Top-level populates
//   if (paths.createdBy) fields.push({ path: "createdBy", select: "name" });
//   if (paths.userId) fields.push({ path: "userId", select: "name" });
//   if (paths.fromGodownId) fields.push({ path: "fromGodownId", select: "name" });
//   if (paths.toGodownId) fields.push({ path: "toGodownId", select: "name" });
//   if (paths.godownId) fields.push({ path: "godownId", select: "name" });

//   // 2. Nested populate for standard 'items' array
//   if (paths.items) {
//     fields.push({
//       path: "items.stockItemId",
//       select: "name unitId stockGroupId", 
//       populate: [
//         { path: "unitId", select: "symbol" },
//         { path: "stockGroupId", select: "name" }
//       ]
//     });
//   }

//   // 3. Nested populate for Distribution model ('allocations')
//   if (paths.allocations) {
//     fields.push({ 
//       path: "allocations.stockItemId", 
//       select: "name stockGroupId unitId",
//       populate: [
//         { path: "stockGroupId", select: "name" },
//         { path: "unitId", select: "symbol" }
//       ]
//     });
//     fields.push({ path: "allocations.godownId", select: "name" });
//   }

//   return fields;
// };

// // --- 1. PREVIEW ROUTE ---
// reportRoutes.get("/:entity", adminOnly, async (req, res) => {
//   try {
//     const Model = sources[req.params.entity];
//     if (!Model) return res.status(404).json({ message: "Invalid report entity" });

//     const populateFields = getDeepPopulateFields(Model);
//     const data = await Model.find()
//       .populate(populateFields)
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json(data);
//   } catch (error) {
//     console.error("Report Load Error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// // --- 2. SINGLE EXPORT ROUTE (Updated with Group Column) ---
// reportRoutes.get("/:entity/export/excel/:id", adminOnly, async (req, res) => {
//   try {
//     const Model = sources[req.params.entity];
//     if (!Model) return res.status(404).send("Invalid entity");

//     const populateFields = getDeepPopulateFields(Model);
//     const row = await Model.findById(req.params.id)
//       .populate(populateFields)
//       .lean();

//     if (!row) return res.status(404).send("Record not found");

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Report Detail");

//     // HEADER INFO
//     sheet.addRow(["REPORT SUMMARY"]).font = { bold: true, size: 14 };
//     sheet.addRow(["Entity Type", req.params.entity.toUpperCase()]);
//     sheet.addRow(["Document No", row.indentNo || row.orderNo || row.transferNo || row.distributionNo || row.consumptionNo || row._id]);
//     sheet.addRow(["Created By", row.createdBy?.name || row.userId?.name || "N/A"]);
//     sheet.addRow(["Date", new Date(row.createdAt).toLocaleDateString('en-GB')]);
//     sheet.addRow(["Status", (row.status || "COMPLETED").toUpperCase()]);
//     sheet.addRow(["Total Amount", `₹${row.totalAmount || 0}`]);
//     sheet.addRow([]); 

//     // STOCK ITEMS TABLE
//     sheet.addRow(["STOCK ITEMS LIST"]).font = { bold: true, size: 12 };
//     // Updated header with "Group"
//     const itemHeaderRow = sheet.addRow(["Item Name", "Group", "Qty", "Unit", "Price/Unit", "Total"]);
//     itemHeaderRow.font = { bold: true };
//     itemHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } });

//     const items = row.items || row.allocations || [];
    
//     if (items.length > 0) {
//       items.forEach(item => {
//         const qty = item.quantity || item.orderedQty || item.receivedQty || item.qtyBaseUnit || 0;
//         const unitPrice = item.unitPrice || 0;
        
//         sheet.addRow([
//           item.stockItemId?.name || "Unknown Item",
//           item.stockItemId?.stockGroupId?.name || "General",
//           qty,
//           item.stockItemId?.unitId?.symbol || "-",
//           unitPrice,
//           item.amount || (qty * unitPrice) || 0
//         ]);
//       });
//     }

//     sheet.columns.forEach(col => col.width = 22);

//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.setHeader("Content-Disposition", `attachment; filename=Report_${req.params.id}.xlsx`);
    
//     await workbook.xlsx.write(res);
//     res.status(200).end(); 
//   } catch (error) {
//     console.error("Single Export error:", error);
//     res.status(500).send("Export failed");
//   }
// });

// // --- 3. BULK EXPORT ROUTE ---
// reportRoutes.get("/:entity/export/excel", adminOnly, async (req, res) => {
//   try {
//     const Model = sources[req.params.entity];
//     if (!Model) return res.status(404).send("Invalid entity");

//     const populateFields = getDeepPopulateFields(Model);
//     const rows = await Model.find()
//       .populate(populateFields)
//       .sort({ createdAt: -1 })
//       .lean();

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Bulk Report");

//     if (rows.length > 0) {
//       sheet.columns = [
//         { header: "DATE", key: "createdAt", width: 15 },
//         { header: "ID / NO", key: "docNo", width: 25 },
//         { header: "USER", key: "userName", width: 20 },
//         { header: "STATUS", key: "status", width: 15 },
//         { header: "TOTAL AMOUNT", key: "totalAmount", width: 15 }
//       ];

//       rows.forEach(r => {
//         sheet.addRow({
//           createdAt: new Date(r.createdAt).toLocaleDateString('en-GB'),
//           docNo: r.indentNo || r.orderNo || r.transferNo || r.distributionNo || r.consumptionNo || r._id,
//           userName: r.createdBy?.name || r.userId?.name || "N/A",
//           status: r.status || "COMPLETED",
//           totalAmount: r.totalAmount || 0
//         });
//       });
      
//       sheet.getRow(1).font = { bold: true };
//     }

//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.setHeader("Content-Disposition", `attachment; filename=${req.params.entity}_bulk.xlsx`);
//     await workbook.xlsx.write(res);
//     res.status(200).end();
//   } catch (error) {
//     console.error("Bulk Export error:", error);
//     res.status(500).send("Bulk Export failed");
//   }
// });





// the above is finla




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