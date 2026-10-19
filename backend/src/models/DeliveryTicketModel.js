import mongoose from "mongoose";

export const TICKET_REASONS = Object.freeze(["short", "excess", "damaged", "wrong_item", "expired"]);

// A problem a kitchen raised with one line of a shared order while receiving it. The line stays out of stock
// until an admin settles the ticket: the accepted quantity then enters stock using the details kept here, and
// a follow-up order can be opened for whatever is still missing.
const deliveryTicketSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "CollaborativePurchaseOrder", required: true, index: true },
  orderNo: { type: String, required: true },
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true, index: true },
  stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
  packId: { type: mongoose.Schema.Types.ObjectId, default: null },
  orderedQtyBaseUnit: { type: Number, required: true },
  reason: { type: String, enum: TICKET_REASONS, required: true },
  // Usable quantity that actually arrived (0 for a wholly damaged, wrong or expired delivery).
  receivedQtyBaseUnit: { type: Number, required: true, min: 0 },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  voiceNoteUrl: { type: String, default: "" },
  // Receiving details for the usable part, same shape as a stock batch's.
  details: {
    photos: { goods: { type: String, default: "" }, label: { type: String, default: "" } },
    expiryDate: { type: Date, default: null },
    mfgDate: { type: Date, default: null },
    lotNumber: { type: String, default: "" },
    storage: { type: String, default: null },
  },
  status: { type: String, enum: ["open", "settled"], default: "open", index: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  raisedAt: { type: Date, default: Date.now },
  resolution: {
    acceptedQtyBaseUnit: { type: Number, default: null },
    reorderShortfall: { type: Boolean, default: false },
    followUpOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "CollaborativePurchaseOrder", default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    settledAt: { type: Date, default: null },
  },
}, { timestamps: true });

export const DeliveryTicket = mongoose.model("DeliveryTicket", deliveryTicketSchema);
