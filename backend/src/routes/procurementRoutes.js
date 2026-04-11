// // // // // // // // // // // // // // // // import express from "express";
// // // // // // // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // // // // // // import { Distribution, GodownStock, Indent, Notification, PurchaseOrder } from "../models/FlowModels.js";

// // // // // // // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // // // // // // const adminOnly = authorize(["admin"]);

// // // // // // // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => res.json(await Indent.find().sort({ createdAt: -1 })));
// // // // // // // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // // // // // // //   if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // // // // // // //   return res.json(indent);
// // // // // // // // // // // // // // // // });
// // // // // // // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const totalAmount = (req.body.items || []).reduce((sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 0);
// // // // // // // // // // // // // // // //   const indent = await Indent.create({
// // // // // // // // // // // // // // // //     indentNo: `IND-${Date.now()}`,
// // // // // // // // // // // // // // // //     createdBy: req.user.sub,
// // // // // // // // // // // // // // // //     items: req.body.items || [],
// // // // // // // // // // // // // // // //     totalAmount
// // // // // // // // // // // // // // // //   });
// // // // // // // // // // // // // // // //   res.status(201).json(indent);
// // // // // // // // // // // // // // // // });
// // // // // // // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const indent = await Indent.findByIdAndUpdate(req.params.id, { status: "purchased" }, { new: true });
// // // // // // // // // // // // // // // //   res.json(indent);
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => res.json(await PurchaseOrder.find().sort({ createdAt: -1 })));
// // // // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // // //   const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // // // // // // //   res.json(indents);
// // // // // // // // // // // // // // // // });
// // // // // // // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce((sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 0);
// // // // // // // // // // // // // // // //       const po = await PurchaseOrder.create([{ indentId: req.body.indentId, items: req.body.items || [], totalAmount }], { session });
// // // // // // // // // // // // // // // //       await Indent.findByIdAndUpdate(req.body.indentId, { status: "stock_received" }, { session });
// // // // // // // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // // // //       const distribution = await Distribution.create([{ purchaseOrderId: req.body.purchaseOrderId, allocations: req.body.allocations || [], leftovers: req.body.leftovers || [] }], { session });
// // // // // // // // // // // // // // // //       for (const item of req.body.allocations || []) {
// // // // // // // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // // // // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } },
// // // // // // // // // // // // // // // //           { upsert: true, new: true, session }
// // // // // // // // // // // // // // // //         );
// // // // // // // // // // // // // // // //       }
// // // // // // // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // // //   const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // // // // // // // // // // // //   const leftovers = docs.flatMap((d) => d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id })));
// // // // // // // // // // // // // // // //   res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // // //   const docs = await GodownStock.find().populate("stockItemId godownId").sort({ updatedAt: -1 });
// // // // // // // // // // // // // // // //   res.json(docs);
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks/:godownId", async (req, res) => {
// // // // // // // // // // // // // // // //   const docs = await GodownStock.find({ godownId: req.params.godownId }).populate("stockItemId");
// // // // // // // // // // // // // // // //   res.json(docs);
// // // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // // //   const stock = await GodownStock.findByIdAndUpdate(req.params.id, { thresholdBaseUnit: req.body.thresholdBaseUnit }, { new: true });
// // // // // // // // // // // // // // // //   if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // // // // // // //     await Notification.create({ type: "threshold", severity: "warning", payload: { godownId: stock.godownId, stockItemId: stock.stockItemId, qty: stock.qtyBaseUnit } });
// // // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // //   res.json(stock);
// // // // // // // // // // // // // // // // });



// // // // // // // // // // // // // // // // // --- FIND THIS SECTION IN procurementRoutes.js ---




// // // // // // // // // // // // // // // import express from "express";
// // // // // // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // // // // // import { 
// // // // // // // // // // // // // // //   Distribution, 
// // // // // // // // // // // // // // //   GodownStock, 
// // // // // // // // // // // // // // //   Indent, 
// // // // // // // // // // // // // // //   Notification, 
// // // // // // // // // // // // // // //   PurchaseOrder 
// // // // // // // // // // // // // // // } from "../models/FlowModels.js";

// // // // // // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // // // // // const adminOnly = authorize(["admin"]);

// // // // // // // // // // // // // // // // --- INDENT ROUTES ---

// // // // // // // // // // // // // // // // Get all indents
// // // // // // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // //   res.json(await Indent.find().sort({ createdAt: -1 }));
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Preview specific indent with item details
// // // // // // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // // // // // //   if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // // // // // //   return res.json(indent);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Create new indent
// // // // // // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // // // //     (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // // // // // // // // // // //     0
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // //   const indent = await Indent.create({
// // // // // // // // // // // // // // //     indentNo: `IND-${Date.now()}`,
// // // // // // // // // // // // // // //     createdBy: req.user.sub,
// // // // // // // // // // // // // // //     items: req.body.items || [],
// // // // // // // // // // // // // // //     totalAmount
// // // // // // // // // // // // // // //   });
// // // // // // // // // // // // // // //   res.status(201).json(indent);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Update indent status to purchased
// // // // // // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const indent = await Indent.findByIdAndUpdate(
// // // // // // // // // // // // // // //     req.params.id, 
// // // // // // // // // // // // // // //     { status: "purchased" }, 
// // // // // // // // // // // // // // //     { new: true }
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // //   res.json(indent);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // // // // // // // // // // // // GET All Purchase Orders (FIXED: Added populate to provide Indent Applied Date)
// // // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // //     const orders = await PurchaseOrder.find()
// // // // // // // // // // // // // // //       .populate("indentId") // Joins Indent data so frontend gets 'createdAt'
// // // // // // // // // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // // // // // // // // //     res.json(orders);
// // // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Get indents ready for PO creation
// // // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // //   const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // // // // // //   res.json(indents);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Create Purchase Order and update Indent status
// // // // // // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // // // // // // // // // // //         0
// // // // // // // // // // // // // // //       );
      
// // // // // // // // // // // // // // //       const po = await PurchaseOrder.create(
// // // // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // // // //           indentId: req.body.indentId, 
// // // // // // // // // // // // // // //           items: req.body.items || [], 
// // // // // // // // // // // // // // //           totalAmount,
// // // // // // // // // // // // // // //           receivedAt: req.body.receivedAt || new Date()
// // // // // // // // // // // // // // //         }], 
// // // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // // //       );

// // // // // // // // // // // // // // //       await Indent.findByIdAndUpdate(
// // // // // // // // // // // // // // //         req.body.indentId, 
// // // // // // // // // // // // // // //         { status: "stock_received" }, 
// // // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // // //       );
      
// // // // // // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // // // // // // // // // // // // Create Distribution and update Godown Stocks
// // // // // // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // // //       const distribution = await Distribution.create(
// // // // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // // // //           purchaseOrderId: req.body.purchaseOrderId, 
// // // // // // // // // // // // // // //           allocations: req.body.allocations || [], 
// // // // // // // // // // // // // // //           leftovers: req.body.leftovers || [] 
// // // // // // // // // // // // // // //         }], 
// // // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // // //       );

// // // // // // // // // // // // // // //       for (const item of req.body.allocations || []) {
// // // // // // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // // // // // //           { 
// // // // // // // // // // // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // // // // // // // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // // // // // // // // // // //           },
// // // // // // // // // // // // // // //           { upsert: true, new: true, session }
// // // // // // // // // // // // // // //         );
// // // // // // // // // // // // // // //       }
// // // // // // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Get leftover stock from distributions
// // // // // // // // // // // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // //   const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // // // // // // // // // // //   const leftovers = docs.flatMap((d) => 
// // // // // // // // // // // // // // //     d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // // // // // // // // // // // //   );
// // // // // // // // // // // // // // //   res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Get all stocks across all godowns
// // // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // // //   const docs = await GodownStock.find()
// // // // // // // // // // // // // // //     .populate("stockItemId godownId")
// // // // // // // // // // // // // // //     .sort({ updatedAt: -1 });
// // // // // // // // // // // // // // //   res.json(docs);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Get stock for a specific godown
// // // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks/:godownId", async (req, res) => {
// // // // // // // // // // // // // // //   const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // // // // // // // // // // // //     .populate("stockItemId");
// // // // // // // // // // // // // // //   res.json(docs);
// // // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // // Update threshold and trigger notifications if low
// // // // // // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // // // // // //   const stock = await GodownStock.findByIdAndUpdate(
// // // // // // // // // // // // // // //     req.params.id, 
// // // // // // // // // // // // // // //     { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // // // // // // // // // // //     { new: true }
// // // // // // // // // // // // // // //   );
  
// // // // // // // // // // // // // // //   if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // // // // // //     await Notification.create({ 
// // // // // // // // // // // // // // //       type: "threshold", 
// // // // // // // // // // // // // // //       severity: "warning", 
// // // // // // // // // // // // // // //       payload: { 
// // // // // // // // // // // // // // //         godownId: stock.godownId, 
// // // // // // // // // // // // // // //         stockItemId: stock.stockItemId, 
// // // // // // // // // // // // // // //         qty: stock.qtyBaseUnit 
// // // // // // // // // // // // // // //       } 
// // // // // // // // // // // // // // //     });
// // // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // //   res.json(stock);
// // // // // // // // // // // // // // // });






// // // // // // // // // // // // // // import express from "express";
// // // // // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // // // // import { 
// // // // // // // // // // // // // //   Distribution, 
// // // // // // // // // // // // // //   GodownStock, 
// // // // // // // // // // // // // //   Indent, 
// // // // // // // // // // // // // //   Notification, 
// // // // // // // // // // // // // //   PurchaseOrder 
// // // // // // // // // // // // // // } from "../models/FlowModels.js";

// // // // // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // // // // const adminOnly = authorize(["admin"]);

// // // // // // // // // // // // // // // --- INDENT ROUTES ---

// // // // // // // // // // // // // // // Get all indents
// // // // // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Preview specific indent with item details
// // // // // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // // // // //     return res.json(indent);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Create new indent
// // // // // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // // // // // // // // // //       0
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //     const indent = await Indent.create({
// // // // // // // // // // // // // //       indentNo: `IND-${Date.now()}`,
// // // // // // // // // // // // // //       createdBy: req.user.sub,
// // // // // // // // // // // // // //       items: req.body.items || [],
// // // // // // // // // // // // // //       totalAmount
// // // // // // // // // // // // // //     });
// // // // // // // // // // // // // //     res.status(201).json(indent);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Update indent status to purchased
// // // // // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // // // //       { status: "purchased" }, 
// // // // // // // // // // // // // //       { new: true }
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //     res.json(indent);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // // // // // // // // // // // GET All Purchase Orders (Handles frontend split between Pending/Distributed)
// // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const orders = await PurchaseOrder.find()
// // // // // // // // // // // // // //       .populate({
// // // // // // // // // // // // // //         path: 'indentId',
// // // // // // // // // // // // // //         select: 'indentNo createdAt' 
// // // // // // // // // // // // // //       }) 
// // // // // // // // // // // // // //       .sort({ updatedAt: -1 }); 
// // // // // // // // // // // // // //     res.json(orders);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Get indents ready for PO creation
// // // // // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Create Purchase Order and update Indent status
// // // // // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // // // // // // // // // //         0
// // // // // // // // // // // // // //       );
      
// // // // // // // // // // // // // //       const po = await PurchaseOrder.create(
// // // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // // //           indentId: req.body.indentId, 
// // // // // // // // // // // // // //           items: req.body.items || [], 
// // // // // // // // // // // // // //           totalAmount,
// // // // // // // // // // // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // // // // // // // // // // //           status: "pending" // Initial status for distribution queue
// // // // // // // // // // // // // //         }], 
// // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // //       );

// // // // // // // // // // // // // //       await Indent.findByIdAndUpdate(
// // // // // // // // // // // // // //         req.body.indentId, 
// // // // // // // // // // // // // //         { status: "stock_received" }, 
// // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // //       );
      
// // // // // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // // // // //     });
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // // // // // // // // // // // Create Distribution: Updates Godown Stocks, PO Status, and Cleans Leftovers
// // // // // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;

// // // // // // // // // // // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // // // // // // // // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // // //       // 1. Create Distribution Entry
// // // // // // // // // // // // // //       const distribution = await Distribution.create(
// // // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // // //           purchaseOrderId: cleanPOId, 
// // // // // // // // // // // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // // // // // // // // // // //           allocations: allocations || [], 
// // // // // // // // // // // // // //           leftovers: leftovers || [] 
// // // // // // // // // // // // // //         }], 
// // // // // // // // // // // // // //         { session }
// // // // // // // // // // // // // //       );

// // // // // // // // // // // // // //       // 2. Atomic Stock Update (Upsert into Godown)
// // // // // // // // // // // // // //       for (const item of (allocations || [])) {
// // // // // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // // // // //           { 
// // // // // // // // // // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // // // // // // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // // // // // // // // // //           },
// // // // // // // // // // // // // //           { upsert: true, session }
// // // // // // // // // // // // // //         );
// // // // // // // // // // // // // //       }

