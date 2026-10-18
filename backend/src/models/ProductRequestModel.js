import mongoose from "mongoose";

/** A kitchen asking for a product that is not in the catalog yet. Admins approve it by creating the product. */
const productRequestSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    unitSymbol: { type: String, trim: true, default: "" },
    brand: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    decisionNote: { type: String, trim: true, default: "" },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", default: null }
  },
  { timestamps: true }
);

productRequestSchema.index({ status: 1, createdAt: -1 });
productRequestSchema.index({ godownId: 1, createdAt: -1 });

export const ProductRequest = mongoose.model("ProductRequest", productRequestSchema);
