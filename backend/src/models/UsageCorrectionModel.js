import mongoose from "mongoose";

/**
 * A kitchen asking an admin to undo something it recorded by mistake. Nothing changes until the admin approves.
 * kind "reopen_day": a day marked "no usage" that should be open again (the mark is removed on approval).
 * Later kinds (correcting or cancelling a usage record) will carry `consumptionId` and the proposed items.
 */
export const CORRECTION_KINDS = ["reopen_day"];
export const REOPEN_REASONS = ["ticked_by_mistake", "stock_was_used", "other"];

const usageCorrectionSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: CORRECTION_KINDS, required: true },
    date: { type: String, required: true }, // business date, YYYY-MM-DD, like NoUsageDay.date
    consumptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Consumption", default: null },
    reason: { type: String, enum: REOPEN_REASONS, required: true },
    note: { type: String, trim: true, default: "", maxlength: 200 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    decisionNote: { type: String, trim: true, default: "", maxlength: 300 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

usageCorrectionSchema.index({ status: 1, createdAt: -1 });
usageCorrectionSchema.index({ godownId: 1, createdAt: -1 });

export const UsageCorrection = mongoose.model("UsageCorrection", usageCorrectionSchema);
