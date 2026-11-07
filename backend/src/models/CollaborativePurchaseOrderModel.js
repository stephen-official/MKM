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
  // Set when an admin changed the quantity while reviewing (which also approves the line). requested* keep what the
  // kitchen first asked for, so both sides can see the change.
  adjustedAt: { type: Date, default: null },
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  requestedQtyBaseUnit: { type: Number, default: null },
  requestedPackQuantity: { type: Number, default: null },
  // Set when an admin rejects this line (with the reason the kitchen sees); it is never bought, sent or received.
  rejectedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
  // Lines can be sent and received on different days. Shares dispatched before lines were tracked
  // carry these on the share instead, so read them as line.x || share.x.
  dispatchedAt: { type: Date, default: null },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deliveredAt: { type: Date, default: null },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Tracking ID of the stock batch this line became when it was received (MKM-YYMM-NNNN), and the quantity that
  // actually entered stock (equal to qtyBaseUnit for a normal receipt, the accepted quantity after a problem).
  trackingId: { type: String, default: null },
  receivedQtyBaseUnit: { type: Number, default: null },
  // Set when the kitchen raised a problem with this line instead of receiving it; the line waits for the admin.
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryTicket", default: null },
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
  // Set when an admin rejects the rest of the share: its lines not yet approved are rejected and the kitchen can no longer change it.
  rejectedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
  // Set once every line of the share has been sent (each kitchen's share is sent separately).
  dispatchedAt: { type: Date, default: null },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Set once every line has been received; each line was added to the kitchen's stock as it arrived.
  deliveredAt: { type: Date, default: null },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Set when a super-admin changes this kitchen's items: what the kitchen had asked for before the first change it has
  // not seen yet. Cleared when the kitchen taps OK (or edits its items itself). Only this kitchen and admins see it.
  adminChange: {
    type: new mongoose.Schema({
      before: [{
        _id: false,
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
        qtyBaseUnit: { type: Number, required: true },
        packId: { type: mongoose.Schema.Types.ObjectId, default: null },
        packName: { type: String, default: "" },
        packQuantity: { type: Number, default: null },
      }],
      changedAt: { type: Date, required: true },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    }, { _id: false }),
    default: null,
  },
}, { _id: true });

export const ORDER_STATUSES = Object.freeze(["open", "closed", "approved", "ordered", "cancelled"]);

// One entry in an order's history. Written in the same save as the change it records, and never edited afterwards.
export const ORDER_EVENT_ACTIONS = Object.freeze([
  "raised", "joined", "edited", "left", "approved", "rejected", "quantity_changed",
  "items_changed", "closing_time_changed", "purchase_updated", "status_changed", "dispatched", "received", "problem_raised", "problem_settled",
]);
const orderEventSchema = new mongoose.Schema({
  action: { type: String, enum: ORDER_EVENT_ACTIONS, required: true },
  at: { type: Date, required: true },
  // "system" (no actorId) when the ordering window closes the order by itself.
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, enum: ["kitchen", "admin", "system"], required: true },
  // The kitchen the event concerns; null for order-wide events (approve all, status changes, purchase details).
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", default: null },
  items: { type: [{
    _id: false,
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    packId: { type: mongoose.Schema.Types.ObjectId, default: null },
    qtyBaseUnit: { type: Number, default: null },
    fromQtyBaseUnit: { type: Number, default: null },
  }], default: [] },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  // closing_time_changed only: the ordering window's old and new closing time.
  fromClosesAt: { type: Date, default: null },
  toClosesAt: { type: Date, default: null },
  // A reason (rejection, cancellation) or a short summary (purchase details, delivery problem settled).
  note: { type: String, trim: true, maxlength: 1000, default: "" },
}, { _id: false });

const collaborativePurchaseOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  title: { type: String, trim: true, maxlength: 120, default: "" },
  note: { type: String, trim: true, maxlength: 1000, default: "" },
  neededBy: { type: Date, default: null },
  emergency: { type: Boolean, default: false },
  // Other kitchens can join until this time; after it the order counts as closed (see closeExpiredOrders).
  closesAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Who raised it: a kitchen, or the central store on a kitchen's behalf (createdByGodown is then that kitchen).
  // Orders from before this field read as "kitchen".
  source: { type: String, enum: ["kitchen", "admin"], default: "kitchen" },
  createdByGodown: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  contributions: { type: [contributionSchema], default: [] },
  // Who the admin bought from and the paid invoice; kitchens see both read-only and every batch they receive copies the supplier.
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
  invoiceNo: { type: String, trim: true, maxlength: 60, default: "" },
  // A combined order may be split across vendors: a product bought elsewhere than the order's supplier.
  supplierByProduct: { type: [{ _id: false, stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true }, supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true } }], default: [] },
  // Expiry the admin read off a bulk buy, one per product (YYYY-MM-DD). Kitchens see it pre-filled when
  // receiving and may correct it from the label; the date they confirm lives on their own stock batch.
  expiryByProduct: { type: [{ _id: false, stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true }, expiryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ } }], default: [] },
  status: { type: String, enum: ORDER_STATUSES, default: "open" },
  statusChangedAt: { type: Date, default: null },
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Why the central store cancelled the order; kitchens see it on the cancelled order.
  cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
  // Everything that happened to the order, oldest first (see orderEventSchema). Orders from before this read as [].
  events: { type: [orderEventSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });

collaborativePurchaseOrderSchema.index({ status: 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ "contributions.godownId": 1, updatedAt: -1 });
collaborativePurchaseOrderSchema.index({ createdByGodown: 1, createdAt: -1 });

export const CollaborativePurchaseOrder = mongoose.model("CollaborativePurchaseOrder", collaborativePurchaseOrderSchema);
