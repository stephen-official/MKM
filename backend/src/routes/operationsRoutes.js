import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption, GodownStock, Notification, Request, Transfer } from "../models/FlowModels.js";
import { io, notifyKitchen } from "../realtime.js";
import { bodyItemIds, requireAvailableProducts } from "../catalog/productService.js";
import { isAvailable, missingFields } from "../catalog/completeness.js";
// CRITICAL: Explicitly import these so Mongoose registers the models for population
import { StockItem, StockGroup, Unit } from "../models/InventoryModels.js";
import { isAdminRole, isKitchenRole } from "../utils/roles.js";
import { businessDateOf, normalizeBusinessDate } from "../executive/params.js";
import { createStockBatch, deductFefo, valuationFromAllocations } from "../stock/batchService.js";
import { StockBatch } from "../models/StockBatchModel.js";
import { stripPrices } from "../utils/kitchenSafe.js";

import { consumptionRoutes } from "./consumptionRoutes.js";
import { deepPopulateItem } from "../modules/operations/operationItemPopulation.js";
import { priceLines } from "../modules/consumption/consumptionValuation.js";

export const operationsRoutes = express.Router();

/**
 * Dated stock a kitchen holds, per product: Map stockItemId → [{ date: "YYYY-MM-DD", qtyBaseUnit }], soonest first.
 * Lots are grouped by expiry date (no batch ids, no prices), which is all the kitchen app needs for its
 * "use first" banners. Undated batches are left out.
 */
const expiryLotsFor = async (godownId) => {
  const rows = await StockBatch.aggregate([
    { $match: { godownId: new mongoose.Types.ObjectId(String(godownId)), remainingQtyBaseUnit: { $gt: 0 }, expiryDate: { $ne: null } } },
    { $group: { _id: { stockItemId: "$stockItemId", expiryDate: "$expiryDate" }, qtyBaseUnit: { $sum: "$remainingQtyBaseUnit" } } },
    { $sort: { "_id.expiryDate": 1 } },
  ]);
  const lots = new Map();
  for (const row of rows) {
    const key = String(row._id.stockItemId);
    if (!lots.has(key)) lots.set(key, []);
    lots.get(key).push({ date: businessDateOf(row._id.expiryDate), qtyBaseUnit: row.qtyBaseUnit });
  }
  return lots;
};

/** Supplier names behind the stock a kitchen still holds, per product: Map stockItemId → ["Name", …] (A–Z, no blanks). */
const suppliersFor = async (godownId) => {
  const rows = await StockBatch.aggregate([
    { $match: { godownId: new mongoose.Types.ObjectId(String(godownId)), remainingQtyBaseUnit: { $gt: 0 }, supplierName: { $nin: [null, ""] } } },
    { $group: { _id: "$stockItemId", names: { $addToSet: "$supplierName" } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), [...row.names].sort((a, b) => a.localeCompare(b))]));
};