// // // // // // // // // // // // // //       // 3. Update PO Status to 'distributed' (moves it to the Log tab on frontend)
// // // // // // // // // // // // // //       if (cleanPOId) {
// // // // // // // // // // // // // //         const updatedPO = await PurchaseOrder.findByIdAndUpdate(
// // // // // // // // // // // // // //           cleanPOId,
// // // // // // // // // // // // // //           { $set: { status: "distributed" } },
// // // // // // // // // // // // // //           { session, new: true }
// // // // // // // // // // // // // //         );
// // // // // // // // // // // // // //         if (!updatedPO) throw new Error("Purchase Order not found");
// // // // // // // // // // // // // //       }

// // // // // // // // // // // // // //       // 4. Clean up source leftovers if this was a redistribution
// // // // // // // // // // // // // //       if (cleanLeftoverId) {
// // // // // // // // // // // // // //         await Distribution.findOneAndUpdate(
// // // // // // // // // // // // // //           { _id: cleanLeftoverId },
// // // // // // // // // // // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // // // // // // // // // // //           { session }
// // // // // // // // // // // // // //         );
// // // // // // // // // // // // // //       }

// // // // // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // // // // //     });
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Get active leftover stock
// // // // // // // // // // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // // // // // // // // // //     const leftovers = docs.flatMap((d) => 
// // // // // // // // // // // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // // // // // // // // // // //     );
// // // // // // // // // // // // // //     // Filter to only show items that haven't been redistributed yet
// // // // // // // // // // // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Get all stocks across all godowns
// // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const docs = await GodownStock.find()
// // // // // // // // // // // // // //       .populate("stockItemId godownId")
// // // // // // // // // // // // // //       .sort({ updatedAt: -1 });
// // // // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Get stock for a specific godown
// // // // // // // // // // // // // // procurementRoutes.get("/godown-stocks/:godownId", async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // // // // // // // // // // //       .populate("stockItemId");
// // // // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });

// // // // // // // // // // // // // // // Update threshold and trigger notifications if low
// // // // // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // // // // // // // // // //       { new: true }
// // // // // // // // // // // // // //     );
    
// // // // // // // // // // // // // //     if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // // // // //       await Notification.create({ 
// // // // // // // // // // // // // //         type: "threshold", 
// // // // // // // // // // // // // //         severity: "warning", 
// // // // // // // // // // // // // //         payload: { 
// // // // // // // // // // // // // //           godownId: stock.godownId, 
// // // // // // // // // // // // // //           stockItemId: stock.stockItemId, 
// // // // // // // // // // // // // //           qty: stock.qtyBaseUnit 
// // // // // // // // // // // // // //         } 
// // // // // // // // // // // // // //       });
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //     res.json(stock);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });



// // // // // // // // // // // // // // // GET Specific Distribution by Purchase Order ID
// // // // // // // // // // // // // // procurementRoutes.get("/distributions/po/:poId", adminOnly, async (req, res) => {
// // // // // // // // // // // // // //   try {
// // // // // // // // // // // // // //     const distribution = await Distribution.findOne({ purchaseOrderId: req.params.poId })
// // // // // // // // // // // // // //       .populate("allocations.stockItemId")
// // // // // // // // // // // // // //       .populate("allocations.godownId");

// // // // // // // // // // // // // //     if (!distribution) {
// // // // // // // // // // // // // //       return res.status(404).json({ message: "Distribution record not found" });
// // // // // // // // // // // // // //     }
// // // // // // // // // // // // // //     res.json(distribution);
// // // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // // //   }
// // // // // // // // // // // // // // });





// // // // // // // // // // // // // import express from "express";
// // // // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // // // import { 
// // // // // // // // // // // // //   Distribution, 
// // // // // // // // // // // // //   GodownStock, 
// // // // // // // // // // // // //   Indent, 
// // // // // // // // // // // // //   Notification, 
// // // // // // // // // // // // //   PurchaseOrder 
// // // // // // // // // // // // // } from "../models/FlowModels.js";

// // // // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // // // const adminOnly = authorize(["admin"]);
// // // // // // // // // // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // // // // // // // // // --- NEW: CLIENT-WEB SPECIFIC ROUTE ---
// // // // // // // // // // // // // /// backend/src/routes/procurementRoutes.js
// // // // // // // // // // // // // procurementRoutes.get("/my-stock", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const userGodownId = req.user.godownId; // This MUST be in your JWT payload
// // // // // // // // // // // // //     if (!userGodownId) {
// // // // // // // // // // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // // // // // // // // // //     }

// // // // // // // // // // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // // // // // // // // // //       .populate("stockItemId");
// // // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // // --- INDENT ROUTES ---

// // // // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // // // //     return res.json(indent);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // // // // // // // // //       0
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //     const indent = await Indent.create({
// // // // // // // // // // // // //       indentNo: `IND-${Date.now()}`,
// // // // // // // // // // // // //       createdBy: req.user.sub,
// // // // // // // // // // // // //       items: req.body.items || [],
// // // // // // // // // // // // //       totalAmount
// // // // // // // // // // // // //     });
// // // // // // // // // // // // //     res.status(201).json(indent);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // // //       { status: "purchased" }, 
// // // // // // // // // // // // //       { new: true }
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //     res.json(indent);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const orders = await PurchaseOrder.find()
// // // // // // // // // // // // //       .populate({
// // // // // // // // // // // // //         path: 'indentId',
// // // // // // // // // // // // //         select: 'indentNo createdAt' 
// // // // // // // // // // // // //       }) 
// // // // // // // // // // // // //       .sort({ updatedAt: -1 }); 
// // // // // // // // // // // // //     res.json(orders);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // // // // // // // // //         0
// // // // // // // // // // // // //       );
      
// // // // // // // // // // // // //       const po = await PurchaseOrder.create(
// // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // //           indentId: req.body.indentId, 
// // // // // // // // // // // // //           items: req.body.items || [], 
// // // // // // // // // // // // //           totalAmount,
// // // // // // // // // // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // // // // // // // // // //           status: "pending" 
// // // // // // // // // // // // //         }], 
// // // // // // // // // // // // //         { session }
// // // // // // // // // // // // //       );

// // // // // // // // // // // // //       await Indent.findByIdAndUpdate(
// // // // // // // // // // // // //         req.body.indentId, 
// // // // // // // // // // // // //         { status: "stock_received" }, 
// // // // // // // // // // // // //         { session }
// // // // // // // // // // // // //       );
      
// // // // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // // // //     });
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;

// // // // // // // // // // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // // // // // // // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // // //       const distribution = await Distribution.create(
// // // // // // // // // // // // //         [{ 
// // // // // // // // // // // // //           purchaseOrderId: cleanPOId, 
// // // // // // // // // // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // // // // // // // // // //           allocations: allocations || [], 
// // // // // // // // // // // // //           leftovers: leftovers || [] 
// // // // // // // // // // // // //         }], 
// // // // // // // // // // // // //         { session }
// // // // // // // // // // // // //       );

// // // // // // // // // // // // //       for (const item of (allocations || [])) {
// // // // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // // // //           { 
// // // // // // // // // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // // // // // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // // // // // // // // //           },
// // // // // // // // // // // // //           { upsert: true, session }
// // // // // // // // // // // // //         );
// // // // // // // // // // // // //       }

// // // // // // // // // // // // //       if (cleanPOId) {
// // // // // // // // // // // // //         await PurchaseOrder.findByIdAndUpdate(
// // // // // // // // // // // // //           cleanPOId,
// // // // // // // // // // // // //           { $set: { status: "distributed" } },
// // // // // // // // // // // // //           { session, new: true }
// // // // // // // // // // // // //         );
// // // // // // // // // // // // //       }

// // // // // // // // // // // // //       if (cleanLeftoverId) {
// // // // // // // // // // // // //         await Distribution.findOneAndUpdate(
// // // // // // // // // // // // //           { _id: cleanLeftoverId },
// // // // // // // // // // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // // // // // // // // // //           { session }
// // // // // // // // // // // // //         );
// // // // // // // // // // // // //       }

// // // // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // // // //     });
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // // // // // // // // //   } finally {
// // // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // // // // // // // // //     const leftovers = docs.flatMap((d) => 
// // // // // // // // // // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // // // // // // // // // //     );
// // // // // // // // // // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const docs = await GodownStock.find()
// // // // // // // // // // // // //       .populate("stockItemId godownId")
// // // // // // // // // // // // //       .sort({ updatedAt: -1 });
// // // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // // Admin manual check for specific godown
// // // // // // // // // // // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // // // // // // // // // //       .populate("stockItemId");
// // // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // // // // // // // // //       { new: true }
// // // // // // // // // // // // //     );
    
// // // // // // // // // // // // //     if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // // // //       await Notification.create({ 
// // // // // // // // // // // // //         type: "threshold", 
// // // // // // // // // // // // //         severity: "warning", 
// // // // // // // // // // // // //         payload: { 
// // // // // // // // // // // // //           godownId: stock.godownId, 
// // // // // // // // // // // // //           stockItemId: stock.stockItemId, 
// // // // // // // // // // // // //           qty: stock.qtyBaseUnit 
// // // // // // // // // // // // //         } 
// // // // // // // // // // // // //       });
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //     res.json(stock);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });

// // // // // // // // // // // // // procurementRoutes.get("/distributions/po/:poId", adminOnly, async (req, res) => {
// // // // // // // // // // // // //   try {
// // // // // // // // // // // // //     const distribution = await Distribution.findOne({ purchaseOrderId: req.params.poId })
// // // // // // // // // // // // //       .populate("allocations.stockItemId")
// // // // // // // // // // // // //       .populate("allocations.godownId");

// // // // // // // // // // // // //     if (!distribution) {
// // // // // // // // // // // // //       return res.status(404).json({ message: "Distribution record not found" });
// // // // // // // // // // // // //     }
// // // // // // // // // // // // //     res.json(distribution);
// // // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // // //   }
// // // // // // // // // // // // // });



// // // // // // // // // // // import express from "express";
// // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // import { 
// // // // // // // // // // //   Distribution, 
// // // // // // // // // // //   GodownStock, 
// // // // // // // // // // //   Indent, 
// // // // // // // // // // //   Notification, 
// // // // // // // // // // //   PurchaseOrder 
// // // // // // // // // // // } from "../models/FlowModels.js";

// // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // const adminOnly = authorize(["admin"]);
// // // // // // // // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // // // // // // // --- UPDATED: CLIENT-WEB SPECIFIC ROUTE WITH NESTED POPULATION ---
// // // // // // // // // // // procurementRoutes.get("/my-stock", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const userGodownId = req.user.godownId; 
// // // // // // // // // // //     if (!userGodownId) {
// // // // // // // // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // // // // // // // //     }

// // // // // // // // // // //     // Fixed: Added nested populate to reach the unitId symbol
// // // // // // // // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // // // // // // // //       .populate({
// // // // // // // // // // //         path: "stockItemId",
// // // // // // // // // // //         populate: {
// // // // // // // // // // //           path: "unitId",
// // // // // // // // // // //           select: "symbol"
// // // // // // // // // // //         }
// // // // // // // // // // //       });
      
// // // // // // // // // // //     res.json(docs);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // // --- INDENT ROUTES ---

// // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // // // // // // // //     res.json(indents);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // //     return res.json(indent);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // // // // // // //       0
// // // // // // // // // // //     );
// // // // // // // // // // //     const indent = await Indent.create({
// // // // // // // // // // //       indentNo: `IND-${Date.now()}`,
// // // // // // // // // // //       createdBy: req.user.sub,
// // // // // // // // // // //       items: req.body.items || [],
// // // // // // // // // // //       totalAmount
// // // // // // // // // // //     });
// // // // // // // // // // //     res.status(201).json(indent);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // // // // // // // //       req.params.id, 
// // // // // // // // // // //       { status: "purchased" }, 
// // // // // // // // // // //       { new: true }
// // // // // // // // // // //     );
// // // // // // // // // // //     res.json(indent);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const orders = await PurchaseOrder.find()
// // // // // // // // // // //       .populate({
// // // // // // // // // // //         path: 'indentId',
// // // // // // // // // // //         select: 'indentNo createdAt' 
// // // // // // // // // // //       }) 
// // // // // // // // // // //       .sort({ updatedAt: -1 }); 
// // // // // // // // // // //     res.json(orders);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // //     res.json(indents);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // //   try {
// // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // // // // // // //         0
// // // // // // // // // // //       );
      
// // // // // // // // // // //       const po = await PurchaseOrder.create(
// // // // // // // // // // //         [{ 
// // // // // // // // // // //           indentId: req.body.indentId, 
// // // // // // // // // // //           items: req.body.items || [], 
// // // // // // // // // // //           totalAmount,
// // // // // // // // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // // // // // // // //           status: "pending" 
// // // // // // // // // // //         }], 
// // // // // // // // // // //         { session }
// // // // // // // // // // //       );

