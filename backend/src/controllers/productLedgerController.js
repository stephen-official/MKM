

// import mongoose from "mongoose";
// import ExcelJS from "exceljs";

// import {
//   Distribution,
//   Transfer,
//   Consumption,
//   GodownStock,
//   IndentRequest
// } from "../models/FlowModels.js";

// import { DailyUsage } from "../models/DailyUsageModel.js";

// import {
//   Godown,
//   StockItem,
//   StockGroup,
//   Unit
// } from "../models/InventoryModels.js";


// // ============================================================
// // HELPERS
// // ============================================================

// const validObjectId = (id) => {
//   return mongoose.Types.ObjectId.isValid(id);
// };


// const getDate = (value) => {
//   if (!value) return null;

//   const d = new Date(value);

//   return Number.isNaN(d.getTime()) ? null : d;
// };


// const startOfDay = (date) => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// };


// const endOfDay = (date) => {
//   const d = new Date(date);
//   d.setHours(23, 59, 59, 999);
//   return d;
// };


// // ============================================================
// // GET GODOWNS
// // ============================================================

// export const getLedgerGodowns = async (req, res) => {

//   try {

//     const godowns = await Godown.find({})
//       .select("_id name")
//       .sort({ name: 1 })
//       .lean();

//     res.json(godowns);

//   } catch (error) {

//     console.error("GET GODOWNS ERROR:", error);

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // GET PRODUCTS FOR GODOWN
// // ============================================================

// export const getProducts = async (req, res) => {

//   try {

//     const { godownId } = req.query;

//     if (!godownId) {

//       return res.status(400).json({
//         error: "godownId is required"
//       });

//     }

//     if (!validObjectId(godownId)) {

//       return res.status(400).json({
//         error: "Invalid godownId"
//       });

//     }


//     const stocks = await GodownStock.find({
//       godownId
//     })
//       .populate({
//         path: "stockItemId",
//         model: "StockItem",
//         select: "name imageUrl unitId stockGroupId itemType",

//         populate: [
//           {
//             path: "unitId",
//             model: "Unit",
//             select: "name symbol"
//           },
//           {
//             path: "stockGroupId",
//             model: "StockGroup",
//             select: "name"
//           }
//         ]
//       })
//       .lean();


//     const products = stocks
//       .filter(stock => stock.stockItemId)
//       .map(stock => ({

//         _id: stock.stockItemId._id,

//         name: stock.stockItemId.name,

//         imageUrl:
//           stock.stockItemId.imageUrl || "",

//         unit:
//           stock.stockItemId.unitId?.symbol ||
//           stock.stockItemId.unitId?.name ||
//           "Units",

//         stockGroup:
//           stock.stockItemId.stockGroupId?.name ||
//           "General",

//         itemType:
//           stock.stockItemId.itemType ||
//           "stock",

//         currentStock:
//           Number(stock.qtyBaseUnit || 0)

//       }));


//     res.json(products);

//   } catch (error) {

//     console.error("GET PRODUCTS ERROR:", error);

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // GET PRODUCT LEDGER
// //
// // Movement types:
// //
// // RECEIVED       -> Distribution
// // TRANSFER IN    -> Transfer destination
// // TRANSFER OUT   -> Transfer source
// // CONSUMPTION    -> Consumption
// // DAILY USAGE    -> DailyUsage
// //
// // ============================================================

// export const getProductLedger = async (req, res) => {

//   try {

//     const { productId } = req.params;

//     const {
//       godownId,
//       startDate,
//       endDate
//     } = req.query;


//     // --------------------------------------------------------
//     // VALIDATION
//     // --------------------------------------------------------

//     if (!godownId) {

//       return res.status(400).json({
//         error: "godownId is required"
//       });

//     }

//     if (!validObjectId(godownId)) {

//       return res.status(400).json({
//         error: "Invalid godownId"
//       });

//     }

//     if (!validObjectId(productId)) {

//       return res.status(400).json({
//         error: "Invalid productId"
//       });

//     }


//     // --------------------------------------------------------
//     // PRODUCT
//     // --------------------------------------------------------

//     const product = await StockItem.findById(productId)
//       .populate("unitId", "name symbol")
//       .populate("stockGroupId", "name")
//       .lean();


//     if (!product) {

//       return res.status(404).json({
//         error: "Product not found"
//       });

//     }


//     // --------------------------------------------------------
//     // CURRENT GODOWN STOCK
//     // --------------------------------------------------------

//     const currentStockDoc =
//       await GodownStock.findOne({
//         godownId,
//         stockItemId: productId
//       }).lean();


//     const currentStock =
//       Number(currentStockDoc?.qtyBaseUnit || 0);


//     // ========================================================
//     // GET ALL DISTRIBUTIONS
//     // ========================================================

//     const distributionDocs =
//       await Distribution.find({
//         "allocations.godownId": godownId,
//         "allocations.stockItemId": productId
//       })
//         .populate({
//           path: "purchaseOrderId",
//           select: "createdAt receivedAt status"
//         })
//         .lean();


//         // ========================================================
// // 🔴 LIVE DEBUG - TEMPORARY
// // ========================================================

// console.log("========== PRODUCT LEDGER DEBUG ==========");
// console.log("productId:", productId);
// console.log("godownId:", godownId);
// console.log("startDate:", startDate);
// console.log("endDate:", endDate);

// console.log(
//   "distributionDocs:",
//   JSON.stringify(distributionDocs, null, 2)
// );

// console.log("==========================================");
// const allDistributions = await Distribution.find({})
//   .sort({ createdAt: -1 })
//   .limit(10)
//   .lean();

// console.log("========== ALL LIVE DISTRIBUTIONS ==========");
// console.log(
//   JSON.stringify(allDistributions, null, 2)
// );
// console.log("============================================");
//     // ========================================================
//     // GET ACCEPTED TRANSFERS
//     // ========================================================

//     const transferDocs =
//       await Transfer.find({

//         status: "accepted",

//         $or: [
//           {
//             fromGodownId: godownId,
//             "items.stockItemId": productId
//           },
//           {
//             toGodownId: godownId,
//             "items.stockItemId": productId
//           }
//         ]

//       })
//         .populate("fromGodownId", "name")
//         .populate("toGodownId", "name")
//         .lean();


//     // ========================================================
//     // GET CONSUMPTIONS
//     // ========================================================

//     const consumptionDocs =
//       await Consumption.find({
//         godownId,
//         "items.stockItemId": productId
//       })
//         .lean();


//     // ========================================================
//     // GET DAILY USAGE
//     // ========================================================

//     const dailyUsageDocs =
//       await DailyUsage.find({
//         godownId,
//         "items.stockItemId": productId
//       })
//         .lean();

// const indentDocs =
//   await IndentRequest.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();
//     // ========================================================
//     // BUILD MOVEMENTS
//     // ========================================================

//     const movements = [];


//     // ========================================================
//     // 1. RECEIVED STOCK
//     // Distribution -> Godown
//     // ========================================================

//     for (const distribution of distributionDocs) {

//       for (const allocation of distribution.allocations || []) {

//         if (
//           String(allocation.godownId) !==
//           String(godownId)
//         ) {
//           continue;
//         }


//         if (
//           String(allocation.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(allocation.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         const date =
//           distribution.createdAt ||
//           distribution.purchaseOrderId?.receivedAt ||
//           distribution.purchaseOrderId?.createdAt ||
//           new Date();


//         movements.push({

//           date,

//           type: "RECEIVED",

//           reference:
//             distribution.purchaseOrderId
//               ? `PO-${distribution.purchaseOrderId._id}`
//               : `DIST-${distribution._id}`,

//           qtyIn: qty,

//           qtyOut: 0,

//           source: "distribution",

//           sourceId: distribution._id

//         });

//       }

//     }
// // ========================================================
// // RECEIVED THROUGH INDENT
// // ========================================================

// for (const indent of indentDocs) {

//   for (const item of indent.items || []) {

//     if (
//       String(item.stockItemId) !==
//       String(productId)
//     ) {
//       continue;
//     }

//     // IMPORTANT:
//     // Use receivedQty, NOT requested qtyBaseUnit
//     const receivedQty =
//       Number(item.receivedQty || 0);

//     if (receivedQty <= 0) {
//       continue;
//     }

//     movements.push({

//       date:
//         item.receivedAt ||
//         indent.updatedAt ||
//         indent.createdAt,

//       type: "RECEIVED",

//       reference: "RECEIVED THROUGH INDENT",

//       qtyIn: receivedQty,

//       qtyOut: 0,

//       source: "indent",

//       sourceId: indent._id

//     });

//   }

// }
// // ========================================================
// // 2. TRANSFERS
// // ========================================================

// for (const transfer of transferDocs) {

//   for (const item of transfer.items || []) {

//     if (
//       String(item.stockItemId) !==
//       String(productId)
//     ) {
//       continue;
//     }

//     const qty =
//       Number(item.qtyBaseUnit || 0);

