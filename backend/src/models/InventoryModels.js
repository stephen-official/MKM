import mongoose from "mongoose";
import { Counter } from "./CounterModel.js";
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
    subUnits: [{ name: String, factorToBase: Number }],
    // A unit a super-admin added in Settings, offered to products like the 7 built-in ones (catalog/units.js).
    offered: { type: Boolean, default: false }
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
  // Permanent short ID (P-0001), given once and never changed. The Excel round trip matches rows by it.
  productNo: { type: String, default: undefined },
  pricePerUnit: { type: Number, default: null },
  priceUpdatedAt: { type: Date, default: null },
  priceUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Ordered, distributed and stocked in packs too, e.g. a 25 kg bag of rice with its own price.
  // Kitchens must enter an expiry date when receiving this product (FSSAI). Admins turn it off for items that have none.
  expiryRequired: { type: Boolean, default: true },
  // Food-safety facts (FSSAI), see catalog/foodSafety.js. Unset `kind` = saved before these existed; the form asks on the next edit.
  kind: { type: String, enum: ["food", "non_food", null], default: undefined },
  form: { type: String, enum: ["packaged", "loose", null], default: undefined },
  vegMark: { type: String, enum: ["veg", "non_veg", "egg", null], default: undefined },
  allergens: { type: [String], default: [] },
  storage: { type: String, enum: ["room", "fridge", "freezer", null], default: undefined },
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
stockItemSchema.index({ productNo: 1 }, { unique: true, partialFilterExpression: { productNo: { $type: "string" } } });

/** The next Product ID from the "product-no" counter, e.g. P-0042. Atomic, so two saves never share one. */
export const nextProductNo = async (session) => {
  const counter = await Counter.findOneAndUpdate({ _id: "product-no" }, { $inc: { seq: 1 } }, { new: true, upsert: true, session });
  return `P-${String(counter.seq).padStart(4, "0")}`;
};
// Every product saved through the model gets its ID on creation. Bulk inserts (seed, fixtures) are covered by assignMissingProductNos.
stockItemSchema.pre("save", async function giveProductNo() {
  if (this.isNew && !this.productNo) this.productNo = await nextProductNo(this.$session());
});
// Custom pack names added in Settings before any product uses them (names in use on products count too; see /products/pack-names).
const packNameSchema = new mongoose.Schema({ name: { type: String, required: true }, key: { type: String, required: true, unique: true } }, { timestamps: true });
export const PackName = mongoose.model("PackName", packNameSchema);
export const StockGroup = mongoose.model("StockGroup", stockGroupSchema);
export const Unit = mongoose.model("Unit", unitSchema);
export const Godown = mongoose.model("Godown", godownSchema);
export const StockItem = mongoose.model("StockItem", stockItemSchema);

