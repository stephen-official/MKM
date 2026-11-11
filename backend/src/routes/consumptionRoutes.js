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
import { recordConsumption, applyConsumptionEdit, removeConsumption } from "../modules/consumption/consumptionService.js";

export const consumptionRoutes = express.Router();

const handleStockProcessing = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const godownId = isKitchenRole(req.user.role) ? req.user.godownId : req.body.godownId;
    // A day the kitchen marked "no usage" stays closed until an admin approves a correction; nothing is recorded on it.
    if (godownId && req.body.date && await NoUsageDay.exists({ godownId, date: req.body.date })) {
      return res.status(409).json({ code: "DAY_CLOSED", error: "This day is marked as no usage. Ask the admin to reopen it before recording." });
    }
    const result = await session.withTransaction(() => recordConsumption({ godownId, userId: req.user.sub, date: req.body.date, items: req.body.items, session }));

    const populatedResult = await Consumption.findById(result._id)
      .populate("userId", "name")
      .populate("godownId", "name")
      .populate(deepPopulateItem);

    notifyKitchen(result.godownId, "stock");
    notifyKitchen(result.godownId, "usage");
    res.status(201).json(populatedResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};

consumptionRoutes.post("/orders", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);
consumptionRoutes.post("/consumptions", authorize(["user", "admin"]), requireAvailableProducts(stockRecordItemIds), handleStockProcessing);




consumptionRoutes.patch(
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

        await applyConsumptionEdit({ consumption, items, userId: req.user.sub, session });
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


consumptionRoutes.delete(
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

        deletedConsumption = await removeConsumption({ consumption, session });
      });

      // ------------------------------------------------------
      // Notify clients immediately
      // ------------------------------------------------------
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

      res.json({
        message: deletedConsumption.stockRestored ? "Consumption deleted and stock restored" : "Consumption deleted",
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


consumptionRoutes.get("/consumptions", authorize(["admin"]), async (_req, res) => {
  try {
    const consumptions = await Consumption.find()
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });
    res.json(consumptions);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




consumptionRoutes.get("/consumptions/me", authorize(["user"]), async (req, res) => {
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
