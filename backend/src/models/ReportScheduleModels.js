import mongoose from "mongoose";

const reportScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    godownId: { type: String, required: true }, // "all" or a kitchen id
    rangePreset: { type: String, enum: ["last-7-days", "last-30-days", "previous-month"], required: true },
    cadence: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    dayOfWeek: { type: Number, default: null },
    dayOfMonth: { type: Number, default: null },
    time: { type: String, required: true },
    recipients: { type: [String], required: true },
    format: { type: String, enum: ["xlsx", "pdf"], required: true },
    active: { type: Boolean, default: true },
    nextRunAt: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, enum: ["success", "failed", null], default: null },
    lastError: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 }
  },
  { timestamps: true, versionKey: false }
);
reportScheduleSchema.index({ active: 1, nextRunAt: 1 });

const reportRunSchema = new mongoose.Schema(
  {
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportSchedule", required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    errorCode: { type: String, default: null },
    from: String,
    to: String,
    filename: { type: String, default: null },
    recipientCount: { type: Number, default: 0 }
  },
  { versionKey: false }
);
reportRunSchema.index({ scheduleId: 1, startedAt: -1 });

export const ReportSchedule = mongoose.model("ReportSchedule", reportScheduleSchema, "reportschedules");
export const ReportRun = mongoose.model("ReportRun", reportRunSchema, "reportruns");
