import mongoose from "mongoose";

const collaborativeLineSchema = new mongoose.Schema({
  stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
  qtyBaseUnit: { type: Number, required: true, min: 0.000001 },
  packId: { type: mongoose.Schema.Types.ObjectId, default: null },
  packName: { type: String, trim: true, default: "" },
  packSize: { type: Number, default: null },
  packQuantity: { type: Number, default: null },
  packPrice: { type: Number, default: null },
}, { _id: false });

const contributionSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: { type: [collaborativeLineSchema], validate: [(items) => items.length > 0, "Add at least one item"] },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const collaborativePurchaseOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  title: { type: String, trim: true, maxlength: 120, default: "" },
  note: { type: String, trim: true, maxlength: 1000, default: "" },
  neededBy: { type: Date, default: null },
  emergency: { type: Boolean, default: false },
  // Other kitchens can join until this time; after it the order counts as closed (see closeExpiredOrders).
  closesAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdByGodown: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  contributions: { type: [contributionSchema], default: [] },
  status: { type: String, enum: ["open", "closed", "ordered", "cancelled"], default: "open" },
  statusChangedAt: { type: Date, default: null },
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, optimisticConcurrency: true });

collaborativePurchaseOrderSchema.index({ status: 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ "contributions.godownId": 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ createdByGodown: 1, createdAt: -1 });

export const CollaborativePurchaseOrder = mongoose.model("CollaborativePurchaseOrder", collaborativePurchaseOrderSchema);
