// // // // // // // // // import express from "express";
// // // // // // // // // import mongoose from "mongoose";
// // // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // // // // // import { io } from "../server.js"; 

// // // // // // // // // export const operationsRoutes = express.Router();

// // // // // // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // // // // // //   try {
// // // // // // // // //     const godownId = req.user.godownId;
// // // // // // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // // // // // //     const stock = await GodownStock.find({ godownId })
// // // // // // // // //       .populate({
// // // // // // // // //         path: "stockItemId",
// // // // // // // // //         populate: [
// // // // // // // // //           { path: "stockGroupId", select: "name" },
// // // // // // // // //           { path: "unitId", select: "name symbol" } 
// // // // // // // // //         ]
// // // // // // // // //       });

// // // // // // // // //     const formatted = stock.map(s => ({
// // // // // // // // //       stockRecordId: s._id,
// // // // // // // // //       stockItemId: s.stockItemId?._id,
// // // // // // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // // // // // // //       name: s.stockItemId?.name || "Unknown Item",
// // // // // // // // //       currentQty: s.qtyBaseUnit || 0,
// // // // // // // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // // // // // // //       image: s.stockItemId?.imageUrl || ""
// // // // // // // // //     }));

// // // // // // // // //     res.json(formatted);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // // --- 2. ORDERS & CONSUMPTIONS logic ---
// // // // // // // // // const handleStockProcessing = async (req, res) => {
// // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // //   try {
// // // // // // // // //     const result = await session.withTransaction(async () => {
// // // // // // // // //       const { items } = req.body;
// // // // // // // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // // // // // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // // // // // // //       const orderItems = [];
// // // // // // // // //       for (const item of items) {
// // // // // // // // //         const updatedStock = await GodownStock.findOne({ 
// // // // // // // // //           _id: item.stockRecordId, 
// // // // // // // // //           godownId: godownId 
// // // // // // // // //         }).session(session).populate("stockItemId");

// // // // // // // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // // // // // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // // // // // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // // // // // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // // // // // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // // // // // // //         }
// // // // // // // // //         await updatedStock.save({ session });

// // // // // // // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // // // // // // //           const alert = {
// // // // // // // // //             type: "low_stock_alert",
// // // // // // // // //             severity: "critical",
// // // // // // // // //             payload: {
// // // // // // // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // // // // // // //               itemName: updatedStock.stockItemId.name,
// // // // // // // // //               currentQty: updatedStock.qtyBaseUnit,
// // // // // // // // //               threshold: updatedStock.thresholdBaseUnit,
// // // // // // // // //               godownId,
// // // // // // // // //               stockItemId: updatedStock.stockItemId._id
// // // // // // // // //             }
// // // // // // // // //           };
// // // // // // // // //           await Notification.create([alert], { session });
// // // // // // // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // // // // // // //         }

// // // // // // // // //         orderItems.push({ 
// // // // // // // // //           stockItemId: updatedStock.stockItemId._id, 
// // // // // // // // //           qtyBaseUnit: qtyToDeduct,
// // // // // // // // //           stockRecordId: updatedStock._id 
// // // // // // // // //         });
// // // // // // // // //       }

// // // // // // // // //       // sub is usually the ID in JWT (req.user.sub)
// // // // // // // // //       const consumption = await Consumption.create([{
// // // // // // // // //         godownId,
// // // // // // // // //         userId: req.user.sub, 
// // // // // // // // //         date: new Date().toISOString(),
// // // // // // // // //         items: orderItems
// // // // // // // // //       }], { session });

// // // // // // // // //       return consumption[0];
// // // // // // // // //     });

// // // // // // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // // // // // //       .populate("userId", "name") // Populate user on creation response
// // // // // // // // //       .populate({
// // // // // // // // //         path: "items.stockItemId",
// // // // // // // // //         select: "name",
// // // // // // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // // // // // //       });

// // // // // // // // //     res.status(201).json(populatedResult);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(400).json({ error: error.message });
// // // // // // // // //   } finally {
// // // // // // // // //     await session.endSession();
// // // // // // // // //   }
// // // // // // // // // };

// // // // // // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // // // // // --- 3. CONSUMPTION HISTORY (UPDATED WITH USER POPULATION) ---

// // // // // // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // // // // // //   try {
// // // // // // // // //     const data = await Consumption.find()
// // // // // // // // //       .populate("godownId", "name")
// // // // // // // // //       .populate("userId", "name") // <-- THIS FIXES "UNASSIGNED STAFF"
// // // // // // // // //       .populate({
// // // // // // // // //         path: "items.stockItemId",
// // // // // // // // //         select: "name",
// // // // // // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // // // // // //       }) 
// // // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // // //     res.json(data);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // // // // // //   try {
// // // // // // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // // // // // //       .populate("userId", "name")
// // // // // // // // //       .populate({
// // // // // // // // //         path: "items.stockItemId",
// // // // // // // // //         select: "name",
// // // // // // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // // // // // //       }) 
// // // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // // //     res.json(data);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // // --- 4. REQUESTS ---

// // // // // // // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // // //   try {
// // // // // // // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // // // // // // //     const requests = await Request.find(filter)
// // // // // // // // //       .populate("godownId", "name")
// // // // // // // // //       .populate("userId", "name") // Added for admin clarity
// // // // // // // // //       .populate({
// // // // // // // // //         path: "items.stockItemId",
// // // // // // // // //         select: "name",
// // // // // // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // // // // // //       }) 
// // // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // // //     res.json(requests);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // // // // // //   const created = await Request.create({ 
// // // // // // // // //     ...req.body, 
// // // // // // // // //     userId: req.user.sub, 
// // // // // // // // //     godownId: req.user.godownId, 
// // // // // // // // //     status: "pending" 
// // // // // // // // //   });
  
// // // // // // // // //   const notification = await Notification.create({ 
// // // // // // // // //     type: "request_created", 
// // // // // // // // //     severity: "info", 
// // // // // // // // //     payload: { 
// // // // // // // // //       message: `New consumption request created`,
// // // // // // // // //       requestId: created._id,
// // // // // // // // //       godownId: req.user.godownId 
// // // // // // // // //     } 
// // // // // // // // //   });

// // // // // // // // //   io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // // // // // //   res.status(201).json(created);
// // // // // // // // // });

// // // // // // // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // //   try {
// // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // //       const request = await Request.findById(req.params.id).session(session);
// // // // // // // // //       if (!request) throw new Error("Request not found");
      
// // // // // // // // //       request.status = "approved";
// // // // // // // // //       request.adminDecision = req.body.note || "Approved";
// // // // // // // // //       await request.save({ session });
      
// // // // // // // // //       await Consumption.create([{ 
// // // // // // // // //         godownId: request.godownId, 
// // // // // // // // //         userId: request.userId, 
// // // // // // // // //         date: request.targetDate || new Date(), 
// // // // // // // // //         items: request.items 
// // // // // // // // //       }], { session });
      
// // // // // // // // //       for (const item of request.items) {
// // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // // // //           { session }
// // // // // // // // //         );
// // // // // // // // //       }
      
// // // // // // // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // // // // // // //     });
// // // // // // // // //     res.json({ message: "Request approved and stock updated" });
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   } finally {
// // // // // // // // //     await session.endSession();
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // // // // // // //   const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // // // // // //     status: "rejected", 
// // // // // // // // //     adminDecision: req.body.note || "Rejected" 
// // // // // // // // //   }, { new: true });
  
// // // // // // // // //   io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // // // // // //   res.json(request);
// // // // // // // // // });

// // // // // // // // // // --- 5. TRANSFERS ---

// // // // // // // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // // // // // // //   const session = await mongoose.startSession();
// // // // // // // // //   try {
// // // // // // // // //     await session.withTransaction(async () => {
// // // // // // // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // // // // // // //       for (const item of req.body.items || []) {
// // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // // // //           { session }
// // // // // // // // //         );
// // // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // // // // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // // // // // // //           { upsert: true, session }
// // // // // // // // //         );
// // // // // // // // //       }
// // // // // // // // //       res.status(201).json(transfer[0]);
// // // // // // // // //     });
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   } finally {
// // // // // // // // //     await session.endSession();
// // // // // // // // //   }
// // // // // // // // // });

// // // // // // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // // // // // //   res.json(await Transfer.find()
// // // // // // // // // //     .populate("fromGodownId", "name")
// // // // // // // // // //     .populate("toGodownId", "name")
// // // // // // // // // //     .populate("items.stockItemId", "name")
// // // // // // // // // //     .sort({ createdAt: -1 }));
// // // // // // // // // // });






// // // // // // // // // // --- 5. TRANSFERS (INTEGRATED WITH DEEP POPULATION) ---

// // // // // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // // // // //   try {
// // // // // // // // //     const transfers = await Transfer.find()
// // // // // // // // //       .populate("fromGodownId", "name")
// // // // // // // // //       .populate("toGodownId", "name")
// // // // // // // // //       .populate({
// // // // // // // // //         path: "items.stockItemId",
// // // // // // // // //         select: "name unitId",
// // // // // // // // //         // This nested populate reaches the Unit collection
// // // // // // // // //         populate: {
// // // // // // // // //           path: "unitId",
// // // // // // // // //           select: "symbol name"
// // // // // // // // //         }
// // // // // // // // //       })
// // // // // // // // //       .sort({ createdAt: -1 });

// // // // // // // // //     res.json(transfers);
// // // // // // // // //   } catch (error) {
// // // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // // //   }
// // // // // // // // // });












// // // // // // // // // // --- 6. NOTIFICATIONS ---

// // // // // // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // // //   const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // // // // // //   res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // // // // // // });




















// // // // // // // // import express from "express";
// // // // // // // // import mongoose from "mongoose";
// // // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // // // // import { io } from "../server.js"; 

// // // // // // // // export const operationsRoutes = express.Router();

// // // // // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // // // // //   try {
// // // // // // // //     const godownId = req.user.godownId;
// // // // // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // // // // //     const stock = await GodownStock.find({ godownId })
// // // // // // // //       .populate({
// // // // // // // //         path: "stockItemId",
// // // // // // // //         populate: [
// // // // // // // //           { path: "stockGroupId", select: "name" },
// // // // // // // //           { path: "unitId", select: "name symbol" } 
// // // // // // // //         ]
// // // // // // // //       });

// // // // // // // //     const formatted = stock.map(s => ({
// // // // // // // //       stockRecordId: s._id,
// // // // // // // //       stockItemId: s.stockItemId?._id,
// // // // // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // // // // // //       name: s.stockItemId?.name || "Unknown Item",
// // // // // // // //       currentQty: s.qtyBaseUnit || 0,
// // // // // // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // // // // // //       image: s.stockItemId?.imageUrl || ""
// // // // // // // //     }));

// // // // // // // //     res.json(formatted);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
// // // // // // // // const handleStockProcessing = async (req, res) => {
// // // // // // // //   const session = await mongoose.startSession();
// // // // // // // //   try {
// // // // // // // //     const result = await session.withTransaction(async () => {
// // // // // // // //       const { items } = req.body;
// // // // // // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // // // // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // // // // // //       const orderItems = [];
// // // // // // // //       for (const item of items) {
// // // // // // // //         const updatedStock = await GodownStock.findOne({ 
// // // // // // // //           _id: item.stockRecordId, 
// // // // // // // //           godownId: godownId 
// // // // // // // //         }).session(session).populate("stockItemId");

// // // // // // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // // // // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // // // // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // // // // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // // // // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // // // // // //         }
// // // // // // // //         await updatedStock.save({ session });

// // // // // // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // // // // // //           const alert = {
// // // // // // // //             type: "low_stock_alert",
// // // // // // // //             severity: "critical",
// // // // // // // //             payload: {
// // // // // // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // // // // // //               itemName: updatedStock.stockItemId.name,
// // // // // // // //               currentQty: updatedStock.qtyBaseUnit,
// // // // // // // //               threshold: updatedStock.thresholdBaseUnit,
// // // // // // // //               godownId,
// // // // // // // //               stockItemId: updatedStock.stockItemId._id
// // // // // // // //             }
// // // // // // // //           };
// // // // // // // //           await Notification.create([alert], { session });
// // // // // // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // // // // // //         }

// // // // // // // //         orderItems.push({ 
// // // // // // // //           stockItemId: updatedStock.stockItemId._id, 
// // // // // // // //           qtyBaseUnit: qtyToDeduct,
// // // // // // // //           stockRecordId: updatedStock._id 
// // // // // // // //         });
// // // // // // // //       }

// // // // // // // //       const consumption = await Consumption.create([{
// // // // // // // //         godownId,
// // // // // // // //         userId: req.user.sub, 
// // // // // // // //         date: new Date().toISOString(),
// // // // // // // //         items: orderItems
// // // // // // // //       }], { session });

// // // // // // // //       return consumption[0];
// // // // // // // //     });

// // // // // // // //     // --- INTEGRATED POPULATION FOR CREATION RESPONSE ---
// // // // // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // // // // //       .populate("userId", "name")
// // // // // // // //       .populate({
// // // // // // // //         path: "items.stockItemId",
// // // // // // // //         select: "name stockGroupId unitId",
// // // // // // // //         populate: [
// // // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // // //           { path: "stockGroupId", select: "name" }
// // // // // // // //         ]
// // // // // // // //       });

// // // // // // // //     res.status(201).json(populatedResult);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(400).json({ error: error.message });
// // // // // // // //   } finally {
// // // // // // // //     await session.endSession();
// // // // // // // //   }
// // // // // // // // };

// // // // // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // // // // --- 3. CONSUMPTION HISTORY (UPDATED WITH GROUP POPULATION) ---
// // // // // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // // // // //   try {
// // // // // // // //     const data = await Consumption.find()
// // // // // // // //       .populate("godownId", "name")
// // // // // // // //       .populate("userId", "name")
// // // // // // // //       .populate({
// // // // // // // //         path: "items.stockItemId",
// // // // // // // //         select: "name stockGroupId unitId", 
// // // // // // // //         populate: [
// // // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // // //           { path: "stockGroupId", select: "name" } 
// // // // // // // //         ]
// // // // // // // //       }) 
// // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // //     res.json(data);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // // // // //   try {
// // // // // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // // // // //       .populate("userId", "name")
// // // // // // // //       .populate({
// // // // // // // //         path: "items.stockItemId",
// // // // // // // //         select: "name stockGroupId unitId",
// // // // // // // //         populate: [
// // // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // // //           { path: "stockGroupId", select: "name" }
// // // // // // // //         ]
// // // // // // // //       }) 
// // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // //     res.json(data);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // // --- 4. REQUESTS ---
// // // // // // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // //   try {
// // // // // // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // // // // // //     const requests = await Request.find(filter)
// // // // // // // //       .populate("godownId", "name")
// // // // // // // //       .populate("userId", "name")
// // // // // // // //       .populate({
// // // // // // // //         path: "items.stockItemId",
// // // // // // // //         select: "name unitId",
// // // // // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // // // // //       }) 
// // // // // // // //       .sort({ createdAt: -1 });
// // // // // // // //     res.json(requests);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // // // // //   const created = await Request.create({ 
// // // // // // // //     ...req.body, 
// // // // // // // //     userId: req.user.sub, 
// // // // // // // //     godownId: req.user.godownId, 
// // // // // // // //     status: "pending" 
// // // // // // // //   });
  
// // // // // // // //   const notification = await Notification.create({ 
// // // // // // // //     type: "request_created", 
// // // // // // // //     severity: "info", 
// // // // // // // //     payload: { 
// // // // // // // //       message: `New consumption request created`,
// // // // // // // //       requestId: created._id,
// // // // // // // //       godownId: req.user.godownId 
// // // // // // // //     } 
// // // // // // // //   });

// // // // // // // //   io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // // // // //   res.status(201).json(created);
// // // // // // // // });

// // // // // // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // // // // // //   const session = await mongoose.startSession();
// // // // // // // //   try {
// // // // // // // //     await session.withTransaction(async () => {
// // // // // // // //       const request = await Request.findById(req.params.id).session(session);
// // // // // // // //       if (!request) throw new Error("Request not found");
      
// // // // // // // //       request.status = "approved";
// // // // // // // //       request.adminDecision = req.body.note || "Approved";
// // // // // // // //       await request.save({ session });
      
// // // // // // // //       await Consumption.create([{ 
// // // // // // // //         godownId: request.godownId, 
// // // // // // // //         userId: request.userId, 
// // // // // // // //         date: request.targetDate || new Date(), 
// // // // // // // //         items: request.items 
// // // // // // // //       }], { session });
      
// // // // // // // //       for (const item of request.items) {
// // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // // //           { session }
// // // // // // // //         );
// // // // // // // //       }
      
// // // // // // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // // // // // //     });
// // // // // // // //     res.json({ message: "Request approved and stock updated" });
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   } finally {
// // // // // // // //     await session.endSession();
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // // // // // //   const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // // // // //     status: "rejected", 
// // // // // // // //     adminDecision: req.body.note || "Rejected" 
// // // // // // // //   }, { new: true });
  
// // // // // // // //   io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // // // // //   res.json(request);
// // // // // // // // });

// // // // // // // // // --- 5. TRANSFERS ---
// // // // // // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // // // // // //   const session = await mongoose.startSession();
// // // // // // // //   try {
// // // // // // // //     await session.withTransaction(async () => {
// // // // // // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // // // // // //       for (const item of req.body.items || []) {
// // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // // //           { session }
// // // // // // // //         );
// // // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // // // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // // // // // //           { upsert: true, session }
// // // // // // // //         );
// // // // // // // //       }
// // // // // // // //       res.status(201).json(transfer[0]);
// // // // // // // //     });
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   } finally {
// // // // // // // //     await session.endSession();
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // // // //   try {
// // // // // // // //     const transfers = await Transfer.find()
// // // // // // // //       .populate("fromGodownId", "name")
// // // // // // // //       .populate("toGodownId", "name")
// // // // // // // //       .populate({
// // // // // // // //         path: "items.stockItemId",
// // // // // // // //         select: "name unitId",
// // // // // // // //         populate: {
// // // // // // // //           path: "unitId",
// // // // // // // //           select: "symbol name"
// // // // // // // //         }
// // // // // // // //       })
// // // // // // // //       .sort({ createdAt: -1 });

// // // // // // // //     res.json(transfers);
// // // // // // // //   } catch (error) {
// // // // // // // //     res.status(500).json({ error: error.message });
// // // // // // // //   }
// // // // // // // // });

// // // // // // // // // --- 6. NOTIFICATIONS ---
// // // // // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // // // // //   const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // // // // //   res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // // // // // });










// // // // // // // import express from "express";
// // // // // // // import mongoose from "mongoose";
// // // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // // // import { io } from "../server.js"; 

// // // // // // // export const operationsRoutes = express.Router();

// // // // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const godownId = req.user.godownId;
// // // // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // // // //     const stock = await GodownStock.find({ godownId })
// // // // // // //       .populate({
// // // // // // //         path: "stockItemId",
// // // // // // //         populate: [
// // // // // // //           { path: "stockGroupId", select: "name" },
// // // // // // //           { path: "unitId", select: "name symbol" } 
// // // // // // //         ]
// // // // // // //       });

// // // // // // //     const formatted = stock.map(s => ({
// // // // // // //       stockRecordId: s._id,
// // // // // // //       stockItemId: s.stockItemId?._id,
// // // // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // // // // //       name: s.stockItemId?.name || "Unknown Item",
// // // // // // //       currentQty: s.qtyBaseUnit || 0,
// // // // // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // // // // //       image: s.stockItemId?.imageUrl || ""
// // // // // // //     }));

// // // // // // //     res.json(formatted);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
// // // // // // // const handleStockProcessing = async (req, res) => {
// // // // // // //   const session = await mongoose.startSession();
// // // // // // //   try {
// // // // // // //     const result = await session.withTransaction(async () => {
// // // // // // //       const { items } = req.body;
// // // // // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // // // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // // // // //       const orderItems = [];
// // // // // // //       for (const item of items) {
// // // // // // //         const updatedStock = await GodownStock.findOne({ 
// // // // // // //           _id: item.stockRecordId, 
// // // // // // //           godownId: godownId 
// // // // // // //         }).session(session).populate("stockItemId");

// // // // // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // // // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // // // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // // // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // // // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // // // // //         }
// // // // // // //         await updatedStock.save({ session });

// // // // // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // // // // //           const alert = {
// // // // // // //             type: "low_stock_alert",
// // // // // // //             severity: "critical",
// // // // // // //             payload: {
// // // // // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // // // // //               itemName: updatedStock.stockItemId.name,
// // // // // // //               currentQty: updatedStock.qtyBaseUnit,
// // // // // // //               threshold: updatedStock.thresholdBaseUnit,
// // // // // // //               godownId,
// // // // // // //               stockItemId: updatedStock.stockItemId._id
// // // // // // //             }
// // // // // // //           };
// // // // // // //           await Notification.create([alert], { session });
// // // // // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // // // // //         }

// // // // // // //         orderItems.push({ 
// // // // // // //           stockItemId: updatedStock.stockItemId._id, 
// // // // // // //           qtyBaseUnit: qtyToDeduct,
// // // // // // //           stockRecordId: updatedStock._id 
// // // // // // //         });
// // // // // // //       }

// // // // // // //       const consumption = await Consumption.create([{
// // // // // // //         godownId,
// // // // // // //         userId: req.user.sub, 
// // // // // // //         date: new Date().toISOString(),
// // // // // // //         items: orderItems
// // // // // // //       }], { session });

// // // // // // //       return consumption[0];
// // // // // // //     });

// // // // // // //     // --- INTEGRATED POPULATION FOR CREATION RESPONSE ---
// // // // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // // // //       .populate("userId", "name")
// // // // // // //       .populate("godownId", "name") 
// // // // // // //       .populate({
// // // // // // //         path: "items.stockItemId",
// // // // // // //         select: "name stockGroupId unitId",
// // // // // // //         populate: [
// // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // //           { path: "stockGroupId", select: "name" } 
// // // // // // //         ]
// // // // // // //       });

// // // // // // //     res.status(201).json(populatedResult);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(400).json({ error: error.message });
// // // // // // //   } finally {
// // // // // // //     await session.endSession();
// // // // // // //   }
// // // // // // // };

// // // // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // // // --- 3. CONSUMPTION HISTORY ---
// // // // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // // // //   try {
// // // // // // //     const data = await Consumption.find()
// // // // // // //       .populate("godownId", "name")
// // // // // // //       .populate("userId", "name")
// // // // // // //       .populate({
// // // // // // //         path: "items.stockItemId",
// // // // // // //         select: "name stockGroupId unitId", 
// // // // // // //         populate: [
// // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // //           { path: "stockGroupId", select: "name" } 
// // // // // // //         ]
// // // // // // //       }) 
// // // // // // //       .sort({ createdAt: -1 });
// // // // // // //     res.json(data);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // // // //       .populate("godownId", "name")
// // // // // // //       .populate("userId", "name")
// // // // // // //       .populate({
// // // // // // //         path: "items.stockItemId",
// // // // // // //         select: "name stockGroupId unitId",
// // // // // // //         populate: [
// // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // //           { path: "stockGroupId", select: "name" }
// // // // // // //         ]
// // // // // // //       }) 
// // // // // // //       .sort({ createdAt: -1 });
// // // // // // //     res.json(data);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // // --- 4. REQUESTS ---
// // // // // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // // // // //     const requests = await Request.find(filter)
// // // // // // //       .populate("godownId", "name")
// // // // // // //       .populate("userId", "name")
// // // // // // //       .populate({
// // // // // // //         path: "items.stockItemId",
// // // // // // //         select: "name stockGroupId unitId",
// // // // // // //         populate: [
// // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // //           { path: "stockGroupId", select: "name" }
// // // // // // //         ]
// // // // // // //       }) 
// // // // // // //       .sort({ createdAt: -1 });
// // // // // // //     res.json(requests);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const created = await Request.create({ 
// // // // // // //       ...req.body, 
// // // // // // //       userId: req.user.sub, 
// // // // // // //       godownId: req.user.godownId, 
// // // // // // //       status: "pending" 
// // // // // // //     });
    
// // // // // // //     const notification = await Notification.create({ 
// // // // // // //       type: "request_created", 
// // // // // // //       severity: "info", 
// // // // // // //       payload: { 
// // // // // // //         message: `New consumption request created`,
// // // // // // //         requestId: created._id,
// // // // // // //         godownId: req.user.godownId 
// // // // // // //       } 
// // // // // // //     });

// // // // // // //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // // // //     res.status(201).json(created);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(400).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // // // // //   const session = await mongoose.startSession();
// // // // // // //   try {
// // // // // // //     await session.withTransaction(async () => {
// // // // // // //       const request = await Request.findById(req.params.id).session(session);
// // // // // // //       if (!request) throw new Error("Request not found");
      
// // // // // // //       request.status = "approved";
// // // // // // //       request.adminDecision = req.body.note || "Approved";
// // // // // // //       await request.save({ session });
      
// // // // // // //       await Consumption.create([{ 
// // // // // // //         godownId: request.godownId, 
// // // // // // //         userId: request.userId, 
// // // // // // //         date: request.targetDate || new Date(), 
// // // // // // //         items: request.items 
// // // // // // //       }], { session });
      
// // // // // // //       for (const item of request.items) {
// // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // //           { session }
// // // // // // //         );
// // // // // // //       }
      
// // // // // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // // // // //     });
// // // // // // //     res.json({ message: "Request approved and stock updated" });
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   } finally {
// // // // // // //     await session.endSession();
// // // // // // //   }
// // // // // // // });

// // // // // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // // // //       status: "rejected", 
// // // // // // //       adminDecision: req.body.note || "Rejected" 
// // // // // // //     }, { new: true });
    
// // // // // // //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // // // //     res.json(request);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // // --- 5. TRANSFERS ---
// // // // // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // // // // //   const session = await mongoose.startSession();
// // // // // // //   try {
// // // // // // //     await session.withTransaction(async () => {
// // // // // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // // // // //       for (const item of req.body.items || []) {
// // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // // //           { session }
// // // // // // //         );
// // // // // // //         await GodownStock.findOneAndUpdate(
// // // // // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // // // // //           { upsert: true, session }
// // // // // // //         );
// // // // // // //       }
// // // // // // //       res.status(201).json(transfer[0]);
// // // // // // //     });
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   } finally {
// // // // // // //     await session.endSession();
// // // // // // //   }
// // // // // // // });

// // // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // // //   try {
// // // // // // //     const transfers = await Transfer.find()
// // // // // // //       .populate("fromGodownId", "name")
// // // // // // //       .populate("toGodownId", "name")
// // // // // // //       .populate({
// // // // // // //         path: "items.stockItemId",
// // // // // // //         select: "name stockGroupId unitId",
// // // // // // //         populate: [
// // // // // // //           { path: "unitId", select: "symbol name" },
// // // // // // //           { path: "stockGroupId", select: "name" }
// // // // // // //         ]
// // // // // // //       })
// // // // // // //       .sort({ createdAt: -1 });

// // // // // // //     res.json(transfers);
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });

// // // // // // // // --- 6. NOTIFICATIONS ---
// // // // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // // // //   try {
// // // // // // //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // // // //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // // // //   } catch (error) {
// // // // // // //     res.status(500).json({ error: error.message });
// // // // // // //   }
// // // // // // // });





// // // // // // import express from "express";
// // // // // // import mongoose from "mongoose";
// // // // // // import { authorize } from "../middleware/auth.js";
// // // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // // import { io } from "../server.js"; 
// // // // // // // Add these at the very top with your other imports
// // // // // // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// // // // // // export const operationsRoutes = express.Router();

