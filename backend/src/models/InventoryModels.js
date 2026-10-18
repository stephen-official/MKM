import mongoose from "mongoose";
const stockGroupSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true });
const unitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    stockGroupId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: "StockGroup", 
  default: null 
},
    subUnits: [{ name: String, factorToBase: Number }]
  },
  { timestamps: true }
);
const godownSchema = new mongoose.Schema({ 
  name: { type: String, required: true, unique: true }, 
  active: { type: Boolean, default: true } // Standardizes visibility
}, { timestamps: true });

const stockItemSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    unique: true
  },

  imageUrl: {
    type: String,
    default: ""
  },

  stockGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StockGroup",
    required: true
  },

  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
    required: true
  },

  itemType: {
    type: String,
    enum: ["stock", "daily_use"],
    default: "stock"
  },

  defaultThreshold: {
    type: Number,
    default: 0
  },

  // Catalog details (products page). Only a super-admin may set prices; see catalog/completeness.js
  // for what a product needs before kitchens can use it.
  brand: { type: String, trim: true, default: "" },
  productCode: { type: String, trim: true, default: undefined },
  pricePerUnit: { type: Number, default: null },
  priceUpdatedAt: { type: Date, default: null },
  priceUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Ordered, distributed and stocked in packs too, e.g. a 25 kg bag of rice with its own price.
  soldInPacks: { type: Boolean, default: false },
  packs: [{
    name: { type: String, trim: true, required: true },
    size: { type: Number, required: true },
    price: { type: Number, default: null }
  }],
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
},
{ timestamps: true }
);
stockItemSchema.index({ productCode: 1 }, { unique: true, partialFilterExpression: { productCode: { $type: "string" } } });
export const StockGroup = mongoose.model("StockGroup", stockGroupSchema);
export const Unit = mongoose.model("Unit", unitSchema);
export const Godown = mongoose.model("Godown", godownSchema);
export const StockItem = mongoose.model("StockItem", stockItemSchema);