// // // // // // // // // // //       await Indent.findByIdAndUpdate(
// // // // // // // // // // //         req.body.indentId, 
// // // // // // // // // // //         { status: "stock_received" }, 
// // // // // // // // // // //         { session }
// // // // // // // // // // //       );
      
// // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // //     });
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // // // // // // //   } finally {
// // // // // // // // // // //     await session.endSession();
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;

// // // // // // // // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // // // // // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // // // // // // // //   try {
// // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // //       const distribution = await Distribution.create(
// // // // // // // // // // //         [{ 
// // // // // // // // // // //           purchaseOrderId: cleanPOId, 
// // // // // // // // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // // // // // // // //           allocations: allocations || [], 
// // // // // // // // // // //           leftovers: leftovers || [] 
// // // // // // // // // // //         }], 
// // // // // // // // // // //         { session }
// // // // // // // // // // //       );

// // // // // // // // // // //       for (const item of (allocations || [])) {
// // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // //           { 
// // // // // // // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // // // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // // // // // // //           },
// // // // // // // // // // //           { upsert: true, session }
// // // // // // // // // // //         );
// // // // // // // // // // //       }

// // // // // // // // // // //       if (cleanPOId) {
// // // // // // // // // // //         await PurchaseOrder.findByIdAndUpdate(
// // // // // // // // // // //           cleanPOId,
// // // // // // // // // // //           { $set: { status: "distributed" } },
// // // // // // // // // // //           { session, new: true }
// // // // // // // // // // //         );
// // // // // // // // // // //       }

// // // // // // // // // // //       if (cleanLeftoverId) {
// // // // // // // // // // //         await Distribution.findOneAndUpdate(
// // // // // // // // // // //           { _id: cleanLeftoverId },
// // // // // // // // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // // // // // // // //           { session }
// // // // // // // // // // //         );
// // // // // // // // // // //       }

// // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // //     });
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // // // // // // //   } finally {
// // // // // // // // // // //     await session.endSession();
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // // // // // // //     const leftovers = docs.flatMap((d) => 
// // // // // // // // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // // // // // // // //     );
// // // // // // // // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const docs = await GodownStock.find()
// // // // // // // // // // //       .populate({
// // // // // // // // // // //         path: "stockItemId",
// // // // // // // // // // //         populate: { path: "unitId", select: "symbol" }
// // // // // // // // // // //       })
// // // // // // // // // // //       .populate("godownId")
// // // // // // // // // // //       .sort({ updatedAt: -1 });
// // // // // // // // // // //     res.json(docs);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // // // // // // // //       .populate({
// // // // // // // // // // //         path: "stockItemId",
// // // // // // // // // // //         populate: { path: "unitId", select: "symbol" }
// // // // // // // // // // //       });
// // // // // // // // // // //     res.json(docs);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // // // // // // // //       req.params.id, 
// // // // // // // // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // // // // // // //       { new: true }
// // // // // // // // // // //     );
    
// // // // // // // // // // //     if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // //       await Notification.create({ 
// // // // // // // // // // //         type: "threshold", 
// // // // // // // // // // //         severity: "warning", 
// // // // // // // // // // //         payload: { 
// // // // // // // // // // //           godownId: stock.godownId, 
// // // // // // // // // // //           stockItemId: stock.stockItemId, 
// // // // // // // // // // //           qty: stock.qtyBaseUnit 
// // // // // // // // // // //         } 
// // // // // // // // // // //       });
// // // // // // // // // // //     }
// // // // // // // // // // //     res.json(stock);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });

// // // // // // // // // // // procurementRoutes.get("/distributions/po/:poId", adminOnly, async (req, res) => {
// // // // // // // // // // //   try {
// // // // // // // // // // //     const distribution = await Distribution.findOne({ purchaseOrderId: req.params.poId })
// // // // // // // // // // //       .populate("allocations.stockItemId")
// // // // // // // // // // //       .populate("allocations.godownId");

// // // // // // // // // // //     if (!distribution) {
// // // // // // // // // // //       return res.status(404).json({ message: "Distribution record not found" });
// // // // // // // // // // //     }
// // // // // // // // // // //     res.json(distribution);
// // // // // // // // // // //   } catch (error) {
// // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // //   }
// // // // // // // // // // // });





// // // // // // // // // // // // // 03-04-2026









// // // // // // // // // // // // import express from "express";
// // // // // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // // // // import { 
// // // // // // // // // // // //   Distribution, 
// // // // // // // // // // // //   GodownStock, 
// // // // // // // // // // // //   Indent, 
// // // // // // // // // // // //   Notification, 
// // // // // // // // // // // //   PurchaseOrder,
// // // // // // // // // // // //   Consumption 
// // // // // // // // // // // // } from "../models/FlowModels.js";

// // // // // // // // // // // // export const procurementRoutes = express.Router();
// // // // // // // // // // // // const adminOnly = authorize(["admin"]);
// // // // // // // // // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // // // // // // // // ==========================================
// // // // // // // // // // // // // 1. CLIENT & USER STOCK ROUTES
// // // // // // // // // // // // // ==========================================

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Fetch stock specific to the logged-in user's assigned Godown
// // // // // // // // // // // //  */
// // // // // // // // // // // // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const userGodownId = req.user.godownId; 
// // // // // // // // // // // //     if (!userGodownId) {
// // // // // // // // // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // // // // // // // // //     }

// // // // // // // // // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // // // // // // // // //       .populate({
// // // // // // // // // // // //         path: "stockItemId",
// // // // // // // // // // // //         populate: {
// // // // // // // // // // // //           path: "unitId",
// // // // // // // // // // // //           select: "symbol"
// // // // // // // // // // // //         }
// // // // // // // // // // // //       });
      
// // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // // ==========================================
// // // // // // // // // // // // // 2. CONSUMPTION & ORDERING (The "Submit Order" Logic)
// // // // // // // // // // // // // ==========================================

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Handle Direct Consumption (Deducting stock from User's Godown)
// // // // // // // // // // // //  */
// // // // // // // // // // // // procurementRoutes.post("/consumptions", anyUser, async (req, res) => {
// // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // //       const { items, reason } = req.body;
// // // // // // // // // // // //       const userGodownId = req.user.godownId;

// // // // // // // // // // // //       if (!userGodownId) throw new Error("Unauthorized: No Godown assigned.");

// // // // // // // // // // // //       const consumptionItems = [];

// // // // // // // // // // // //       for (const item of items) {
// // // // // // // // // // // //         // Find and decrement the specific godown stock
// // // // // // // // // // // //         const stock = await GodownStock.findOneAndUpdate(
// // // // // // // // // // // //           { _id: item.stockRecordId, godownId: userGodownId },
// // // // // // // // // // // //           { $inc: { qtyBaseUnit: -Number(item.qtyBaseUnit) } },
// // // // // // // // // // // //           { session, new: true }
// // // // // // // // // // // //         );

// // // // // // // // // // // //         if (!stock || stock.qtyBaseUnit < 0) {
// // // // // // // // // // // //           throw new Error(`Insufficient stock for item: ${item.stockRecordId}`);
// // // // // // // // // // // //         }

// // // // // // // // // // // //         consumptionItems.push({
// // // // // // // // // // // //           stockItemId: item.stockItemId,
// // // // // // // // // // // //           stockRecordId: item.stockRecordId,
// // // // // // // // // // // //           qtyBaseUnit: Number(item.qtyBaseUnit)
// // // // // // // // // // // //         });
// // // // // // // // // // // //       }

// // // // // // // // // // // //       // Record the transaction in history
// // // // // // // // // // // //       const record = await Consumption.create([{
// // // // // // // // // // // //         userId: req.user.sub,
// // // // // // // // // // // //         godownId: userGodownId,
// // // // // // // // // // // //         items: consumptionItems,
// // // // // // // // // // // //         reason: reason || "Direct Consumption"
// // // // // // // // // // // //       }], { session });

// // // // // // // // // // // //       res.status(201).json(record[0]);
// // // // // // // // // // // //     });
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(400).json({ message: error.message });
// // // // // // // // // // // //   } finally {
// // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // /**
// // // // // // // // // // // //  * Fetch History for the logged-in user
// // // // // // // // // // // //  */
// // // // // // // // // // // // procurementRoutes.get("/consumptions/me", anyUser, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const docs = await Consumption.find({ userId: req.user.sub })
// // // // // // // // // // // //       .populate("items.stockItemId")
// // // // // // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // // ==========================================
// // // // // // // // // // // // // 3. INDENT ROUTES (Admin Only)
// // // // // // // // // // // // // ==========================================

// // // // // // // // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // // // // // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // // // // // // // //     return res.json(indent);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // // // // // // // //       0
// // // // // // // // // // // //     );
// // // // // // // // // // // //     const indent = await Indent.create({
// // // // // // // // // // // //       indentNo: `IND-${Date.now()}`,
// // // // // // // // // // // //       createdBy: req.user.sub,
// // // // // // // // // // // //       items: req.body.items || [],
// // // // // // // // // // // //       totalAmount
// // // // // // // // // // // //     });
// // // // // // // // // // // //     res.status(201).json(indent);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // //       { status: "purchased" }, 
// // // // // // // // // // // //       { new: true }
// // // // // // // // // // // //     );
// // // // // // // // // // // //     res.json(indent);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // // ==========================================
// // // // // // // // // // // // // 4. PURCHASE ORDER ROUTES (Admin Only)
// // // // // // // // // // // // // ==========================================

// // // // // // // // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const orders = await PurchaseOrder.find()
// // // // // // // // // // // //       .populate({
// // // // // // // // // // // //         path: 'indentId',
// // // // // // // // // // // //         select: 'indentNo createdAt' 
// // // // // // // // // // // //       }) 
// // // // // // // // // // // //       .sort({ updatedAt: -1 }); 
// // // // // // // // // // // //     res.json(orders);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // // // // // // // // //     res.json(indents);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // // // // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // // // // // // // //         0
// // // // // // // // // // // //       );
      
// // // // // // // // // // // //       const po = await PurchaseOrder.create(
// // // // // // // // // // // //         [{ 
// // // // // // // // // // // //           indentId: req.body.indentId, 
// // // // // // // // // // // //           items: req.body.items || [], 
// // // // // // // // // // // //           totalAmount,
// // // // // // // // // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // // // // // // // // //           status: "pending" 
// // // // // // // // // // // //         }], 
// // // // // // // // // // // //         { session }
// // // // // // // // // // // //       );

// // // // // // // // // // // //       await Indent.findByIdAndUpdate(
// // // // // // // // // // // //         req.body.indentId, 
// // // // // // // // // // // //         { status: "stock_received" }, 
// // // // // // // // // // // //         { session }
// // // // // // // // // // // //       );
      
// // // // // // // // // // // //       res.status(201).json(po[0]);
// // // // // // // // // // // //     });
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // // // // // // // //   } finally {
// // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // // ==========================================
// // // // // // // // // // // // // 5. DISTRIBUTION & STOCK MANAGEMENT
// // // // // // // // // // // // // ==========================================

// // // // // // // // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;

// // // // // // // // // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // // // // // // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // // // // // // // // //   try {
// // // // // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // // // // //       const distribution = await Distribution.create(
// // // // // // // // // // // //         [{ 
// // // // // // // // // // // //           purchaseOrderId: cleanPOId, 
// // // // // // // // // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // // // // // // // // //           allocations: allocations || [], 
// // // // // // // // // // // //           leftovers: leftovers || [] 
// // // // // // // // // // // //         }], 
// // // // // // // // // // // //         { session }
// // // // // // // // // // // //       );

// // // // // // // // // // // //       for (const item of (allocations || [])) {
// // // // // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // // // // // // // //           { 
// // // // // // // // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // // // // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // // // // // // // //           },
// // // // // // // // // // // //           { upsert: true, session }
// // // // // // // // // // // //         );
// // // // // // // // // // // //       }

// // // // // // // // // // // //       if (cleanPOId) {
// // // // // // // // // // // //         await PurchaseOrder.findByIdAndUpdate(
// // // // // // // // // // // //           cleanPOId,
// // // // // // // // // // // //           { $set: { status: "distributed" } },
// // // // // // // // // // // //           { session, new: true }
// // // // // // // // // // // //         );
// // // // // // // // // // // //       }

// // // // // // // // // // // //       if (cleanLeftoverId) {
// // // // // // // // // // // //         await Distribution.findOneAndUpdate(
// // // // // // // // // // // //           { _id: cleanLeftoverId },
// // // // // // // // // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // // // // // // // // //           { session }
// // // // // // // // // // // //         );
// // // // // // // // // // // //       }

// // // // // // // // // // // //       res.status(201).json(distribution[0]);
// // // // // // // // // // // //     });
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // // // // // // // //   } finally {
// // // // // // // // // // // //     await session.endSession();
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const docs = await GodownStock.find()
// // // // // // // // // // // //       .populate({
// // // // // // // // // // // //         path: "stockItemId",
// // // // // // // // // // // //         populate: { path: "unitId", select: "symbol" }
// // // // // // // // // // // //       })
// // // // // // // // // // // //       .populate("godownId")
// // // // // // // // // // // //       .sort({ updatedAt: -1 });
// // // // // // // // // // // //     res.json(docs);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // // // // // // // // //       req.params.id, 
// // // // // // // // // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // // // // // // // //       { new: true }
// // // // // // // // // // // //     );
    
// // // // // // // // // // // //     if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // // // // // // // // //       await Notification.create({ 
// // // // // // // // // // // //         type: "threshold", 
// // // // // // // // // // // //         severity: "warning", 
// // // // // // // // // // // //         payload: { 
// // // // // // // // // // // //           godownId: stock.godownId, 
// // // // // // // // // // // //           stockItemId: stock.stockItemId, 
// // // // // // // // // // // //           qty: stock.qtyBaseUnit 
// // // // // // // // // // // //         } 
// // // // // // // // // // // //       });
// // // // // // // // // // // //     }
// // // // // // // // // // // //     res.json(stock);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });

// // // // // // // // // // // // procurementRoutes.get("/distributions/po/:poId", adminOnly, async (req, res) => {
// // // // // // // // // // // //   try {
// // // // // // // // // // // //     const distribution = await Distribution.findOne({ purchaseOrderId: req.params.poId })
// // // // // // // // // // // //       .populate("allocations.stockItemId")
// // // // // // // // // // // //       .populate("allocations.godownId");

// // // // // // // // // // // //     if (!distribution) {
// // // // // // // // // // // //       return res.status(404).json({ message: "Distribution record not found" });
// // // // // // // // // // // //     }
// // // // // // // // // // // //     res.json(distribution);
// // // // // // // // // // // //   } catch (error) {
// // // // // // // // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // // // // // // // //   }
// // // // // // // // // // // // });






// // // // // // // // // // // wowowo







// // // // // import express from "express";
// // // // // import mongoose from "mongoose";
// // // // // import { authorize } from "../middleware/auth.js";
// // // // // import { 
// // // // //   Distribution, 
// // // // //   GodownStock, 
// // // // //   Indent, 
// // // // //   Notification, 
// // // // //   PurchaseOrder 
// // // // // } from "../models/FlowModels.js";

// // // // // export const procurementRoutes = express.Router();
// // // // // const adminOnly = authorize(["admin"]);
// // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // --- UPDATED: CLIENT-WEB SPECIFIC ROUTE WITH NESTED POPULATION ---
// // // // // procurementRoutes.get("/my-stock", authorize(["admin", "user"]), async (req, res) => {
// // // // //   try {
// // // // //     const userGodownId = req.user.godownId; 
// // // // //     if (!userGodownId) {
// // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // //     }

// // // // //     // Fixed: Added nested populate to reach the unitId symbol
// // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: {
// // // // //           path: "unitId",
// // // // //           select: "symbol"
// // // // //         }
// // // // //       });
      
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- INDENT ROUTES ---

// // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // //     res.json(indents);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // //     return res.json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // //       0
// // // // //     );
// // // // //     const indent = await Indent.create({
// // // // //       indentNo: `IND-${Date.now()}`,
// // // // //       createdBy: req.user.sub,
// // // // //       items: req.body.items || [],
// // // // //       totalAmount
// // // // //     });
// // // // //     res.status(201).json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // //       req.params.id, 
// // // // //       { status: "purchased" }, 
// // // // //       { new: true }
// // // // //     );
// // // // //     res.json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const orders = await PurchaseOrder.find()
// // // // //       .populate({
// // // // //         path: 'indentId',
// // // // //         select: 'indentNo createdAt' 
// // // // //       }) 
// // // // //       .sort({ updatedAt: -1 }); 
// // // // //     res.json(orders);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
// // // // //     res.json(indents);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // //         0
// // // // //       );
      
// // // // //       const po = await PurchaseOrder.create(
// // // // //         [{ 
// // // // //           indentId: req.body.indentId, 
// // // // //           items: req.body.items || [], 
// // // // //           totalAmount,
// // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // //           status: "pending" 
// // // // //         }], 
// // // // //         { session }
// // // // //       );

// // // // //       await Indent.findByIdAndUpdate(
// // // // //         req.body.indentId, 
// // // // //         { status: "stock_received" }, 
// // // // //         { session }
// // // // //       );
      
// // // // //       res.status(201).json(po[0]);
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;

// // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const distribution = await Distribution.create(
// // // // //         [{ 
// // // // //           purchaseOrderId: cleanPOId, 
// // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // //           allocations: allocations || [], 
// // // // //           leftovers: leftovers || [] 
// // // // //         }], 
// // // // //         { session }
// // // // //       );

// // // // //       for (const item of (allocations || [])) {
// // // // //         await GodownStock.findOneAndUpdate(
// // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // //           { 
// // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // //           },
// // // // //           { upsert: true, session }
// // // // //         );
// // // // //       }

// // // // //       if (cleanPOId) {
// // // // //         await PurchaseOrder.findByIdAndUpdate(
// // // // //           cleanPOId,
// // // // //           { $set: { status: "distributed" } },
// // // // //           { session, new: true }
// // // // //         );
// // // // //       }

// // // // //       if (cleanLeftoverId) {
// // // // //         await Distribution.findOneAndUpdate(
// // // // //           { _id: cleanLeftoverId },
// // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // //           { session }
// // // // //         );
// // // // //       }

// // // // //       res.status(201).json(distribution[0]);
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // //     const leftovers = docs.flatMap((d) => 
// // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // //     );
// // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const docs = await GodownStock.find()
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: { path: "unitId", select: "symbol" }
// // // // //       })
// // // // //       .populate("godownId")
// // // // //       .sort({ updatedAt: -1 });
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: { path: "unitId", select: "symbol" }
// // // // //       });
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // //       req.params.id, 
// // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // //       { new: true }
// // // // //     );
    
// // // // //     if (stock.qtyBaseUnit <= stock.thresholdBaseUnit) {
// // // // //       await Notification.create({ 
// // // // //         type: "threshold", 
// // // // //         severity: "warning", 
// // // // //         payload: { 
// // // // //           godownId: stock.godownId, 
// // // // //           stockItemId: stock.stockItemId, 
// // // // //           qty: stock.qtyBaseUnit 
// // // // //         } 
// // // // //       });
// // // // //     }
// // // // //     res.json(stock);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/distributions/po/:poId", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const distribution = await Distribution.findOne({ purchaseOrderId: req.params.poId })
// // // // //       .populate("allocations.stockItemId")
// // // // //       .populate("allocations.godownId");

// // // // //     if (!distribution) {
// // // // //       return res.status(404).json({ message: "Distribution record not found" });
// // // // //     }
// // // // //     res.json(distribution);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });


// // // // // // --- LOG DETAILS ROUTE ---

// // // // // /**
// // // // //  * @route   GET /api/procurement/distributions/:id/details
// // // // //  * @desc    Fetches the full allocation list for a specific distribution log
// // // // //  * to display in the right-side preview panel.
// // // // //  */
// // // // // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const distribution = await Distribution.findById(req.params.id)
// // // // //       .populate({
// // // // //         path: "allocations.stockItemId",
// // // // //         select: "name itemName", // Populates the item name
// // // // //       })
// // // // //       .populate({
// // // // //         path: "allocations.godownId",
// // // // //         select: "name godownName location", // Populates the destination name
// // // // //       });

// // // // //     if (!distribution) {
// // // // //       return res.status(404).json({ message: "Distribution log not found" });
// // // // //     }

// // // // //     // Map the data to a clean format for your frontend table
// // // // //     const formattedLogs = distribution.allocations.map((item) => ({
// // // // //       itemId: item.stockItemId?._id,
// // // // //       itemName: item.stockItemId?.name || item.stockItemId?.itemName || "Unknown Item",
// // // // //       destination: item.godownId?.name || item.godownId?.godownName || "Direct Delivery",
// // // // //       quantity: item.qtyBaseUnit,
// // // // //     }));

// // // // //     res.json({
// // // // //       distributionId: distribution._id,
// // // // //       finalizedDate: distribution.createdAt,
// // // // //       logs: formattedLogs
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Failed to fetch log details", error: error.message });
// // // // //   }
// // // // // });



// // // // // // Fetch all completed distribution logs for the sidebar
// // // // // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const logs = await Distribution.find()
// // // // //       .populate({
// // // // //         path: "purchaseOrderId",
// // // // //         populate: { path: "indentId", select: "indentNo" }
// // // // //       })
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(logs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// // // // //   }
// // // // // });


// // // // // // --- DELETE STOCK ITEM ---
// // // // // /**
// // // // //  * @route   DELETE /api/procurement/godown-stocks/:id
// // // // //  * @desc    Removes a specific stock record from a godown
// // // // //  */
// // // // // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);

// // // // //     if (!deletedStock) {
// // // // //       return res.status(404).json({ message: "Stock item not found" });
// // // // //     }

// // // // //     res.json({ message: "Stock item removed successfully", id: req.params.id });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Delete failed", error: error.message });
// // // // //   }
// // // // // });













// // // // // // // // // // 8-4-2026
















// // // // // // import express from "express";
// // // // // // import mongoose from "mongoose";
// // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // import { 
// // // // // //   Distribution, 
// // // // // //   GodownStock, 
// // // // // //   Indent, 
// // // // // //   Notification, 
// // // // // //   PurchaseOrder 
// // // // // // } from "../models/FlowModels.js";

// // // // // // export const procurementRoutes = express.Router();
// // // // // // const adminOnly = authorize(["admin"]);
// // // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // // --- STOCK UTILITY & VALIDATION ROUTES ---

// // // // // // /**
// // // // // //  * @route   GET /api/procurement/stock-balance
// // // // // //  * @desc    Checks how much of a specific item is available in a specific godown.
// // // // // //  * Crucial for the Transfer Stock page to prevent over-transferring.
// // // // // //  */
// // // // // // procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
// // // // // //   try {
// // // // // //     const { godownId, stockItemId } = req.query;
    
// // // // // //     if (!godownId || !stockItemId) {
// // // // // //       return res.status(400).json({ message: "Missing godownId or stockItemId" });
// // // // // //     }

// // // // // //     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
// // // // // //     res.json({ 
// // // // // //       availableQty: stock ? stock.qtyBaseUnit : 0 
// // // // // //     });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Balance check failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // Fetch user-specific godown stock (Client Web)
// // // // // // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// // // // // //   try {
// // // // // //     const userGodownId = req.user.godownId; 
// // // // // //     if (!userGodownId) {
// // // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // // //     }

// // // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // // //       .populate({
// // // // // //         path: "stockItemId",
// // // // // //         populate: {
// // // // // //           path: "unitId",
// // // // // //           select: "symbol"
// // // // // //         }
// // // // // //       });
      
// // // // // //     res.json(docs);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- INDENT ROUTES ---

// // // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // // //   try {
// // // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // // //     res.json(indents);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // // //     return res.json(indent);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // // //       0
// // // // // //     );
// // // // // //     const indent = await Indent.create({
// // // // // //       indentNo: `IND-${Date.now()}`,
// // // // // //       createdBy: req.user.sub,
// // // // // //       items: req.body.items || [],
// // // // // //       totalAmount
// // // // // //     });
// // // // // //     res.status(201).json(indent);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // // //       req.params.id, 
// // // // // //       { status: "purchased" }, 
// // // // // //       { new: true }
// // // // // //     );
// // // // // //     res.json(indent);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // // //   try {
// // // // // //     const orders = await PurchaseOrder.find()
// // // // // //       .populate({
// // // // // //         path: 'indentId',
// // // // // //         select: 'indentNo createdAt' 
// // // // // //       }) 
// // // // // //       .sort({ updatedAt: -1 }); 
// // // // // //     res.json(orders);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // // //   const session = await mongoose.startSession();
// // // // // //   try {
// // // // // //     await session.withTransaction(async () => {
// // // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // // //         0
// // // // // //       );
      
// // // // // //       const po = await PurchaseOrder.create(
// // // // // //         [{ 
// // // // // //           indentId: req.body.indentId, 
// // // // // //           items: req.body.items || [], 
// // // // // //           totalAmount,
// // // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // // //           status: "pending" 
// // // // // //         }], 
// // // // // //         { session }
// // // // // //       );

// // // // // //       await Indent.findByIdAndUpdate(
// // // // // //         req.body.indentId, 
// // // // // //         { status: "stock_received" }, 
// // // // // //         { session }
// // // // // //       );
      
// // // // // //       res.status(201).json(po[0]);
// // // // // //     });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // // //   } finally {
// // // // // //     await session.endSession();
// // // // // //   }
// // // // // // });

// // // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // // //   const session = await mongoose.startSession();
// // // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
// // // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // // //   try {
// // // // // //     await session.withTransaction(async () => {
// // // // // //       const distribution = await Distribution.create(
// // // // // //         [{ 
// // // // // //           purchaseOrderId: cleanPOId, 
// // // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // // //           allocations: allocations || [], 
// // // // // //           leftovers: leftovers || [] 
// // // // // //         }], 
// // // // // //         { session }
// // // // // //       );

// // // // // //       for (const item of (allocations || [])) {
// // // // // //         await GodownStock.findOneAndUpdate(
// // // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // // //           { 
// // // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // // //           },
// // // // // //           { upsert: true, session }
// // // // // //         );
// // // // // //       }

// // // // // //       if (cleanPOId) {
// // // // // //         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
// // // // // //       }

// // // // // //       if (cleanLeftoverId) {
// // // // // //         await Distribution.findOneAndUpdate(
// // // // // //           { _id: cleanLeftoverId },
// // // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // // //           { session }
// // // // // //         );
// // // // // //       }

// // // // // //       res.status(201).json(distribution[0]);
// // // // // //     });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // // //   } finally {
// // // // // //     await session.endSession();
// // // // // //   }
// // // // // // });

// // // // // // // Get all stocks across all godowns
// // // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // // //   try {
// // // // // //     const docs = await GodownStock.find()
// // // // // //       .populate({
// // // // // //         path: "stockItemId",
// // // // // //         populate: { path: "unitId", select: "symbol" }
// // // // // //       })
// // // // // //       .populate("godownId")
// // // // // //       .sort({ updatedAt: -1 });
// // // // // //     res.json(docs);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // Get stock for a specific godown
// // // // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // // //       .populate({
// // // // // //         path: "stockItemId",
// // // // // //         populate: { path: "unitId", select: "symbol" }
// // // // // //       });
// // // // // //     res.json(docs);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- LOGS & ANALYTICS ---

// // // // // // // Fetch distribution logs for sidebar
// // // // // // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// // // // // //   try {
// // // // // //     const logs = await Distribution.find()
// // // // // //       .populate({
// // // // // //         path: "purchaseOrderId",
// // // // // //         populate: { path: "indentId", select: "indentNo" }
// // // // // //       })
// // // // // //       .sort({ createdAt: -1 });
// // // // // //     res.json(logs);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // Fetch detail for a specific distribution log
// // // // // // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const distribution = await Distribution.findById(req.params.id)
// // // // // //       .populate({ path: "allocations.stockItemId", select: "name" })
// // // // // //       .populate({ path: "allocations.godownId", select: "name" });

// // // // // //     if (!distribution) return res.status(404).json({ message: "Log not found" });

// // // // // //     const logs = distribution.allocations.map((item) => ({
// // // // // //       itemId: item.stockItemId?._id,
// // // // // //       itemName: item.stockItemId?.name || "Unknown Item",
// // // // // //       destination: item.godownId?.name || "Direct Delivery",
// // // // // //       quantity: item.qtyBaseUnit,
// // // // // //     }));

// // // // // //     res.json({ distributionId: distribution._id, logs });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Failed to fetch details", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // // //   try {
// // // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // // //     const leftovers = docs.flatMap((d) => 
// // // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // // //     );
// // // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- SETTINGS & DELETION ---

// // // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // // //       req.params.id, 
// // // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // // //       { new: true }
// // // // // //     );
// // // // // //     res.json(stock);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// // // // // //   try {
// // // // // //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
// // // // // //     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
// // // // // //     res.json({ message: "Stock item removed", id: req.params.id });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ message: "Delete failed", error: error.message });
// // // // // //   }
// // // // // // });
















// // // // // // // // // for stock group






// // // // // import express from "express";
// // // // // import mongoose from "mongoose";
// // // // // import { authorize } from "../middleware/auth.js";
// // // // // import { 
// // // // //   Distribution, 
// // // // //   GodownStock, 
// // // // //   Indent, 
// // // // //   Notification, 
// // // // //   PurchaseOrder 
// // // // // } from "../models/FlowModels.js";

// // // // // export const procurementRoutes = express.Router();
// // // // // const adminOnly = authorize(["admin"]);
// // // // // const anyUser = authorize(["admin", "user"]);

// // // // // // --- STOCK UTILITY & VALIDATION ROUTES ---

// // // // // /**
// // // // //  * @route   GET /api/procurement/stock-balance
// // // // //  * @desc    Checks available quantity in a specific godown.
// // // // //  */
// // // // // procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
// // // // //   try {
// // // // //     const { godownId, stockItemId } = req.query;
    
// // // // //     if (!godownId || !stockItemId) {
// // // // //       return res.status(400).json({ message: "Missing godownId or stockItemId" });
// // // // //     }

// // // // //     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
// // // // //     res.json({ 
// // // // //       availableQty: stock ? stock.qtyBaseUnit : 0 
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Balance check failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // /**
// // // // //  * @route   GET /api/procurement/my-stock
// // // // //  * @desc    Fetch user-specific godown stock with full item details.
// // // // //  */
// // // // // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// // // // //   try {
// // // // //     const userGodownId = req.user.godownId; 
// // // // //     if (!userGodownId) {
// // // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // // //     }

// // // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: [
// // // // //           { path: "unitId", select: "symbol" },
// // // // //           { path: "stockGroupId", select: "name" } // Integrated Group for Client Web
// // // // //         ]
// // // // //       });
      
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- INDENT ROUTES ---

// // // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // // //     res.json(indents);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // // //     return res.json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const totalAmount = (req.body.items || []).reduce(
// // // // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // // // //       0
// // // // //     );
// // // // //     const indent = await Indent.create({
// // // // //       indentNo: `IND-${Date.now()}`,
// // // // //       createdBy: req.user.sub,
// // // // //       items: req.body.items || [],
// // // // //       totalAmount
// // // // //     });
// // // // //     res.status(201).json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const indent = await Indent.findByIdAndUpdate(
// // // // //       req.params.id, 
// // // // //       { status: "purchased" }, 
// // // // //       { new: true }
// // // // //     );
// // // // //     res.json(indent);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- PURCHASE ORDER ROUTES ---

// // // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const orders = await PurchaseOrder.find()
// // // // //       .populate({
// // // // //         path: 'indentId',
// // // // //         select: 'indentNo createdAt' 
// // // // //       }) 
// // // // //       .sort({ updatedAt: -1 }); 
// // // // //     res.json(orders);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const totalAmount = (req.body.items || []).reduce(
// // // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // // // //         0
// // // // //       );
      
// // // // //       const po = await PurchaseOrder.create(
// // // // //         [{ 
// // // // //           indentId: req.body.indentId, 
// // // // //           items: req.body.items || [], 
// // // // //           totalAmount,
// // // // //           receivedAt: req.body.receivedAt || new Date(),
// // // // //           status: "pending" 
// // // // //         }], 
// // // // //         { session }
// // // // //       );

// // // // //       await Indent.findByIdAndUpdate(
// // // // //         req.body.indentId, 
// // // // //         { status: "stock_received" }, 
// // // // //         { session }
// // // // //       );
      
// // // // //       res.status(201).json(po[0]);
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
// // // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const distribution = await Distribution.create(
// // // // //         [{ 
// // // // //           purchaseOrderId: cleanPOId, 
// // // // //           leftoverSourceId: cleanLeftoverId, 
// // // // //           allocations: allocations || [], 
// // // // //           leftovers: leftovers || [] 
// // // // //         }], 
// // // // //         { session }
// // // // //       );

// // // // //       for (const item of (allocations || [])) {
// // // // //         await GodownStock.findOneAndUpdate(
// // // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // // //           { 
// // // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // // //           },
// // // // //           { upsert: true, session }
// // // // //         );
// // // // //       }

// // // // //       if (cleanPOId) {
// // // // //         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
// // // // //       }

// // // // //       if (cleanLeftoverId) {
// // // // //         await Distribution.findOneAndUpdate(
// // // // //           { _id: cleanLeftoverId },
// // // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // // //           { session }
// // // // //         );
// // // // //       }

// // // // //       res.status(201).json(distribution[0]);
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // /**
// // // // //  * @route   GET /api/procurement/godown-stocks
// // // // //  * @desc    Get all stocks across all godowns.
// // // // //  * CRITICAL UPDATE: Multi-level population for Stock Group.
// // // // //  */
// // // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const docs = await GodownStock.find()
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: [
// // // // //           { path: "unitId", select: "symbol" },
// // // // //           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
// // // // //         ]
// // // // //       })
// // // // //       .populate("godownId")
// // // // //       .sort({ updatedAt: -1 });
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // /**
// // // // //  * @route   GET /api/procurement/godown-stocks/:godownId
// // // // //  * @desc    Get stock for a specific godown.
// // // // //  * CRITICAL UPDATE: Multi-level population for Stock Group.
// // // // //  */
// // // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: [
// // // // //           { path: "unitId", select: "symbol" },
// // // // //           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
// // // // //         ]
// // // // //       });
// // // // //     res.json(docs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- LOGS & ANALYTICS ---

// // // // // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const logs = await Distribution.find()
// // // // //       .populate({
// // // // //         path: "purchaseOrderId",
// // // // //         populate: { path: "indentId", select: "indentNo" }
// // // // //       })
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(logs);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const distribution = await Distribution.findById(req.params.id)
// // // // //       .populate({ path: "allocations.stockItemId", select: "name" })
// // // // //       .populate({ path: "allocations.godownId", select: "name" });

// // // // //     if (!distribution) return res.status(404).json({ message: "Log not found" });

// // // // //     const logs = distribution.allocations.map((item) => ({
// // // // //       itemId: item.stockItemId?._id,
// // // // //       itemName: item.stockItemId?.name || "Unknown Item",
// // // // //       destination: item.godownId?.name || "Direct Delivery",
// // // // //       quantity: item.qtyBaseUnit,
// // // // //     }));

// // // // //     res.json({ distributionId: distribution._id, logs });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Failed to fetch details", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // // //   try {
// // // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // // //     const leftovers = docs.flatMap((d) => 
// // // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // // //     );
// // // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- SETTINGS & DELETION ---

// // // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // // //       req.params.id, 
// // // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // // //       { new: true }
// // // // //     );
// // // // //     res.json(stock);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // // //   }
// // // // // });

// // // // // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// // // // //   try {
// // // // //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
// // // // //     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
// // // // //     res.json({ message: "Stock item removed", id: req.params.id });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ message: "Delete failed", error: error.message });
// // // // //   }
// // // // // });







// // // // import express from "express";
// // // // import mongoose from "mongoose";
// // // // import { authorize } from "../middleware/auth.js";
// // // // import { 
// // // //   Distribution, 
// // // //   GodownStock, 
// // // //   Indent, 
// // // //   Notification, 
// // // //   PurchaseOrder 
// // // // } from "../models/FlowModels.js";

// // // // export const procurementRoutes = express.Router();
// // // // const adminOnly = authorize(["admin"]);
// // // // const anyUser = authorize(["admin", "user"]);

// // // // // --- STOCK UTILITY & VALIDATION ROUTES ---

// // // // /**
// // // //  * @route   GET /api/procurement/stock-balance
// // // //  * @desc    Checks available quantity in a specific godown.
// // // //  */
// // // // procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
// // // //   try {
// // // //     const { godownId, stockItemId } = req.query;
    
// // // //     if (!godownId || !stockItemId) {
// // // //       return res.status(400).json({ message: "Missing godownId or stockItemId" });
// // // //     }

// // // //     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
// // // //     res.json({ 
// // // //       availableQty: stock ? stock.qtyBaseUnit : 0 
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Balance check failed", error: error.message });
// // // //   }
// // // // });

// // // // /**
// // // //  * @route   GET /api/procurement/my-stock
// // // //  * @desc    Fetch user-specific godown stock with full item details.
// // // //  */
// // // // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// // // //   try {
// // // //     const userGodownId = req.user.godownId; 
// // // //     if (!userGodownId) {
// // // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // // //     }

// // // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // // //       .populate({
// // // //         path: "stockItemId",
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol" },
// // // //           { path: "stockGroupId", select: "name" }
// // // //         ]
// // // //       });
      
// // // //     res.json(docs);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // //   }
// // // // });

// // // // // --- INDENT ROUTES ---

// // // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // // //   try {
// // // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // // //     res.json(indents);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // // //     return res.json(indent);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const items = req.body.items || [];
// // // //     const totalAmount = items.reduce(
// // // //       (sum, it) => sum + (it.amount || (it.orderedQty || 0) * (it.unitPrice || 0)), 
// // // //       0
// // // //     );

// // // //     const indent = await Indent.create({
// // // //       indentNo: `IND-${Date.now()}`,
// // // //       createdBy: req.user.sub,
// // // //       items: items,
// // // //       totalAmount
// // // //     });
// // // //     res.status(201).json(indent);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const indent = await Indent.findByIdAndUpdate(
// // // //       req.params.id, 
// // // //       { status: "purchased" }, 
// // // //       { new: true }
// // // //     );
// // // //     res.json(indent);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Update failed", error: error.message });
// // // //   }
// // // // });

// // // // // --- PURCHASE ORDER ROUTES ---

// // // // /**
// // // //  * FIXED: Graceful handling of null indentId to prevent frontend crashes.
// // // //  */
// // // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // // //   try {
// // // //     const orders = await PurchaseOrder.find()
// // // //       .populate({
// // // //         path: 'indentId',
// // // //         select: 'indentNo createdAt' 
// // // //       }) 
// // // //       .sort({ updatedAt: -1 }); 

// // // //     // Clean data: Ensure indentId is at least an empty object if populate fails
// // // //     const sanitizedOrders = orders.map(order => {
// // // //       const o = order.toObject();
// // // //       if (!o.indentId) o.indentId = { indentNo: "N/A", deleted: true };
// // // //       return o;
// // // //     });

// // // //     res.json(sanitizedOrders);
// // // //   } catch (error) {
// // // //     console.error("PO Fetch Error:", error);
// // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const items = req.body.items || [];
// // // //       const totalAmount = items.reduce(
// // // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty || 0) * (it.unitPrice || 0)), 
// // // //         0
// // // //       );
      
// // // //       const po = await PurchaseOrder.create(
// // // //         [{ 
// // // //           indentId: req.body.indentId, 
// // // //           items: items, 
// // // //           totalAmount,
// // // //           receivedAt: req.body.receivedAt || new Date(),
// // // //           status: "pending" 
// // // //         }], 
// // // //         { session }
// // // //       );

// // // //       await Indent.findByIdAndUpdate(
// // // //         req.body.indentId, 
// // // //         { status: "stock_received" }, 
// // // //         { session }
// // // //       );
      
// // // //       res.status(201).json(po[0]);
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // });

// // // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
// // // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const distribution = await Distribution.create(
// // // //         [{ 
// // // //           purchaseOrderId: cleanPOId, 
// // // //           leftoverSourceId: cleanLeftoverId, 
// // // //           allocations: allocations || [], 
// // // //           leftovers: leftovers || [] 
// // // //         }], 
// // // //         { session }
// // // //       );

// // // //       for (const item of (allocations || [])) {
// // // //         await GodownStock.findOneAndUpdate(
// // // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // // //           { 
// // // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // // //           },
// // // //           { upsert: true, session }
// // // //         );
// // // //       }

// // // //       if (cleanPOId) {
// // // //         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
// // // //       }

// // // //       if (cleanLeftoverId) {
// // // //         await Distribution.findOneAndUpdate(
// // // //           { _id: cleanLeftoverId },
// // // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // // //           { session }
// // // //         );
// // // //       }

// // // //       res.status(201).json(distribution[0]);
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // });

// // // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // // //   try {
// // // //     const docs = await GodownStock.find()
// // // //       .populate({
// // // //         path: "stockItemId",
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol" },
// // // //           { path: "stockGroupId", select: "name" }
// // // //         ]
// // // //       })
// // // //       .populate("godownId")
// // // //       .sort({ updatedAt: -1 });
// // // //     res.json(docs);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // // //       .populate({
// // // //         path: "stockItemId",
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol" },
// // // //           { path: "stockGroupId", select: "name" }
// // // //         ]
// // // //       });
// // // //     res.json(docs);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // // //   }
// // // // });

// // // // // --- LOGS & ANALYTICS ---

// // // // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// // // //   try {
// // // //     const logs = await Distribution.find()
// // // //       .populate({
// // // //         path: "purchaseOrderId",
// // // //         populate: { path: "indentId", select: "indentNo" }
// // // //       })
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(logs);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const distribution = await Distribution.findById(req.params.id)
// // // //       .populate({ path: "allocations.stockItemId", select: "name" })
// // // //       .populate({ path: "allocations.godownId", select: "name" });

// // // //     if (!distribution) return res.status(404).json({ message: "Log not found" });

// // // //     const logs = distribution.allocations.map((item) => ({
// // // //       itemId: item.stockItemId?._id,
// // // //       itemName: item.stockItemId?.name || "Unknown Item",
// // // //       destination: item.godownId?.name || "Direct Delivery",
// // // //       quantity: item.qtyBaseUnit,
// // // //     }));

// // // //     res.json({ distributionId: distribution._id, logs });
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Failed to fetch details", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // // //   try {
// // // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // // //     const leftovers = docs.flatMap((d) => 
// // // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // // //     );
// // // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // // //   }
// // // // });

// // // // // --- SETTINGS & DELETION ---

// // // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const stock = await GodownStock.findByIdAndUpdate(
// // // //       req.params.id, 
// // // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // // //       { new: true }
// // // //     );
// // // //     res.json(stock);
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // // //   }
// // // // });

// // // // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// // // //   try {
// // // //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
// // // //     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
// // // //     res.json({ message: "Stock item removed", id: req.params.id });
// // // //   } catch (error) {
// // // //     res.status(500).json({ message: "Delete failed", error: error.message });
// // // //   }
// // // // });

















// // // import express from "express";
// // // import mongoose from "mongoose";
// // // import { authorize } from "../middleware/auth.js";
// // // import { 
// // //   Distribution, 
// // //   GodownStock, 
// // //   Indent, 
// // //   Notification, 
// // //   PurchaseOrder 
// // // } from "../models/FlowModels.js";

// // // export const procurementRoutes = express.Router();
// // // const adminOnly = authorize(["admin"]);
// // // const anyUser = authorize(["admin", "user"]);

// // // // --- STOCK UTILITY & VALIDATION ROUTES ---

// // // /**
// // //  * @route   GET /api/procurement/stock-balance
// // //  * @desc    Checks available quantity in a specific godown. 
// // //  * Crucial for preventing over-transferring.
// // //  */
// // // procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
// // //   try {
// // //     const { godownId, stockItemId } = req.query;
    
// // //     if (!godownId || !stockItemId) {
// // //       return res.status(400).json({ message: "Missing godownId or stockItemId" });
// // //     }

// // //     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
// // //     res.json({ 
// // //       availableQty: stock ? stock.qtyBaseUnit : 0 
// // //     });
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Balance check failed", error: error.message });
// // //   }
// // // });

// // // /**
// // //  * @route   GET /api/procurement/my-stock
// // //  * @desc    Fetch user-specific godown stock with full item, unit, and group details.
// // //  */
// // // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// // //   try {
// // //     const userGodownId = req.user.godownId; 
// // //     if (!userGodownId) {
// // //       return res.status(403).json({ message: "No Godown assigned to this user." });
// // //     }

// // //     const docs = await GodownStock.find({ godownId: userGodownId })
// // //       .populate({
// // //         path: "stockItemId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol" },
// // //           { path: "stockGroupId", select: "name" } 
// // //         ]
// // //       });
      
// // //     res.json(docs);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // //   }
// // // });

// // // // --- INDENT ROUTES ---

// // // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// // //   try {
// // //     const indents = await Indent.find().sort({ createdAt: -1 });
// // //     res.json(indents);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// // //   try {
// // //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// // //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// // //     return res.json(indent);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Preview failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// // //   try {
// // //     const totalAmount = (req.body.items || []).reduce(
// // //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// // //       0
// // //     );
// // //     const indent = await Indent.create({
// // //       indentNo: `IND-${Date.now()}`,
// // //       createdBy: req.user.sub,
// // //       items: req.body.items || [],
// // //       totalAmount
// // //     });
// // //     res.status(201).json(indent);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// // //   try {
// // //     const indent = await Indent.findByIdAndUpdate(
// // //       req.params.id, 
// // //       { status: "purchased" }, 
// // //       { new: true }
// // //     );
// // //     res.json(indent);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Update failed", error: error.message });
// // //   }
// // // });

// // // // --- PURCHASE ORDER ROUTES ---

// // // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// // //   try {
// // //     const orders = await PurchaseOrder.find()
// // //       .populate({
// // //         path: 'indentId',
// // //         select: 'indentNo createdAt' 
// // //       }) 
// // //       .sort({ updatedAt: -1 }); 
// // //     res.json(orders);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   try {
// // //     await session.withTransaction(async () => {
// // //       const totalAmount = (req.body.items || []).reduce(
// // //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// // //         0
// // //       );
      
// // //       const po = await PurchaseOrder.create(
// // //         [{ 
// // //           indentId: req.body.indentId, 
// // //           items: req.body.items || [], 
// // //           totalAmount,
// // //           receivedAt: req.body.receivedAt || new Date(),
// // //           status: "pending" 
// // //         }], 
// // //         { session }
// // //       );

// // //       await Indent.findByIdAndUpdate(
// // //         req.body.indentId, 
// // //         { status: "stock_received" }, 
// // //         { session }
// // //       );
      
// // //       res.status(201).json(po[0]);
// // //     });
// // //   } catch (error) {
// // //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// // //   } finally {
// // //     await session.endSession();
// // //   }
// // // });

// // // // --- DISTRIBUTION & STOCK ROUTES ---

// // // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
// // //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// // //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// // //   try {
// // //     await session.withTransaction(async () => {
// // //       const distribution = await Distribution.create(
// // //         [{ 
// // //           purchaseOrderId: cleanPOId, 
// // //           leftoverSourceId: cleanLeftoverId, 
// // //           allocations: allocations || [], 
// // //           leftovers: leftovers || [] 
// // //         }], 
// // //         { session }
// // //       );

// // //       for (const item of (allocations || [])) {
// // //         await GodownStock.findOneAndUpdate(
// // //           { godownId: item.godownId, stockItemId: item.stockItemId },
// // //           { 
// // //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// // //             $setOnInsert: { thresholdBaseUnit: 0 } 
// // //           },
// // //           { upsert: true, session }
// // //         );
// // //       }

// // //       if (cleanPOId) {
// // //         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
// // //       }

// // //       if (cleanLeftoverId) {
// // //         await Distribution.findOneAndUpdate(
// // //           { _id: cleanLeftoverId },
// // //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// // //           { session }
// // //         );
// // //       }

// // //       res.status(201).json(distribution[0]);
// // //     });
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Distribution failed", error: error.message });
// // //   } finally {
// // //     await session.endSession();
// // //   }
// // // });

// // // /**
// // //  * @route   GET /api/procurement/godown-stocks
// // //  * @desc   Get all stocks across all godowns with full population.
// // //  */
// // // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// // //   try {
// // //     const docs = await GodownStock.find()
// // //       .populate({
// // //         path: "stockItemId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol" },
// // //           { path: "stockGroupId", select: "name" }
// // //         ]
// // //       })
// // //       .populate("godownId")
// // //       .sort({ updatedAt: -1 });
// // //     res.json(docs);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// // //   }
// // // });

// // // /**
// // //  * @route   GET /api/procurement/godown-stocks/:godownId
// // //  * @desc   Get stock for a specific godown with full population.
// // //  */
// // // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// // //   try {
// // //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// // //       .populate({
// // //         path: "stockItemId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol" },
// // //           { path: "stockGroupId", select: "name" }
// // //         ]
// // //       });
// // //     res.json(docs);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch failed", error: error.message });
// // //   }
// // // });

// // // // --- LOGS & ANALYTICS ---

// // // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// // //   try {
// // //     const logs = await Distribution.find()
// // //       .populate({
// // //         path: "purchaseOrderId",
// // //         populate: { path: "indentId", select: "indentNo" }
// // //       })
// // //       .sort({ createdAt: -1 });
// // //     res.json(logs);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// // //   try {
// // //     const distribution = await Distribution.findById(req.params.id)
// // //       .populate({ path: "allocations.stockItemId", select: "name" })
// // //       .populate({ path: "allocations.godownId", select: "name" });

// // //     if (!distribution) return res.status(404).json({ message: "Log not found" });

// // //     const logs = distribution.allocations.map((item) => ({
// // //       itemId: item.stockItemId?._id,
// // //       itemName: item.stockItemId?.name || "Unknown Item",
// // //       destination: item.godownId?.name || "Direct Delivery",
// // //       quantity: item.qtyBaseUnit,
// // //     }));

// // //     res.json({ distributionId: distribution._id, logs });
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Failed to fetch details", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// // //   try {
// // //     const docs = await Distribution.find().sort({ createdAt: -1 });
// // //     const leftovers = docs.flatMap((d) => 
// // //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// // //     );
// // //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// // //   }
// // // });

// // // // --- SETTINGS & DELETION ---

// // // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// // //   try {
// // //     const stock = await GodownStock.findByIdAndUpdate(
// // //       req.params.id, 
// // //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// // //       { new: true }
// // //     );
// // //     res.json(stock);
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// // //   }
// // // });

// // // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// // //   try {
// // //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
// // //     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
// // //     res.json({ message: "Stock item removed", id: req.params.id });
// // //   } catch (error) {
// // //     res.status(500).json({ message: "Delete failed", error: error.message });
// // //   }
// // // });







// // import express from "express";
// // import mongoose from "mongoose";
// // import { authorize } from "../middleware/auth.js";
// // import { 
// //   Distribution, 
// //   GodownStock, 
// //   Indent, 
// //   Notification, 
// //   PurchaseOrder 
// // } from "../models/FlowModels.js";

// // export const procurementRoutes = express.Router();
// // const adminOnly = authorize(["admin"]);
// // const anyUser = authorize(["admin", "user"]);

// // // --- STOCK UTILITY & VALIDATION ROUTES ---

// // /**
// //  * @route   GET /api/procurement/stock-balance
// //  * @desc    Checks available quantity in a specific godown.
// //  */
// // procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
// //   try {
// //     const { godownId, stockItemId } = req.query;
    
// //     if (!godownId || !stockItemId) {
// //       return res.status(400).json({ message: "Missing godownId or stockItemId" });
// //     }

// //     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
// //     res.json({ 
// //       availableQty: stock ? stock.qtyBaseUnit : 0 
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: "Balance check failed", error: error.message });
// //   }
// // });

// // /**
// //  * @route   GET /api/procurement/my-stock
// //  * @desc    Fetch user-specific godown stock with full item details.
// //  */
// // procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
// //   try {
// //     const userGodownId = req.user.godownId; 
// //     if (!userGodownId) {
// //       return res.status(403).json({ message: "No Godown assigned to this user." });
// //     }

// //     const docs = await GodownStock.find({ godownId: userGodownId })
// //       .populate({
// //         path: "stockItemId",
// //         populate: [
// //           { path: "unitId", select: "symbol" },
// //           { path: "stockGroupId", select: "name" } // Integrated Group for Client Web
// //         ]
// //       });
      
// //     res.json(docs);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch failed", error: error.message });
// //   }
// // });

// // // --- INDENT ROUTES ---

// // procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
// //   try {
// //     const indents = await Indent.find().sort({ createdAt: -1 });
// //     res.json(indents);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch failed", error: error.message });
// //   }
// // });

// // procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
// //   try {
// //     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
// //     if (!indent) return res.status(404).json({ message: "Indent not found" });
// //     return res.json(indent);
// //   } catch (error) {
// //     res.status(500).json({ message: "Preview failed", error: error.message });
// //   }
// // });

// // procurementRoutes.post("/indents", adminOnly, async (req, res) => {
// //   try {
// //     const totalAmount = (req.body.items || []).reduce(
// //       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
// //       0
// //     );
// //     const indent = await Indent.create({
// //       indentNo: `IND-${Date.now()}`,
// //       createdBy: req.user.sub,
// //       items: req.body.items || [],
// //       totalAmount
// //     });
// //     res.status(201).json(indent);
// //   } catch (error) {
// //     res.status(500).json({ message: "Indent creation failed", error: error.message });
// //   }
// // });

// // procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
// //   try {
// //     const indent = await Indent.findByIdAndUpdate(
// //       req.params.id, 
// //       { status: "purchased" }, 
// //       { new: true }
// //     );
// //     res.json(indent);
// //   } catch (error) {
// //     res.status(500).json({ message: "Update failed", error: error.message });
// //   }
// // });

// // // --- PURCHASE ORDER ROUTES ---

// // procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
// //   try {
// //     const orders = await PurchaseOrder.find()
// //       .populate({
// //         path: 'indentId',
// //         select: 'indentNo createdAt' 
// //       }) 
// //       .sort({ updatedAt: -1 }); 
// //     res.json(orders);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch failed", error: error.message });
// //   }
// // });

// // procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {
// //     await session.withTransaction(async () => {
// //       const totalAmount = (req.body.items || []).reduce(
// //         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
// //         0
// //       );
      
// //       const po = await PurchaseOrder.create(
// //         [{ 
// //           indentId: req.body.indentId, 
// //           items: req.body.items || [], 
// //           totalAmount,
// //           receivedAt: req.body.receivedAt || new Date(),
// //           status: "pending" 
// //         }], 
// //         { session }
// //       );

// //       await Indent.findByIdAndUpdate(
// //         req.body.indentId, 
// //         { status: "stock_received" }, 
// //         { session }
// //       );
      
// //       res.status(201).json(po[0]);
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: "PO Creation failed", error: error.message });
// //   } finally {
// //     await session.endSession();
// //   }
// // });