//     if (qty <= 0) continue;


//     // ----------------------------------------------------
//     // TRANSFER IN
//     // ----------------------------------------------------

//     if (
//       String(
//         transfer.toGodownId?._id ||
//         transfer.toGodownId
//       ) === String(godownId)
//     ) {

//       const fromGodownName =
//         transfer.fromGodownId?.name ||
//         "Unknown Godown";

//       movements.push({

//         date:
//           transfer.acceptedAt ||
//           transfer.updatedAt ||
//           transfer.createdAt,

//         type: "TRANSFER IN",

//         // OTHER GODOWN NAME
//         reference: fromGodownName,

//         qtyIn: qty,

//         qtyOut: 0,

//         source: "transfer_in",

//         sourceId: transfer._id

//       });

//     }


//     // ----------------------------------------------------
//     // TRANSFER OUT
//     // ----------------------------------------------------

//     if (
//       String(
//         transfer.fromGodownId?._id ||
//         transfer.fromGodownId
//       ) === String(godownId)
//     ) {

//       const toGodownName =
//         transfer.toGodownId?.name ||
//         "Unknown Godown";

//       movements.push({

//         date:
//           transfer.acceptedAt ||
//           transfer.updatedAt ||
//           transfer.createdAt,

//         type: "TRANSFER OUT",

//         // OTHER GODOWN NAME
//         reference: toGodownName,

//         qtyIn: 0,

//         qtyOut: qty,

//         source: "transfer_out",

//         sourceId: transfer._id

//       });

//     }

//   }

// }
//     // ========================================================
//     // 3. CONSUMPTION
//     // ========================================================

//     for (const consumption of consumptionDocs) {

//       for (const item of consumption.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//        movements.push({

//   date:
//     consumption.date ||
//     consumption.createdAt,

//   type: "CONSUMPTION",

//   // Show simple reference instead of Consumption ID
//   reference: "CONSUMED",

//   qtyIn: 0,

//   qtyOut: qty,

//   source: "consumption",

//   sourceId: consumption._id

// });

//       }

//     }


//     // ========================================================
//     // 4. DAILY USAGE
//     // ========================================================

//     for (const usage of dailyUsageDocs) {

//       for (const item of usage.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//           date:
//             usage.date ||
//             usage.createdAt,

//           type: "DAILY USAGE",

//           reference: "DAILY USAGE",

//           qtyIn: 0,

//           qtyOut: qty,

//           source: "daily_usage",

//           sourceId: usage._id

//         });

//       }

//     }


//     // ========================================================
//     // SORT ALL MOVEMENTS
//     // ========================================================

//     movements.sort(
//       (a, b) =>
//         new Date(a.date) -
//         new Date(b.date)
//     );


//     // ========================================================
//     // CALCULATE TOTAL HISTORICAL NET MOVEMENT
//     // ========================================================

//     let totalHistoricalIn = 0;

//     let totalHistoricalOut = 0;


//     for (const row of movements) {

//       totalHistoricalIn +=
//         Number(row.qtyIn || 0);

//       totalHistoricalOut +=
//         Number(row.qtyOut || 0);

//     }


//     // ========================================================
//     // RECONSTRUCT STOCK BEFORE FILTERED PERIOD
//     //
//     // Current Stock =
//     // Opening Historical Stock
//     // + All In
//     // - All Out
//     //
//     // Therefore:
//     //
//     // Opening Historical Stock =
//     // Current Stock - All In + All Out
//     // ========================================================

//     const historicalOpeningStock =
//       currentStock -
//       totalHistoricalIn +
//       totalHistoricalOut;


//     // ========================================================
//     // DATE FILTER
//     // ========================================================

//     const from =
//       getDate(startDate);

//     const to =
//       getDate(endDate);


//     let filteredMovements =
//       [...movements];


//     if (from) {

//       const fromDate =
//         startOfDay(from);

//       filteredMovements =
//         filteredMovements.filter(
//           row =>
//             new Date(row.date) >=
//             fromDate
//         );

//     }


//     if (to) {

//       const toDate =
//         endOfDay(to);

//       filteredMovements =
//         filteredMovements.filter(
//           row =>
//             new Date(row.date) <=
//             toDate
//         );

//     }


//     // ========================================================
//     // OPENING STOCK FOR SELECTED DATE RANGE
//     // ========================================================

//     let openingStock =
//       historicalOpeningStock;


//     if (from) {

//       let beforeIn = 0;

//       let beforeOut = 0;


//       for (const row of movements) {

//         if (
//           new Date(row.date) <
//           startOfDay(from)
//         ) {

//           beforeIn +=
//             Number(row.qtyIn || 0);

//           beforeOut +=
//             Number(row.qtyOut || 0);

//         }

//       }


//       openingStock =
//         historicalOpeningStock +
//         beforeIn -
//         beforeOut;

//     }


//     // ========================================================
//     // RUNNING BALANCE
//     // ========================================================

//     let balance =
//       Number(openingStock || 0);


//     const ledger =
//       filteredMovements.map(row => {

//         const qtyIn =
//           Number(row.qtyIn || 0);

//         const qtyOut =
//           Number(row.qtyOut || 0);


//         balance =
//           balance +
//           qtyIn -
//           qtyOut;


//         return {

//           date: row.date,

//           type: row.type,

//           reference: row.reference,

//           qtyIn,

//           qtyOut,

//           balance,

//           source: row.source,

//           sourceId: row.sourceId

//         };

//       });


//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     res.json({

//       product: {

//         _id: product._id,

//         name: product.name,

//         imageUrl:
//           product.imageUrl || "",

//         unit:
//           product.unitId?.symbol ||
//           product.unitId?.name ||
//           "Units",

//         stockGroup:
//           product.stockGroupId?.name ||
//           "General"

//       },

//       godownId,

//       openingStock,

//       currentStock,

//       ledger

//     });

//   } catch (error) {

//     console.error(
//       "PRODUCT LEDGER ERROR:",
//       error
//     );

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // EXPORT EXCEL
// // ============================================================

// export const exportProductLedgerExcel = async (req, res) => {

//   try {

//     const {
//       productId
//     } = req.params;

//     const {
//       godownId,
//       startDate,
//       endDate
//     } = req.query;


//     if (!godownId || !productId) {

//       return res.status(400).json({
//         error: "Godown and Product are required"
//       });

//     }


//     // --------------------------------------------------------
//     // Reuse ledger logic internally
//     // --------------------------------------------------------

//     const product =
//       await StockItem.findById(productId)
//         .populate("unitId", "name symbol")
//         .populate("stockGroupId", "name")
//         .lean();


//     if (!product) {

//       return res.status(404).json({
//         error: "Product not found"
//       });

//     }


//     const currentStockDoc =
//       await GodownStock.findOne({
//         godownId,
//         stockItemId: productId
//       }).lean();


//     const currentStock =
//       Number(currentStockDoc?.qtyBaseUnit || 0);


//     // --------------------------------------------------------
//     // DISTRIBUTIONS
//     // --------------------------------------------------------

//     const distributionDocs =
//       await Distribution.find({
//         "allocations.godownId": godownId,
//         "allocations.stockItemId": productId
//       }).lean();


//     // --------------------------------------------------------
//     // TRANSFERS
//     // --------------------------------------------------------

//     const transferDocs =
//       await Transfer.find({

//         status: "accepted",

//         $or: [
//           {
//             fromGodownId: godownId,
//             "items.stockItemId": productId
//           },
//           {
//             toGodownId: godownId,
//             "items.stockItemId": productId
//           }
//         ]

//       }).lean();


//     // --------------------------------------------------------
//     // CONSUMPTIONS
//     // --------------------------------------------------------

//     const consumptionDocs =
//       await Consumption.find({
//         godownId,
//         "items.stockItemId": productId
//       }).lean();


//     // --------------------------------------------------------
//     // DAILY USAGE
//     // --------------------------------------------------------

//    // --------------------------------------------------------
// // DAILY USAGE
// // --------------------------------------------------------

// const dailyUsageDocs =
//   await DailyUsage.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();


// // --------------------------------------------------------
// // INDENT RECEIVED STOCK
// // IMPORTANT: Excel must include inward received through indent
// // --------------------------------------------------------

// const indentDocs =
//   await IndentRequest.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();


// const movements = [];


//     // RECEIVED

//     for (const distribution of distributionDocs) {

//       for (const item of distribution.allocations || []) {

//         if (
//           String(item.godownId) !==
//             String(godownId) ||
//           String(item.stockItemId) !==
//             String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//           date:
//             distribution.createdAt,

//           type: "RECEIVED",

//           reference:
//             `DIST-${distribution._id}`,

//           qtyIn: qty,

//           qtyOut: 0

//         });

//       }

//     }


//     // TRANSFERS

//     for (const transfer of transferDocs) {

//       for (const item of transfer.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         if (
//           String(transfer.toGodownId) ===
//           String(godownId)
//         ) {

