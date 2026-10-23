import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { Consumption } from "../models/FlowModels.js";
import { NoUsageDay } from "../models/NoUsageDayModel.js";
import { addDays, businessDateOf, isIsoDate } from "../executive/params.js";
import { notifyKitchen } from "../realtime.js";
import { LOOKBACK_DAYS, NO_USAGE_REASONS, usageDayStatuses } from "../usage/usageDays.js";

/** Day-by-day usage account for a kitchen: which days were recorded, closed on purpose ("no usage"), or missed. */
export const usageDayRoutes = express.Router();

const fail = (res, status, code, message) => res.status(status).json({ code, message });

// GET /api/usage-days → { today, lookbackDays, missed, days: [{ date, status, entries, reason }] } newest first.
usageDayRoutes.get("/", authorize(["user"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return fail(res, 400, "NO_KITCHEN", "Your account is not linked to a kitchen");
    const today = businessDateOf(Date.now());
    const earliest = addDays(today, -(LOOKBACK_DAYS - 1));
    const [first, counts, closed] = await Promise.all([
      Consumption.findOne({ godownId }).sort({ date: 1 }).select("date").lean(),
      Consumption.aggregate([
        { $match: { godownId: new mongoose.Types.ObjectId(String(godownId)), date: { $gte: earliest, $lte: today } } },
        { $group: { _id: "$date", entries: { $sum: 1 } } },
      ]),
      NoUsageDay.find({ godownId, date: { $gte: earliest, $lte: today } }).select("date reason").lean(),
    ]);
    const days = usageDayStatuses({
      today,
      firstUsageDate: first?.date || null,
      entriesByDate: new Map(counts.map((row) => [row._id, row.entries])),
      noUsageByDate: new Map(closed.map((row) => [row.date, row.reason])),
    });
    return res.json({ today, lookbackDays: LOOKBACK_DAYS, missed: days.filter((day) => day.status === "missed").length, days });
  } catch (error) {
    return fail(res, 500, "USAGE_DAYS_FAILED", error.message);
  }
});

// POST /api/usage-days/none { date, reason, note } → marks a day as "no usage" (today or a past day with no entries).
usageDayRoutes.post("/none", authorize(["user"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return fail(res, 400, "NO_KITCHEN", "Your account is not linked to a kitchen");
    const { date, reason = "other", note = "" } = req.body || {};
    const today = businessDateOf(Date.now());
    if (!isIsoDate(date)) return fail(res, 400, "INVALID_DATE", "Choose a date");
    if (date > today) return fail(res, 400, "FUTURE_DATE", "That day has not happened yet");
    if (date < addDays(today, -(LOOKBACK_DAYS - 1))) return fail(res, 400, "TOO_OLD", `Only the last ${LOOKBACK_DAYS} days can be marked`);
    if (!NO_USAGE_REASONS.includes(reason)) return fail(res, 400, "INVALID_REASON", "Choose a reason");
    if (await Consumption.exists({ godownId, date })) return fail(res, 409, "USAGE_EXISTS", "Usage is already recorded for that day");
    const marker = await NoUsageDay.findOneAndUpdate(
      { godownId, date },
      { $set: { reason, note: String(note).slice(0, 200), createdBy: req.user.sub } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    notifyKitchen(godownId, "usage");
    return res.status(201).json(marker);
  } catch (error) {
    return fail(res, 500, "NO_USAGE_FAILED", error.message);
  }
});

// DELETE /api/usage-days/none/:date → undo a "no usage" mark.
usageDayRoutes.delete("/none/:date", authorize(["user"]), async (req, res) => {
  try {
    const godownId = req.user.godownId;
    if (!godownId) return fail(res, 400, "NO_KITCHEN", "Your account is not linked to a kitchen");
    if (!isIsoDate(req.params.date)) return fail(res, 400, "INVALID_DATE", "Choose a date");
    const removed = await NoUsageDay.findOneAndDelete({ godownId, date: req.params.date }).lean();
    if (!removed) return fail(res, 404, "NOT_MARKED", "That day was not marked");
    notifyKitchen(godownId, "usage");
    return res.json({ success: true });
  } catch (error) {
    return fail(res, 500, "NO_USAGE_FAILED", error.message);
  }
});
