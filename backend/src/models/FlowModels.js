// // import mongoose from "mongoose";

// // const lineItemSchema = new mongoose.Schema(
// //   {
// //     stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
// //     orderedQty: { type: Number, default: 0 },
// //     receivedQty: { type: Number, default: 0 },
// //     qtyBaseUnit: { type: Number, default: 0 },
// //     unitPrice: { type: Number, default: 0 },
// //     amount: { type: Number, default: 0 }
// //   },
// //   { _id: false }
// // );

// // const indentSchema = new mongoose.Schema(
// //   {
// //     indentNo: { type: String, required: true, unique: true },
// //     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
// //     items: [lineItemSchema],
// //     totalAmount: { type: Number, default: 0 },
// //     status: { type: String, enum: ["pending", "purchased", "stock_received"], default: "pending" }
// //   },
// //   { timestamps: true }
// // );

// // const purchaseOrderSchema = new mongoose.Schema(
// //   {
// //     indentId: { type: mongoose.Schema.Types.ObjectId, ref: "Indent", required: true },
// //     items: [lineItemSchema],
// //     totalAmount: { type: Number, default: 0 },
// //     receivedAt: { type: Date, default: Date.now }
// //   },
// //   { timestamps: true }
// // );

// // const godownStockSchema = new mongoose.Schema(
// //   {
// //     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
// //     stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
// //     qtyBaseUnit: { type: Number, default: 0 },
// //     thresholdBaseUnit: { type: Number, default: 0 }
// //   },
// //   { timestamps: true }
// // );
// // godownStockSchema.index({ godownId: 1, stockItemId: 1 }, { unique: true });

// // const distributionSchema = new mongoose.Schema(
// //   {
// //     purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
// //     allocations: [{ stockItemId: mongoose.Schema.Types.ObjectId, godownId: mongoose.Schema.Types.ObjectId, qtyBaseUnit: Number }],
// //     leftovers: [{ stockItemId: mongoose.Schema.Types.ObjectId, qtyBaseUnit: Number }]
// //   },
// //   { timestamps: true }
// // );

// // const consumptionSchema = new mongoose.Schema(
// //   {
// //     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
// //     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
// //     date: { type: String, required: true },
// //     items: [{ stockItemId: mongoose.Schema.Types.ObjectId, qtyBaseUnit: Number, unitDisplay: String, amountAtIssue: Number }]
// //   },
// //   { timestamps: true }
// // );

// // const requestSchema = new mongoose.Schema(
// //   {
// //     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
// //     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
// //     targetDate: { type: String, required: true },
// //     reason: { type: String, required: true },
// //     items: [{ stockItemId: mongoose.Schema.Types.ObjectId, qtyBaseUnit: Number }],
// //     status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
// //     adminDecision: { type: String, default: "" }
// //   },
// //   { timestamps: true }
// // );

// // const transferSchema = new mongoose.Schema(
// //   {
// //     fromGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
// //     toGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
// //     items: [{ stockItemId: mongoose.Schema.Types.ObjectId, qtyBaseUnit: Number }],
// //     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
// //   },
// //   { timestamps: true }
// // );

// // const notificationSchema = new mongoose.Schema(
// //   {
// //     type: { type: String, required: true },
// //     severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
// //     payload: { type: Object, default: {} },
// //     readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
// //   },
// //   { timestamps: true }
// // );

// // export const Indent = mongoose.model("Indent", indentSchema);
// // export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
// // export const GodownStock = mongoose.model("GodownStock", godownStockSchema);
// // export const Distribution = mongoose.model("Distribution", distributionSchema);
// // export const Consumption = mongoose.model("Consumption", consumptionSchema);
// // export const Request = mongoose.model("Request", requestSchema);
// // export const Transfer = mongoose.model("Transfer", transferSchema);
// // export const Notification = mongoose.model("Notification", notificationSchema);







// import mongoose from "mongoose";

