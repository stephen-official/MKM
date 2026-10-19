import mongoose from "mongoose";

const stockBatchSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true, index: true },
  stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true, index: true },
  sourceType: {
    type: String,
    enum: ["distribution", "indent_receipt", "collaborative_order", "transfer", "opening_balance", "return"],
    required: true,
  },
  sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  receivedAt: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, default: null },
  // Kitchen receiving details (FSSAI). trackingId is MKM-YYMM-NNNN from stock/trackingId.js; lotNumber is the
  // manufacturer's batch number read off the label. Supplier fields are copied from the order's supplier at receipt.
  trackingId: { type: String, default: null },
  mfgDate: { type: Date, default: null },
  storage: { type: String, enum: ["room", "fridge", "freezer", null], default: null },
  photos: { goods: { type: String, default: "" }, label: { type: String, default: "" } },
  supplierName: { type: String, trim: true, default: "" },
  supplierFssaiLicence: { type: String, trim: true, default: "" },
  lotNumber: { type: String, trim: true, default: "" },
  condition: { type: String, enum: ["good", "damaged", "partial_damage", "unchecked"], default: "unchecked" },
  notes: { type: String, trim: true, default: "" },
  expectedQtyBaseUnit: { type: Number, default: null },
  receivedQtyBaseUnit: { type: Number, required: true, min: 0 },
  remainingQtyBaseUnit: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

stockBatchSchema.index({ godownId: 1, stockItemId: 1, receivedAt: 1, _id: 1 });
stockBatchSchema.index({ expiryDate: 1, remainingQtyBaseUnit: 1 });
stockBatchSchema.index({ trackingId: 1 }, { unique: true, partialFilterExpression: { trackingId: { $type: "string" } } });

export const StockBatch = mongoose.model("StockBatch", stockBatchSchema);
