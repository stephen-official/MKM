// // // // // import express from "express";
// // // // // import mongoose from "mongoose";
// // // // // import { authorize } from "../middleware/auth.js";
// // // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // // import { io } from "../server.js"; 

// // // // // export const operationsRoutes = express.Router();

// // // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // // //   try {
// // // // //     const godownId = req.user.godownId;
// // // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // // //     const stock = await GodownStock.find({ godownId })
// // // // //       .populate({
// // // // //         path: "stockItemId",
// // // // //         populate: [
// // // // //           { path: "stockGroupId", select: "name" },
// // // // //           { path: "unitId", select: "name symbol" } 
// // // // //         ]
// // // // //       });

// // // // //     const formatted = stock.map(s => ({
// // // // //       stockRecordId: s._id,
// // // // //       stockItemId: s.stockItemId?._id,
// // // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
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

// // // // // // --- 2. ORDERS & CONSUMPTIONS logic ---
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

// // // // //       // sub is usually the ID in JWT (req.user.sub)
// // // // //       const consumption = await Consumption.create([{
// // // // //         godownId,
// // // // //         userId: req.user.sub, 
// // // // //         date: new Date().toISOString(),
// // // // //         items: orderItems
// // // // //       }], { session });

// // // // //       return consumption[0];
// // // // //     });

// // // // //     const populatedResult = await Consumption.findById(result._id)
// // // // //       .populate("userId", "name") // Populate user on creation response
// // // // //       .populate({
// // // // //         path: "items.stockItemId",
// // // // //         select: "name",
// // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // //       });

// // // // //     res.status(201).json(populatedResult);
// // // // //   } catch (error) {
// // // // //     res.status(400).json({ error: error.message });
// // // // //   } finally {
// // // // //     await session.endSession();
// // // // //   }
// // // // // };

// // // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // // --- 3. CONSUMPTION HISTORY (UPDATED WITH USER POPULATION) ---

// // // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // // //   try {
// // // // //     const data = await Consumption.find()
// // // // //       .populate("godownId", "name")
// // // // //       .populate("userId", "name") // <-- THIS FIXES "UNASSIGNED STAFF"
// // // // //       .populate({
// // // // //         path: "items.stockItemId",
// // // // //         select: "name",
// // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // //       }) 
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(data);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // // //   try {
// // // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // // //       .populate("userId", "name")
// // // // //       .populate({
// // // // //         path: "items.stockItemId",
// // // // //         select: "name",
// // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // //       }) 
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
// // // // //       .populate("userId", "name") // Added for admin clarity
// // // // //       .populate({
// // // // //         path: "items.stockItemId",
// // // // //         select: "name",
// // // // //         populate: { path: "unitId", select: "symbol name" }
// // // // //       }) 
// // // // //       .sort({ createdAt: -1 });
// // // // //     res.json(requests);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });

// // // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // // //   const created = await Request.create({ 
// // // // //     ...req.body, 
// // // // //     userId: req.user.sub, 
// // // // //     godownId: req.user.godownId, 
// // // // //     status: "pending" 
// // // // //   });
  
// // // // //   const notification = await Notification.create({ 
// // // // //     type: "request_created", 
// // // // //     severity: "info", 
// // // // //     payload: { 
// // // // //       message: `New consumption request created`,
// // // // //       requestId: created._id,
// // // // //       godownId: req.user.godownId 
// // // // //     } 
// // // // //   });

// // // // //   io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // // //   res.status(201).json(created);
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
// // // // //   const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // // //     status: "rejected", 
// // // // //     adminDecision: req.body.note || "Rejected" 
// // // // //   }, { new: true });
  
// // // // //   io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // // //   res.json(request);
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

// // // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // // //   res.json(await Transfer.find()
// // // // // //     .populate("fromGodownId", "name")
// // // // // //     .populate("toGodownId", "name")
// // // // // //     .populate("items.stockItemId", "name")
// // // // // //     .sort({ createdAt: -1 }));
// // // // // // });






// // // // // // --- 5. TRANSFERS (INTEGRATED WITH DEEP POPULATION) ---

// // // // // operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
// // // // //   try {
// // // // //     const transfers = await Transfer.find()
// // // // //       .populate("fromGodownId", "name")
// // // // //       .populate("toGodownId", "name")
// // // // //       .populate({
// // // // //         path: "items.stockItemId",
// // // // //         select: "name unitId",
// // // // //         // This nested populate reaches the Unit collection
// // // // //         populate: {
// // // // //           path: "unitId",
// // // // //           select: "symbol name"
// // // // //         }
// // // // //       })
// // // // //       .sort({ createdAt: -1 });

// // // // //     res.json(transfers);
// // // // //   } catch (error) {
// // // // //     res.status(500).json({ error: error.message });
// // // // //   }
// // // // // });












// // // // // // --- 6. NOTIFICATIONS ---

// // // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // // //   const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // // //   res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // // });




















// // // // import express from "express";
// // // // import mongoose from "mongoose";
// // // // import { authorize } from "../middleware/auth.js";
// // // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // // import { io } from "../server.js"; 

// // // // export const operationsRoutes = express.Router();

// // // // // --- 1. KITCHEN STOCK FETCH ---
// // // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // // //   try {
// // // //     const godownId = req.user.godownId;
// // // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // // //     const stock = await GodownStock.find({ godownId })
// // // //       .populate({
// // // //         path: "stockItemId",
// // // //         populate: [
// // // //           { path: "stockGroupId", select: "name" },
// // // //           { path: "unitId", select: "name symbol" } 
// // // //         ]
// // // //       });

// // // //     const formatted = stock.map(s => ({
// // // //       stockRecordId: s._id,
// // // //       stockItemId: s.stockItemId?._id,
// // // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
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

// // // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
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

// // // //     // --- INTEGRATED POPULATION FOR CREATION RESPONSE ---
// // // //     const populatedResult = await Consumption.findById(result._id)
// // // //       .populate("userId", "name")
// // // //       .populate({
// // // //         path: "items.stockItemId",
// // // //         select: "name stockGroupId unitId",
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol name" },
// // // //           { path: "stockGroupId", select: "name" }
// // // //         ]
// // // //       });

// // // //     res.status(201).json(populatedResult);
// // // //   } catch (error) {
// // // //     res.status(400).json({ error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // };

// // // // operationsRoutes.post("/orders", authorize(["user", "admin"]), handleStockProcessing);
// // // // operationsRoutes.post("/consumptions", authorize(["user", "admin"]), handleStockProcessing);

// // // // // --- 3. CONSUMPTION HISTORY (UPDATED WITH GROUP POPULATION) ---
// // // // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// // // //   try {
// // // //     const data = await Consumption.find()
// // // //       .populate("godownId", "name")
// // // //       .populate("userId", "name")
// // // //       .populate({
// // // //         path: "items.stockItemId",
// // // //         select: "name stockGroupId unitId", 
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol name" },
// // // //           { path: "stockGroupId", select: "name" } 
// // // //         ]
// // // //       }) 
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(data);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // operationsRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
// // // //   try {
// // // //     const data = await Consumption.find({ userId: req.user.sub })
// // // //       .populate("userId", "name")
// // // //       .populate({
// // // //         path: "items.stockItemId",
// // // //         select: "name stockGroupId unitId",
// // // //         populate: [
// // // //           { path: "unitId", select: "symbol name" },
// // // //           { path: "stockGroupId", select: "name" }
// // // //         ]
// // // //       }) 
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(data);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 4. REQUESTS ---
// // // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // // //   try {
// // // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // // //     const requests = await Request.find(filter)
// // // //       .populate("godownId", "name")
// // // //       .populate("userId", "name")
// // // //       .populate({
// // // //         path: "items.stockItemId",
// // // //         select: "name unitId",
// // // //         populate: { path: "unitId", select: "symbol name" }
// // // //       }) 
// // // //       .sort({ createdAt: -1 });
// // // //     res.json(requests);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // operationsRoutes.post("/requests", authorize(["user"]), async (req, res) => {
// // // //   const created = await Request.create({ 
// // // //     ...req.body, 
// // // //     userId: req.user.sub, 
// // // //     godownId: req.user.godownId, 
// // // //     status: "pending" 
// // // //   });
  