//           movements.push({

//             date:
//               transfer.acceptedAt ||
//               transfer.updatedAt ||
//               transfer.createdAt,

//             type: "TRANSFER IN",

//             reference:
//               `TRF-${transfer._id}`,

//             qtyIn: qty,

//             qtyOut: 0

//           });

//         }


//         if (
//           String(transfer.fromGodownId) ===
//           String(godownId)
//         ) {

//           movements.push({

//             date:
//               transfer.acceptedAt ||
//               transfer.updatedAt ||
//               transfer.createdAt,

//             type: "TRANSFER OUT",

//             reference:
//               `TRF-${transfer._id}`,

//             qtyIn: 0,

//             qtyOut: qty

//           });

//         }

//       }

//     }


//     // CONSUMPTION

//     for (const consumption of consumptionDocs) {

//       for (const item of consumption.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//   date:
//     consumption.date ||
//     consumption.createdAt,

//   type: "CONSUMPTION",

//   reference: "CONSUMED",

//   qtyIn: 0,

//   qtyOut: qty

// });

//       }

//     }


//     // DAILY USAGE

//     for (const usage of dailyUsageDocs) {

//       for (const item of usage.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//        movements.push({

//   date:
//     usage.date ||
//     usage.createdAt,

//   type: "DAILY USAGE",

//   reference: "DAILY USAGE",

//   qtyIn: 0,

//   qtyOut: qty

// });

//       }

//     }


//     // --------------------------------------------------------
//     // SORT
//     // --------------------------------------------------------

//     movements.sort(
//       (a, b) =>
//         new Date(a.date) -
//         new Date(b.date)
//     );


//     // --------------------------------------------------------
//     // HISTORICAL OPENING
//     // --------------------------------------------------------

//     let totalIn = 0;

//     let totalOut = 0;


//     for (const row of movements) {

//       totalIn +=
//         Number(row.qtyIn || 0);

//       totalOut +=
//         Number(row.qtyOut || 0);

//     }


//     const historicalOpening =
//       currentStock -
//       totalIn +
//       totalOut;


//     // --------------------------------------------------------
//     // DATE FILTER + OPENING
//     // --------------------------------------------------------

//     const from =
//       getDate(startDate);

//     const to =
//       getDate(endDate);


//     let openingStock =
//       historicalOpening;


//     if (from) {

//       let beforeIn = 0;

//       let beforeOut = 0;


//       for (const row of movements) {

//         if (
//           new Date(row.date) <
//           startOfDay(from)
//         ) {

//           beforeIn +=
//             Number(row.qtyIn || 0);

//           beforeOut +=
//             Number(row.qtyOut || 0);

//         }

//       }


//       openingStock =
//         historicalOpening +
//         beforeIn -
//         beforeOut;

//     }


//     let filtered =
//       movements.filter(row => {

//         const date =
//           new Date(row.date);


//         if (
//           from &&
//           date <
//             startOfDay(from)
//         ) {
//           return false;
//         }


//         if (
//           to &&
//           date >
//             endOfDay(to)
//         ) {
//           return false;
//         }


//         return true;

//       });


//     // --------------------------------------------------------
//     // RUNNING BALANCE
//     // --------------------------------------------------------

//     let balance =
//       Number(openingStock || 0);


//     filtered =
//       filtered.map(row => {

//         const qtyIn =
//           Number(row.qtyIn || 0);

//         const qtyOut =
//           Number(row.qtyOut || 0);


//         balance =
//           balance +
//           qtyIn -
//           qtyOut;


//         return {

//           ...row,

//           balance

//         };

//       });


//     // ========================================================
//     // CREATE EXCEL
//     // ========================================================

//     const workbook =
//       new ExcelJS.Workbook();


//     const sheet =
//       workbook.addWorksheet(
//         "Product Ledger"
//       );


//     sheet.columns = [

//       {
//         header: "Date",
//         key: "date",
//         width: 15
//       },

//       {
//         header: "Type",
//         key: "type",
//         width: 20
//       },

//       {
//         header: "Reference",
//         key: "reference",
//         width: 28
//       },

//       {
//         header: "Inward",
//         key: "qtyIn",
//         width: 15
//       },

//       {
//         header: "Outward",
//         key: "qtyOut",
//         width: 15
//       },

//       {
//         header: "Balance",
//         key: "balance",
//         width: 15
//       }

//     ];


//     sheet.addRow({

//       date: "",
//       type: "OPENING STOCK",
//       reference: "",
//       qtyIn: "",
//       qtyOut: "",
//       balance: openingStock

//     });


//     for (const row of filtered) {

//       sheet.addRow({

//         date:
//           new Date(row.date)
//             .toLocaleDateString("en-IN"),

//         type:
//           row.type,

//         reference:
//           row.reference,

//         qtyIn:
//           row.qtyIn || "",

//         qtyOut:
//           row.qtyOut || "",

//         balance:
//           row.balance

//       });

//     }


//     // --------------------------------------------------------
//     // HEADER STYLE
//     // --------------------------------------------------------

//     const header =
//       sheet.getRow(1);


//     header.font = {
//       bold: true
//     };


//     header.alignment = {
//       vertical: "middle"
//     };


//     // --------------------------------------------------------
//     // RESPONSE
//     // --------------------------------------------------------

//     const safeName =
//       String(product.name || "Product")
//         .replace(/[^a-z0-9-_]/gi, "_");


//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );


//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${safeName}-Ledger.xlsx"`
//     );


//     await workbook.xlsx.write(res);

//     res.end();

//   } catch (error) {

//     console.error(
//       "EXPORT LEDGER ERROR:",
//       error
//     );

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };





// 01-08-2026








// import mongoose from "mongoose";
// import ExcelJS from "exceljs";

// import {
//   Distribution,
//   Transfer,
//   Consumption,
//   GodownStock,
//   IndentRequest
// } from "../models/FlowModels.js";

// import { DailyUsage } from "../models/DailyUsageModel.js";

// import {
//   Godown,
//   StockItem,
//   StockGroup,
//   Unit
// } from "../models/InventoryModels.js";


// // ============================================================
// // HELPERS
// // ============================================================

// const validObjectId = (id) => {
//   return mongoose.Types.ObjectId.isValid(id);
// };


// const getDate = (value) => {
//   if (!value) return null;

//   const d = new Date(value);

//   return Number.isNaN(d.getTime()) ? null : d;
// };


// const startOfDay = (date) => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// };


// const endOfDay = (date) => {
//   const d = new Date(date);
//   d.setHours(23, 59, 59, 999);
//   return d;
// };


// // ============================================================
// // GET GODOWNS
// // ============================================================

// export const getLedgerGodowns = async (req, res) => {

//   try {

//     const godowns = await Godown.find({})
//       .select("_id name")
//       .sort({ name: 1 })
//       .lean();

//     res.json(godowns);

//   } catch (error) {

//     console.error("GET GODOWNS ERROR:", error);

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // GET PRODUCTS FOR GODOWN
// // ============================================================

// export const getProducts = async (req, res) => {

//   try {

//     const { godownId } = req.query;

//     if (!godownId) {

//       return res.status(400).json({
//         error: "godownId is required"
//       });

//     }

//     if (!validObjectId(godownId)) {

//       return res.status(400).json({
//         error: "Invalid godownId"
//       });

//     }


//     const stocks = await GodownStock.find({
//       godownId
//     })
//       .populate({
//         path: "stockItemId",
//         model: "StockItem",
//         select: "name imageUrl unitId stockGroupId itemType",

//         populate: [
//           {
//             path: "unitId",
//             model: "Unit",
//             select: "name symbol"
//           },
//           {
//             path: "stockGroupId",
//             model: "StockGroup",
//             select: "name"
//           }
//         ]
//       })
//       .lean();


//     const products = stocks
//       .filter(stock => stock.stockItemId)
//       .map(stock => ({

//         _id: stock.stockItemId._id,

//         name: stock.stockItemId.name,

//         imageUrl:
//           stock.stockItemId.imageUrl || "",

//         unit:
//           stock.stockItemId.unitId?.symbol ||
//           stock.stockItemId.unitId?.name ||
//           "Units",

//         stockGroup:
//           stock.stockItemId.stockGroupId?.name ||
//           "General",

//         itemType:
//           stock.stockItemId.itemType ||
//           "stock",

//         currentStock:
//           Number(stock.qtyBaseUnit || 0)

//       }));


//     res.json(products);

//   } catch (error) {

//     console.error("GET PRODUCTS ERROR:", error);

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // GET PRODUCT LEDGER
// //
// // Movement types:
// //
// // RECEIVED       -> Distribution
// // TRANSFER IN    -> Transfer destination
// // TRANSFER OUT   -> Transfer source
// // CONSUMPTION    -> Consumption
// // DAILY USAGE    -> DailyUsage
// //
// // ============================================================

// export const getProductLedger = async (req, res) => {

//   try {

//     const { productId } = req.params;