// // // // // // /**
// // // // // //  * SHARED UTILITY: Deep Population Config
// // // // // //  * This ensures consistency across all routes that need detailed item info
// // // // // //  */
// // // // // // const deepPopulateItem = {
// // // // // //   path: "items.stockItemId",
// // // // // //   model: "StockItem", // Explicitly tell Mongoose which model to use
// // // // // //   select: "name stockGroupId unitId imageUrl",
// // // // // //   populate: [
// // // // // //     { 
// // // // // //       path: "unitId", 
// // // // // //       model: "Unit", // Explicitly tell Mongoose which model to use
// // // // // //       select: "symbol name" 
// // // // // //     },
// // // // // //     { 
// // // // // //       path: "stockGroupId", 
// // // // // //       model: "StockGroup", // Explicitly tell Mongoose which model to use
// // // // // //       select: "name" 
// // // // // //     } 
// // // // // //   ]
// // // // // // };

// // // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const godownId = req.user.godownId;
// // // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // // //     const stock = await GodownStock.find({ godownId })
// // // // // //       .populate({
// // // // // //         path: "stockItemId",
// // // // // //         populate: [
// // // // // //           { path: "stockGroupId", select: "name" },
// // // // // //           { path: "unitId", select: "name symbol" } 
// // // // // //         ]
// // // // // //       });

// // // // // //     const formatted = stock.map(s => ({
// // // // // //       stockRecordId: s._id,
// // // // // //       stockItemId: s.stockItemId?._id,
// // // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // // // //       groupName: s.stockItemId?.stockGroupId?.name || "General", // Added for easier frontend access
// // // // // //       name: s.stockItemId?.name || "Unknown Item",
// // // // // //       currentQty: s.qtyBaseUnit || 0,
// // // // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // // // //       image: s.stockItemId?.imageUrl || ""
// // // // // //     }));

// // // // // //     res.json(formatted);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
// // // // // // const handleStockProcessing = async (req, res) => {
// // // // // //   const session = await mongoose.startSession();
// // // // // //   try {
// // // // // //     const result = await session.withTransaction(async () => {
// // // // // //       const { items } = req.body;
// // // // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // // // //       const orderItems = [];
// // // // // //       for (const item of items) {
// // // // // //         const updatedStock = await GodownStock.findOne({ 
// // // // // //           _id: item.stockRecordId, 
// // // // // //           godownId: godownId 
// // // // // //         }).session(session).populate("stockItemId");

// // // // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // // // //         }
// // // // // //         await updatedStock.save({ session });

// // // // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // // // //           const alert = {
// // // // // //             type: "low_stock_alert",
// // // // // //             severity: "critical",
// // // // // //             payload: {
// // // // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // // // //               itemName: updatedStock.stockItemId.name,
// // // // // //               currentQty: updatedStock.qtyBaseUnit,
// // // // // //               threshold: updatedStock.thresholdBaseUnit,
// // // // // //               godownId,
// // // // // //               stockItemId: updatedStock.stockItemId._id
// // // // // //             }
// // // // // //           };
// // // // // //           await Notification.create([alert], { session });
// // // // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // // // //         }

// // // // // //         orderItems.push({ 
// // // // // //           stockItemId: updatedStock.stockItemId._id, 
// // // // // //           qtyBaseUnit: qtyToDeduct,
// // // // // //           stockRecordId: updatedStock._id 
// // // // // //         });
// // // // // //       }

// // // // // //       const consumption = await Consumption.create([{
// // // // // //         godownId,
// // // // // //         userId: req.user.sub, 
// // // // // //         date: new Date().toISOString(),
// // // // // //         items: orderItems
// // // // // //       }], { session });

// // // // // //       return consumption[0];
// // // // // //     });

// // // // // //     // Integrated Deep Population for the Creation Response
// // // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // // //       .populate("userId", "name")
// // // // // //       .populate("godownId", "name") 
// // // // // //       .populate(deepPopulateItem);

// // // // // //     res.status(201).json(populatedResult);
// // // // // //   } catch (error) {
// // // // // //     res.status(400).json({ error: error.message });
// // // // // //   } finally {
// // // // // //     await session.endSession();
// // // // // //   }
// // // // // // };

// // // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // // --- 3. CONSUMPTION HISTORY ---
// // // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // // //   try {
// // // // // //     const data = await Consumption.find()
// // // // // //       .populate("godownId", "name")
// // // // // //       .populate("userId", "name")
// // // // // //       .populate(deepPopulateItem) // Deeply populated Group & Unit
// // // // // //       .sort({ createdAt: -1 });
// // // // // //     res.json(data);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // // //       .populate("godownId", "name")
// // // // // //       .populate("userId", "name")
// // // // // //       .populate(deepPopulateItem) 
// // // // // //       .sort({ createdAt: -1 });
// // // // // //     res.json(data);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- 4. REQUESTS ---
// // // // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // // // //     const requests = await Request.find(filter)
// // // // // //       .populate("godownId", "name")
// // // // // //       .populate("userId", "name")
// // // // // //       .populate(deepPopulateItem) 
// // // // // //       .sort({ createdAt: -1 });
// // // // // //     res.json(requests);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const created = await Request.create({ 
// // // // // //       ...req.body, 
// // // // // //       userId: req.user.sub, 
// // // // // //       godownId: req.user.godownId, 
// // // // // //       status: "pending" 
// // // // // //     });
    
// // // // // //     const notification = await Notification.create({ 
// // // // // //       type: "request_created", 
// // // // // //       severity: "info", 
// // // // // //       payload: { 
// // // // // //         message: `New consumption request created`,
// // // // // //         requestId: created._id,
// // // // // //         godownId: req.user.godownId 
// // // // // //       } 
// // // // // //     });

// // // // // //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // // //     res.status(201).json(created);
// // // // // //   } catch (error) {
// // // // // //     res.status(400).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // // // //   const session = await mongoose.startSession();
// // // // // //   try {
// // // // // //     await session.withTransaction(async () => {
// // // // // //       const request = await Request.findById(req.params.id).session(session);
// // // // // //       if (!request) throw new Error("Request not found");
      
// // // // // //       request.status = "approved";
// // // // // //       request.adminDecision = req.body.note || "Approved";
// // // // // //       await request.save({ session });
      
// // // // // //       await Consumption.create([{ 
// // // // // //         godownId: request.godownId, 
// // // // // //         userId: request.userId, 
// // // // // //         date: request.targetDate || new Date(), 
// // // // // //         items: request.items 
// // // // // //       }], { session });
      
// // // // // //       for (const item of request.items) {
// // // // // //         await GodownStock.findOneAndUpdate(
// // // // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // //           { session }
// // // // // //         );
// // // // // //       }
      
// // // // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // // // //     });
// // // // // //     res.json({ message: "Request approved and stock updated" });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   } finally {
// // // // // //     await session.endSession();
// // // // // //   }
// // // // // // });

// // // // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // // //       status: "rejected", 
// // // // // //       adminDecision: req.body.note || "Rejected" 
// // // // // //     }, { new: true });
    
// // // // // //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // // //     res.json(request);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- 5. TRANSFERS ---
// // // // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // // // //   const session = await mongoose.startSession();
// // // // // //   try {
// // // // // //     await session.withTransaction(async () => {
// // // // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // // // //       for (const item of req.body.items || []) {
// // // // // //         await GodownStock.findOneAndUpdate(
// // // // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // // //           { session }
// // // // // //         );
// // // // // //         await GodownStock.findOneAndUpdate(
// // // // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // // // //           { upsert: true, session }
// // // // // //         );
// // // // // //       }
// // // // // //       res.status(201).json(transfer[0]);
// // // // // //     });
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   } finally {
// // // // // //     await session.endSession();
// // // // // //   }
// // // // // // });

// // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // //   try {
// // // // // //     const transfers = await Transfer.find()
// // // // // //       .populate("fromGodownId", "name")
// // // // // //       .populate("toGodownId", "name")
// // // // // //       .populate(deepPopulateItem)
// // // // // //       .sort({ createdAt: -1 });

// // // // // //     res.json(transfers);
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });

// // // // // // // --- 6. NOTIFICATIONS ---
// // // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // // //   try {
// // // // // //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // // //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // // //   } catch (error) {
// // // // // //     res.status(500).json({ error: error.message });
// // // // // //   }
// // // // // // });










// // // // // import express from "express";
// // // // // import mongoose from "mongoose";
// // // // // import { authorize } from "../middleware/auth.js";
// // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // import { io } from "../server.js"; 
// // // // // // CRITICAL: Explicitly import these so Mongoose registers the models for population
// // // // // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// // // // // export const operationsRoutes = express.Router();

// // // // // /**
// // // // //  * SHARED UTILITY: Deep Population Config
// // // // //  * Using explicit 'model' properties to prevent "General" fallback issues
// // // // //  */
// // // // // const deepPopulateItem = {
// // // // //   path: "items.stockItemId",
// // // // //   model: "StockItem", 
// // // // //   select: "name stockGroupId unitId imageUrl",
// // // // //   populate: [
// // // // //     { 
// // // // //       path: "unitId", 
// // // // //       model: "Unit", 
// // // // //       select: "symbol name" 
// // // // //     },
// // // // //     { 
// // // // //       path: "stockGroupId", 
// // // // //       model: "StockGroup", 
// // // // //       select: "name" // Ensure 'name' is selected here
// // // // //     } 
// // // // //   ]
// // // // // };

// // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // //   try {
// // // // //     const godownId = req.user.godownId;
// // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // //     const stock = await GodownStock.find({ godownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         model: "StockItem",
// // // // //         populate: [
// // // // //           { path: "stockGroupId", model: "StockGroup", select: "name" },
// // // // //           { path: "unitId", model: "Unit", select: "name symbol" } 
// // // // //         ]
// // // // //       });

// // // // //     const formatted = stock.map(s => ({
// // // // //       stockRecordId: s._id,
// // // // //       stockItemId: s.stockItemId?._id,
// // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // // //       groupName: s.stockItemId?.stockGroupId?.name || "General", 
// // // // //       name: s.stockItemId?.name || "Unknown Item",
// // // // //       currentQty: s.qtyBaseUnit || 0,
// // // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // // //       image: s.stockItemId?.imageUrl || ""
// // // // //     }));

// // // // //     res.json(formatted);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
// // // // // const handleStockProcessing = async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   try {
// // // // //     const result = await session.withTransaction(async () => {
// // // // //       const { items } = req.body;
// // // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // // //       const orderItems = [];
// // // // //       for (const item of items) {
// // // // //         const updatedStock = await GodownStock.findOne({ 
// // // // //           _id: item.stockRecordId, 
// // // // //           godownId: godownId 
// // // // //         }).session(session).populate("stockItemId");

// // // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // // //         }
// // // // //         await updatedStock.save({ session });

// // // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // // //           const alert = {
// // // // //             type: "low_stock_alert",
// // // // //             severity: "critical",
// // // // //             payload: {
// // // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // // //               itemName: updatedStock.stockItemId.name,
// // // // //               currentQty: updatedStock.qtyBaseUnit,
// // // // //               threshold: updatedStock.thresholdBaseUnit,
// // // // //               godownId,
// // // // //               stockItemId: updatedStock.stockItemId._id
// // // // //             }
// // // // //           };
// // // // //           await Notification.create([alert], { session });
// // // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // // //         }

// // // // //         orderItems.push({ 
// // // // //           stockItemId: updatedStock.stockItemId._id, 
// // // // //           qtyBaseUnit: qtyToDeduct,
// // // // //           stockRecordId: updatedStock._id 
// // // // //         });
// // // // //       }

// // // // //       const consumption = await Consumption.create([{
// // // // //         godownId,
// // // // //         userId: req.user.sub, 
// // // // //         date: new Date().toISOString(),
// // // // //         items: orderItems
// // // // //       }], { session });

// // // // //       return consumption[0];
// // // // //     });

// // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // //       .populate("userId", "name")
// // // // //       .populate("godownId", "name") 
// // // // //       .populate(deepPopulateItem);

// // // // //     res.status(201).json(populatedResult);
// // // // //   } catch (error) {
// // // // //     res.status(400).json({ error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // };

// // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // --- 3. CONSUMPTION HISTORY (WITH DEBUG LOG) ---
// // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // //   try {
// // // // //     const data = await Consumption.find()
// // // // //       .populate("godownId", "name")
// // // // //       .populate("userId", "name")
// // // // //       .populate(deepPopulateItem)
// // // // //       .sort({ createdAt: -1 });

// // // // //     // DEBUG: Check terminal output to see if StockGroup name is reaching the server
// // // // //     if (data.length > 0 && data[0].items.length > 0) {
// // // // //       console.log("DEBUG GROUP:", data[0].items[0].stockItemId?.stockGroupId);
// // // // //     }

// // // // //     res.json(data);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // //   try {
// // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // //       .populate("godownId", "name")
// // // // //       .populate("userId", "name")
// // // // //       .populate(deepPopulateItem) 
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(data);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- 4. REQUESTS ---
// // // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // // //   try {
// // // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // // //     const requests = await Request.find(filter)
// // // // //       .populate("godownId", "name")
// // // // //       .populate("userId", "name")
// // // // //       .populate(deepPopulateItem) 
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(requests);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // //   try {
// // // // //     const created = await Request.create({ 
// // // // //       ...req.body, 
// // // // //       userId: req.user.sub, 
// // // // //       godownId: req.user.godownId, 
// // // // //       status: "pending" 
// // // // //     });
    
// // // // //     const notification = await Notification.create({ 
// // // // //       type: "request_created", 
// // // // //       severity: "info", 
// // // // //       payload: { 
// // // // //         message: `New consumption request created`,
// // // // //         requestId: created._id,
// // // // //         godownId: req.user.godownId 
// // // // //       } 
// // // // //     });

// // // // //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // //     res.status(201).json(created);
// // // // //   } catch (error) {
// // // // //     res.status(400).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const request = await Request.findById(req.params.id).session(session);
// // // // //       if (!request) throw new Error("Request not found");
      
// // // // //       request.status = "approved";
// // // // //       request.adminDecision = req.body.note || "Approved";
// // // // //       await request.save({ session });
      