// // // //   const notification = await Notification.create({ 
// // // //     type: "request_created", 
// // // //     severity: "info", 
// // // //     payload: { 
// // // //       message: `New consumption request created`,
// // // //       requestId: created._id,
// // // //       godownId: req.user.godownId 
// // // //     } 
// // // //   });

// // // //   io.to("admins").emit("new_request", { message: "New request received", id: created._id, notification });
// // // //   res.status(201).json(created);
// // // // });

// // // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const request = await Request.findById(req.params.id).session(session);
// // // //       if (!request) throw new Error("Request not found");
      
// // // //       request.status = "approved";
// // // //       request.adminDecision = req.body.note || "Approved";
// // // //       await request.save({ session });
      
// // // //       await Consumption.create([{ 
// // // //         godownId: request.godownId, 
// // // //         userId: request.userId, 
// // // //         date: request.targetDate || new Date(), 
// // // //         items: request.items 
// // // //       }], { session });
      
// // // //       for (const item of request.items) {
// // // //         await GodownStock.findOneAndUpdate(
// // // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // //           { session }
// // // //         );
// // // //       }
      
// // // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // // //     });
// // // //     res.json({ message: "Request approved and stock updated" });
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   } finally {
// // // //     await session.endSession();
// // // //   }
// // // // });

// // // // operationsRoutes.post("/requests/:id/reject", authorize(["admin"]), async (req, res) => {
// // // //   const request = await Request.findByIdAndUpdate(req.params.id, { 
// // // //     status: "rejected", 
// // // //     adminDecision: req.body.note || "Rejected" 
// // // //   }, { new: true });
  
// // // //   io.to(request.godownId.toString()).emit("request_rejected", { requestId: request._id });
// // // //   res.json(request);
// // // // });

// // // // // --- 5. TRANSFERS ---
// // // // operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
// // // //   const session = await mongoose.startSession();
// // // //   try {
// // // //     await session.withTransaction(async () => {
// // // //       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
// // // //       for (const item of req.body.items || []) {
// // // //         await GodownStock.findOneAndUpdate(
// // // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // // //           { session }
// // // //         );
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
// // // //       .populate({
// // // //         path: "items.stockItemId",
// // // //         select: "name unitId",
// // // //         populate: {
// // // //           path: "unitId",
// // // //           select: "symbol name"
// // // //         }
// // // //       })
// // // //       .sort({ createdAt: -1 });

// // // //     res.json(transfers);
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // --- 6. NOTIFICATIONS ---
// // // // operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
// // // //   const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
// // // //   res.json(await Notification.find(filter).sort({ createdAt: -1 }));
// // // // });










// // // import express from "express";
// // // import mongoose from "mongoose";
// // // import { authorize } from "../middleware/auth.js";
// // // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // // import { io } from "../server.js"; 

// // // export const operationsRoutes = express.Router();

// // // // --- 1. KITCHEN STOCK FETCH ---
// // // operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
// // //   try {
// // //     const godownId = req.user.godownId;
// // //     if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });

// // //     const stock = await GodownStock.find({ godownId })
// // //       .populate({
// // //         path: "stockItemId",
// // //         populate: [
// // //           { path: "stockGroupId", select: "name" },
// // //           { path: "unitId", select: "name symbol" } 
// // //         ]
// // //       });

// // //     const formatted = stock.map(s => ({
// // //       stockRecordId: s._id,
// // //       stockItemId: s.stockItemId?._id,
// // //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
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

// // // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
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

// // //     // --- INTEGRATED POPULATION FOR CREATION RESPONSE ---
// // //     const populatedResult = await Consumption.findById(result._id)
// // //       .populate("userId", "name")
// // //       .populate("godownId", "name") 
// // //       .populate({
// // //         path: "items.stockItemId",
// // //         select: "name stockGroupId unitId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol name" },
// // //           { path: "stockGroupId", select: "name" } 
// // //         ]
// // //       });

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
// // //       .populate({
// // //         path: "items.stockItemId",
// // //         select: "name stockGroupId unitId", 
// // //         populate: [
// // //           { path: "unitId", select: "symbol name" },
// // //           { path: "stockGroupId", select: "name" } 
// // //         ]
// // //       }) 
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
// // //       .populate({
// // //         path: "items.stockItemId",
// // //         select: "name stockGroupId unitId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol name" },
// // //           { path: "stockGroupId", select: "name" }
// // //         ]
// // //       }) 
// // //       .sort({ createdAt: -1 });
// // //     res.json(data);
// // //   } catch (error) {
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // });

// // // // --- 4. REQUESTS ---
// // // operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
// // //   try {
// // //     const filter = req.user.role === "admin" ? {} : { userId: req.user.sub };
// // //     const requests = await Request.find(filter)
// // //       .populate("godownId", "name")
// // //       .populate("userId", "name")
// // //       .populate({
// // //         path: "items.stockItemId",
// // //         select: "name stockGroupId unitId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol name" },
// // //           { path: "stockGroupId", select: "name" }
// // //         ]
// // //       }) 
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

// // // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// // //   const session = await mongoose.startSession();
// // //   try {
// // //     await session.withTransaction(async () => {
// // //       const request = await Request.findById(req.params.id).session(session);
// // //       if (!request) throw new Error("Request not found");
      
// // //       request.status = "approved";
// // //       request.adminDecision = req.body.note || "Approved";
// // //       await request.save({ session });
      
// // //       await Consumption.create([{ 
// // //         godownId: request.godownId, 
// // //         userId: request.userId, 
// // //         date: request.targetDate || new Date(), 
// // //         items: request.items 
// // //       }], { session });
      
// // //       for (const item of request.items) {
// // //         await GodownStock.findOneAndUpdate(
// // //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // //           { session }
// // //         );
// // //       }
      
// // //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// // //     });
// // //     res.json({ message: "Request approved and stock updated" });
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
// // //         await GodownStock.findOneAndUpdate(
// // //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// // //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// // //           { session }
// // //         );
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
// // //       .populate({
// // //         path: "items.stockItemId",
// // //         select: "name stockGroupId unitId",
// // //         populate: [
// // //           { path: "unitId", select: "symbol name" },
// // //           { path: "stockGroupId", select: "name" }
// // //         ]
// // //       })
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





// // import express from "express";
// // import mongoose from "mongoose";
// // import { authorize } from "../middleware/auth.js";
// // import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// // import { io } from "../server.js"; 
// // // Add these at the very top with your other imports
// // import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// // export const operationsRoutes = express.Router();

// // /**
// //  * SHARED UTILITY: Deep Population Config
// //  * This ensures consistency across all routes that need detailed item info
// //  */
// // const deepPopulateItem = {
// //   path: "items.stockItemId",
// //   model: "StockItem", // Explicitly tell Mongoose which model to use
// //   select: "name stockGroupId unitId imageUrl",
// //   populate: [
// //     { 
// //       path: "unitId", 
// //       model: "Unit", // Explicitly tell Mongoose which model to use
// //       select: "symbol name" 
// //     },
// //     { 
// //       path: "stockGroupId", 
// //       model: "StockGroup", // Explicitly tell Mongoose which model to use
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
// //         populate: [
// //           { path: "stockGroupId", select: "name" },
// //           { path: "unitId", select: "name symbol" } 
// //         ]
// //       });

// //     const formatted = stock.map(s => ({
// //       stockRecordId: s._id,
// //       stockItemId: s.stockItemId?._id,
// //       stockGroupId: s.stockItemId?.stockGroupId?._id, 
// //       groupName: s.stockItemId?.stockGroupId?.name || "General", // Added for easier frontend access
// //       name: s.stockItemId?.name || "Unknown Item",
// //       currentQty: s.qtyBaseUnit || 0,
// //       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
// //       image: s.stockItemId?.imageUrl || ""
// //     }));

// //     res.json(formatted);
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // });

// // // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
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
// //         date: new Date().toISOString(),
// //         items: orderItems
// //       }], { session });

// //       return consumption[0];
// //     });

// //     // Integrated Deep Population for the Creation Response
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
// // operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
// //   try {
// //     const data = await Consumption.find()
// //       .populate("godownId", "name")
// //       .populate("userId", "name")
// //       .populate(deepPopulateItem) // Deeply populated Group & Unit
// //       .sort({ createdAt: -1 });
// //     res.json(data);
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

// // // --- 4. REQUESTS ---
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

// // operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {
// //     await session.withTransaction(async () => {
// //       const request = await Request.findById(req.params.id).session(session);
// //       if (!request) throw new Error("Request not found");
      
// //       request.status = "approved";
// //       request.adminDecision = req.body.note || "Approved";
// //       await request.save({ session });
      
// //       await Consumption.create([{ 
// //         godownId: request.godownId, 
// //         userId: request.userId, 
// //         date: request.targetDate || new Date(), 
// //         items: request.items 
// //       }], { session });
      
// //       for (const item of request.items) {
// //         await GodownStock.findOneAndUpdate(
// //           { godownId: request.godownId, stockItemId: item.stockItemId }, 
// //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// //           { session }
// //         );
// //       }
      
// //       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
// //     });
// //     res.json({ message: "Request approved and stock updated" });
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   } finally {
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
// //         await GodownStock.findOneAndUpdate(
// //           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
// //           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
// //           { session }
// //         );
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










// import express from "express";
// import mongoose from "mongoose";
// import { authorize } from "../middleware/auth.js";
// import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
// import { io } from "../server.js"; 
// // CRITICAL: Explicitly import these so Mongoose registers the models for population
// import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

// export const operationsRoutes = express.Router();

// /**
//  * SHARED UTILITY: Deep Population Config
//  * Using explicit 'model' properties to prevent "General" fallback issues
//  */
// const deepPopulateItem = {
//   path: "items.stockItemId",
//   model: "StockItem", 
//   select: "name stockGroupId unitId imageUrl",
//   populate: [
//     { 
//       path: "unitId", 
//       model: "Unit", 
//       select: "symbol name" 
//     },
//     { 
//       path: "stockGroupId", 
//       model: "StockGroup", 
//       select: "name" // Ensure 'name' is selected here
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
//           { path: "stockGroupId", model: "StockGroup", select: "name" },
//           { path: "unitId", model: "Unit", select: "name symbol" } 
//         ]
//       });

//     const formatted = stock.map(s => ({
//       stockRecordId: s._id,
//       stockItemId: s.stockItemId?._id,
//       stockGroupId: s.stockItemId?.stockGroupId?._id, 
//       groupName: s.stockItemId?.stockGroupId?.name || "General", 
//       name: s.stockItemId?.name || "Unknown Item",
//       currentQty: s.qtyBaseUnit || 0,
//       unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
//       image: s.stockItemId?.imageUrl || ""
//     }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // --- 2. ORDERS & CONSUMPTIONS LOGIC ---
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
//         date: new Date().toISOString(),
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

// // --- 3. CONSUMPTION HISTORY (WITH DEBUG LOG) ---
// operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
//   try {
//     const data = await Consumption.find()
//       .populate("godownId", "name")
//       .populate("userId", "name")
//       .populate(deepPopulateItem)
//       .sort({ createdAt: -1 });

//     // DEBUG: Check terminal output to see if StockGroup name is reaching the server
//     if (data.length > 0 && data[0].items.length > 0) {
//       console.log("DEBUG GROUP:", data[0].items[0].stockItemId?.stockGroupId);
//     }

//     res.json(data);
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

// // --- 4. REQUESTS ---
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

// operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     await session.withTransaction(async () => {
//       const request = await Request.findById(req.params.id).session(session);
//       if (!request) throw new Error("Request not found");
      
//       request.status = "approved";
//       request.adminDecision = req.body.note || "Approved";
//       await request.save({ session });
      
//       await Consumption.create([{ 
//         godownId: request.godownId, 
//         userId: request.userId, 
//         date: request.targetDate || new Date(), 
//         items: request.items 
//       }], { session });
      
//       for (const item of request.items) {
//         await GodownStock.findOneAndUpdate(
//           { godownId: request.godownId, stockItemId: item.stockItemId }, 
//           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
//           { session }
//         );
//       }
      
//       io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
//     });
//     res.json({ message: "Request approved and stock updated" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   } finally {
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

// // --- 5. TRANSFERS ---
// operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     await session.withTransaction(async () => {
//       const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
//       for (const item of req.body.items || []) {
//         await GodownStock.findOneAndUpdate(
//           { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
//           { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
//           { session }
//         );
//         await GodownStock.findOneAndUpdate(
//           { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
//           { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
//           { upsert: true, session }
//         );
//       }
//       res.status(201).json(transfer[0]);
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   } finally {
//     await session.endSession();
//   }
// });

// operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
//   try {
//     const transfers = await Transfer.find()
//       .populate("fromGodownId", "name")
//       .populate("toGodownId", "name")
//       .populate(deepPopulateItem)
//       .sort({ createdAt: -1 });

//     res.json(transfers);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // --- 6. NOTIFICATIONS ---
// operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
//   try {
//     const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
//     res.json(await Notification.find(filter).sort({ createdAt: -1 }));
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });












// 10-4-2026




import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
import { io } from "../server.js"; 
// CRITICAL: Explicitly import these so Mongoose registers the models for population
import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";

export const operationsRoutes = express.Router();

/**
 * SHARED UTILITY: Deep Population Config
 * Using explicit 'model' properties to prevent "General" fallback issues
 */
const deepPopulateItem = {
  path: "items.stockItemId",
  model: "StockItem", 
  select: "name stockGroupId unitId imageUrl",
  populate: [
    { 
      path: "unitId", 
      model: "Unit", 
      select: "symbol name" 
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
        ]
      });

    const formatted = stock.map(s => ({
      stockRecordId: s._id,
      stockItemId: s.stockItemId?._id,
      stockGroupId: s.stockItemId?.stockGroupId?._id, 
      groupName: s.stockItemId?.stockGroupId?.name || "General", 
      name: s.stockItemId?.name || "Unknown Item",
      currentQty: s.qtyBaseUnit || 0,
      unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
      image: s.stockItemId?.imageUrl || ""
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
        date: new Date().toISOString(),
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

// --- 3. CONSUMPTION HISTORY ---
operationsRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
  try {
    const data = await Consumption.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });

    res.json(data);
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
    await session.withTransaction(async () => {
      const request = await Request.findById(req.params.id).session(session);
      if (!request) throw new Error("Request not found");
      if (request.status !== "pending") throw new Error("Request already processed");

      request.status = "approved";
      request.adminDecision = req.body.note || "Approved";
      await request.save({ session });
      
      // Create a record of this consumption/return
      await Consumption.create([{ 
        godownId: request.godownId, 
        userId: request.userId, 
        date: request.targetDate || new Date(), 
        items: request.items 
      }], { session });
      
      for (const item of request.items) {
        // Logic: Negative of the requested quantity. 
        // Request 10 -> Deducts 10. Request -10 -> Adds 10 back to Godown.
        const stockUpdate = await GodownStock.findOneAndUpdate(
          { godownId: request.godownId, stockItemId: item.stockItemId }, 
          { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
          { session, new: true }
        );

        if (!stockUpdate) throw new Error("Stock record not found for one of the items.");

        // Safety check if stock goes below 0 after deduction
        if (stockUpdate.qtyBaseUnit < 0) {
           throw new Error(`Insufficient Godown stock to fulfill this request.`);
        }
      }
      
      io.to(request.godownId.toString()).emit("request_approved", { requestId: request._id });
    });
    res.json({ message: "Status updated and Godown stock synced" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
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

// --- 5. TRANSFERS ---
operationsRoutes.post("/transfers", authorize(["admin"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transfer = await Transfer.create([{ ...req.body, createdBy: req.user.sub }], { session });
      for (const item of req.body.items || []) {
        // Deduct from Source
        await GodownStock.findOneAndUpdate(
          { godownId: req.body.fromGodownId, stockItemId: item.stockItemId }, 
          { $inc: { qtyBaseUnit: -item.qtyBaseUnit } }, 
          { session }
        );
        // Add to Destination
        await GodownStock.findOneAndUpdate(
          { godownId: req.body.toGodownId, stockItemId: item.stockItemId }, 
          { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } }, 
          { upsert: true, session }
        );
      }
      res.status(201).json(transfer[0]);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

operationsRoutes.get("/transfers", authorize(["admin"]), async (_req, res) => {
  try {
    const transfers = await Transfer.find()
      .populate("fromGodownId", "name")
      .populate("toGodownId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 6. NOTIFICATIONS ---
operationsRoutes.get("/notifications", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { "payload.godownId": req.user.godownId };
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});