//     const {
//       godownId,
//       startDate,
//       endDate
//     } = req.query;


//     // --------------------------------------------------------
//     // VALIDATION
//     // --------------------------------------------------------

//     if (!godownId) {

//       return res.status(400).json({
//         error: "godownId is required"
//       });

//     }

//     if (!validObjectId(godownId)) {

//       return res.status(400).json({
//         error: "Invalid godownId"
//       });

//     }

//     if (!validObjectId(productId)) {

//       return res.status(400).json({
//         error: "Invalid productId"
//       });

//     }


//     // --------------------------------------------------------
//     // PRODUCT
//     // --------------------------------------------------------

//     const product = await StockItem.findById(productId)
//       .populate("unitId", "name symbol")
//       .populate("stockGroupId", "name")
//       .lean();


//     if (!product) {

//       return res.status(404).json({
//         error: "Product not found"
//       });

//     }


//     // --------------------------------------------------------
//     // CURRENT GODOWN STOCK
//     // --------------------------------------------------------

//     const currentStockDoc =
//       await GodownStock.findOne({
//         godownId,
//         stockItemId: productId
//       }).lean();


//     const currentStock =
//       Number(currentStockDoc?.qtyBaseUnit || 0);


//     // ========================================================
//     // GET ALL DISTRIBUTIONS
//     // ========================================================

//     const distributionDocs =
//       await Distribution.find({
//         "allocations.godownId": godownId,
//         "allocations.stockItemId": productId
//       })
//         .populate({
//           path: "purchaseOrderId",
//           select: "createdAt receivedAt status"
//         })
//         .lean();


//         // ========================================================
// // 🔴 LIVE DEBUG - TEMPORARY
// // ========================================================

// console.log("========== PRODUCT LEDGER DEBUG ==========");
// console.log("productId:", productId);
// console.log("godownId:", godownId);
// console.log("startDate:", startDate);
// console.log("endDate:", endDate);

// console.log(
//   "distributionDocs:",
//   JSON.stringify(distributionDocs, null, 2)
// );

// console.log("==========================================");
// const allDistributions = await Distribution.find({})
//   .sort({ createdAt: -1 })
//   .limit(10)
//   .lean();

// console.log("========== ALL LIVE DISTRIBUTIONS ==========");
// console.log(
//   JSON.stringify(allDistributions, null, 2)
// );
// console.log("============================================");
//     // ========================================================
//     // GET ACCEPTED TRANSFERS
//     // ========================================================

//     const transferDocs =
//       await Transfer.find({

//         status: "accepted",

//         $or: [
//           {
//             fromGodownId: godownId,
//             "items.stockItemId": productId
//           },
//           {
//             toGodownId: godownId,
//             "items.stockItemId": productId
//           }
//         ]

//       })
//         .populate("fromGodownId", "name")
//         .populate("toGodownId", "name")
//         .lean();


//     // ========================================================
//     // GET CONSUMPTIONS
//     // ========================================================

//     const consumptionDocs =
//       await Consumption.find({
//         godownId,
//         "items.stockItemId": productId
//       })
//         .lean();


//     // ========================================================
//     // GET DAILY USAGE
//     // ========================================================

//     const dailyUsageDocs =
//       await DailyUsage.find({
//         godownId,
//         "items.stockItemId": productId
//       })
//         .lean();

// const indentDocs =
//   await IndentRequest.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();
//     // ========================================================
//     // BUILD MOVEMENTS
//     // ========================================================

//     const movements = [];


//     // ========================================================
//     // 1. RECEIVED STOCK
//     // Distribution -> Godown
//     // ========================================================

//     for (const distribution of distributionDocs) {

//       for (const allocation of distribution.allocations || []) {

//         if (
//           String(allocation.godownId) !==
//           String(godownId)
//         ) {
//           continue;
//         }


//         if (
//           String(allocation.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(allocation.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         const date =
//           distribution.createdAt ||
//           distribution.purchaseOrderId?.receivedAt ||
//           distribution.purchaseOrderId?.createdAt ||
//           new Date();


//         movements.push({

//           date,

//           type: "RECEIVED",

//           reference:
//             distribution.purchaseOrderId
//               ? `PO-${distribution.purchaseOrderId._id}`
//               : `DIST-${distribution._id}`,

//           qtyIn: qty,

//           qtyOut: 0,

//           source: "distribution",

//           sourceId: distribution._id

//         });

//       }

//     }
// // ========================================================
// // RECEIVED THROUGH INDENT
// // ========================================================

// for (const indent of indentDocs) {

//   for (const item of indent.items || []) {

//     if (
//       String(item.stockItemId) !==
//       String(productId)
//     ) {
//       continue;
//     }

//     // IMPORTANT:
//     // Use receivedQty, NOT requested qtyBaseUnit
//     const receivedQty =
//       Number(item.receivedQty || 0);

//     if (receivedQty <= 0) {
//       continue;
//     }

//     movements.push({

//       date:
//         item.receivedAt ||
//         indent.updatedAt ||
//         indent.createdAt,

//       type: "RECEIVED",

//       reference: "RECEIVED THROUGH INDENT",

//       qtyIn: receivedQty,

//       qtyOut: 0,

//       source: "indent",

//       sourceId: indent._id

//     });

//   }

// }
// // ========================================================
// // 2. TRANSFERS
// // ========================================================

// for (const transfer of transferDocs) {

//   for (const item of transfer.items || []) {

//     if (
//       String(item.stockItemId) !==
//       String(productId)
//     ) {
//       continue;
//     }

//     const qty =
//       Number(item.qtyBaseUnit || 0);

//     if (qty <= 0) continue;


//     // ----------------------------------------------------
//     // TRANSFER IN
//     // ----------------------------------------------------

//     if (
//       String(
//         transfer.toGodownId?._id ||
//         transfer.toGodownId
//       ) === String(godownId)
//     ) {

//       const fromGodownName =
//         transfer.fromGodownId?.name ||
//         "Unknown Godown";

//       movements.push({

//         date:
//           transfer.acceptedAt ||
//           transfer.updatedAt ||
//           transfer.createdAt,

//         type: "TRANSFER IN",

//         // OTHER GODOWN NAME
//         reference: fromGodownName,

//         qtyIn: qty,

//         qtyOut: 0,

//         source: "transfer_in",

//         sourceId: transfer._id

//       });

//     }


//     // ----------------------------------------------------
//     // TRANSFER OUT
//     // ----------------------------------------------------

//     if (
//       String(
//         transfer.fromGodownId?._id ||
//         transfer.fromGodownId
//       ) === String(godownId)
//     ) {

//       const toGodownName =
//         transfer.toGodownId?.name ||
//         "Unknown Godown";

//       movements.push({

//         date:
//           transfer.acceptedAt ||
//           transfer.updatedAt ||
//           transfer.createdAt,

//         type: "TRANSFER OUT",

//         // OTHER GODOWN NAME
//         reference: toGodownName,

//         qtyIn: 0,

//         qtyOut: qty,

//         source: "transfer_out",

//         sourceId: transfer._id

//       });

//     }

//   }

// }
//     // ========================================================
//     // 3. CONSUMPTION
//     // ========================================================

//     for (const consumption of consumptionDocs) {

//       for (const item of consumption.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//        movements.push({

//   date:
//     consumption.date ||
//     consumption.createdAt,

//   type: "CONSUMPTION",

//   // Show simple reference instead of Consumption ID
//   reference: "CONSUMED",

//   qtyIn: 0,

//   qtyOut: qty,

//   source: "consumption",

//   sourceId: consumption._id

// });

//       }

//     }


//     // ========================================================
//     // 4. DAILY USAGE
//     // ========================================================

//     for (const usage of dailyUsageDocs) {

//       for (const item of usage.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//           date:
//             usage.date ||
//             usage.createdAt,

//           type: "DAILY USAGE",

//           reference: "DAILY USAGE",

//           qtyIn: 0,

//           qtyOut: qty,

//           source: "daily_usage",

//           sourceId: usage._id

//         });

//       }

//     }


//     // ========================================================
//     // SORT ALL MOVEMENTS
//     // ========================================================

//     movements.sort(
//       (a, b) =>
//         new Date(a.date) -
//         new Date(b.date)
//     );


//     // ========================================================
//     // CALCULATE TOTAL HISTORICAL NET MOVEMENT
//     // ========================================================

//     let totalHistoricalIn = 0;

//     let totalHistoricalOut = 0;


//     for (const row of movements) {

//       totalHistoricalIn +=
//         Number(row.qtyIn || 0);

//       totalHistoricalOut +=
//         Number(row.qtyOut || 0);

//     }


//     // ========================================================
//     // RECONSTRUCT STOCK BEFORE FILTERED PERIOD
//     //
//     // Current Stock =
//     // Opening Historical Stock
//     // + All In
//     // - All Out
//     //
//     // Therefore:
//     //
//     // Opening Historical Stock =
//     // Current Stock - All In + All Out
//     // ========================================================

