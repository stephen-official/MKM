import mongoose from "mongoose";

// The deterministic _id is the cross-process uniqueness constraint. No TTL: expiry would allow a late retry to move stock again.
const schema = new mongoose.Schema({
  _id: { type: String },
  actorId: { type: String, required: true },
  command: { type: String, required: true },
  fingerprint: { type: String, required: true },
  resultJson: { type: String, default: null },
}, { timestamps: true });

export const StockCommand = mongoose.model("StockCommand", schema);
