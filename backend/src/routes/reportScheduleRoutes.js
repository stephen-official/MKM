import { asyncRoute, typedErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { ReportRun, ReportSchedule } from "../models/ReportScheduleModels.js";
import { computeNextRun, validateSchedule } from "../executive/schedule.js";
import { clampPage } from "../utils/pagination.js";

export const reportScheduleRoutes = express.Router();
reportScheduleRoutes.use(authorize(["super_admin"]));

const errorPolicy = typedErrorPolicy({ publicCodeFallback: null, fallbackCode: "INTERNAL_ERROR", fallbackMessage: "Something went wrong.", specials: [{ matches: (error) => error?.code === "INVALID_SCHEDULE", status: 400, fields: ["fields"] }] });
const notFound = () => Object.assign(new Error("No such schedule."), { status: 404, code: "SCHEDULE_NOT_FOUND" });
const findOr404 = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const doc = await ReportSchedule.findById(id).lean();
  if (!doc) throw notFound();
  return doc;
};

reportScheduleRoutes.get("/", asyncRoute(async (_req, res) => {
   return res.json(await ReportSchedule.find().sort({ name: 1, _id: 1 }).lean());
}, errorPolicy));

reportScheduleRoutes.post("/", asyncRoute(async (req, res) => {

    const { value } = validateSchedule(req.body);
    const doc = await ReportSchedule.create({ ...value, createdBy: req.user.sub, nextRunAt: computeNextRun(value, new Date()) });
    return res.status(201).json(doc);

}, errorPolicy));

reportScheduleRoutes.patch("/:id", asyncRoute(async (req, res) => {

    const current = await findOr404(req.params.id);
    if (!Number.isInteger(req.body?.expectedVersion)) {
      return res.status(400).json({ code: "INVALID_SCHEDULE", message: "Check the highlighted fields.", fields: { expectedVersion: "Reload the schedule and try again." } });
    }
    const { value } = validateSchedule({ ...current, ...req.body });
    const now = new Date();
    // A run that is already due (e.g. a queued "Run now") survives an edit; reactivating a paused
    // schedule waits for its next regular slot instead of sending at once.
    const keepDue = current.active && value.active && current.nextRunAt <= now;
    const updated = await ReportSchedule.findOneAndUpdate(
      { _id: current._id, version: req.body?.expectedVersion },
      { $set: { ...value, nextRunAt: keepDue ? current.nextRunAt : computeNextRun(value, now) }, $inc: { version: 1 } },
      { new: true }
    ).lean();
    if (!updated) return res.status(409).json({ code: "VERSION_CONFLICT", message: "This schedule was changed by someone else. Reload and try again." });
    return res.json(updated);

}, errorPolicy));

reportScheduleRoutes.delete("/:id", asyncRoute(async (req, res) => {

    const current = await findOr404(req.params.id);
    // The schedule and its run history go together; no orphaned history rows.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await ReportSchedule.deleteOne({ _id: current._id }, { session });
        await ReportRun.deleteMany({ scheduleId: current._id }, { session });
      });
    } finally {
      await session.endSession();
    }
    return res.status(204).end();

}, errorPolicy));

reportScheduleRoutes.post("/:id/run", asyncRoute(async (req, res) => {

    const current = await findOr404(req.params.id);
    if (!current.active) return res.status(409).json({ code: "SCHEDULE_INACTIVE", message: "Activate this schedule before running it." });
    await ReportSchedule.updateOne({ _id: current._id }, { $set: { nextRunAt: new Date() } });
    return res.status(202).json({ queued: true, message: "The report will be sent within a minute." });

}, errorPolicy));

reportScheduleRoutes.get("/:id/runs", asyncRoute(async (req, res) => {

    const current = await findOr404(req.params.id);
    const page = clampPage(req.query.page);
    const [items, total] = await Promise.all([
      ReportRun.find({ scheduleId: current._id }).sort({ startedAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      ReportRun.countDocuments({ scheduleId: current._id })
    ]);
    return res.json({ items, total, page, pageSize: 25 });

}, errorPolicy));