//     const historicalOpeningStock =
//       currentStock -
//       totalHistoricalIn +
//       totalHistoricalOut;


//     // ========================================================
//     // DATE FILTER
//     // ========================================================

//     const from =
//       getDate(startDate);

//     const to =
//       getDate(endDate);


//     let filteredMovements =
//       [...movements];


//     if (from) {

//       const fromDate =
//         startOfDay(from);

//       filteredMovements =
//         filteredMovements.filter(
//           row =>
//             new Date(row.date) >=
//             fromDate
//         );

//     }


//     if (to) {

//       const toDate =
//         endOfDay(to);

//       filteredMovements =
//         filteredMovements.filter(
//           row =>
//             new Date(row.date) <=
//             toDate
//         );

//     }


//     // ========================================================
//     // OPENING STOCK FOR SELECTED DATE RANGE
//     // ========================================================

//     let openingStock =
//       historicalOpeningStock;


//     if (from) {

//       let beforeIn = 0;

//       let beforeOut = 0;


//       for (const row of movements) {

//         if (
//           new Date(row.date) <
//           startOfDay(from)
//         ) {

//           beforeIn +=
//             Number(row.qtyIn || 0);

//           beforeOut +=
//             Number(row.qtyOut || 0);

//         }

//       }


//       openingStock =
//         historicalOpeningStock +
//         beforeIn -
//         beforeOut;

//     }


//     // ========================================================
//     // RUNNING BALANCE
//     // ========================================================

//     let balance =
//       Number(openingStock || 0);


//     const ledger =
//       filteredMovements.map(row => {

//         const qtyIn =
//           Number(row.qtyIn || 0);

//         const qtyOut =
//           Number(row.qtyOut || 0);


//         balance =
//           balance +
//           qtyIn -
//           qtyOut;


//         return {

//           date: row.date,

//           type: row.type,

//           reference: row.reference,

//           qtyIn,

//           qtyOut,

//           balance,

//           source: row.source,

//           sourceId: row.sourceId

//         };

//       });


//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     res.json({

//       product: {

//         _id: product._id,

//         name: product.name,

//         imageUrl:
//           product.imageUrl || "",

//         unit:
//           product.unitId?.symbol ||
//           product.unitId?.name ||
//           "Units",

//         stockGroup:
//           product.stockGroupId?.name ||
//           "General"

//       },

//       godownId,

//       openingStock,

//       currentStock,

//       ledger

//     });

//   } catch (error) {

//     console.error(
//       "PRODUCT LEDGER ERROR:",
//       error
//     );

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };


// // ============================================================
// // EXPORT EXCEL
// // ============================================================

// export const exportProductLedgerExcel = async (req, res) => {

//   try {

//     const {
//       productId
//     } = req.params;

//     const {
//       godownId,
//       startDate,
//       endDate
//     } = req.query;


//     if (!godownId || !productId) {

//       return res.status(400).json({
//         error: "Godown and Product are required"
//       });

//     }


//     // --------------------------------------------------------
//     // Reuse ledger logic internally
//     // --------------------------------------------------------

//     const product =
//       await StockItem.findById(productId)
//         .populate("unitId", "name symbol")
//         .populate("stockGroupId", "name")
//         .lean();


//     if (!product) {

//       return res.status(404).json({
//         error: "Product not found"
//       });

//     }


//     const currentStockDoc =
//       await GodownStock.findOne({
//         godownId,
//         stockItemId: productId
//       }).lean();


//     const currentStock =
//       Number(currentStockDoc?.qtyBaseUnit || 0);


//     // --------------------------------------------------------
//     // DISTRIBUTIONS
//     // --------------------------------------------------------

//     const distributionDocs =
//       await Distribution.find({
//         "allocations.godownId": godownId,
//         "allocations.stockItemId": productId
//       }).lean();


//     // --------------------------------------------------------
//     // TRANSFERS
//     // --------------------------------------------------------

//     const transferDocs =
//       await Transfer.find({

//         status: "accepted",

//         $or: [
//           {
//             fromGodownId: godownId,
//             "items.stockItemId": productId
//           },
//           {
//             toGodownId: godownId,
//             "items.stockItemId": productId
//           }
//         ]

//       }).lean();


//     // --------------------------------------------------------
//     // CONSUMPTIONS
//     // --------------------------------------------------------

//     const consumptionDocs =
//       await Consumption.find({
//         godownId,
//         "items.stockItemId": productId
//       }).lean();


//     // --------------------------------------------------------
//     // DAILY USAGE
//     // --------------------------------------------------------

//    // --------------------------------------------------------
// // DAILY USAGE
// // --------------------------------------------------------

// const dailyUsageDocs =
//   await DailyUsage.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();


// // --------------------------------------------------------
// // INDENT RECEIVED STOCK
// // IMPORTANT: Excel must include inward received through indent
// // --------------------------------------------------------

// const indentDocs =
//   await IndentRequest.find({
//     godownId,
//     "items.stockItemId": productId
//   }).lean();


// const movements = [];


//     // RECEIVED

//     for (const distribution of distributionDocs) {

//       for (const item of distribution.allocations || []) {

//         if (
//           String(item.godownId) !==
//             String(godownId) ||
//           String(item.stockItemId) !==
//             String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//           date:
//             distribution.createdAt,

//           type: "RECEIVED",

//           reference:
//             `DIST-${distribution._id}`,

//           qtyIn: qty,

//           qtyOut: 0

//         });

//       }

//     }

//     // ========================================================
//     // RECEIVED THROUGH INDENT
//     // ========================================================

//     for (const indent of indentDocs) {

//       for (const item of indent.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }

//         const receivedQty =
//           Number(item.receivedQty || 0);

//         if (receivedQty <= 0) {
//           continue;
//         }

//         movements.push({

//           date:
//             item.receivedAt ||
//             indent.updatedAt ||
//             indent.createdAt,

//           type: "RECEIVED",

//           reference:
//             "RECEIVED THROUGH INDENT",

//           qtyIn: receivedQty,

//           qtyOut: 0

//         });

//       }

//     }
//     // TRANSFERS

//     for (const transfer of transferDocs) {

//       for (const item of transfer.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         if (
//           String(transfer.toGodownId) ===
//           String(godownId)
//         ) {

//           movements.push({

//             date:
//               transfer.acceptedAt ||
//               transfer.updatedAt ||
//               transfer.createdAt,

//             type: "TRANSFER IN",

//             reference:
//               `TRF-${transfer._id}`,

//             qtyIn: qty,

//             qtyOut: 0

//           });

//         }


//         if (
//           String(transfer.fromGodownId) ===
//           String(godownId)
//         ) {

//           movements.push({

//             date:
//               transfer.acceptedAt ||
//               transfer.updatedAt ||
//               transfer.createdAt,

//             type: "TRANSFER OUT",

//             reference:
//               `TRF-${transfer._id}`,

//             qtyIn: 0,

//             qtyOut: qty

//           });

//         }

//       }

//     }


//     // CONSUMPTION

//     for (const consumption of consumptionDocs) {

//       for (const item of consumption.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//         movements.push({

//   date:
//     consumption.date ||
//     consumption.createdAt,

//   type: "CONSUMPTION",

//   reference: "CONSUMED",

//   qtyIn: 0,

//   qtyOut: qty

// });

//       }

//     }


//     // DAILY USAGE

//     for (const usage of dailyUsageDocs) {

//       for (const item of usage.items || []) {

//         if (
//           String(item.stockItemId) !==
//           String(productId)
//         ) {
//           continue;
//         }


//         const qty =
//           Number(item.qtyBaseUnit || 0);


//         if (qty <= 0) continue;


//        movements.push({

//   date:
//     usage.date ||
//     usage.createdAt,

//   type: "DAILY USAGE",

//   reference: "DAILY USAGE",

//   qtyIn: 0,

//   qtyOut: qty

// });

//       }

//     }


//     // --------------------------------------------------------
//     // SORT
//     // --------------------------------------------------------

//     movements.sort(
//       (a, b) =>
//         new Date(a.date) -
//         new Date(b.date)
//     );


//     // --------------------------------------------------------
//     // HISTORICAL OPENING
//     // --------------------------------------------------------

//     let totalIn = 0;

//     let totalOut = 0;


//     for (const row of movements) {

//       totalIn +=
//         Number(row.qtyIn || 0);

//       totalOut +=
//         Number(row.qtyOut || 0);

//     }


//     const historicalOpening =
//       currentStock -
//       totalIn +
//       totalOut;


//     // --------------------------------------------------------
//     // DATE FILTER + OPENING
//     // --------------------------------------------------------

//     const from =
//       getDate(startDate);

//     const to =
//       getDate(endDate);


//     let openingStock =
//       historicalOpening;


//     if (from) {

//       let beforeIn = 0;

//       let beforeOut = 0;


//       for (const row of movements) {

