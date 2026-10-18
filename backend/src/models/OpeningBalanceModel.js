import mongoose from "mongoose";

const openingBalanceSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
  stockRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "GodownStock", required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: "StockBatch", required: true },
  quantityBaseUnit: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  effectiveAt: { type: Date, required: true },
  reason: { type: String, trim: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

// An opening balance is a one-time baseline, never an adjustment mechanism.
openingBalanceSchema.index({ godownId: 1, stockItemId: 1 }, { unique: true });

export const OpeningBalance = mongoose.model("OpeningBalance", openingBalanceSchema);
