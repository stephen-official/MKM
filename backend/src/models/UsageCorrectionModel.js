import mongoose from "mongoose";

/**
 * A kitchen asking an admin to change what it recorded. Nothing changes until the admin approves.
 * kind "reopen_day": a day marked "no usage" by mistake; `items` is the usage to record once the mark is removed.
 * kind "edit_usage": a usage record (`consumptionId`) with the wrong lines; `items` replaces them (empty = cancel the record).
 *   `before` is the record as it was when the kitchen asked, so the admin sees the difference and approval can tell
 *   whether the record changed in the meantime (`recordUpdatedAt`).
 */
export const CORRECTION_KINDS = ["reopen_day", "edit_usage"];
/** Kept for rows written before corrections carried items; new asks do not send a reason. */
export const REOPEN_REASONS = ["ticked_by_mistake", "stock_was_used", "other"];

const lineSchema = new mongoose.Schema(
  {
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    stockRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "GodownStock", default: null },
    qtyBaseUnit: { type: Number, required: true },
    // How the cook counted ("25 kg bag" × 2); qtyBaseUnit stays authoritative, like Consumption lines.
    packId: { type: mongoose.Schema.Types.ObjectId, default: null },
    packName: { type: String, default: "" },
    packSize: { type: Number, default: null },
    packQuantity: { type: Number, default: null },
  },
  { _id: false },
);

const usageCorrectionSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: CORRECTION_KINDS, required: true },
    date: { type: String, required: true }, // business date, YYYY-MM-DD, like NoUsageDay.date
    consumptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Consumption", default: null },
    items: { type: [lineSchema], default: [] },
    before: { type: [lineSchema], default: [] },
    recordUpdatedAt: { type: Date, default: null },
    reason: { type: String, enum: REOPEN_REASONS },
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