//         if (
//           new Date(row.date) <
//           startOfDay(from)
//         ) {

//           beforeIn +=
//             Number(row.qtyIn || 0);

//           beforeOut +=
//             Number(row.qtyOut || 0);

//         }

//       }


//       openingStock =
//         historicalOpening +
//         beforeIn -
//         beforeOut;

//     }


//     let filtered =
//       movements.filter(row => {

//         const date =
//           new Date(row.date);


//         if (
//           from &&
//           date <
//             startOfDay(from)
//         ) {
//           return false;
//         }


//         if (
//           to &&
//           date >
//             endOfDay(to)
//         ) {
//           return false;
//         }


//         return true;

//       });


//     // --------------------------------------------------------
//     // RUNNING BALANCE
//     // --------------------------------------------------------

//     let balance =
//       Number(openingStock || 0);


//     filtered =
//       filtered.map(row => {

//         const qtyIn =
//           Number(row.qtyIn || 0);

//         const qtyOut =
//           Number(row.qtyOut || 0);


//         balance =
//           balance +
//           qtyIn -
//           qtyOut;


//         return {

//           ...row,

//           balance

//         };

//       });


//     // ========================================================
//     // CREATE EXCEL
//     // ========================================================

//     const workbook =
//       new ExcelJS.Workbook();


//     const sheet =
//       workbook.addWorksheet(
//         "Product Ledger"
//       );


//     sheet.columns = [

//       {
//         header: "Date",
//         key: "date",
//         width: 15
//       },

//       {
//         header: "Type",
//         key: "type",
//         width: 20
//       },

//       {
//         header: "Reference",
//         key: "reference",
//         width: 28
//       },

//       {
//         header: "Inward",
//         key: "qtyIn",
//         width: 15
//       },

//       {
//         header: "Outward",
//         key: "qtyOut",
//         width: 15
//       },

//       {
//         header: "Balance",
//         key: "balance",
//         width: 15
//       }

//     ];


//     sheet.addRow({

//       date: "",
//       type: "OPENING STOCK",
//       reference: "",
//       qtyIn: "",
//       qtyOut: "",
//       balance: openingStock

//     });


//     for (const row of filtered) {

//       sheet.addRow({

//         date:
//           new Date(row.date)
//             .toLocaleDateString("en-IN"),

//         type:
//           row.type,

//         reference:
//           row.reference,

//         qtyIn:
//           row.qtyIn || "",

//         qtyOut:
//           row.qtyOut || "",

//         balance:
//           row.balance

//       });

//     }


//     // --------------------------------------------------------
//     // HEADER STYLE
//     // --------------------------------------------------------

//     const header =
//       sheet.getRow(1);


//     header.font = {
//       bold: true
//     };


//     header.alignment = {
//       vertical: "middle"
//     };


//     // --------------------------------------------------------
//     // RESPONSE
//     // --------------------------------------------------------

//     const safeName =
//       String(product.name || "Product")
//         .replace(/[^a-z0-9-_]/gi, "_");


//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );


//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${safeName}-Ledger.xlsx"`
//     );


//     await workbook.xlsx.write(res);

//     res.end();

//   } catch (error) {

//     console.error(
//       "EXPORT LEDGER ERROR:",
//       error
//     );

//     res.status(500).json({
//       error: error.message
//     });

//   }

// };




// 2






import mongoose from "mongoose";
import ExcelJS from "exceljs";

import {
  Distribution,
  Transfer,
  Consumption,
  GodownStock,
  IndentRequest
} from "../models/FlowModels.js";

import { DailyUsage } from "../models/DailyUsageModel.js";

import {
  Godown,
  StockItem,
  StockGroup,
  Unit
} from "../models/InventoryModels.js";


// ============================================================
// HELPERS
// ============================================================

const validObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


const getDate = (value) => {
  if (!value) return null;

  const d = new Date(value);

  return Number.isNaN(d.getTime()) ? null : d;
};


const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};


const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};


// ============================================================
// GET GODOWNS
// ============================================================

export const getLedgerGodowns = async (req, res) => {

  try {

    const godowns = await Godown.find({})
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    res.json(godowns);

  } catch (error) {

    console.error("GET GODOWNS ERROR:", error);

    res.status(500).json({
      error: error.message
    });

  }

};


// ============================================================
// GET PRODUCTS FOR GODOWN
// ============================================================

export const getProducts = async (req, res) => {

  try {

    const { godownId } = req.query;

    if (!godownId) {

      return res.status(400).json({
        error: "godownId is required"
      });

    }

    if (!validObjectId(godownId)) {

      return res.status(400).json({
        error: "Invalid godownId"
      });

    }


    const stocks = await GodownStock.find({
      godownId
    })
      .populate({
        path: "stockItemId",
        model: "StockItem",
        select: "name imageUrl unitId stockGroupId itemType",

        populate: [
          {
            path: "unitId",
            model: "Unit",
            select: "name symbol"
          },
          {
            path: "stockGroupId",
            model: "StockGroup",
            select: "name"
          }
        ]
      })
      .lean();


    const products = stocks
      .filter(stock => stock.stockItemId)
      .map(stock => ({

        _id: stock.stockItemId._id,

        name: stock.stockItemId.name,

        imageUrl:
          stock.stockItemId.imageUrl || "",

        unit:
          stock.stockItemId.unitId?.symbol ||
          stock.stockItemId.unitId?.name ||
          "Units",

        stockGroup:
          stock.stockItemId.stockGroupId?.name ||
          "General",

        itemType:
          stock.stockItemId.itemType ||
          "stock",

        currentStock:
          Number(stock.qtyBaseUnit || 0)

      }));


    res.json(products);

  } catch (error) {

    console.error("GET PRODUCTS ERROR:", error);

    res.status(500).json({
      error: error.message
    });

  }

};


// ============================================================
// GET PRODUCT LEDGER
//
// Movement types:
//
// RECEIVED       -> Distribution
// TRANSFER IN    -> Transfer destination
// TRANSFER OUT   -> Transfer source
// CONSUMPTION    -> Consumption
// DAILY USAGE    -> DailyUsage
//
// ============================================================

