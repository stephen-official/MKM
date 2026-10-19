import mongoose from "mongoose";

// A supplier the admin buys from. Name and FSSAI licence are copied onto every stock batch received
// from an order placed with this supplier, so kitchens can show them read-only.
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  nameKey: { type: String, required: true, unique: true }, // lower-cased name, for case-insensitive uniqueness
  fssaiLicence: { type: String, required: true, match: /^\d{14}$/ },
  phone: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export const Supplier = mongoose.model("Supplier", supplierSchema);
