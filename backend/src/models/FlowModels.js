import mongoose from "mongoose";

// --- SHARED SCHEMAS ---

const lineItemSchema = new mongoose.Schema(
  {
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    qtyBaseUnit: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    // Optional immutable snapshot of the catalog pack selected for this line.
    // Quantities above remain in the product's base unit for stock arithmetic.
    packId: { type: mongoose.Schema.Types.ObjectId, default: null },
    packName: { type: String, default: "" },
    packSize: { type: Number, default: null },
    packQuantity: { type: Number, default: null },
    packPrice: { type: Number, default: null },
     status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  }
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
        unitPrice: Number,
        amount: Number,
        packId: { type: mongoose.Schema.Types.ObjectId, default: null },
        packName: { type: String, default: "" },
        packSize: { type: Number, default: null },
        packQuantity: { type: Number, default: null },
        packPrice: { type: Number, default: null }
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
    // Pack balances are derived for display from qtyBaseUnit and the current catalog packs.
    // This keeps one authoritative balance and avoids stock drifting between representations.
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
    reason: { type: String, trim: true, default: "" },
    sourceType: { type: String, enum: ["direct", "request", "migrated_daily_usage"], default: "direct" },
    legacyDailyUsageId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    items: [
      { 
        stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" }, 
        stockRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "GodownStock", default: null },
        qtyBaseUnit: Number, 
        unitDisplay: String, 
        // Captured when the line is recorded (README Decision 5); null = no valid price then.
        unitPriceAtIssue: { type: Number, default: null },
        amountAtIssue: { type: Number, default: null },
        returnBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "StockBatch", default: null },
        batchAllocations: [{
          batchId: { type: mongoose.Schema.Types.ObjectId, ref: "StockBatch", required: true },
          qtyBaseUnit: { type: Number, required: true },
          unitPrice: { type: Number, default: null }
        }]
      }
    ]
  },
  { timestamps: true }
);

const requestSchema = new mongoose.Schema(
  {
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestType: {
  type: String,
  // Legacy values remain readable while new requests use the single usage workflow.
  enum: ["usage", "stock_request", "daily_usage"],
  default: "usage"
},
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
  fromGodownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    required: true
  },

  toGodownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    required: true
  },

  items: [
    {
      stockItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StockItem"
      },
      qtyBaseUnit: Number,
      batchAllocations: [{
        batchId: { type: mongoose.Schema.Types.ObjectId, ref: "StockBatch" },
        qtyBaseUnit: Number,
        unitPrice: { type: Number, default: null }
      }]
    }
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },

  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  acceptedAt: Date,

  rejectedAt: Date

},
{
  timestamps: true
});






const indentRequestSchema = new mongoose.Schema({
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
items: [
  {
    stockItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItem",
      required: true
    },

    qtyBaseUnit: { type: Number, required: true },

    receivedQty: { type: Number, default: 0 },

    packId: { type: mongoose.Schema.Types.ObjectId, default: null },
    packName: { type: String, default: "" },
    packSize: { type: Number, default: null },
    packQuantity: { type: Number, default: null },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  }
],
note: { type: String, default: "" },
targetDate: { type: Date, default: null },
status: {
  type: String,
  enum: [
    "pending",
    "confirmed",
    "partially_received",
    "received",
    "rejected"
  ],
  default: "pending"
},
  confirmedAt: Date,
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }

}, { timestamps: true });







const notificationSchema = new mongoose.Schema(
{
  type: {
    type: String,
    required: true
  },

  severity: {
    type: String,
    enum: ["info", "warning", "critical"],
    default: "info"
  },

  payload: {
    type: Object,
    default: {}
  },

  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ]

},
{
  timestamps: true
});

// --- Executive report indexes (README Decision 8) ---
consumptionSchema.index({ godownId: 1, date: 1 });
consumptionSchema.index({ date: 1 });
consumptionSchema.index({ godownId: 1, createdAt: 1 });
consumptionSchema.index({ createdAt: 1 });
consumptionSchema.index(
  { legacyDailyUsageId: 1 },
  { unique: true, partialFilterExpression: { legacyDailyUsageId: { $type: "objectId" } } },
);
distributionSchema.index({ "allocations.godownId": 1, "allocations.stockItemId": 1, createdAt: -1 });
distributionSchema.index({ createdAt: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ receivedAt: 1 });
purchaseOrderSchema.index({ "items.stockItemId": 1, receivedAt: -1 });
requestSchema.index({ status: 1, godownId: 1, createdAt: 1 });
requestSchema.index({ godownId: 1, createdAt: 1 });
requestSchema.index({ createdAt: 1 });
transferSchema.index({ status: 1, createdAt: 1 });
transferSchema.index({ fromGodownId: 1, status: 1 });
transferSchema.index({ toGodownId: 1, status: 1 });
transferSchema.index({ createdAt: 1 });
indentSchema.index({ createdAt: 1 });
indentSchema.index({ status: 1 });
indentRequestSchema.index({ status: 1, godownId: 1, createdAt: 1 });
indentRequestSchema.index({ godownId: 1, createdAt: 1 });

export const IndentRequest = mongoose.model("IndentRequest", indentRequestSchema);



export const Indent = mongoose.model("Indent", indentSchema);
export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export const GodownStock = mongoose.model("GodownStock", godownStockSchema);
export const Distribution = mongoose.model("Distribution", distributionSchema);
export const Consumption = mongoose.model("Consumption", consumptionSchema);
export const Request = mongoose.model("Request", requestSchema);
export const Transfer = mongoose.model("Transfer", transferSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