// // // // //       await Consumption.create([{ 
// // // // //         godownId: request.godownId, 
// // // // //         userId: request.userId, 
// // // // //         date: request.targetDate || new Date(), 
// // // // //         items: request.items 
// // // // //       }], { session });
      
// // // // //       for (const item of request.items) {
// // // // //         await GodownStock.findOneAndUpdate(
// // // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // //           { session }
// // // // //         );
// // // // //       }
      
// // // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // // //     });
// // // // //     res.json({ message: "Request approved and stock updated" });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // // //   try {
// // // // //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // //       status: "rejected", 
// // // // //       adminDecision: req.body.note || "Rejected" 
// // // // //     }, { new: true });
    
// // // // //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // //     res.json(request);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- 5. TRANSFERS ---
// // // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // // //   const session = await mongoose.startSession();
// // // // //   try {
// // // // //     await session.withTransaction(async () => {
// // // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // // //       for (const item of req.body.items || []) {
// // // // //         await GodownStock.findOneAndUpdate(
// // // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // // //           { session }
// // // // //         );
// // // // //         await GodownStock.findOneAndUpdate(
// // // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // // //           { upsert: true, session }
// // // // //         );
// // // // //       }
// // // // //       res.status(201).json(transfer[0]);
// // // // //     });
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // });

// // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // //   try {
// // // // //     const transfers = await Transfer.find()
// // // // //       .populate("fromGodownId", "name")
// // // // //       .populate("toGodownId", "name")
// // // // //       .populate(deepPopulateItem)
// // // // //       .sort({ createdAt: -1 });

// // // // //     res.json(transfers);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // // --- 6. NOTIFICATIONS ---
// // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // //   try {
// // // // //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });












// // // // // 10-4-2026




// // // // import express from "express";
// // // // import mongoose from "mongoose";
// // // // import { authorize } from "../middleware/auth.js";
// // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // import { io } from "../server.js"; 
// // // // // CRITICAL: Explicitly import these so Mongoose registers the models for population
// // // // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// // // // export const operationsRoutes = express.Router();

// // // // /**
// // // //  * SHARED UTILITY: Deep Population Config
// // // //  * Using explicit 'model' properties to prevent "General" fallback issues
// // // //  */
// // // // const deepPopulateItem = {
// // // //   path: "items.stockItemId",
// // // //   model: "StockItem", 
// // // //   select: "name stockGroupId unitId imageUrl",
// // // //   populate: [
// // // //     { 
// // // //       path: "unitId", 
// // // //       model: "Unit", 
// // // //       select: "symbol name" 
// // // //     },
// // // //     { 
// // // //       path: "stockGroupId", 
// // // //       model: "StockGroup", 
// // // //       select: "name" 
// // // //     } 
// // // //   ]
// // // // };

// // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // //   try {
// // // //     const godownId = req.user.godownId;
// // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // //     const stock = await GodownStock.find({ godownId })
// // // //       .populate({
// // // //         path: "stockItemId",
// // // //         model: "StockItem",
// // // //         populate: [
// // // //           { path: "stockGroupId", model: "StockGroup", select: "name" },
// // // //           { path: "unitId", model: "Unit", select: "name symbol" } 
// // // //         ]
// // // //       });

// // // //     const formatted = stock.map(s => ({
// // // //       stockRecordId: s._id,
// // // //       stockItemId: s.stockItemId?._id,
// // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // // //       groupName: s.stockItemId?.stockGroupId?.name || "General", 
// // // //       name: s.stockItemId?.name || "Unknown Item",
// // // //       currentQty: s.qtyBaseUnit || 0,
// // // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // // //       image: s.stockItemId?.imageUrl || ""
// // // //     }));

// // // //     res.json(formatted);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
// // // // const handleStockProcessing = async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     const result = await session.withTransaction(async () => {
// // // //       const { items } = req.body;
// // // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // // //       if (!godownId) throw new Error("No godown associated with this request.");

// // // //       const orderItems = [];
// // // //       for (const item of items) {
// // // //         const updatedStock = await GodownStock.findOne({ 
// // // //           _id: item.stockRecordId, 
// // // //           godownId: godownId 
// // // //         }).session(session).populate("stockItemId");

// // // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // // //         if (updatedStock.qtyBaseUnit < 0) {
// // // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // // //         }
// // // //         await updatedStock.save({ session });

// // // //         // Low Stock Alert Logic
// // // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // // //           const alert = {
// // // //             type: "low_stock_alert",
// // // //             severity: "critical",
// // // //             payload: {
// // // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // // //               itemName: updatedStock.stockItemId.name,
// // // //               currentQty: updatedStock.qtyBaseUnit,
// // // //               threshold: updatedStock.thresholdBaseUnit,
// // // //               godownId,
// // // //               stockItemId: updatedStock.stockItemId._id
// // // //             }
// // // //           };
// // // //           await Notification.create([alert], { session });
// // // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // // //         }

// // // //         orderItems.push({ 
// // // //           stockItemId: updatedStock.stockItemId._id, 
// // // //           qtyBaseUnit: qtyToDeduct,
// // // //           stockRecordId: updatedStock._id 
// // // //         });
// // // //       }

// // // //       const consumption = await Consumption.create([{
// // // //         godownId,
// // // //         userId: req.user.sub, 
// // // //         date: new Date().toISOString(),
// // // //         items: orderItems
// // // //       }], { session });

// // // //       return consumption[0];
// // // //     });

// // // //     const populatedResult = await Consumption.findById(result._id)
// // // //       .populate("userId", "name")
// // // //       .populate("godownId", "name") 
// // // //       .populate(deepPopulateItem);

// // // //     res.status(201).json(populatedResult);
// // // //   } catch (error) {
// // // //     res.status(400).json({ error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // };

// // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // --- 3. CONSUMPTION HISTORY ---
// // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // //   try {
// // // //     const data = await Consumption.find()
// // // //       .populate("godownId", "name")
// // // //       .populate("userId", "name")
// // // //       .populate(deepPopulateItem)
// // // //       .sort({ createdAt: -1 });

// // // //     res.json(data);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // //   try {
// // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // //       .populate("godownId", "name")
// // // //       .populate("userId", "name")
// // // //       .populate(deepPopulateItem) 
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(data);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 4. REQUESTS (WORKFLOW) ---
// // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // //   try {
// // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // //     const requests = await Request.find(filter)
// // // //       .populate("godownId", "name")
// // // //       .populate("userId", "name")
// // // //       .populate(deepPopulateItem) 
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(requests);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // //   try {
// // // //     const created = await Request.create({ 
// // // //       ...req.body, 
// // // //       userId: req.user.sub, 
// // // //       godownId: req.user.godownId, 
// // // //       status: "pending" 
// // // //     });
    
// // // //     const notification = await Notification.create({ 
// // // //       type: "request_created", 
// // // //       severity: "info", 
// // // //       payload: { 
// // // //         message: `New consumption request created`,
// // // //         requestId: created._id,
// // // //         godownId: req.user.godownId 
// // // //       } 
// // // //     });

// // // //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // //     res.status(201).json(created);
// // // //   } catch (error) {
// // // //     res.status(400).json({ error: error.message });
// // // //   }
// // // // });

// // // // /**
// // // //  * UPDATED APPROVE ROUTE
// // // //  * Handles stock sync for both regular issues (+) and returns (-).
// // // //  */
// // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const request = await Request.findById(req.params.id).session(session);
// // // //       if (!request) throw new Error("Request not found");
// // // //       if (request.status !== "pending") throw new Error("Request already processed");

// // // //       request.status = "approved";
// // // //       request.adminDecision = req.body.note || "Approved";
// // // //       await request.save({ session });
      
// // // //       // Create a record of this consumption/return
// // // //       await Consumption.create([{ 
// // // //         godownId: request.godownId, 
// // // //         userId: request.userId, 
// // // //         date: request.targetDate || new Date(), 
// // // //         items: request.items 
// // // //       }], { session });
      
// // // //       for (const item of request.items) {
// // // //         // Logic: Negative of the requested quantity. 
// // // //         // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
// // // //         const stockUpdate = await GodownStock.findOneAndUpdate(
// // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // //           { session, new: true }
// // // //         );

// // // //         if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

// // // //         // Safety check if stock goes below 0 after deduction
// // // //         if (stockUpdate.qtyBaseUnit < 0) {
// // // //            throw new Error(`Insufficient Godown stock to fulfill this request.`);
// // // //         }
// // // //       }
      
// // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // //     });
// // // //     res.json({ message: "Status updated and Godown stock synced" });
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // });

// // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // //   try {
// // // //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // //       status: "rejected", 
// // // //       adminDecision: req.body.note || "Rejected" 
// // // //     }, { new: true });
    
// // // //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // //     res.json(request);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 5. TRANSFERS ---
// // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // //       for (const item of req.body.items || []) {
// // // //         // Deduct from Source
// // // //         await GodownStock.findOneAndUpdate(
// // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // //           { session }
// // // //         );
// // // //         // Add to Destination
// // // //         await GodownStock.findOneAndUpdate(
// // // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // // //           { upsert: true, session }
// // // //         );
// // // //       }
// // // //       res.status(201).json(transfer[0]);
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // });

// // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // //   try {
// // // //     const transfers = await Transfer.find()
// // // //       .populate("fromGodownId", "name")
// // // //       .populate("toGodownId", "name")
// // // //       .populate(deepPopulateItem)
// // // //       .sort({ createdAt: -1 });

// // // //     res.json(transfers);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 6. NOTIFICATIONS ---
// // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // //   try {
// // // //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });




// // // // 18-06-2026






// // // import express from "express";
// // // import mongoose from "mongoose";
// // // import { authorize } from "../middleware/auth.js";
// // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // import { io } from "../server.js"; 
// // // // CRITICAL: Explicitly import these so Mongoose registers the models for population
// // // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// // // export const operationsRoutes = express.Router();

// // // /**
// // //  * SHARED UTILITY: Deep Population Config
// // //  * Using explicit 'model' properties to prevent "General" fallback issues
// // //  */
// // // const deepPopulateItem = {
// // //   path: "items.stockItemId",
// // //   model: "StockItem", 
// // //   select: "name stockGroupId unitId imageUrl",
// // //   populate: [
// // //     { 
// // //       path: "unitId", 
// // //       model: "Unit", 
// // //       select: "symbol name" 
// // //     },
// // //     { 
// // //       path: "stockGroupId", 
// // //       model: "StockGroup", 
// // //       select: "name" 
// // //     } 
// // //   ]
// // // };

// // // // --- 1. KITCHEN STOCK FETCH ---
// // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // //   try {
// // //     const godownId = req.user.godownId;
// // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // //     const stock = await GodownStock.find({ godownId })
// // //       .populate({
// // //         path: "stockItemId",
// // //         model: "StockItem",
// // //         populate: [
// // //           { path: "stockGroupId", model: "StockGroup", select: "name" },
// // //           { path: "unitId", model: "Unit", select: "name symbol" } 
// // //         ]
// // //       });

// // //     const formatted = stock.map(s => ({
// // //       stockRecordId: s._id,
// // //       stockItemId: s.stockItemId?._id,
// // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// // //       groupName: s.stockItemId?.stockGroupId?.name || "General", 
// // //       name: s.stockItemId?.name || "Unknown Item",
// // //       currentQty: s.qtyBaseUnit || 0,
// // //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// // //       image: s.stockItemId?.imageUrl || ""
// // //     }));

// // //     res.json(formatted);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // // --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
// // // const handleStockProcessing = async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   try {
// // //     const result = await session.withTransaction(async () => {
// // //       const { items } = req.body;
// // //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// // //       if (!godownId) throw new Error("No godown associated with this request.");

// // //       const orderItems = [];
// // //       for (const item of items) {
// // //         const updatedStock = await GodownStock.findOne({ 
// // //           _id: item.stockRecordId, 
// // //           godownId: godownId 
// // //         }).session(session).populate("stockItemId");

// // //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// // //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// // //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// // //         if (updatedStock.qtyBaseUnit < 0) {
// // //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// // //         }
// // //         await updatedStock.save({ session });

// // //         // Low Stock Alert Logic
// // //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// // //           const alert = {
// // //             type: "low_stock_alert",
// // //             severity: "critical",
// // //             payload: {
// // //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// // //               itemName: updatedStock.stockItemId.name,
// // //               currentQty: updatedStock.qtyBaseUnit,
// // //               threshold: updatedStock.thresholdBaseUnit,
// // //               godownId,
// // //               stockItemId: updatedStock.stockItemId._id
// // //             }
// // //           };
// // //           await Notification.create([alert], { session });
// // //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// // //         }

// // //         orderItems.push({ 
// // //           stockItemId: updatedStock.stockItemId._id, 
// // //           qtyBaseUnit: qtyToDeduct,
// // //           stockRecordId: updatedStock._id 
// // //         });
// // //       }

// // //       const consumption = await Consumption.create([{
// // //         godownId,
// // //         userId: req.user.sub, 
// // //         date: new Date().toISOString(),
// // //         items: orderItems
// // //       }], { session });

// // //       return consumption[0];
// // //     });

// // //     const populatedResult = await Consumption.findById(result._id)
// // //       .populate("userId", "name")
// // //       .populate("godownId", "name") 
// // //       .populate(deepPopulateItem);

// // //     res.status(201).json(populatedResult);
// // //   } catch (error) {
// // //     res.status(400).json({ error: error.message });
// // //   } finally {
// // //     await session.endSession();
// // //   }
// // // };

// // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // --- 3. CONSUMPTION HISTORY ---
// // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // //   try {
// // //     const data = await Consumption.find()
// // //       .populate("godownId", "name")
// // //       .populate("userId", "name")
// // //       .populate(deepPopulateItem)
// // //       .sort({ createdAt: -1 });

