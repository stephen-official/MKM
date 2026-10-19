import mongoose from "mongoose";

const collaborativeLineSchema = new mongoose.Schema({
  stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
  qtyBaseUnit: { type: Number, required: true, min: 0.000001 },
  packId: { type: mongoose.Schema.Types.ObjectId, default: null },
  packName: { type: String, trim: true, default: "" },
  packSize: { type: Number, default: null },
  packQuantity: { type: Number, default: null },
  packPrice: { type: Number, default: null },
  // Set when an admin approves this line; the kitchen can no longer change or add to this product.
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Lines can be sent and received on different days. Shares dispatched before lines were tracked
  // carry these on the share instead, so read them as line.x || share.x.
  dispatchedAt: { type: Date, default: null },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deliveredAt: { type: Date, default: null },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Tracking ID of the stock batch this line became when it was received (MKM-YYMM-NNNN).
  trackingId: { type: String, default: null },
}, { _id: false });

const contributionSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: { type: [collaborativeLineSchema], validate: [(items) => items.length > 0, "Add at least one item"] },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Set when an admin approves the whole share; the kitchen can no longer change it.
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Set once every line of the share has been sent (each kitchen's share is sent separately).
  dispatchedAt: { type: Date, default: null },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Set once every line has been received; each line was added to the kitchen's stock as it arrived.
  deliveredAt: { type: Date, default: null },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
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
  // Who the admin bought from and the paid invoice; kitchens see both read-only and every batch they receive copies the supplier.
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
  invoiceNo: { type: String, trim: true, maxlength: 60, default: "" },
  // Expiry the admin read off a bulk buy, one per product (YYYY-MM-DD). Kitchens see it pre-filled when
  // receiving and may correct it from the label; the date they confirm lives on their own stock batch.
  expiryByProduct: { type: [{ _id: false, stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true }, expiryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ } }], default: [] },
  status: { type: String, enum: ["open", "closed", "approved", "ordered", "cancelled"], default: "open" },
  statusChangedAt: { type: Date, default: null },
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, optimisticConcurrency: true });

collaborativePurchaseOrderSchema.index({ status: 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ "contributions.godownId": 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ createdByGodown: 1, createdAt: -1 });

export const CollaborativePurchaseOrder = mongoose.model("CollaborativePurchaseOrder", collaborativePurchaseOrderSchema);
