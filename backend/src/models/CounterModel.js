import mongoose from "mongoose";

// Named running numbers, bumped atomically (see stock/trackingId.js). One document per name.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
}, { versionKey: false });

export const Counter = mongoose.model("Counter", counterSchema, "counters");