// // //     res.json(data);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // //   try {
// // //     const data = await Consumption.find({ userId: req.user.sub })
// // //       .populate("godownId", "name")
// // //       .populate("userId", "name")
// // //       .populate(deepPopulateItem) 
// // //       .sort({ createdAt: -1 });
// // //     res.json(data);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // // --- 4. REQUESTS (WORKFLOW) ---
// // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // //   try {
// // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // //     const requests = await Request.find(filter)
// // //       .populate("godownId", "name")
// // //       .populate("userId", "name")
// // //       .populate(deepPopulateItem) 
// // //       .sort({ createdAt: -1 });
// // //     res.json(requests);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // //   try {
// // //     const created = await Request.create({ 
// // //       ...req.body, 
// // //       userId: req.user.sub, 
// // //       godownId: req.user.godownId, 
// // //       status: "pending" 
// // //     });
    
// // //     const notification = await Notification.create({ 
// // //       type: "request_created", 
// // //       severity: "info", 
// // //       payload: { 
// // //         message: `New consumption request created`,
// // //         requestId: created._id,
// // //         godownId: req.user.godownId 
// // //       } 
// // //     });

// // //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // //     res.status(201).json(created);
// // //   } catch (error) {
// // //     res.status(400).json({ error: error.message });
// // //   }
// // // });

// // // /**
// // //  * UPDATED APPROVE ROUTE
// // //  * Handles stock sync for both regular issues (+) and returns (-).
// // //  */
// // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   try {
// // //     await session.withTransaction(async () => {
// // //       const request = await Request.findById(req.params.id).session(session);
// // //       if (!request) throw new Error("Request not found");
// // //       if (request.status !== "pending") throw new Error("Request already processed");

// // //       request.status = "approved";
// // //       request.adminDecision = req.body.note || "Approved";
// // //       await request.save({ session });
      
// // //       // Create a record of this consumption/return
// // //       await Consumption.create([{ 
// // //         godownId: request.godownId, 
// // //         userId: request.userId, 
// // //         date: request.targetDate || new Date(), 
// // //         items: request.items 
// // //       }], { session });
      
// // //       for (const item of request.items) {
// // //         // Logic: Negative of the requested quantity. 
// // //         // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
// // //         const stockUpdate = await GodownStock.findOneAndUpdate(
// // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // //           { session, new: true }
// // //         );

// // //         if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

// // //         // Safety check if stock goes below 0 after deduction
// // //         if (stockUpdate.qtyBaseUnit < 0) {
// // //            throw new Error(`Insufficient Godown stock to fulfill this request.`);
// // //         }
// // //       }
      
// // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // //     });
// // //     res.json({ message: "Status updated and Godown stock synced" });
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   } finally {
// // //     await session.endSession();
// // //   }
// // // });

// // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // //   try {
// // //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// // //       status: "rejected", 
// // //       adminDecision: req.body.note || "Rejected" 
// // //     }, { new: true });
    
// // //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // //     res.json(request);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // // --- 5. TRANSFERS ---
// // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   try {
// // //     await session.withTransaction(async () => {
// // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // //       for (const item of req.body.items || []) {
// // //         // Deduct from Source
// // //         await GodownStock.findOneAndUpdate(
// // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // //           { session }
// // //         );
// // //         // Add to Destination
// // //         await GodownStock.findOneAndUpdate(
// // //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// // //           { upsert: true, session }
// // //         );
// // //       }
// // //       res.status(201).json(transfer[0]);
// // //     });
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   } finally {
// // //     await session.endSession();
// // //   }
// // // });

// // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // //   try {
// // //     const transfers = await Transfer.find()
// // //       .populate("fromGodownId", "name")
// // //       .populate("toGodownId", "name")
// // //       .populate(deepPopulateItem)
// // //       .sort({ createdAt: -1 });

// // //     res.json(transfers);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // // --- 6. NOTIFICATIONS ---
// // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // //   try {
// // //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });






// // // 28-06-2026






// // import express from "express";
// // import mongoose from "mongoose";
// // import { authorize } from "../middleware/auth.js";
// // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // import { io } from "../server.js"; 
// // // CRITICAL: Explicitly import these so Mongoose registers the models for population
// // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
// // import { DailyUsage } from "../models/DailyUsageModel.js";

// // export const operationsRoutes = express.Router();

// // /**
// //  * SHARED UTILITY: Deep Population Config
// //  * Using explicit 'model' properties to prevent "General" fallback issues
// //  */
// // const deepPopulateItem = {
// //   path: "items.stockItemId",
// //   model: "StockItem", 
// //   select: "name stockGroupId unitId imageUrl",
// //   populate: [
// //     { 
// //       path: "unitId", 
// //       model: "Unit", 
// //       select: "symbol name" 
// //     },
// //     { 
// //       path: "stockGroupId", 
// //       model: "StockGroup", 
// //       select: "name" 
// //     } 
// //   ]
// // };

// // // --- 1. KITCHEN STOCK FETCH ---
// // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// //   try {
// //     const godownId = req.user.godownId;
// //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// //     const stock = await GodownStock.find({ godownId })
// //       .populate({
// //         path: "stockItemId",
// //         model: "StockItem",
// //         populate: [
// //   { path: "stockGroupId", model: "StockGroup", select: "name" },
// //   { path: "unitId", model: "Unit", select: "name symbol" }
// // ],
// // select: "name stockGroupId unitId imageUrl itemType"
// //       });

// //     const formatted = stock.map(s => ({
// //   stockRecordId: s._id,
// //   stockItemId: s.stockItemId?._id,
// //   stockGroupId: s.stockItemId?.stockGroupId?._id,
// //   groupName: s.stockItemId?.stockGroupId?.name || "General",
// //   name: s.stockItemId?.name || "Unknown Item",
// //   currentQty: s.qtyBaseUnit || 0,
// //   unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// //   image: s.stockItemId?.imageUrl || "",

// //   // ADD THIS
// //   itemType: s.stockItemId?.itemType || "stock"
// // }));

// //     res.json(formatted);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // // --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
// // const handleStockProcessing = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {
// //     const result = await session.withTransaction(async () => {
// //       const { items } = req.body;
// //       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

// //       if (!godownId) throw new Error("No godown associated with this request.");

// //       const orderItems = [];
// //       for (const item of items) {
// //         const updatedStock = await GodownStock.findOne({ 
// //           _id: item.stockRecordId, 
// //           godownId: godownId 
// //         }).session(session).populate("stockItemId");

// //         if (!updatedStock) throw new Error(`Item not found in inventory.`);

// //         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
// //         updatedStock.qtyBaseUnit -= qtyToDeduct;

// //         if (updatedStock.qtyBaseUnit < 0) {
// //           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
// //         }
// //         await updatedStock.save({ session });

// //         // Low Stock Alert Logic
// //         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
// //           const alert = {
// //             type: "low_stock_alert",
// //             severity: "critical",
// //             payload: {
// //               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
// //               itemName: updatedStock.stockItemId.name,
// //               currentQty: updatedStock.qtyBaseUnit,
// //               threshold: updatedStock.thresholdBaseUnit,
// //               godownId,
// //               stockItemId: updatedStock.stockItemId._id
// //             }
// //           };
// //           await Notification.create([alert], { session });
// //           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
// //         }

// //         orderItems.push({ 
// //           stockItemId: updatedStock.stockItemId._id, 
// //           qtyBaseUnit: qtyToDeduct,
// //           stockRecordId: updatedStock._id 
// //         });
// //       }

// //       const consumption = await Consumption.create([{
// //         godownId,
// //         userId: req.user.sub, 
// //         date: req.body.date,
// //         // date: new Date().toISOString(),
// //         items: orderItems
// //       }], { session });

// //       return consumption[0];
// //     });

// //     const populatedResult = await Consumption.findById(result._id)
// //       .populate("userId", "name")
// //       .populate("godownId", "name") 
// //       .populate(deepPopulateItem);

// //     res.status(201).json(populatedResult);
// //   } catch (error) {
// //     res.status(400).json({ error: error.message });
// //   } finally {
// //     await session.endSession();
// //   }
// // };

// // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // --- 3. CONSUMPTION HISTORY ---
// // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // //   try {
// // //     const data = await Consumption.find()
// // //       .populate("godownId", "name")
// // //       .populate("userId", "name")
// // //       .populate(deepPopulateItem)
// // //       .sort({ createdAt: -1 });

// // //     res.json(data);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });





// // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// //   try {

// //     const consumptions = await Consumption.find()
// //       .populate("godownId", "name")
// //       .populate("userId", "name")
// //       .populate(deepPopulateItem);

// //     const dailyUsages = await DailyUsage.find()
// //       .populate("godownId", "name")
// //       .populate("userId", "name")
// //       .populate(deepPopulateItem);

// //     const combined = [
// //       ...consumptions.map(item => ({
// //         ...item.toObject(),
// //         recordType: "consumption"
// //       })),
// //       ...dailyUsages.map(item => ({
// //         ...item.toObject(),
// //         recordType: "dailyUsage"
// //       }))
// //     ].sort((a, b) => {
// //   const dateA = new Date(a.date || a.createdAt);
// //   const dateB = new Date(b.date || b.createdAt);

// //   return dateB - dateA;
// // });

// //     res.json(combined);

// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });




// // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// //   try {
// //     const data = await Consumption.find({ userId: req.user.sub })
// //       .populate("godownId", "name")
// //       .populate("userId", "name")
// //       .populate(deepPopulateItem) 
// //       .sort({ createdAt: -1 });
// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // // --- 4. REQUESTS (WORKFLOW) ---
// // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// //   try {
// //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// //     const requests = await Request.find(filter)
// //       .populate("godownId", "name")
// //       .populate("userId", "name")
// //       .populate(deepPopulateItem) 
// //       .sort({ createdAt: -1 });
// //     res.json(requests);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// //   try {
// //     const created = await Request.create({ 
// //       ...req.body, 
// //       userId: req.user.sub, 
// //       godownId: req.user.godownId, 
// //       status: "pending" 
// //     });
    
// //     const notification = await Notification.create({ 
// //       type: "request_created", 
// //       severity: "info", 
// //       payload: { 
// //         message: `New consumption request created`,
// //         requestId: created._id,
// //         godownId: req.user.godownId 
// //       } 
// //     });

// //     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// //     res.status(201).json(created);
// //   } catch (error) {
// //     res.status(400).json({ error: error.message });
// //   }
// // });

// // /**
// //  * UPDATED APPROVE ROUTE
// //  * Handles stock sync for both regular issues (+) and returns (-).
// //  */
// // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {

// //   console.log("=================================");
// //   console.log("APPROVE CLICKED");
// //   console.log("REQUEST ID:", req.params.id);
// //   console.log("=================================");
// //     await session.withTransaction(async () => {
// //       const request = await Request.findById(req.params.id).session(session);
// //       console.log("REQUEST FOUND:");
// // console.log(request);
// //       if (!request) throw new Error("Request not found");
// //       if (request.status !== "pending") throw new Error("Request already processed");

// //       request.status = "approved";
// //       request.adminDecision = req.body.note || "Approved";
// //       await request.save({ session });
// //       console.log("REQUEST STATUS SAVED:", request.status);
// //       // Create a record of this consumption/return
// //       if (request.requestType === "daily_usage") {

// //   await DailyUsage.create([{
// //   godownId: request.godownId,
// //   userId: request.userId,
// //   date: request.targetDate,
// //   reason: request.reason,
// //   items: request.items
// // }], { session });

// // } else {

// //   await Consumption.create([{
// //     godownId: request.godownId,
// //     userId: request.userId,
// //     date: request.targetDate || new Date(),
// //     items: request.items
// //   }], { session });

// // }
      
      
      
// //       // await Consumption.create([{ 
// //       //   godownId: request.godownId, 
// //       //   userId: request.userId, 
// //       //   date: request.targetDate || new Date(), 
// //       //   items: request.items 
// //       // }], { session });
   
      
// // for (const item of request.items) {

// //   console.log("CHECKING STOCK");
// //   console.log("Godown:", request.godownId);
// //   console.log("Item:", item.stockItemId);

// //   const stock = await GodownStock.findOne({
// //     godownId: request.godownId,
// //     stockItemId: item.stockItemId
// //   });

// //   console.log("FOUND STOCK:", stock);

// //   const stockUpdate = await GodownStock.findOneAndUpdate(
// //     {
// //       godownId: request.godownId,
// //       stockItemId: item.stockItemId
// //     },
// //     {
// //       $inc: {
// //         qtyBaseUnit: -item.qtyBaseUnit
// //       }
// //     },
// //     {
// //       session,
// //       new: true
// //     }
// //   );

// // if (!stockUpdate) {

// //   await GodownStock.create([{
// //     godownId: request.godownId,
// //     stockItemId: item.stockItemId,
// //     qtyBaseUnit: 0,
// //     thresholdBaseUnit: 0
// //   }], { session });

// //   continue;
// // }


// //   // if (!stockUpdate)
// //   //   throw new Error("Stock record not found for one of the items.");
// // }

// // //       for (const item of request.items) {
// // //         console.log("CHECKING STOCK");
// // // console.log("Godown:", request.godownId);
// // // console.log("Item:", item.stockItemId);
// // //         // Logic: Negative of the requested quantity. 
// // //         // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
// // //         const stockUpdate = await GodownStock.findOneAndUpdate(
// // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // //           { session, new: true }
// // //         );

// // //         if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

// // //         // Safety check if stock goes below 0 after deduction
// // //         if (stockUpdate.qtyBaseUnit < 0) {
// // //            throw new Error(`Insufficient Godown stock to fulfill this request.`);
// // //         }
// // //       }
      
// //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// //     });
// //     res.json({ message: "Status updated and Godown stock synced" });
// //   } catch (error) {

// //   console.log("=================================");
// //   console.log("APPROVE ERROR");
// //   console.log(error);
// //   console.log("=================================");

// //   res.status(500).json({
// //     error: error.message
// //   });

// // }finally {
// //     await session.endSession();
// //   }
// // });

// // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// //   try {
// //     const request = await Request.findByIdAndUpdate(req.params.id, { 
// //       status: "rejected", 
// //       adminDecision: req.body.note || "Rejected" 
// //     }, { new: true });
    
// //     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// //     res.json(request);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // // --- 5. TRANSFERS ---
// // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {
// //     await session.withTransaction(async () => {
// //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// //       for (const item of req.body.items || []) {
// //         // Deduct from Source
// //         await GodownStock.findOneAndUpdate(
// //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// //           { session }
// //         );
// //         // Add to Destination
// //         await GodownStock.findOneAndUpdate(
// //           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
// //           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
// //           { upsert: true, session }
// //         );
// //       }
// //       res.status(201).json(transfer[0]);
// //     });
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   } finally {
// //     await session.endSession();
// //   }
// // });

// // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// //   try {
// //     const transfers = await Transfer.find()
// //       .populate("fromGodownId", "name")
// //       .populate("toGodownId", "name")
// //       .populate(deepPopulateItem)
// //       .sort({ createdAt: -1 });

// //     res.json(transfers);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // // --- 6. NOTIFICATIONS ---
// // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// //   try {
// //     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// //     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });




// // 01-07-2026









// import express from "express";
// import mongoose from "mongoose";
// import { authorize } from "../middleware/auth.js";
// import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// import { io } from "../server.js"; 
// // CRITICAL: Explicitly import these so Mongoose registers the models for population
// import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
// import { DailyUsage } from "../models/DailyUsageModel.js";

// export const operationsRoutes = express.Router();

// /**
//  * SHARED UTILITY: Deep Population Config
//  * Using explicit 'model' properties to prevent "General" fallback issues
//  */
// const deepPopulateItem = {
//   path: "items.stockItemId",
//   model: "StockItem",
//   select: "name imageUrl unitId stockGroupId itemType",
//   populate: [
//     {
//       path: "unitId",
//       model: "Unit",
//       select: "name symbol"
//     },
//     {
//       path: "stockGroupId",
//       model: "StockGroup",
//       select: "name"
//     }
//   ]
// };
// // --- 1. KITCHEN STOCK FETCH ---
// operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
//   try {
//     const godownId = req.user.godownId;
//     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

//     const stock = await GodownStock.find({ godownId })
//       .populate({
//         path: "stockItemId",
//         model: "StockItem",
//         populate: [
//   { path: "stockGroupId", model: "StockGroup", select: "name" },
//   { path: "unitId", model: "Unit", select: "name symbol" }
// ],
// select: "name stockGroupId unitId imageUrl itemType"
//       });

//     const formatted = stock.map(s => ({
//   stockRecordId: s._id,
//   stockItemId: s.stockItemId?._id,
//   stockGroupId: s.stockItemId?.stockGroupId?._id,
//   groupName: s.stockItemId?.stockGroupId?.name || "General",
//   name: s.stockItemId?.name || "Unknown Item",
//   currentQty: s.qtyBaseUnit || 0,
//   unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
//   image: s.stockItemId?.imageUrl || "",

//   // ADD THIS
//   itemType: s.stockItemId?.itemType || "stock"
// }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
// const handleStockProcessing = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const result = await session.withTransaction(async () => {
//       const { items } = req.body;
//       const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

//       if (!godownId) throw new Error("No godown associated with this request.");

//       const orderItems = [];
//       for (const item of items) {
//         const updatedStock = await GodownStock.findOne({ 
//           _id: item.stockRecordId, 
//           godownId: godownId 
//         }).session(session).populate("stockItemId");

//         if (!updatedStock) throw new Error(`Item not found in inventory.`);

//         const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
//         updatedStock.qtyBaseUnit -= qtyToDeduct;

//         if (updatedStock.qtyBaseUnit < 0) {
//           throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
//         }
//         await updatedStock.save({ session });

//         // Low Stock Alert Logic
//         if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
//           const alert = {
//             type: "low_stock_alert",
//             severity: "critical",
//             payload: {
//               message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
//               itemName: updatedStock.stockItemId.name,
//               currentQty: updatedStock.qtyBaseUnit,
//               threshold: updatedStock.thresholdBaseUnit,
//               godownId,
//               stockItemId: updatedStock.stockItemId._id
//             }
//           };
//           await Notification.create([alert], { session });
//           io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
//         }

//         orderItems.push({ 
//           stockItemId: updatedStock.stockItemId._id, 
//           qtyBaseUnit: qtyToDeduct,
//           stockRecordId: updatedStock._id 
//         });
//       }

//       const consumption = await Consumption.create([{
//         godownId,
//         userId: req.user.sub, 
//         date: req.body.date,
//         // date: new Date().toISOString(),
//         items: orderItems
//       }], { session });

//       return consumption[0];
//     });

//     const populatedResult = await Consumption.findById(result._id)
//       .populate("userId", "name")
//       .populate("godownId", "name") 
//       .populate(deepPopulateItem);

//     res.status(201).json(populatedResult);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   } finally {
//     await session.endSession();
//   }
// };

// operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);







// operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
//   try {

//     const consumptions = await Consumption.find()
//       .populate("godownId", "name")
//       .populate("userId", "name")
//       .populate(deepPopulateItem);

//     const dailyUsages = await DailyUsage.find()
//       .populate("godownId", "name")
//       .populate("userId", "name")
//       .populate(deepPopulateItem);

//     const combined = [
//       ...consumptions.map(item => ({
//         ...item.toObject(),
//         recordType: "consumption"
//       })),
//       ...dailyUsages.map(item => ({
//         ...item.toObject(),
//         recordType: "dailyUsage"
//       }))
//     ].sort((a, b) => {
//   const dateA = new Date(a.date || a.createdAt);
//   const dateB = new Date(b.date || b.createdAt);

//   return dateB - dateA;
// });

//     res.json(combined);

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });




// operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
//   try {
//     const data = await Consumption.find({ userId: req.user.sub })
//       .populate("godownId", "name")
//       .populate("userId", "name")
//       .populate(deepPopulateItem) 
//       .sort({ createdAt: -1 });
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // --- 4. REQUESTS (WORKFLOW) ---
// operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
//   try {
//     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
//     const requests = await Request.find(filter)
//       .populate("godownId", "name")
//       .populate("userId", "name")
//       .populate(deepPopulateItem) 
//       .sort({ createdAt: -1 });
//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
//   try {
//     const created = await Request.create({ 
//       ...req.body, 
//       userId: req.user.sub, 
//       godownId: req.user.godownId, 
//       status: "pending" 
//     });
    
//     const notification = await Notification.create({ 
//       type: "request_created", 
//       severity: "info", 
//       payload: { 
//         message: `New consumption request created`,
//         requestId: created._id,
//         godownId: req.user.godownId 
//       } 
//     });

//     io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
//     res.status(201).json(created);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// /**
//  * UPDATED APPROVE ROUTE
//  * Handles stock sync for both regular issues (+) and returns (-).
//  */
// operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
//   const session = await mongoose.startSession();
//   try {

//   console.log("=================================");
//   console.log("APPROVE CLICKED");
//   console.log("REQUEST ID:", req.params.id);
//   console.log("=================================");
//     await session.withTransaction(async () => {
//       const request = await Request.findById(req.params.id).session(session);
//       console.log("REQUEST FOUND:");
// console.log(request);
//       if (!request) throw new Error("Request not found");
//       if (request.status !== "pending") throw new Error("Request already processed");

//       request.status = "approved";
//       request.adminDecision = req.body.note || "Approved";
//       await request.save({ session });
//       console.log("REQUEST STATUS SAVED:", request.status);
//       // Create a record of this consumption/return
//       if (request.requestType === "daily_usage") {

//   await DailyUsage.create([{
//   godownId: request.godownId,
//   userId: request.userId,
//   date: request.targetDate,
//   reason: request.reason,
//   items: request.items
// }], { session });

// } else {

//   await Consumption.create([{
//     godownId: request.godownId,
//     userId: request.userId,
//     date: request.targetDate || new Date(),
//     items: request.items
//   }], { session });

// }
      
      
      
//       // await Consumption.create([{ 
//       //   godownId: request.godownId, 
//       //   userId: request.userId, 
//       //   date: request.targetDate || new Date(), 
//       //   items: request.items 
//       // }], { session });
   
      
// for (const item of request.items) {

//   console.log("CHECKING STOCK");
//   console.log("Godown:", request.godownId);
//   console.log("Item:", item.stockItemId);

//   const stock = await GodownStock.findOne({
//     godownId: request.godownId,
//     stockItemId: item.stockItemId
//   });

//   console.log("FOUND STOCK:", stock);

//   const stockUpdate = await GodownStock.findOneAndUpdate(
//     {
//       godownId: request.godownId,
//       stockItemId: item.stockItemId
//     },
//     {
//       $inc: {
//         qtyBaseUnit: -item.qtyBaseUnit
//       }
//     },
//     {
//       session,
//       new: true
//     }
//   );

// if (!stockUpdate) {

//   await GodownStock.create([{
//     godownId: request.godownId,
//     stockItemId: item.stockItemId,
//     qtyBaseUnit: 0,
//     thresholdBaseUnit: 0
//   }], { session });

//   continue;
// }


//   // if (!stockUpdate)
//   //   throw new Error("Stock record not found for one of the items.");
// }

// //       for (const item of request.items) {
// //         console.log("CHECKING STOCK");
// // console.log("Godown:", request.godownId);
// // console.log("Item:", item.stockItemId);
// //         // Logic: Negative of the requested quantity. 
// //         // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
// //         const stockUpdate = await GodownStock.findOneAndUpdate(
// //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// //           { session, new: true }
// //         );

// //         if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

// //         // Safety check if stock goes below 0 after deduction
// //         if (stockUpdate.qtyBaseUnit < 0) {
// //            throw new Error(`Insufficient Godown stock to fulfill this request.`);
// //         }
// //       }
      
//       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
//     });
//     res.json({ message: "Status updated and Godown stock synced" });
//   } catch (error) {

//   console.log("=================================");
//   console.log("APPROVE ERROR");
//   console.log(error);
//   console.log("=================================");

//   res.status(500).json({
//     error: error.message
//   });

// }finally {
//     await session.endSession();
//   }
// });

// operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
//   try {
//     const request = await Request.findByIdAndUpdate(req.params.id, { 
//       status: "rejected", 
//       adminDecision: req.body.note || "Rejected" 
//     }, { new: true });
    
//     io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
//     res.json(request);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });



// operationsRoutes.get(
// "/user-transfers/incoming",
// authorize(["user"]),
// async(req,res)=>{

// const transfers = await Transfer.find({
//   toGodownId: req.user.godownId,
//   status: "pending"
// })
// .populate("fromGodownId","name")
// .populate("toGodownId","name")
// .populate(deepPopulateItem)
// .sort({createdAt:-1});

// res.json(transfers);

// });


// operationsRoutes.post(
// "/user-transfers/:id/accept",
// authorize(["user"]),
// async(req,res)=>{

// const session=await mongoose.startSession();

// try{

// await session.withTransaction(async()=>{

// const transfer=await Transfer.findById(req.params.id)
// .session(session);

// if(!transfer)
// throw new Error("Transfer not found");

// if(transfer.status!=="pending")
// throw new Error("Already processed");

// if(
// transfer.toGodownId.toString()!==req.user.godownId.toString()
// ){
// throw new Error("Not allowed");
// }

// for(const item of transfer.items){
// if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
//     throw new Error("Invalid transfer quantity");
// }
// const source=await GodownStock.findOne({

// godownId:transfer.fromGodownId,

// stockItemId:item.stockItemId

// }).session(session);

// if(!source)
// throw new Error("Source stock missing");

// if(source.qtyBaseUnit<item.qtyBaseUnit)
// throw new Error("Insufficient stock");

// source.qtyBaseUnit-=item.qtyBaseUnit;

// await source.save({session});

// await GodownStock.findOneAndUpdate(
// {
//     godownId: transfer.toGodownId,
//     stockItemId: item.stockItemId
// },
// {
//     $inc:{
//         qtyBaseUnit:item.qtyBaseUnit
//     },
//     $setOnInsert:{
//         godownId: transfer.toGodownId,
//         stockItemId: item.stockItemId,
//         // qtyBaseUnit:0,
//         thresholdBaseUnit:0
//     }
// },
// {
//     upsert:true,
//     new:true,
//     session
// }
// );

// }

// transfer.status="accepted";

// transfer.acceptedBy=req.user.sub;

// transfer.acceptedAt=new Date();

// await transfer.save({session});
// io.to(transfer.fromGodownId.toString()).emit(
//     "transfer_accepted",
//     transfer
// );

// });

// res.json({
// message:"Transfer Accepted"
// });

// }catch(err){

// res.status(400).json({
// error:err.message
// });

// }finally{

// session.endSession();

// }

// });





// operationsRoutes.get("/transfers", authorize(["admin", "user"]), async (req, res) => {
//   try {
//     let filter = {};

// if (req.user.role === "user") {
//   filter = {
//     $or: [
//       { fromGodownId: req.user.godownId },
//       { toGodownId: req.user.godownId }
//     ]
//   };
// }

// const transfers = await Transfer.find(filter)
//       .populate("fromGodownId", "name")
//       .populate("toGodownId", "name")
//       .populate(deepPopulateItem)
//       .sort({ createdAt: -1 });

//     res.json(transfers);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });



// operationsRoutes.post(
//   "/transfers",
//   authorize(["admin", "user"]),
//   async (req, res) => {
//     try {

//       const {
//         fromGodownId,
//         toGodownId,
//         items
//       } = req.body;

//       const sourceGodownId =
//   req.user.role === "admin"
//     ? fromGodownId
//     : req.user.godownId;

//       if (!fromGodownId || !toGodownId)
//         return res.status(400).json({
//           error: "Source and Destination required"
//         });

//       if (sourceGodownId.toString() === toGodownId.toString())
//         return res.status(400).json({
//           error: "Cannot transfer to same godown"
//         });

//       if (!items || items.length === 0)
//         return res.status(400).json({
//           error: "No items selected"
//         });

//       for (const item of items) {

//        const stock = await GodownStock.findOne({
//   godownId: sourceGodownId,
//   stockItemId: item.stockItemId
// });

//         if (!stock)
//           return res.status(400).json({
//             error: "Stock not found"
//           });

//         if (stock.qtyBaseUnit < item.qtyBaseUnit)
//           return res.status(400).json({
//             error: "Insufficient stock"
//           });