// // // --- DISTRIBUTION & STOCK ROUTES ---

// // procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
// //   const session = await mongoose.startSession();
// //   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
// //   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
// //   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

// //   try {
// //     await session.withTransaction(async () => {
// //       const distribution = await Distribution.create(
// //         [{ 
// //           purchaseOrderId: cleanPOId, 
// //           leftoverSourceId: cleanLeftoverId, 
// //           allocations: allocations || [], 
// //           leftovers: leftovers || [] 
// //         }], 
// //         { session }
// //       );

// //       for (const item of (allocations || [])) {
// //         await GodownStock.findOneAndUpdate(
// //           { godownId: item.godownId, stockItemId: item.stockItemId },
// //           { 
// //             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
// //             $setOnInsert: { thresholdBaseUnit: 0 } 
// //           },
// //           { upsert: true, session }
// //         );
// //       }

// //       if (cleanPOId) {
// //         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
// //       }

// //       if (cleanLeftoverId) {
// //         await Distribution.findOneAndUpdate(
// //           { _id: cleanLeftoverId },
// //           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
// //           { session }
// //         );
// //       }

// //       res.status(201).json(distribution[0]);
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: "Distribution failed", error: error.message });
// //   } finally {
// //     await session.endSession();
// //   }
// // });

// // /**
// //  * @route   GET /api/procurement/godown-stocks
// //  * @desc    Get all stocks across all godowns.
// //  * CRITICAL UPDATE: Multi-level population for Stock Group.
// //  */
// // procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
// //   try {
// //     const docs = await GodownStock.find()
// //       .populate({
// //         path: "stockItemId",
// //         populate: [
// //           { path: "unitId", select: "symbol" },
// //           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
// //         ]
// //       })
// //       .populate("godownId")
// //       .sort({ updatedAt: -1 });
// //     res.json(docs);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
// //   }
// // });