// // --- SHARED SCHEMAS ---

// const lineItemSchema = new mongoose.Schema(
//   {
//     stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
//     orderedQty: { type: Number, default: 0 },
//     receivedQty: { type: Number, default: 0 },
//     qtyBaseUnit: { type: Number, default: 0 },
//     unitPrice: { type: Number, default: 0 },
//     amount: { type: Number, default: 0 }
//   },
//   { _id: false }
// );

// // --- CORE WORKFLOW MODELS ---

// const indentSchema = new mongoose.Schema(
//   {
//     indentNo: { type: String, required: true, unique: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [lineItemSchema],
//     totalAmount: { type: Number, default: 0 },
//     status: { 
//       type: String, 
//       enum: ["pending", "purchased", "stock_received"], 
//       default: "pending" 
//     }
//   },
//   { timestamps: true }
// );

// const purchaseOrderSchema = new mongoose.Schema(
//   {
//     indentId: { type: mongoose.Schema.Types.ObjectId, ref: "Indent", required: true },
//     items: [lineItemSchema],
//     totalAmount: { type: Number, default: 0 },
//     receivedAt: { type: Date, default: Date.now },
//     // CRITICAL FIX: Tracks if PO has been distributed to godowns
//     status: { 
//       type: String, 
//       enum: ["pending", "distributed"], 
//       default: "pending" 
//     }
//   },
//   { timestamps: true }
// );

// const distributionSchema = new mongoose.Schema(
//   {
//     // Made optional to support redistribution of leftovers without a parent PO
//     purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
//     // CRITICAL FIX: Tracks which distribution the leftovers came from
//     leftoverSourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Distribution", default: null },
//     allocations: [
//       { 
//         stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
//         godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown" }, 
//         qtyBaseUnit: Number ,
//         unitPrice: Number, // Add this
//     amount: Number
//       }
//     ],
//     leftovers: [
//       { 
//         stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
//         qtyBaseUnit: Number 
//       }
//     ]
//   },
//   { timestamps: true }
// );

// // --- INVENTORY & STOCK MODELS ---

// const godownStockSchema = new mongoose.Schema(
//   {
//     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//     stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
//     qtyBaseUnit: { type: Number, default: 0 },
//     thresholdBaseUnit: { type: Number, default: 0 }
//   },
//   { timestamps: true }
// );
// // Ensures an item can only have one entry per godown
// godownStockSchema.index({ godownId: 1, stockItemId: 1 }, { unique: true });

// const consumptionSchema = new mongoose.Schema(
//   {
//     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     date: { type: String, required: true },
//     items: [
//       { 
//         stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
//         qtyBaseUnit: Number, 
//         unitDisplay: String, 
//         amountAtIssue: Number 
//       }
//     ]
//   },
//   { timestamps: true }
// );

// const requestSchema = new mongoose.Schema(
//   {
//     godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     targetDate: { type: String, required: true },
//     reason: { type: String, required: true },
//     items: [
//       { 
//         stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
//         qtyBaseUnit: Number 
//       }
//     ],
//     status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
//     adminDecision: { type: String, default: "" }
//   },
//   { timestamps: true }
// );

// const transferSchema = new mongoose.Schema(
//   {
//     fromGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//     toGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//     items: [
//       { 
//         stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
//         qtyBaseUnit: Number 
//       }
//     ],
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
//   },
//   { timestamps: true }
// );

// const notificationSchema = new mongoose.Schema(
//   {
//     type: { type: String, required: true },
//     severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
//     payload: { type: Object, default: {} },
//     readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
//   },
//   { timestamps: true }
// );

// // --- EXPORTS ---

// export const Indent = mongoose.model("Indent", indentSchema);
// export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
// export const GodownStock = mongoose.model("GodownStock", godownStockSchema);
// export const Distribution = mongoose.model("Distribution", distributionSchema);
// export const Consumption = mongoose.model("Consumption", consumptionSchema);
// export const Request = mongoose.model("Request", requestSchema);
// export const Transfer = mongoose.model("Transfer", transferSchema);
// export const Notification = mongoose.model("Notification", notificationSchema);