//       }

//       const transfer = await Transfer.create({

//   fromGodownId: sourceGodownId,

//   toGodownId,

//   createdBy: req.user.sub,

//   items,

//   status: "pending"

// });

//       io.to(toGodownId.toString()).emit(
//         "new_transfer",
//         transfer
//       );

//       res.status(201).json(transfer);

//     } catch (err) {

//       res.status(500).json({
//         error: err.message
//       });

//     }
//   }
// );



// operationsRoutes.get(
//   "/godown-stocks",
//   authorize(["admin", "user"]),
//   async (req, res) => {
//     try {
//      let filter = {};

// if (req.user.role === "user") {
//   filter = { godownId: req.user.godownId };
// }

// const stocks = await GodownStock.find(filter)
//         .populate({
//           path: "godownId",
//           model: "Godown",
//           select: "name"
//         })
//         .populate({
//           path: "stockItemId",
//           model: "StockItem",
//           select: "name imageUrl unitId stockGroupId itemType",
//           populate: [
//             {
//               path: "unitId",
//               model: "Unit",
//               select: "name symbol"
//             },
//             {
//               path: "stockGroupId",
//               model: "StockGroup",
//               select: "name"
//             }
//           ]
//         })
//         .sort({ createdAt: -1 });

//       res.json(stocks);
//     } catch (err) {
//       res.status(500).json({
//         error: err.message
//       });
//     }
//   }
// );
// // --- 6. NOTIFICATIONS ---
// operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
//   try {
//     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
//     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


// operationsRoutes.post(
// "/user-transfers/:id/reject",
// authorize(["user"]),
// async(req,res)=>{

// const transfer=await Transfer.findById(req.params.id);

// if(!transfer)
// return res.status(404).json({error:"Not found"});

// if (
//     transfer.toGodownId.toString() !== req.user.godownId.toString()
// ) {
//     return res.status(403).json({
//         error: "Not allowed"
//     });
// }

// transfer.status = "rejected";
// transfer.rejectedAt = new Date();

// await transfer.save();

// io.to(transfer.fromGodownId.toString()).emit(
//     "transfer_rejected",
//     transfer
// );

// res.json({
// message:"Rejected"
// });

// });





// operationsRoutes.get(
// "/user-transfers/history",
// authorize(["user"]),
// async(req,res)=>{

// const transfers=await Transfer.find({

// $or:[

// {fromGodownId:req.user.godownId},

// {toGodownId:req.user.godownId}

// ]

// })
// .populate("fromGodownId","name")
// .populate("toGodownId","name")
// .populate(deepPopulateItem)
// .sort({createdAt:-1});

// res.json(transfers);

// });




// operationsRoutes.post(
// "/user-transfers",
// authorize(["user"]),
// async (req,res)=>{

// console.log("BODY");
// console.log(req.body);

// console.log("USER");
// console.log(req.user);

// // Validation
// if (!req.body.toGodownId) {
//     return res.status(400).json({
//         error: "Destination godown is required"
//     });
// }

// if (
//     req.user.godownId.toString() ===
//     req.body.toGodownId.toString()
// ) {
//     return res.status(400).json({
//         error: "Cannot transfer to the same godown"
//     });
// }

// if (!req.body.items || req.body.items.length === 0) {
//     return res.status(400).json({
//         error: "Transfer cart is empty"
//     });
// }

// for (const item of req.body.items) {

//     if (!item.stockItemId) {
//         return res.status(400).json({
//             error: "Invalid stock item"
//         });
//     }

//     if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
//         return res.status(400).json({
//             error: "Transfer quantity must be greater than zero"
//         });
//     }

//     const stock = await GodownStock.findOne({
//         godownId: req.user.godownId,
//         stockItemId: item.stockItemId
//     });

//     if (!stock) {
//         return res.status(400).json({
//             error: "Stock record not found"
//         });
//     }

//     if (stock.qtyBaseUnit < item.qtyBaseUnit) {
//         return res.status(400).json({
//           error: "Insufficient stock available for one of the selected items."  
//           // error: `${stock.stockItemId} has insufficient stock`
//         });
//     }
// }

// const transfer = await Transfer.create({

//     fromGodownId: req.user.godownId,

//     toGodownId: req.body.toGodownId,

//     createdBy: req.user.sub,

//     items: req.body.items,

//     status: "pending"

// });
// io.to(req.body.toGodownId.toString()).emit(
//     "new_transfer",
//     transfer
// );
// console.log("TRANSFER SAVED");
// console.log(transfer);

// res.status(201).json(transfer);

// });
















// 19-08-2026









import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
import { io } from "../server.js"; 
// CRITICAL: Explicitly import these so Mongoose registers the models for population
import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
import { DailyUsage } from "../models/DailyUsageModel.js";

export const operationsRoutes = express.Router();

/**
 * SHARED UTILITY: Deep Population Config
 * Using explicit 'model' properties to prevent "General" fallback issues
 */
const deepPopulateItem = {
  path: "items.stockItemId",
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
};
// --- 1. KITCHEN STOCK FETCH ---
operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

    const stock = await GodownStock.find({ godownId })
      .populate({
        path: "stockItemId",
        model: "StockItem",
        populate: [
  { path: "stockGroupId", model: "StockGroup", select: "name" },
  { path: "unitId", model: "Unit", select: "name symbol" }
],
select: "name stockGroupId unitId imageUrl itemType"
      });

    const formatted = stock.map(s => ({
  stockRecordId: s._id,
  stockItemId: s.stockItemId?._id,
  stockGroupId: s.stockItemId?.stockGroupId?._id,
  groupName: s.stockItemId?.stockGroupId?.name || "General",
  name: s.stockItemId?.name || "Unknown Item",
  currentQty: s.qtyBaseUnit || 0,
  unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
  image: s.stockItemId?.imageUrl || "",

  // ADD THIS
  itemType: s.stockItemId?.itemType || "stock"
}));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 2. ORDERS & CONSUMPTIONS LOGIC (DIRECT PROCESSING) ---
const handleStockProcessing = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const { items } = req.body;
      const godownId = req.user.role === "user" ? req.user.godownId : req.body.godownId;

      if (!godownId) throw new Error("No godown associated with this request.");

      const orderItems = [];
      for (const item of items) {
        const updatedStock = await GodownStock.findOne({ 
          _id: item.stockRecordId, 
          godownId: godownId 
        }).session(session).populate("stockItemId");

        if (!updatedStock) throw new Error(`Item not found in inventory.`);

        const qtyToDeduct = Number(item.qtyBaseUnit || item.quantity);
        updatedStock.qtyBaseUnit -= qtyToDeduct;

        if (updatedStock.qtyBaseUnit < 0) {
          throw new Error(`Insufficient stock for ${updatedStock.stockItemId.name}.`);
        }
        await updatedStock.save({ session });

        // Low Stock Alert Logic
        if (updatedStock.qtyBaseUnit <= updatedStock.thresholdBaseUnit) {
          const alert = {
            type: "low_stock_alert",
            severity: "critical",
            payload: {
              message: `CRITICAL: ${updatedStock.stockItemId.name} low stock!`,
              itemName: updatedStock.stockItemId.name,
              currentQty: updatedStock.qtyBaseUnit,
              threshold: updatedStock.thresholdBaseUnit,
              godownId,
              stockItemId: updatedStock.stockItemId._id
            }
          };
          await Notification.create([alert], { session });
          io.to(godownId.toString()).to("admins").emit("low_stock_alert", alert);
        }

        orderItems.push({ 
          stockItemId: updatedStock.stockItemId._id, 
          qtyBaseUnit: qtyToDeduct,
          stockRecordId: updatedStock._id 
        });
      }

      const consumption = await Consumption.create([{
        godownId,
        userId: req.user.sub, 
        date: req.body.date,
        // date: new Date().toISOString(),
        items: orderItems
      }], { session });

      return consumption[0];
    });

    const populatedResult = await Consumption.findById(result._id)
      .populate("userId", "name")
      .populate("godownId", "name") 
      .populate(deepPopulateItem);

    res.status(201).json(populatedResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};

operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);




// ============================================================
// ADMIN - EDIT CONSUMPTION
// ============================================================
// Admin can change quantities or remove individual items.
//
// Stock synchronization:
// OLD 20 -> NEW 15  => +5 returned to GodownStock
// OLD 20 -> NEW 25  => -5 deducted from GodownStock
// OLD 20 -> DELETE  => +20 returned to GodownStock
// ============================================================

operationsRoutes.patch(
  "/consumptions/:id",
  authorize(["admin"]),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const { id } = req.params;
        const { items } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid consumption ID");
        }

        if (!Array.isArray(items)) {
          throw new Error("Items must be an array");
        }

        // ----------------------------------------------------
        // Find original consumption
        // ----------------------------------------------------
        const consumption = await Consumption.findById(id).session(session);

        if (!consumption) {
          throw new Error("Consumption record not found");
        }

        const godownId = consumption.godownId;

        // ----------------------------------------------------
        // Only normal Consumption can be edited
        // DailyUsage is a different collection.
        // ----------------------------------------------------

        // ----------------------------------------------------
        // Build OLD quantities
        // ----------------------------------------------------
        const oldItems = consumption.items || [];

        const oldMap = new Map();

        for (const oldItem of oldItems) {
          const stockItemId = oldItem.stockItemId?.toString();

          if (!stockItemId) continue;

          const oldQty = Number(oldItem.qtyBaseUnit || 0);

          oldMap.set(stockItemId, {
            qty: oldQty,
            stockRecordId: oldItem.stockRecordId || null
          });
        }

        // ----------------------------------------------------
        // Build NEW quantities
        // ----------------------------------------------------
        const newMap = new Map();

        for (const item of items) {
          if (!item.stockItemId) {
            throw new Error("Invalid stock item");
          }

          const stockItemId = item.stockItemId.toString();
          const qty = Number(item.qtyBaseUnit);

          if (!Number.isFinite(qty) || qty < 0) {
            throw new Error(
              `Invalid quantity for stock item ${stockItemId}`
            );
          }

          if (newMap.has(stockItemId)) {
            throw new Error(
              "The same stock item cannot appear more than once."
            );
          }

          newMap.set(stockItemId, {
            qty,
            stockRecordId: item.stockRecordId || null
          });
        }

        // ----------------------------------------------------
        // Get every affected stock item
        // ----------------------------------------------------
        const affectedIds = new Set([
          ...oldMap.keys(),
          ...newMap.keys()
        ]);

        // ----------------------------------------------------
        // Synchronize Godown Stock
        // ----------------------------------------------------
        for (const stockItemId of affectedIds) {
          const oldData = oldMap.get(stockItemId);
          const newData = newMap.get(stockItemId);

          const oldQty = oldData?.qty || 0;
          const newQty = newData?.qty || 0;

          /*
            Consumption means stock was deducted.

            Example:

            Old consumption = 20
            New consumption = 15

            Difference = 20 - 15 = +5

            So 5 must be returned to stock.

            Old consumption = 20
            New consumption = 25

            Difference = 20 - 25 = -5

            So 5 must be deducted from stock.
          */

          const stockChange = oldQty - newQty;

          if (stockChange === 0) {
            continue;
          }

          let stock = null;

          // First try stockRecordId
          const stockRecordId =
            oldData?.stockRecordId ||
            newData?.stockRecordId;

          if (
            stockRecordId &&
            mongoose.Types.ObjectId.isValid(stockRecordId.toString())
          ) {
            stock = await GodownStock.findOne({
              _id: stockRecordId,
              godownId
            }).session(session);
          }

          // Fallback: godown + stock item
          if (!stock) {
            stock = await GodownStock.findOne({
              godownId,
              stockItemId
            }).session(session);
          }

          // --------------------------------------------------
          // Stock record should exist
          // --------------------------------------------------
          if (!stock) {
            throw new Error(
              `Stock record not found for stock item ${stockItemId}`
            );
          }

          // stockChange can be positive or negative
          const newStockQty =
            Number(stock.qtyBaseUnit || 0) + stockChange;

          // Never allow negative stock
          if (newStockQty < 0) {
            const stockItem = await StockItem.findById(stockItemId)
              .select("name")
              .session(session);

            throw new Error(
              `Insufficient stock for ${
                stockItem?.name || "selected item"
              }. Available: ${
                stock.qtyBaseUnit
              }, additional required: ${
                Math.abs(stockChange)
              }`
            );
          }

          stock.qtyBaseUnit = newStockQty;

          await stock.save({ session });
        }

        // ----------------------------------------------------
        // Save new consumption items
        // ----------------------------------------------------
        consumption.items = items
          .filter(item => Number(item.qtyBaseUnit) > 0)
          .map(item => ({
            stockItemId: item.stockItemId,
            qtyBaseUnit: Number(item.qtyBaseUnit),
            stockRecordId: item.stockRecordId || undefined
          }));

        await consumption.save({ session });
      });

      // ------------------------------------------------------
      // Get updated/populated record
      // ------------------------------------------------------
      const updatedConsumption = await Consumption.findById(req.params.id)
        .populate("userId", "name")
        .populate("godownId", "name")
        .populate(deepPopulateItem);

      // ------------------------------------------------------
      // Notify client applications
      // ------------------------------------------------------
      io.to(updatedConsumption.godownId._id.toString()).emit(
        "consumption_updated",
        updatedConsumption
      );

      io.to("admins").emit(
        "consumption_updated",
        updatedConsumption
      );

      res.json(updatedConsumption);

    } catch (error) {
      console.error("UPDATE CONSUMPTION ERROR:");
      console.error(error);

      res.status(400).json({
        error: error.message || "Failed to update consumption"
      });

    } finally {
      await session.endSession();
    }
  }
);


// ============================================================
// ADMIN - DELETE CONSUMPTION
// ============================================================
// Deletes the consumption record and returns ALL consumed
// quantities back to GodownStock.
// ============================================================