export const getProductLedger = async (req, res) => {

  try {

    const { productId } = req.params;

    const {
      godownId,
      startDate,
      endDate
    } = req.query;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!godownId) {

      return res.status(400).json({
        error: "godownId is required"
      });

    }

    if (!validObjectId(godownId)) {

      return res.status(400).json({
        error: "Invalid godownId"
      });

    }

    if (!validObjectId(productId)) {

      return res.status(400).json({
        error: "Invalid productId"
      });

    }


    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

    const product = await StockItem.findById(productId)
      .populate("unitId", "name symbol")
      .populate("stockGroupId", "name")
      .lean();


    if (!product) {

      return res.status(404).json({
        error: "Product not found"
      });

    }


    // --------------------------------------------------------
    // CURRENT GODOWN STOCK
    // --------------------------------------------------------

    const currentStockDoc =
      await GodownStock.findOne({
        godownId,
        stockItemId: productId
      }).lean();


    const currentStock =
      Number(currentStockDoc?.qtyBaseUnit || 0);


    // ========================================================
    // GET ALL DISTRIBUTIONS
    // ========================================================

    const distributionDocs =
      await Distribution.find({
        "allocations.godownId": godownId,
        "allocations.stockItemId": productId
      })
        .populate({
          path: "purchaseOrderId",
          select: "createdAt receivedAt status"
        })
        .lean();


        // ========================================================
// 🔴 LIVE DEBUG - TEMPORARY
// ========================================================

console.log("========== PRODUCT LEDGER DEBUG ==========");
console.log("productId:", productId);
console.log("godownId:", godownId);
console.log("startDate:", startDate);
console.log("endDate:", endDate);

console.log(
  "distributionDocs:",
  JSON.stringify(distributionDocs, null, 2)
);

console.log("==========================================");
const allDistributions = await Distribution.find({})
  .sort({ createdAt: -1 })
  .limit(10)
  .lean();

console.log("========== ALL LIVE DISTRIBUTIONS ==========");
console.log(
  JSON.stringify(allDistributions, null, 2)
);
console.log("============================================");
    // ========================================================
    // GET ACCEPTED TRANSFERS
    // ========================================================

    const transferDocs =
      await Transfer.find({

        status: "accepted",

        $or: [
          {
            fromGodownId: godownId,
            "items.stockItemId": productId
          },
          {
            toGodownId: godownId,
            "items.stockItemId": productId
          }
        ]

      })
        .populate("fromGodownId", "name")
        .populate("toGodownId", "name")
        .lean();


    // ========================================================
    // GET CONSUMPTIONS
    // ========================================================

    const consumptionDocs =
      await Consumption.find({
        godownId,
        "items.stockItemId": productId
      })
        .lean();


    // ========================================================
    // GET DAILY USAGE
    // ========================================================

    const dailyUsageDocs =
      await DailyUsage.find({
        godownId,
        "items.stockItemId": productId
      })
        .lean();

const indentDocs =
  await IndentRequest.find({
    godownId,
    "items.stockItemId": productId
  }).lean();
    // ========================================================
    // BUILD MOVEMENTS
    // ========================================================

    const movements = [];


    // ========================================================
    // 1. RECEIVED STOCK
    // Distribution -> Godown
    // ========================================================

    for (const distribution of distributionDocs) {

      for (const allocation of distribution.allocations || []) {

        if (
          String(allocation.godownId) !==
          String(godownId)
        ) {
          continue;
        }


        if (
          String(allocation.stockItemId) !==
          String(productId)
        ) {
          continue;
        }


        const qty =
          Number(allocation.qtyBaseUnit || 0);


        if (qty <= 0) continue;


        const date =
          distribution.createdAt ||
          distribution.purchaseOrderId?.receivedAt ||
          distribution.purchaseOrderId?.createdAt ||
          new Date();


        movements.push({

          date,

          type: "RECEIVED",

          reference:
            distribution.purchaseOrderId
              ? `PO-${distribution.purchaseOrderId._id}`
              : `DIST-${distribution._id}`,

          qtyIn: qty,

          qtyOut: 0,

          source: "distribution",

          sourceId: distribution._id

        });

      }

    }
// ========================================================
// RECEIVED THROUGH INDENT
// ========================================================

for (const indent of indentDocs) {

  for (const item of indent.items || []) {

    if (
      String(item.stockItemId) !==
      String(productId)
    ) {
      continue;
    }

    // IMPORTANT:
    // Use receivedQty, NOT requested qtyBaseUnit
    const receivedQty =
      Number(item.receivedQty || 0);

    if (receivedQty <= 0) {
      continue;
    }

    movements.push({

      date:
        item.receivedAt ||
        indent.updatedAt ||
        indent.createdAt,

      type: "RECEIVED",

      reference: "RECEIVED THROUGH INDENT",

      qtyIn: receivedQty,

      qtyOut: 0,

      source: "indent",

      sourceId: indent._id

    });

  }

}
// ========================================================
// 2. TRANSFERS
// ========================================================

for (const transfer of transferDocs) {

  for (const item of transfer.items || []) {

    if (
      String(item.stockItemId) !==
      String(productId)
    ) {
      continue;
    }

    const qty =
      Number(item.qtyBaseUnit || 0);

    if (qty <= 0) continue;


    // ----------------------------------------------------
    // TRANSFER IN
    // ----------------------------------------------------

    if (
      String(
        transfer.toGodownId?._id ||
        transfer.toGodownId
      ) === String(godownId)
    ) {

      const fromGodownName =
        transfer.fromGodownId?.name ||
        "Unknown Godown";

      movements.push({

        date:
          transfer.acceptedAt ||
          transfer.updatedAt ||
          transfer.createdAt,

        type: "TRANSFER IN",

        // OTHER GODOWN NAME
        reference: fromGodownName,

        qtyIn: qty,

        qtyOut: 0,

        source: "transfer_in",

        sourceId: transfer._id

      });

    }


    // ----------------------------------------------------
    // TRANSFER OUT
    // ----------------------------------------------------

    if (
      String(
        transfer.fromGodownId?._id ||
        transfer.fromGodownId
      ) === String(godownId)
    ) {

      const toGodownName =
        transfer.toGodownId?.name ||
        "Unknown Godown";

      movements.push({

        date:
          transfer.acceptedAt ||
          transfer.updatedAt ||
          transfer.createdAt,

        type: "TRANSFER OUT",

        // OTHER GODOWN NAME
        reference: toGodownName,

        qtyIn: 0,

        qtyOut: qty,

        source: "transfer_out",

        sourceId: transfer._id

      });

    }

  }

}
    // ========================================================
    // 3. CONSUMPTION
    // ========================================================

    for (const consumption of consumptionDocs) {

      for (const item of consumption.items || []) {

        if (
          String(item.stockItemId) !==
          String(productId)
        ) {
          continue;
        }


        const qty =
          Number(item.qtyBaseUnit || 0);


        if (qty <= 0) continue;


       movements.push({

  date:
    consumption.date ||
    consumption.createdAt,

  type: "CONSUMPTION",

  // Show simple reference instead of Consumption ID
  reference: "CONSUMED",

  qtyIn: 0,

  qtyOut: qty,

  source: "consumption",

  sourceId: consumption._id

});

      }

    }


    // ========================================================
    // 4. DAILY USAGE
    // ========================================================

    for (const usage of dailyUsageDocs) {

      for (const item of usage.items || []) {

        if (
          String(item.stockItemId) !==
          String(productId)
        ) {
          continue;
        }


        const qty =
          Number(item.qtyBaseUnit || 0);


        if (qty <= 0) continue;


        movements.push({

          date:
            usage.date ||
            usage.createdAt,

          type: "DAILY USAGE",

          reference: "DAILY USAGE",

          qtyIn: 0,

          qtyOut: qty,

          source: "daily_usage",

          sourceId: usage._id

        });

      }

    }


    // ========================================================
    // SORT ALL MOVEMENTS
    // ========================================================

    movements.sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


    // ========================================================
    // CALCULATE TOTAL HISTORICAL NET MOVEMENT
    // ========================================================

    let totalHistoricalIn = 0;

    let totalHistoricalOut = 0;


    for (const row of movements) {

      totalHistoricalIn +=
        Number(row.qtyIn || 0);

      totalHistoricalOut +=
        Number(row.qtyOut || 0);

    }


    // ========================================================
    // RECONSTRUCT STOCK BEFORE FILTERED PERIOD
    //
    // Current Stock =
    // Opening Historical Stock
    // + All In
    // - All Out
    //
    // Therefore:
    //
    // Opening Historical Stock =
    // Current Stock - All In + All Out
    // ========================================================

    const historicalOpeningStock =
      currentStock -
      totalHistoricalIn +
      totalHistoricalOut;


    // ========================================================
    // DATE FILTER
    // ========================================================

    const from =
      getDate(startDate);

    const to =
      getDate(endDate);


    let filteredMovements =
      [...movements];


    if (from) {

      const fromDate =
        startOfDay(from);

      filteredMovements =
        filteredMovements.filter(
          row =>
            new Date(row.date) >=
            fromDate
        );

    }


    if (to) {

      const toDate =
        endOfDay(to);

      filteredMovements =
        filteredMovements.filter(
          row =>
            new Date(row.date) <=
            toDate
        );

    }


    // ========================================================
    // OPENING STOCK FOR SELECTED DATE RANGE
    // ========================================================

    let openingStock =
      historicalOpeningStock;


    if (from) {

      let beforeIn = 0;

      let beforeOut = 0;


      for (const row of movements) {

        if (
          new Date(row.date) <
          startOfDay(from)
        ) {

          beforeIn +=
            Number(row.qtyIn || 0);

          beforeOut +=
            Number(row.qtyOut || 0);

        }

      }


      openingStock =
        historicalOpeningStock +
        beforeIn -
        beforeOut;

    }


    // ========================================================
    // RUNNING BALANCE
    // ========================================================

    let balance =
      Number(openingStock || 0);


    const ledger =
      filteredMovements.map(row => {

        const qtyIn =
          Number(row.qtyIn || 0);

        const qtyOut =
          Number(row.qtyOut || 0);


        balance =
          balance +
          qtyIn -
          qtyOut;


        return {

          date: row.date,

          type: row.type,

          reference: row.reference,

          qtyIn,

          qtyOut,

          balance,

          source: row.source,

          sourceId: row.sourceId

        };

      });


    // ========================================================
    // RESPONSE
    // ========================================================

    res.json({

      product: {

        _id: product._id,

        name: product.name,

        imageUrl:
          product.imageUrl || "",

        unit:
          product.unitId?.symbol ||
          product.unitId?.name ||
          "Units",

        stockGroup:
          product.stockGroupId?.name ||
          "General"

      },

      godownId,

      openingStock,

      currentStock,

      ledger

    });

  } catch (error) {

    console.error(
      "PRODUCT LEDGER ERROR:",
      error
    );

    res.status(500).json({
      error: error.message
    });

  }

};


// ============================================================
// EXPORT EXCEL
// ============================================================