// // /**
// //  * @route   GET /api/procurement/godown-stocks/:godownId
// //  * @desc    Get stock for a specific godown.
// //  * CRITICAL UPDATE: Multi-level population for Stock Group.
// //  */
// // procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
// //   try {
// //     const docs = await GodownStock.find({ godownId: req.params.godownId })
// //       .populate({
// //         path: "stockItemId",
// //         populate: [
// //           { path: "unitId", select: "symbol" },
// //           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
// //         ]
// //       });
// //     res.json(docs);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch failed", error: error.message });
// //   }
// // });

// // // --- LOGS & ANALYTICS ---

// // procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
// //   try {
// //     const logs = await Distribution.find()
// //       .populate({
// //         path: "purchaseOrderId",
// //         populate: { path: "indentId", select: "indentNo" }
// //       })
// //       .sort({ createdAt: -1 });
// //     res.json(logs);
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch logs failed", error: error.message });
// //   }
// // });

// // procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
// //   try {
// //     const distribution = await Distribution.findById(req.params.id)
// //       .populate({ path: "allocations.stockItemId", select: "name" })
// //       .populate({ path: "allocations.godownId", select: "name" });

// //     if (!distribution) return res.status(404).json({ message: "Log not found" });

// //     const logs = distribution.allocations.map((item) => ({
// //       itemId: item.stockItemId?._id,
// //       itemName: item.stockItemId?.name || "Unknown Item",
// //       destination: item.godownId?.name || "Direct Delivery",
// //       quantity: item.qtyBaseUnit,
// //     }));