operationsRoutes.delete(
  "/consumptions/:id",
  authorize(["admin"]),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let deletedConsumption;

      await session.withTransaction(async () => {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid consumption ID");
        }

        // ----------------------------------------------------
        // Find consumption
        // ----------------------------------------------------
        const consumption = await Consumption.findById(id)
          .session(session);

        if (!consumption) {
          throw new Error("Consumption record not found");
        }

        const godownId = consumption.godownId;

        // ----------------------------------------------------
        // Return every consumed quantity to stock
        // ----------------------------------------------------
        for (const item of consumption.items || []) {
          const stockItemId = item.stockItemId;
          const qtyToReturn = Number(item.qtyBaseUnit || 0);

          if (!stockItemId || qtyToReturn <= 0) {
            continue;
          }

          let stock = null;

          // Try stored stockRecordId first
          if (
            item.stockRecordId &&
            mongoose.Types.ObjectId.isValid(
              item.stockRecordId.toString()
            )
          ) {
            stock = await GodownStock.findOne({
              _id: item.stockRecordId,
              godownId
            }).session(session);
          }

          // Fallback
          if (!stock) {
            stock = await GodownStock.findOne({
              godownId,
              stockItemId
            }).session(session);
          }

          if (!stock) {
            throw new Error(
              `Stock record not found for stock item ${stockItemId}`
            );
          }

          stock.qtyBaseUnit =
            Number(stock.qtyBaseUnit || 0) + qtyToReturn;

          await stock.save({ session });
        }

        // ----------------------------------------------------
        // Delete consumption
        // ----------------------------------------------------
        deletedConsumption = {
          _id: consumption._id,
          godownId: consumption.godownId,
          userId: consumption.userId
        };

        await Consumption.deleteOne({
          _id: consumption._id
        }).session(session);
      });

      // ------------------------------------------------------
      // Notify clients immediately
      // ------------------------------------------------------
      io.to(deletedConsumption.godownId.toString()).emit(
        "consumption_deleted",
        {
          consumptionId: deletedConsumption._id,
          godownId: deletedConsumption.godownId
        }
      );

      io.to("admins").emit(
        "consumption_deleted",
        {
          consumptionId: deletedConsumption._id,
          godownId: deletedConsumption.godownId
        }
      );

      res.json({
        message: "Consumption deleted and stock restored",
        consumptionId: deletedConsumption._id
      });

    } catch (error) {
      console.error("DELETE CONSUMPTION ERROR:");
      console.error(error);

      res.status(400).json({
        error: error.message || "Failed to delete consumption"
      });

    } finally {
      await session.endSession();
    }
  }
);


operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
  try {

    const consumptions = await Consumption.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem);

    const dailyUsages = await DailyUsage.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem);

    const combined = [
      ...consumptions.map(item => ({
        ...item.toObject(),
        recordType: "consumption"
      })),
      ...dailyUsages.map(item => ({
        ...item.toObject(),
        recordType: "dailyUsage"
      }))
    ].sort((a, b) => {
  const dateA = new Date(a.date || a.createdAt);
  const dateB = new Date(b.date || b.createdAt);

  return dateB - dateA;
});

    res.json(combined);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
  try {
    const data = await Consumption.find({ userId: req.user.sub })
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem) 
      .sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. REQUESTS (WORKFLOW) ---
operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
    const requests = await Request.find(filter)
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem) 
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
  try {
    const created = await Request.create({ 
      ...req.body, 
      userId: req.user.sub, 
      godownId: req.user.godownId, 
      status: "pending" 
    });
    
    const notification = await Notification.create({ 
      type: "request_created", 
      severity: "info", 
      payload: { 
        message: `New consumption request created`,
        requestId: created._id,
        godownId: req.user.godownId 
      } 
    });

    io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * UPDATED APPROVE ROUTE
 * Handles stock sync for both regular issues (+) and returns (-).
 */
operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {

  console.log("=================================");
  console.log("APPROVE CLICKED");
  console.log("REQUEST ID:", req.params.id);
  console.log("=================================");
    await session.withTransaction(async () => {
      const request = await Request.findById(req.params.id).session(session);
      console.log("REQUEST FOUND:");
console.log(request);
      if (!request) throw new Error("Request not found");
      if (request.status !== "pending") throw new Error("Request already processed");

      request.status = "approved";
      request.adminDecision = req.body.note || "Approved";
      await request.save({ session });
      console.log("REQUEST STATUS SAVED:", request.status);
      // Create a record of this consumption/return
      if (request.requestType === "daily_usage") {

  await DailyUsage.create([{
  godownId: request.godownId,
  userId: request.userId,
  date: request.targetDate,
  reason: request.reason,
  items: request.items
}], { session });

} else {

  await Consumption.create([{
    godownId: request.godownId,
    userId: request.userId,
    date: request.targetDate || new Date(),
    items: request.items
  }], { session });

}
      
      
      
      // await Consumption.create([{ 
      //   godownId: request.godownId, 
      //   userId: request.userId, 
      //   date: request.targetDate || new Date(), 
      //   items: request.items 
      // }], { session });
   
      
for (const item of request.items) {

  console.log("CHECKING STOCK");
  console.log("Godown:", request.godownId);
  console.log("Item:", item.stockItemId);

  const stock = await GodownStock.findOne({
    godownId: request.godownId,
    stockItemId: item.stockItemId
  });

  console.log("FOUND STOCK:", stock);

  const stockUpdate = await GodownStock.findOneAndUpdate(
    {
      godownId: request.godownId,
      stockItemId: item.stockItemId
    },
    {
      $inc: {
        qtyBaseUnit: -item.qtyBaseUnit
      }
    },
    {
      session,
      new: true
    }
  );

if (!stockUpdate) {

  await GodownStock.create([{
    godownId: request.godownId,
    stockItemId: item.stockItemId,
    qtyBaseUnit: 0,
    thresholdBaseUnit: 0
  }], { session });

  continue;
}


  // if (!stockUpdate)
  //   throw new Error("Stock record not found for one of the items.");
}

//       for (const item of request.items) {
//         console.log("CHECKING STOCK");
// console.log("Godown:", request.godownId);
// console.log("Item:", item.stockItemId);
//         // Logic: Negative of the requested quantity. 
//         // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
//         const stockUpdate = await GodownStock.findOneAndUpdate(
//           { godownId: request.godownId, stockItemId: item.stockItemId }, 
//           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
//           { session, new: true }
//         );

//         if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

//         // Safety check if stock goes below 0 after deduction
//         if (stockUpdate.qtyBaseUnit < 0) {
//            throw new Error(`Insufficient Godown stock to fulfill this request.`);
//         }
//       }
      
      io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
    });
    res.json({ message: "Status updated and Godown stock synced" });
  } catch (error) {

  console.log("=================================");
  console.log("APPROVE ERROR");
  console.log(error);
  console.log("=================================");

  res.status(500).json({
    error: error.message
  });

}finally {
    await session.endSession();
  }
});

operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
  try {
    const request = await Request.findByIdAndUpdate(req.params.id, { 
      status: "rejected", 
      adminDecision: req.body.note || "Rejected" 
    }, { new: true });
    
    io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



operationsRoutes.get(
"/user-transfers/incoming",
authorize(["user"]),
async(req,res)=>{

const transfers = await Transfer.find({
  toGodownId: req.user.godownId,
  status: "pending"
})
.populate("fromGodownId","name")
.populate("toGodownId","name")
.populate(deepPopulateItem)
.sort({createdAt:-1});

res.json(transfers);

});


operationsRoutes.post(
"/user-transfers/:id/accept",
authorize(["user"]),
async(req,res)=>{

const session=await mongoose.startSession();

try{

await session.withTransaction(async()=>{

const transfer=await Transfer.findById(req.params.id)
.session(session);

if(!transfer)
throw new Error("Transfer not found");

if(transfer.status!=="pending")
throw new Error("Already processed");

if(
transfer.toGodownId.toString()!==req.user.godownId.toString()
){
throw new Error("Not allowed");
}

for(const item of transfer.items){
if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
    throw new Error("Invalid transfer quantity");
}
const source=await GodownStock.findOne({

godownId:transfer.fromGodownId,

stockItemId:item.stockItemId

}).session(session);

if(!source)
throw new Error("Source stock missing");

if(source.qtyBaseUnit<item.qtyBaseUnit)
throw new Error("Insufficient stock");

source.qtyBaseUnit-=item.qtyBaseUnit;

await source.save({session});

await GodownStock.findOneAndUpdate(
{
    godownId: transfer.toGodownId,
    stockItemId: item.stockItemId
},
{
    $inc:{
        qtyBaseUnit:item.qtyBaseUnit
    },
    $setOnInsert:{
        godownId: transfer.toGodownId,
        stockItemId: item.stockItemId,
        // qtyBaseUnit:0,
        thresholdBaseUnit:0
    }
},
{
    upsert:true,
    new:true,
    session
}
);

}

transfer.status="accepted";

transfer.acceptedBy=req.user.sub;

transfer.acceptedAt=new Date();

await transfer.save({session});
io.to(transfer.fromGodownId.toString()).emit(
    "transfer_accepted",
    transfer
);

});

res.json({
message:"Transfer Accepted"
});

}catch(err){

res.status(400).json({
error:err.message
});

}finally{

session.endSession();

}

});





operationsRoutes.get("/transfers", authorize(["admin", "user"]), async (req, res) => {
  try {
    let filter = {};

if (req.user.role === "user") {
  filter = {
    $or: [
      { fromGodownId: req.user.godownId },
      { toGodownId: req.user.godownId }
    ]
  };
}

const transfers = await Transfer.find(filter)
      .populate("fromGodownId", "name")
      .populate("toGodownId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



operationsRoutes.post(
  "/transfers",
  authorize(["admin", "user"]),
  async (req, res) => {
    try {

      const {
        fromGodownId,
        toGodownId,
        items
      } = req.body;

      const sourceGodownId =
  req.user.role === "admin"
    ? fromGodownId
    : req.user.godownId;

      if (!fromGodownId || !toGodownId)
        return res.status(400).json({
          error: "Source and Destination required"
        });

      if (sourceGodownId.toString() === toGodownId.toString())
        return res.status(400).json({
          error: "Cannot transfer to same godown"
        });

      if (!items || items.length === 0)
        return res.status(400).json({
          error: "No items selected"
        });

      for (const item of items) {

       const stock = await GodownStock.findOne({
  godownId: sourceGodownId,
  stockItemId: item.stockItemId
});

        if (!stock)
          return res.status(400).json({
            error: "Stock not found"
          });

        if (stock.qtyBaseUnit < item.qtyBaseUnit)
          return res.status(400).json({
            error: "Insufficient stock"
          });

      }

      const transfer = await Transfer.create({

  fromGodownId: sourceGodownId,

  toGodownId,

  createdBy: req.user.sub,

  items,

  status: "pending"

});

      io.to(toGodownId.toString()).emit(
        "new_transfer",
        transfer
      );

      res.status(201).json(transfer);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
  }
);



operationsRoutes.get(
  "/godown-stocks",
  authorize(["admin", "user"]),
  async (req, res) => {
    try {
     let filter = {};

if (req.user.role === "user") {
  filter = { godownId: req.user.godownId };
}

const stocks = await GodownStock.find(filter)
        .populate({
          path: "godownId",
          model: "Godown",
          select: "name"
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
        .sort({ createdAt: -1 });

      res.json(stocks);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);
// --- 6. NOTIFICATIONS ---
operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


operationsRoutes.post(
"/user-transfers/:id/reject",
authorize(["user"]),
async(req,res)=>{

const transfer=await Transfer.findById(req.params.id);

if(!transfer)
return res.status(404).json({error:"Not found"});

if (
    transfer.toGodownId.toString() !== req.user.godownId.toString()
) {
    return res.status(403).json({
        error: "Not allowed"
    });
}

transfer.status = "rejected";
transfer.rejectedAt = new Date();

await transfer.save();

io.to(transfer.fromGodownId.toString()).emit(
    "transfer_rejected",
    transfer
);

res.json({
message:"Rejected"
});

});





operationsRoutes.get(
"/user-transfers/history",
authorize(["user"]),
async(req,res)=>{

const transfers=await Transfer.find({

$or:[

{fromGodownId:req.user.godownId},

{toGodownId:req.user.godownId}

]

})
.populate("fromGodownId","name")
.populate("toGodownId","name")
.populate(deepPopulateItem)
.sort({createdAt:-1});

res.json(transfers);

});




operationsRoutes.post(
"/user-transfers",
authorize(["user"]),
async (req,res)=>{

console.log("BODY");
console.log(req.body);

console.log("USER");
console.log(req.user);

// Validation
if (!req.body.toGodownId) {
    return res.status(400).json({
        error: "Destination godown is required"
    });
}

if (
    req.user.godownId.toString() ===
    req.body.toGodownId.toString()
) {
    return res.status(400).json({
        error: "Cannot transfer to the same godown"
    });
}

if (!req.body.items || req.body.items.length === 0) {
    return res.status(400).json({
        error: "Transfer cart is empty"
    });
}

for (const item of req.body.items) {

    if (!item.stockItemId) {
        return res.status(400).json({
            error: "Invalid stock item"
        });
    }

    if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) {
        return res.status(400).json({
            error: "Transfer quantity must be greater than zero"
        });
    }

    const stock = await GodownStock.findOne({
        godownId: req.user.godownId,
        stockItemId: item.stockItemId
    });

    if (!stock) {
        return res.status(400).json({
            error: "Stock record not found"
        });
    }

    if (stock.qtyBaseUnit < item.qtyBaseUnit) {
        return res.status(400).json({
          error: "Insufficient stock available for one of the selected items."  
          // error: `${stock.stockItemId} has insufficient stock`
        });
    }
}

const transfer = await Transfer.create({

    fromGodownId: req.user.godownId,

    toGodownId: req.body.toGodownId,

    createdBy: req.user.sub,

    items: req.body.items,

    status: "pending"

});
io.to(req.body.toGodownId.toString()).emit(
    "new_transfer",
    transfer
);
console.log("TRANSFER SAVED");
console.log(transfer);

res.status(201).json(transfer);

});
