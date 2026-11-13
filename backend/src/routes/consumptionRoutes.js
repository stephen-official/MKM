import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { requireAvailableProducts, stockRecordItemIds } from "../catalog/productService.js";
import { Consumption } from "../models/FlowModels.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { io, notifyKitchen } from "../realtime.js";
import { isKitchenRole } from "../utils/roles.js";
import { stripPrices } from "../utils/kitchenSafe.js";
import { deepPopulateItem } from "../modules/operations/operationItemPopulation.js";
import { emitLowStockAlerts, recordConsumption, applyConsumptionEdit, removeConsumption } from "../modules/consumption/consumptionService.js";
import { stockTransaction } from "../shared/stockCommandHttp.js";

const populatedConsumption = (id, session) => Consumption.findById(id).session(session)
  .populate("userId", "name").populate("godownId", "name").populate(deepPopulateItem);

export const consumptionRoutes = express.Router();

const handleStockProcessing = asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const godownId = isKitchenRole(req.user.role) ? req.user.godownId : req.body.godownId;
    // A day the kitchen marked "no usage" stays closed until an admin approves a correction; nothing is recorded on it.
    let alerts = [];
    const populatedResult = await stockTransaction(req, session, async () => {
      alerts = [];
      if (godownId && req.body.date && await NoUsageDay.exists({ godownId, date: req.body.date }).session(session)) {
        throw Object.assign(new Error("This day is marked as no usage. Ask the admin to reopen it before recording."), { status: 409, dayClosed: true });
      }
      const result = await recordConsumption({ godownId, userId: req.user.sub, date: req.body.date, items: req.body.items, session, alerts });
      return populatedConsumption(result._id, session);
    });

    if (!req.stockCommandReplayed) {
      emitLowStockAlerts(alerts);
      notifyKitchen(populatedResult.godownId?._id || godownId, "stock");
      notifyKitchen(populatedResult.godownId?._id || godownId, "usage");
    }
    res.status(201).json(populatedResult);
  } finally {
    await session.endSession();
  }
}, legacyErrorPolicy({"status":400,"field":"error", specials: [{ matches: (error) => error.dayClosed, status: 409, body: { code: "DAY_CLOSED", error: "This day is marked as no usage. Ask the admin to reopen it before recording." } }] }));

consumptionRoutes.post("/orders", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);
consumptionRoutes.post("/consumptions", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);




consumptionRoutes.patch(
  "/consumptions/:id",
  authorize(["admin"]),
  asyncRoute(async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const updatedConsumption = await stockTransaction(req, session, async () => {
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

        await applyConsumptionEdit({ consumption, items, userId: req.user.sub, session });
        return populatedConsumption(req.params.id, session);
      });

      // ------------------------------------------------------
      // Notify client applications
      // ------------------------------------------------------
      if (!req.stockCommandReplayed) {
      notifyKitchen(updatedConsumption.godownId._id, "stock");
      notifyKitchen(updatedConsumption.godownId._id, "usage");
      io.to(updatedConsumption.godownId._id.toString()).emit(
        "consumption_updated",
        stripPrices(updatedConsumption)
      );

      io.to("admins").emit(
        "consumption_updated",
        updatedConsumption
      );
      }

      res.json(updatedConsumption);

    } finally {
      await session.endSession();
    }
  }, legacyErrorPolicy({ status: 400, field: "error", fallback: "Failed to update consumption" }))
);


consumptionRoutes.delete(
  "/consumptions/:id",
  authorize(["admin"]),
  asyncRoute(async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const deletedConsumption = await stockTransaction(req, session, async () => {
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

        return removeConsumption({ consumption, session });
      });

      // ------------------------------------------------------
      // Notify clients immediately
      // ------------------------------------------------------
      if (!req.stockCommandReplayed) {
      notifyKitchen(deletedConsumption.godownId, "stock");
      notifyKitchen(deletedConsumption.godownId, "usage");
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
      }

      res.json({
        message: deletedConsumption.stockRestored ? "Consumption deleted and stock restored" : "Consumption deleted",
        consumptionId: deletedConsumption._id
      });

    } finally {
      await session.endSession();
    }
  }, legacyErrorPolicy({ status: 400, field: "error", fallback: "Failed to delete consumption" }))
);


consumptionRoutes.get("/consumptions", authorize(["admin"]), asyncRoute(async (_req, res) => {

    const consumptions = await Consumption.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });
    res.json(consumptions);


}, legacyErrorPolicy({ status: 500, field: "error" })));




consumptionRoutes.get("/consumptions/me", authorize(["user"]), asyncRoute(async (req, res) => {

    const data = await Consumption.find({ userId: req.user.sub })
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });
    res.json(data);

}, legacyErrorPolicy({ status: 500, field: "error" })));