export const exportProductLedgerExcel = async (req, res) => {

  try {

    const {
      productId
    } = req.params;

    const {
      godownId,
      startDate,
      endDate
    } = req.query;


    if (!godownId || !productId) {

      return res.status(400).json({
        error: "Godown and Product are required"
      });

    }


    // --------------------------------------------------------
    // Reuse ledger logic internally
    // --------------------------------------------------------

    const product =
      await StockItem.findById(productId)
        .populate("unitId", "name symbol")
        .populate("stockGroupId", "name")
        .lean();


    if (!product) {

      return res.status(404).json({
        error: "Product not found"
      });

    }


    const currentStockDoc =
      await GodownStock.findOne({
        godownId,
        stockItemId: productId
      }).lean();


    const currentStock =
      Number(currentStockDoc?.qtyBaseUnit || 0);


    // --------------------------------------------------------
    // DISTRIBUTIONS
    // --------------------------------------------------------

    const distributionDocs =
      await Distribution.find({
        "allocations.godownId": godownId,
        "allocations.stockItemId": productId
      }).lean();


    // --------------------------------------------------------
    // TRANSFERS
    // --------------------------------------------------------

   const transferDocs =
  await Transfer.find({

    status: "accepted",

    $or: [
      {
        fromGodownId: godownId,
        "items.stockItemId": productId
      },
      {
        toGodownId: godownId,
        "items.stockItemId": productId
      }
    ]

  })
    .populate("fromGodownId", "name")
    .populate("toGodownId", "name")
    .lean();


    // --------------------------------------------------------
    // CONSUMPTIONS
    // --------------------------------------------------------

    const consumptionDocs =
      await Consumption.find({
        godownId,
        "items.stockItemId": productId
      }).lean();


    // --------------------------------------------------------
    // DAILY USAGE
    // --------------------------------------------------------

   // --------------------------------------------------------
// DAILY USAGE
// --------------------------------------------------------

const dailyUsageDocs =
  await DailyUsage.find({
    godownId,
    "items.stockItemId": productId
  }).lean();


// --------------------------------------------------------
// INDENT RECEIVED STOCK
// IMPORTANT: Excel must include inward received through indent
// --------------------------------------------------------

const indentDocs =
  await IndentRequest.find({
    godownId,
    "items.stockItemId": productId
  }).lean();


const movements = [];


    // RECEIVED

    for (const distribution of distributionDocs) {

      for (const item of distribution.allocations || []) {

        if (
          String(item.godownId) !==
            String(godownId) ||
          String(item.stockItemId) !==
            String(productId)
        ) {
          continue;
        }


        const qty =
          Number(item.qtyBaseUnit || 0);


        if (qty <= 0) continue;


        movements.push({

          date:
            distribution.createdAt,

          type: "RECEIVED",

          reference:
            `DIST-${distribution._id}`,

          qtyIn: qty,

          qtyOut: 0

        });

      }

    }

    // ========================================================
    // RECEIVED THROUGH INDENT
    // ========================================================

    for (const indent of indentDocs) {

      for (const item of indent.items || []) {

        if (
          String(item.stockItemId) !==
          String(productId)
        ) {
          continue;
        }

        const receivedQty =
          Number(item.receivedQty || 0);

        if (receivedQty <= 0) {
          continue;
        }

        movements.push({

          date:
            item.receivedAt ||
            indent.updatedAt ||
            indent.createdAt,

          type: "RECEIVED",

          reference:
            "RECEIVED THROUGH INDENT",

          qtyIn: receivedQty,

          qtyOut: 0

        });

      }

    }
    // TRANSFERS

   // ========================================================
// TRANSFERS
// ========================================================

for (const transfer of transferDocs) {

  for (const item of transfer.items || []) {

    if (
      String(item.stockItemId) !==
      String(productId)
    ) {
      continue;
    }

    const qty =
      Number(item.qtyBaseUnit || 0);

    if (qty <= 0) continue;


    // ====================================================
    // TRANSFER IN
    // ====================================================

    if (
      String(
        transfer.toGodownId?._id ||
        transfer.toGodownId
      ) === String(godownId)
    ) {

      const fromGodownName =
        transfer.fromGodownId?.name ||
        "Unknown Godown";

      movements.push({

        date:
          transfer.acceptedAt ||
          transfer.updatedAt ||
          transfer.createdAt,

        type: "TRANSFER IN",

        // SHOW SOURCE GODOWN NAME
        reference: fromGodownName,

        qtyIn: qty,

        qtyOut: 0

      });

    }


    // ====================================================
    // TRANSFER OUT
    // ====================================================

    if (
      String(
        transfer.fromGodownId?._id ||
        transfer.fromGodownId
      ) === String(godownId)
    ) {

      const toGodownName =
        transfer.toGodownId?.name ||
        "Unknown Godown";

      movements.push({

        date:
          transfer.acceptedAt ||
          transfer.updatedAt ||
          transfer.createdAt,

        type: "TRANSFER OUT",

        // SHOW DESTINATION GODOWN NAME
        reference: toGodownName,

        qtyIn: 0,

        qtyOut: qty

      });

    }

  }

}

    // CONSUMPTION

    for (const consumption of consumptionDocs) {

      for (const item of consumption.items || []) {

        if (
          String(item.stockItemId) !==
          String(productId)
        ) {
          continue;
        }


        const qty =
          Number(item.qtyBaseUnit || 0);


        if (qty <= 0) continue;


        movements.push({

  date:
    consumption.date ||
    consumption.createdAt,

  type: "CONSUMPTION",

  reference: "CONSUMED",

  qtyIn: 0,

  qtyOut: qty

});

      }

    }


    // DAILY USAGE

    for (const usage of dailyUsageDocs) {

      for (const item of usage.items || []) {

        if (
          String(item.stockItemId) !==
          String(productId)
        ) {
          continue;
        }


        const qty =
          Number(item.qtyBaseUnit || 0);


        if (qty <= 0) continue;


       movements.push({

  date:
    usage.date ||
    usage.createdAt,

  type: "DAILY USAGE",

  reference: "DAILY USAGE",

  qtyIn: 0,

  qtyOut: qty

});

      }

    }


    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    movements.sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


    // --------------------------------------------------------
    // HISTORICAL OPENING
    // --------------------------------------------------------

    let totalIn = 0;

    let totalOut = 0;


    for (const row of movements) {

      totalIn +=
        Number(row.qtyIn || 0);

      totalOut +=
        Number(row.qtyOut || 0);

    }


    const historicalOpening =
      currentStock -
      totalIn +
      totalOut;


    // --------------------------------------------------------
    // DATE FILTER + OPENING
    // --------------------------------------------------------

    const from =
      getDate(startDate);

    const to =
      getDate(endDate);


    let openingStock =
      historicalOpening;


    if (from) {

      let beforeIn = 0;

      let beforeOut = 0;


      for (const row of movements) {

        if (
          new Date(row.date) <
          startOfDay(from)
        ) {

          beforeIn +=
            Number(row.qtyIn || 0);

          beforeOut +=
            Number(row.qtyOut || 0);

        }

      }


      openingStock =
        historicalOpening +
        beforeIn -
        beforeOut;

    }


    let filtered =
      movements.filter(row => {

        const date =
          new Date(row.date);


        if (
          from &&
          date <
            startOfDay(from)
        ) {
          return false;
        }


        if (
          to &&
          date >
            endOfDay(to)
        ) {
          return false;
        }


        return true;

      });


    // --------------------------------------------------------
    // RUNNING BALANCE
    // --------------------------------------------------------

    let balance =
      Number(openingStock || 0);


    filtered =
      filtered.map(row => {

        const qtyIn =
          Number(row.qtyIn || 0);

        const qtyOut =
          Number(row.qtyOut || 0);


        balance =
          balance +
          qtyIn -
          qtyOut;


        return {

          ...row,

          balance

        };

      });


    // ========================================================
    // CREATE EXCEL
    // ========================================================

    const workbook =
      new ExcelJS.Workbook();


    const sheet =
      workbook.addWorksheet(
        "Product Ledger"
      );


    sheet.columns = [

      {
        header: "Date",
        key: "date",
        width: 15
      },

      {
        header: "Type",
        key: "type",
        width: 20
      },

      {
        header: "Reference",
        key: "reference",
        width: 28
      },

      {
        header: "Inward",
        key: "qtyIn",
        width: 15
      },

      {
        header: "Outward",
        key: "qtyOut",
        width: 15
      },

      {
        header: "Balance",
        key: "balance",
        width: 15
      }

    ];


    sheet.addRow({

      date: "",
      type: "OPENING STOCK",
      reference: "",
      qtyIn: "",
      qtyOut: "",
      balance: openingStock

    });


    for (const row of filtered) {

      sheet.addRow({

        date:
          new Date(row.date)
            .toLocaleDateString("en-IN"),

        type:
          row.type,

        reference:
          row.reference,

        qtyIn:
          row.qtyIn || "",

        qtyOut:
          row.qtyOut || "",

        balance:
          row.balance

      });

    }


    // --------------------------------------------------------
    // HEADER STYLE
    // --------------------------------------------------------

    const header =
      sheet.getRow(1);


    header.font = {
      bold: true
    };


    header.alignment = {
      vertical: "middle"
    };


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    const safeName =
      String(product.name || "Product")
        .replace(/[^a-z0-9-_]/gi, "_");


    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );


    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}-Ledger.xlsx"`
    );


    await workbook.xlsx.write(res);

    res.end();

  } catch (error) {

    console.error(
      "EXPORT LEDGER ERROR:",
      error
    );

    res.status(500).json({
      error: error.message
    });

  }

};