// //     res.json({ distributionId: distribution._id, logs });
// //   } catch (error) {
// //     res.status(500).json({ message: "Failed to fetch details", error: error.message });
// //   }
// // });

// // procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
// //   try {
// //     const docs = await Distribution.find().sort({ createdAt: -1 });
// //     const leftovers = docs.flatMap((d) => 
// //       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
// //     );
// //     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
// //   } catch (error) {
// //     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
// //   }
// // });

// // // --- SETTINGS & DELETION ---

// // procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
// //   try {
// //     const stock = await GodownStock.findByIdAndUpdate(
// //       req.params.id, 
// //       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
// //       { new: true }
// //     );
// //     res.json(stock);
// //   } catch (error) {
// //     res.status(500).json({ message: "Threshold update failed", error: error.message });
// //   }
// // });

// // procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
// //   try {
// //     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
// //     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
// //     res.json({ message: "Stock item removed", id: req.params.id });
// //   } catch (error) {
// //     res.status(500).json({ message: "Delete failed", error: error.message });
// //   }
// // });











// import express from "express";
// import mongoose from "mongoose";
// import { authorize } from "../middleware/auth.js";
// import { 
//   Distribution, 
//   GodownStock, 
//   Indent, 
//   Notification, 
//   PurchaseOrder 
// } from "../models/FlowModels.js";

// export const procurementRoutes = express.Router();
// const adminOnly = authorize(["admin"]);
// const anyUser = authorize(["admin", "user"]);

// // --- STOCK UTILITY & VALIDATION ROUTES ---

// /**
//  * @route   GET /api/procurement/stock-balance
//  * @desc    Checks available quantity in a specific godown.
//  */
// procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
//   try {
//     const { godownId, stockItemId } = req.query;
    
//     if (!godownId || !stockItemId) {
//       return res.status(400).json({ message: "Missing godownId or stockItemId" });
//     }

//     const stock = await GodownStock.findOne({ godownId, stockItemId });
    
//     res.json({ 
//       availableQty: stock ? stock.qtyBaseUnit : 0 
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Balance check failed", error: error.message });
//   }
// });

// /**
//  * @route   GET /api/procurement/my-stock
//  * @desc    Fetch user-specific godown stock with full item details.
//  */
// procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
//   try {
//     const userGodownId = req.user.godownId; 
//     if (!userGodownId) {
//       return res.status(403).json({ message: "No Godown assigned to this user." });
//     }

//     const docs = await GodownStock.find({ godownId: userGodownId })
//       .populate({
//         path: "stockItemId",
//         populate: [
//           { path: "unitId", select: "symbol" },
//           { path: "stockGroupId", select: "name" } // Integrated Group for Client Web
//         ]
//       });
      
//     res.json(docs);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch failed", error: error.message });
//   }
// });

// // --- INDENT ROUTES ---

// procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
//   try {
//     const indents = await Indent.find().sort({ createdAt: -1 });
//     res.json(indents);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch failed", error: error.message });
//   }
// });

// procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
//   try {
//     const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
//     if (!indent) return res.status(404).json({ message: "Indent not found" });
//     return res.json(indent);
//   } catch (error) {
//     res.status(500).json({ message: "Preview failed", error: error.message });
//   }
// });

// procurementRoutes.post("/indents", adminOnly, async (req, res) => {
//   try {
//     const totalAmount = (req.body.items || []).reduce(
//       (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
//       0
//     );
//     const indent = await Indent.create({
//       indentNo: `IND-${Date.now()}`,
//       createdBy: req.user.sub,
//       items: req.body.items || [],
//       totalAmount
//     });
//     res.status(201).json(indent);
//   } catch (error) {
//     res.status(500).json({ message: "Indent creation failed", error: error.message });
//   }
// });

// procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
//   try {
//     const indent = await Indent.findByIdAndUpdate(
//       req.params.id, 
//       { status: "purchased" }, 
//       { new: true }
//     );
//     res.json(indent);
//   } catch (error) {
//     res.status(500).json({ message: "Update failed", error: error.message });
//   }
// });

// // --- PURCHASE ORDER ROUTES ---

// procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
//   try {
//     const orders = await PurchaseOrder.find()
//       .populate({
//         path: 'indentId',
//         select: 'indentNo createdAt' 
//       }) 
//       .sort({ updatedAt: -1 }); 
//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch failed", error: error.message });
//   }
// });

// procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     await session.withTransaction(async () => {
//       const totalAmount = (req.body.items || []).reduce(
//         (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
//         0
//       );
      
//       const po = await PurchaseOrder.create(
//         [{ 
//           indentId: req.body.indentId, 
//           items: req.body.items || [], 
//           totalAmount,
//           receivedAt: req.body.receivedAt || new Date(),
//           status: "pending" 
//         }], 
//         { session }
//       );

//       await Indent.findByIdAndUpdate(
//         req.body.indentId, 
//         { status: "stock_received" }, 
//         { session }
//       );
      
//       res.status(201).json(po[0]);
//     });
//   } catch (error) {
//     res.status(500).json({ message: "PO Creation failed", error: error.message });
//   } finally {
//     await session.endSession();
//   }
// });

