// // import mongoose from "mongoose";
// // const stockGroupSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true });
// // const unitSchema = new mongoose.Schema(
// //   {
// //     name: { type: String, required: true },
// //     symbol: { type: String, required: true },
// //     stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
// //     subUnits: [{ name: String, factorToBase: Number }]
// //   },
// //   { timestamps: true }
// // );
// // // const godownSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, active: { type: Boolean, default: true } }, { timestamps: true });
// // const godownSchema = new mongoose.Schema({ 
// //   name: { type: String, required: true, unique: true }, 
// //   active: { type: Boolean, default: true } // Standardizes visibility
// // }, { timestamps: true });

// // const stockItemSchema = new mongoose.Schema(
// //   {
// //     name: { type: String, required: true, unique: true },
// //     imageUrl: { type: String, default: "" },
// //     stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
// //     unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
// //     defaultThreshold: { type: Number, default: 0 }
// //   },
// //   { timestamps: true }
// // );
// // export const StockGroup = mongoose.model("StockGroup", stockGroupSchema);
// // export const Unit = mongoose.model("Unit", unitSchema);
// // export const Godown = mongoose.model("Godown", godownSchema);
// // export const StockItem = mongoose.model("StockItem", stockItemSchema);






// // 25




// import mongoose from "mongoose";
// const stockGroupSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true });
// const unitSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     symbol: { type: String, required: true },
//     stockGroupId: { 
//   type: mongoose.Schema.Types.ObjectId, 
//   ref: "StockGroup", 
//   default: null 
// },
//     // stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
//     subUnits: [{ name: String, factorToBase: Number }]
//   },
//   { timestamps: true }
// );
// // const godownSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, active: { type: Boolean, default: true } }, { timestamps: true });
// const godownSchema = new mongoose.Schema({ 
//   name: { type: String, required: true, unique: true }, 
//   active: { type: Boolean, default: true } // Standardizes visibility
// }, { timestamps: true });

// const stockItemSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     imageUrl: { type: String, default: "" },
//     stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
//     unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
//     defaultThreshold: { type: Number, default: 0 }
//   },
//   { timestamps: true }
// );
// export const StockGroup = mongoose.model("StockGroup", stockGroupSchema);
// export const Unit = mongoose.model("Unit", unitSchema);
// export const Godown = mongoose.model("Godown", godownSchema);
// export const StockItem = mongoose.model("StockItem", stockItemSchema);







// 28-04-2026







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
    // stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
    subUnits: [{ name: String, factorToBase: Number }]
  },
  { timestamps: true }
);
// const godownSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, active: { type: Boolean, default: true } }, { timestamps: true });
const godownSchema = new mongoose.Schema({ 
  name: { type: String, required: true, unique: true }, 
  active: { type: Boolean, default: true } // Standardizes visibility
}, { timestamps: true });

const stockItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: "" },
    stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "StockGroup", required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    defaultThreshold: { type: Number, default: 0 }
  },
  { timestamps: true }
);
export const StockGroup = mongoose.model("StockGroup", stockGroupSchema);
export const Unit = mongoose.model("Unit", unitSchema);
export const Godown = mongoose.model("Godown", godownSchema);
export const StockItem = mongoose.model("StockItem", stockItemSchema);