import mongoose from "mongoose";

// --- SHARED SCHEMAS ---

const lineItemSchema = new mongoose.Schema(
  {
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    qtyBaseUnit: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  { _id: false }
);

// --- CORE WORKFLOW MODELS ---

const indentSchema = new mongoose.Schema(
  {
    indentNo: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [lineItemSchema],
    totalAmount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["pending", "purchased", "stock_received"], 
      default: "pending" 
    }
  },
  { timestamps: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    indentId: { type: mongoose.Schema.Types.ObjectId, ref: "Indent", required: true },
    items: [lineItemSchema],
    totalAmount: { type: Number, default: 0 },
    receivedAt: { type: Date, default: Date.now },
    // CRITICAL FIX: Tracks if PO has been distributed to godowns
    status: { 
      type: String, 
      enum: ["pending", "distributed"], 
      default: "pending" 
    }
  },
  { timestamps: true }
);

const distributionSchema = new mongoose.Schema(
  {
    // Made optional to support redistribution of leftovers without a parent PO
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    // CRITICAL FIX: Tracks which distribution the leftovers came from
    leftoverSourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Distribution", default: null },
    allocations: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown" }, 
        qtyBaseUnit: Number ,
        unitPrice: Number, // Add this
    amount: Number
      }
    ],
    leftovers: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        qtyBaseUnit: Number 
      }
    ]
  },
  { timestamps: true }
);

// --- INVENTORY & STOCK MODELS ---

const godownStockSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    qtyBaseUnit: { type: Number, default: 0 },
    thresholdBaseUnit: { type: Number, default: 0 }
  },
  { timestamps: true }
);
// Ensures an item can only have one entry per godown
godownStockSchema.index({ godownId: 1, stockItemId: 1 }, { unique: true });

const consumptionSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    items: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        qtyBaseUnit: Number, 
        unitDisplay: String, 
        amountAtIssue: Number 
      }
    ]
  },
  { timestamps: true }
);

const requestSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetDate: { type: String, required: true },
    reason: { type: String, required: true },
    items: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        qtyBaseUnit: Number 
      }
    ],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminDecision: { type: String, default: "" }
  },
  { timestamps: true }
);

const transferSchema = new mongoose.Schema(
  {
    fromGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    toGodownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    items: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        qtyBaseUnit: Number 
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    payload: { type: Object, default: {} },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);





// const indentRequestSchema = new mongoose.Schema({
//   godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

//   items: [
//     {
//       stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" },
//       qtyBaseUnit: Number
//     }
//   ],

//   note: { type: String, default: "" },

//   status: {
//     type: String,
//     enum: ["pending", "converted", "rejected"],
//     default: "pending"
//   }
// }, { timestamps: true });

// export const IndentRequest = mongoose.model("IndentRequest", indentRequestSchema);
// --- EXPORTS ---


// 20






const indentRequestSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  items: [
    {
      stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" },
      qtyBaseUnit: Number,
      receivedQty: { type: Number, default: 0 } // future use
    }
  ],

  note: String,
  targetDate: String,

  status: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "pending"
  },

  confirmedAt: Date,
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }

}, { timestamps: true });

export const IndentRequest = mongoose.model("IndentRequest", indentRequestSchema);
























export const Indent = mongoose.model("Indent", indentSchema);
export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export const GodownStock = mongoose.model("GodownStock", godownStockSchema);
export const Distribution = mongoose.model("Distribution", distributionSchema);
export const Consumption = mongoose.model("Consumption", consumptionSchema);
export const Request = mongoose.model("Request", requestSchema);
export const Transfer = mongoose.model("Transfer", transferSchema);
export const Notification = mongoose.model("Notification", notificationSchema);