// // --- DISTRIBUTION & STOCK ROUTES ---

// procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
//   const session = await mongoose.startSession();
//   const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
//   const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
//   const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

//   try {
//     await session.withTransaction(async () => {
//       const distribution = await Distribution.create(
//         [{ 
//           purchaseOrderId: cleanPOId, 
//           leftoverSourceId: cleanLeftoverId, 
//           allocations: allocations || [], 
//           leftovers: leftovers || [] 
//         }], 
//         { session }
//       );

//       for (const item of (allocations || [])) {
//         await GodownStock.findOneAndUpdate(
//           { godownId: item.godownId, stockItemId: item.stockItemId },
//           { 
//             $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
//             $setOnInsert: { thresholdBaseUnit: 0 } 
//           },
//           { upsert: true, session }
//         );
//       }

//       if (cleanPOId) {
//         await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
//       }

//       if (cleanLeftoverId) {
//         await Distribution.findOneAndUpdate(
//           { _id: cleanLeftoverId },
//           { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
//           { session }
//         );
//       }

//       res.status(201).json(distribution[0]);
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Distribution failed", error: error.message });
//   } finally {
//     await session.endSession();
//   }
// });

// /**
//  * @route   GET /api/procurement/godown-stocks
//  * @desc    Get all stocks across all godowns.
//  * CRITICAL UPDATE: Multi-level population for Stock Group.
//  */
// procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
//   try {
//     const docs = await GodownStock.find()
//       .populate({
//         path: "stockItemId",
//         populate: [
//           { path: "unitId", select: "symbol" },
//           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
//         ]
//       })
//       .populate("godownId")
//       .sort({ updatedAt: -1 });
//     res.json(docs);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch stocks failed", error: error.message });
//   }
// });

// /**
//  * @route   GET /api/procurement/godown-stocks/:godownId
//  * @desc    Get stock for a specific godown.
//  * CRITICAL UPDATE: Multi-level population for Stock Group.
//  */
// procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
//   try {
//     const docs = await GodownStock.find({ godownId: req.params.godownId })
//       .populate({
//         path: "stockItemId",
//         populate: [
//           { path: "unitId", select: "symbol" },
//           { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
//         ]
//       });
//     res.json(docs);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch failed", error: error.message });
//   }
// });

// // --- LOGS & ANALYTICS ---

// procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
//   try {
//     const logs = await Distribution.find()
//       .populate({
//         path: "purchaseOrderId",
//         populate: { path: "indentId", select: "indentNo" }
//       })
//       .sort({ createdAt: -1 });
//     res.json(logs);
//   } catch (error) {
//     res.status(500).json({ message: "Fetch logs failed", error: error.message });
//   }
// });

// procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
//   try {
//     const distribution = await Distribution.findById(req.params.id)
//       .populate({ path: "allocations.stockItemId", select: "name" })
//       .populate({ path: "allocations.godownId", select: "name" });

//     if (!distribution) return res.status(404).json({ message: "Log not found" });

//     const logs = distribution.allocations.map((item) => ({
//       itemId: item.stockItemId?._id,
//       itemName: item.stockItemId?.name || "Unknown Item",
//       destination: item.godownId?.name || "Direct Delivery",
//       quantity: item.qtyBaseUnit,
//     }));

//     res.json({ distributionId: distribution._id, logs });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch details", error: error.message });
//   }
// });

// procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
//   try {
//     const docs = await Distribution.find().sort({ createdAt: -1 });
//     const leftovers = docs.flatMap((d) => 
//       d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
//     );
//     res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
//   } catch (error) {
//     res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
//   }
// });

// // --- SETTINGS & DELETION ---

// procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
//   try {
//     const stock = await GodownStock.findByIdAndUpdate(
//       req.params.id, 
//       { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
//       { new: true }
//     );
//     res.json(stock);
//   } catch (error) {
//     res.status(500).json({ message: "Threshold update failed", error: error.message });
//   }
// });

// procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
//   try {
//     const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
//     if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
//     res.json({ message: "Stock item removed", id: req.params.id });
//   } catch (error) {
//     res.status(500).json({ message: "Delete failed", error: error.message });
//   }
// });








import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { 
  Distribution, 
  GodownStock, 
  Indent, 
  Notification, 
  PurchaseOrder 
} from "../models/FlowModels.js";

export const procurementRoutes = express.Router();
const adminOnly = authorize(["admin"]);
const anyUser = authorize(["admin", "user"]);

// --- STOCK UTILITY & VALIDATION ROUTES ---

/**
 * @route   GET /api/procurement/stock-balance
 * @desc    Checks available quantity in a specific godown.
 */
procurementRoutes.get("/stock-balance", anyUser, async (req, res) => {
  try {
    const { godownId, stockItemId } = req.query;
    
    if (!godownId || !stockItemId) {
      return res.status(400).json({ message: "Missing godownId or stockItemId" });
    }

    const stock = await GodownStock.findOne({ godownId, stockItemId });
    
    res.json({ 
      availableQty: stock ? stock.qtyBaseUnit : 0 
    });
  } catch (error) {
    res.status(500).json({ message: "Balance check failed", error: error.message });
  }
});

/**
 * @route   GET /api/procurement/my-stock
 * @desc    Fetch user-specific godown stock with full item details.
 */
procurementRoutes.get("/my-stock", anyUser, async (req, res) => {
  try {
    const userGodownId = req.user.godownId; 
    if (!userGodownId) {
      return res.status(403).json({ message: "No Godown assigned to this user." });
    }

    const docs = await GodownStock.find({ godownId: userGodownId })
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Integrated Group for Client Web
        ]
      });
      
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// --- INDENT ROUTES ---

procurementRoutes.get("/indents", adminOnly, async (_req, res) => {
  try {
    const indents = await Indent.find().sort({ createdAt: -1 });
    res.json(indents);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

procurementRoutes.get("/indents/:id/preview", adminOnly, async (req, res) => {
  try {
    const indent = await Indent.findById(req.params.id).populate("items.stockItemId");
    if (!indent) return res.status(404).json({ message: "Indent not found" });
    return res.json(indent);
  } catch (error) {
    res.status(500).json({ message: "Preview failed", error: error.message });
  }
});

procurementRoutes.post("/indents", adminOnly, async (req, res) => {
  try {
    const totalAmount = (req.body.items || []).reduce(
      (sum, it) => sum + (it.amount || it.orderedQty * it.unitPrice || 0), 
      0
    );
    const indent = await Indent.create({
      indentNo: `IND-${Date.now()}`,
      createdBy: req.user.sub,
      items: req.body.items || [],
      totalAmount
    });
    res.status(201).json(indent);
  } catch (error) {
    res.status(500).json({ message: "Indent creation failed", error: error.message });
  }
});

procurementRoutes.post("/indents/:id/mark-purchased", adminOnly, async (req, res) => {
  try {
    const indent = await Indent.findByIdAndUpdate(
      req.params.id, 
      { status: "purchased" }, 
      { new: true }
    );
    res.json(indent);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

// --- PURCHASE ORDER ROUTES ---

procurementRoutes.get("/purchase-orders", adminOnly, async (_req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate({
        path: 'indentId',
        select: 'indentNo createdAt' 
      }) 
      .sort({ updatedAt: -1 }); 
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

procurementRoutes.post("/purchase-orders", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const totalAmount = (req.body.items || []).reduce(
        (sum, it) => sum + ((it.receivedQty || it.orderedQty) * it.unitPrice || 0), 
        0
      );
      
      const po = await PurchaseOrder.create(
        [{ 
          indentId: req.body.indentId, 
          items: req.body.items || [], 
          totalAmount,
          receivedAt: req.body.receivedAt || new Date(),
          status: "pending" 
        }], 
        { session }
      );

      await Indent.findByIdAndUpdate(
        req.body.indentId, 
        { status: "stock_received" }, 
        { session }
      );
      
      res.status(201).json(po[0]);
    });
  } catch (error) {
    res.status(500).json({ message: "PO Creation failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

// --- DISTRIBUTION & STOCK ROUTES ---

procurementRoutes.post("/distributions", adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = req.body;
  const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
  const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;

  try {
    await session.withTransaction(async () => {
      const distribution = await Distribution.create(
        [{ 
          purchaseOrderId: cleanPOId, 
          leftoverSourceId: cleanLeftoverId, 
          allocations: allocations || [], 
          leftovers: leftovers || [] 
        }], 
        { session }
      );

      for (const item of (allocations || [])) {
        await GodownStock.findOneAndUpdate(
          { godownId: item.godownId, stockItemId: item.stockItemId },
          { 
            $inc: { qtyBaseUnit: item.qtyBaseUnit }, 
            $setOnInsert: { thresholdBaseUnit: 0 } 
          },
          { upsert: true, session }
        );
      }

      if (cleanPOId) {
        await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
      }

      if (cleanLeftoverId) {
        await Distribution.findOneAndUpdate(
          { _id: cleanLeftoverId },
          { $set: { "leftovers.$[].qtyBaseUnit": 0 } },
          { session }
        );
      }

      res.status(201).json(distribution[0]);
    });
  } catch (error) {
    res.status(500).json({ message: "Distribution failed", error: error.message });
  } finally {
    await session.endSession();
  }
});

/**
 * @route   GET /api/procurement/godown-stocks
 * @desc    Get all stocks across all godowns.
 * CRITICAL UPDATE: Multi-level population for Stock Group.
 */
procurementRoutes.get("/godown-stocks", adminOnly, async (_req, res) => {
  try {
    const docs = await GodownStock.find()
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
        ]
      })
      .populate("godownId")
      .sort({ updatedAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch stocks failed", error: error.message });
  }
});

/**
 * @route   GET /api/procurement/godown-stocks/:godownId
 * @desc    Get stock for a specific godown.
 * CRITICAL UPDATE: Multi-level population for Stock Group.
 */
procurementRoutes.get("/godown-stocks/:godownId", adminOnly, async (req, res) => {
  try {
    const docs = await GodownStock.find({ godownId: req.params.godownId })
      .populate({
        path: "stockItemId",
        populate: [
          { path: "unitId", select: "symbol" },
          { path: "stockGroupId", select: "name" } // Populating the Stock Group Name
        ]
      });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// --- LOGS & ANALYTICS ---

procurementRoutes.get("/distributions/logs", adminOnly, async (_req, res) => {
  try {
    const logs = await Distribution.find()
      .populate({
        path: "purchaseOrderId",
        populate: { path: "indentId", select: "indentNo" }
      })
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Fetch logs failed", error: error.message });
  }
});

procurementRoutes.get("/distributions/:id/details", adminOnly, async (req, res) => {
  try {
    const distribution = await Distribution.findById(req.params.id)
      .populate({ path: "allocations.stockItemId", select: "name" })
      .populate({ path: "allocations.godownId", select: "name" });

    if (!distribution) return res.status(404).json({ message: "Log not found" });

    const logs = distribution.allocations.map((item) => ({
      itemId: item.stockItemId?._id,
      itemName: item.stockItemId?.name || "Unknown Item",
      destination: item.godownId?.name || "Direct Delivery",
      quantity: item.qtyBaseUnit,
    }));

    res.json({ distributionId: distribution._id, logs });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch details", error: error.message });
  }
});

procurementRoutes.get("/distributions/leftovers", adminOnly, async (_req, res) => {
  try {
    const docs = await Distribution.find().sort({ createdAt: -1 });
    const leftovers = docs.flatMap((d) => 
      d.leftovers.map((l) => ({ ...l.toObject(), distributionId: d._id }))
    );
    res.json(leftovers.filter((l) => l.qtyBaseUnit > 0));
  } catch (error) {
    res.status(500).json({ message: "Fetch leftovers failed", error: error.message });
  }
});

// --- SETTINGS & DELETION ---

procurementRoutes.post("/godown-stocks/:id/threshold", adminOnly, async (req, res) => {
  try {
    const stock = await GodownStock.findByIdAndUpdate(
      req.params.id, 
      { thresholdBaseUnit: req.body.thresholdBaseUnit }, 
      { new: true }
    );
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Threshold update failed", error: error.message });
  }
});

procurementRoutes.delete("/godown-stocks/:id", adminOnly, async (req, res) => {
  try {
    const deletedStock = await GodownStock.findByIdAndDelete(req.params.id);
    if (!deletedStock) return res.status(404).json({ message: "Stock item not found" });
    res.json({ message: "Stock item removed", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});





/**
 * @route   GET /api/procurement/purchase-orders/purchased-indents
 * @desc    Fetches all indents with a status of 'purchased'
 */
procurementRoutes.get("/purchase-orders/purchased-indents", adminOnly, async (_req, res) => {
  try {
    const indents = await Indent.find({ status: "purchased" }).sort({ createdAt: -1 });
    res.json(indents);
  } catch (error) {
    res.status(500).json({ message: "Fetch purchased indents failed", error: error.message });
  }
});