// --- 1. KITCHEN STOCK FETCH ---
operationsRoutes.get("/my-kitchen-stock", authorize(["user", "admin"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return res.status(400).json({ error: "User not assigned to a godown" });
    const [expiryLots, suppliers] = await Promise.all([expiryLotsFor(godownId), suppliersFor(godownId)]);

    const stock = await GodownStock.find({ godownId })
      .populate({
        path: "stockItemId",
        model: "StockItem",
        populate: [
  { path: "stockGroupId", model: "StockGroup", select: "name" },
  { path: "unitId", model: "Unit", select: "name symbol" }
],
select: "name stockGroupId unitId imageUrl itemType pricePerUnit soldInPacks packs archived"
      });

    const formatted = stock.map(s => ({
  // Kitchens keep seeing stock they hold, but cannot use a product until its details are complete.
  available: Boolean(s.stockItemId) && isAvailable(s.stockItemId, s.stockItemId.unitId),
  missing: s.stockItemId ? missingFields(s.stockItemId, s.stockItemId.unitId) : [],
  archived: Boolean(s.stockItemId?.archived),
  stockRecordId: s._id,
  stockItemId: s.stockItemId?._id,
  stockGroupId: s.stockItemId?.stockGroupId?._id,
  groupName: s.stockItemId?.stockGroupId?.name || "General",
  name: s.stockItemId?.name || "Unknown Item",
  currentQty: s.qtyBaseUnit || 0,
  thresholdBaseUnit: s.thresholdBaseUnit || 0,
  unit: s.stockItemId?.unitId?.symbol || s.stockItemId?.unitId?.name || "Units",
  image: s.stockItemId?.imageUrl || "",
  soldInPacks: Boolean(s.stockItemId?.soldInPacks),
  packs: s.stockItemId?.packs || [],
  expiries: expiryLots.get(String(s.stockItemId?._id)) || [],
  suppliers: suppliers.get(String(s.stockItemId?._id)) || [],

  itemType: s.stockItemId?.itemType || "stock"
}));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Keep both /api and /api/operations aliases through this router.
operationsRoutes.use(consumptionRoutes);

// --- 4. REQUESTS (WORKFLOW) ---
operationsRoutes.get("/requests", authorize(["admin", "user"]), async (req, res) => {
  try {
    const filter = isAdminRole(req.user.role) ? {} : { userId: req.user.sub };
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

operationsRoutes.post("/requests", authorize(["user"]), requireAvailableProducts(bodyItemIds), async (req, res) => {
  try {
    const created = await Request.create({ 
      ...req.body, 
      requestType: "usage",
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

operationsRoutes.post("/requests/:id/approve", authorize(["admin"]), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let approvedRequest;
    await session.withTransaction(async () => {
      const request = await Request.findById(req.params.id).session(session);
      if (!request) throw new Error("Request not found");
      if (request.status !== "pending") throw new Error("Request already processed");

      const batchLines = [];
      for (const item of request.items) {
        const quantity = Number(item.qtyBaseUnit);
        if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Invalid request quantity");
        let stock = await GodownStock.findOne({ godownId: request.godownId, stockItemId: item.stockItemId }).session(session);
        if (!stock && quantity > 0) throw new Error("Insufficient kitchen stock for one or more items");
        if (!stock) stock = new GodownStock({ godownId: request.godownId, stockItemId: item.stockItemId, qtyBaseUnit: 0, thresholdBaseUnit: 0 });
        if (quantity > 0) {
          if (Number(stock.qtyBaseUnit) < quantity) throw new Error("Insufficient kitchen stock for one or more items");
          const batchAllocations = await deductFefo({ godownId: request.godownId, stockItemId: item.stockItemId, quantity, stock, session });
          stock.qtyBaseUnit -= quantity;
          batchLines.push({ stockItemId: item.stockItemId, qtyBaseUnit: quantity, batchAllocations, ...valuationFromAllocations(quantity, batchAllocations) });
        } else {
          const returned = Math.abs(quantity);
          const [pricedReturn] = await priceLines(request.godownId, [{ stockItemId: item.stockItemId, qtyBaseUnit: quantity }]);
          stock.qtyBaseUnit += returned;
          const returnBatch = await createStockBatch({ godownId: request.godownId, stockItemId: item.stockItemId, quantity: returned, unitPrice: pricedReturn.unitPriceAtIssue, sourceType: "return", createdBy: req.user.sub, session });
          batchLines.push({ ...pricedReturn, returnBatchId: returnBatch._id, batchAllocations: [] });
        }
        await stock.save({ session });
      }

      // A future target date would fall outside every valid report range; the stock moves today.
      const approvedAt = new Date();
      const today = businessDateOf(approvedAt);
      const target = normalizeBusinessDate(request.targetDate, approvedAt);
      const date = target > today ? today : target;
      const record = {
        godownId: request.godownId,
        userId: request.userId,
        date,
        reason: request.reason,
        sourceType: "request",
        items: batchLines,
      };
      await Consumption.create([record], { session });

      request.status = "approved";
      request.adminDecision = req.body.note || "Approved";
      approvedRequest = await request.save({ session });
    });
    io.to(approvedRequest.godownId.toString()).emit("request_approved", { requestId: approvedRequest._id });
    notifyKitchen(approvedRequest.godownId, "requests");
    notifyKitchen(approvedRequest.godownId, "stock");
    res.json({ message: "Status updated and Godown stock synced" });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    notifyKitchen(request.godownId, "requests");
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

const batchAllocations = await deductFefo({
  godownId: transfer.fromGodownId,
  stockItemId: item.stockItemId,
  quantity: item.qtyBaseUnit,
  stock: source,
  session
});
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
        thresholdBaseUnit:0
    }
},
{
    upsert:true,
    new:true,
    session
}
);

for (const allocation of batchAllocations) {
  await createStockBatch({
    godownId: transfer.toGodownId,
    stockItemId: item.stockItemId,
    quantity: allocation.qtyBaseUnit,
    unitPrice: allocation.unitPrice,
    sourceType: "transfer",
    sourceId: transfer._id,
    receivedAt: new Date(),
    expiryDate: allocation.expiryDate,
    lotNumber: allocation.lotNumber,
    condition: allocation.condition,
    notes: allocation.notes,
    createdBy: req.user.sub,
    session
  });
}
item.batchAllocations = batchAllocations;

}

transfer.status="accepted";

transfer.acceptedBy=req.user.sub;

transfer.acceptedAt=new Date();

await transfer.save({session});
for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
io.to(transfer.fromGodownId.toString()).emit(
    "transfer_accepted",
    stripPrices(transfer)
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

if (isKitchenRole(req.user.role)) {
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
  requireAvailableProducts(bodyItemIds),
  async (req, res) => {
    try {

      const {
        fromGodownId,
        toGodownId,
        items
      } = req.body;

      const sourceGodownId =
  isAdminRole(req.user.role)
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

      for (const id of [transfer.fromGodownId, toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
      io.to(toGodownId.toString()).emit(
        "new_transfer",
        stripPrices(transfer)
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

if (isKitchenRole(req.user.role)) {
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
          select: "name imageUrl unitId stockGroupId itemType soldInPacks packs",
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
    const filter = isAdminRole(req.user.role) ? {} : { "payload.godownId": req.user.godownId };
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

for (const id of [transfer.fromGodownId, transfer.toGodownId]) { notifyKitchen(id, "transfers"); notifyKitchen(id, "stock"); }
io.to(transfer.fromGodownId.toString()).emit(
    "transfer_rejected",
    stripPrices(transfer)
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
requireAvailableProducts(bodyItemIds),
async (req,res)=>{

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
    stripPrices(transfer)
);

res.status(201).json(transfer);

});

