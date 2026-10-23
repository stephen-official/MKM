import mongoose from "mongoose";

/** A day a kitchen closed on purpose ("No usage today"): it counts as accounted for, not missed. One per kitchen and date. */
const noUsageDaySchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    date: { type: String, required: true }, // business date, YYYY-MM-DD, like Consumption.date
    reason: { type: String, enum: ["closed", "holiday", "other"], default: "other" },
    note: { type: String, trim: true, default: "", maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
noUsageDaySchema.index({ godownId: 1, date: 1 }, { unique: true });

export const NoUsageDay = mongoose.model("NoUsageDay", noUsageDaySchema);
