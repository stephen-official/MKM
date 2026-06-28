// 28-06-2026



import mongoose from "mongoose";

const dailyUsageSchema = new mongoose.Schema(
{
  godownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  date: {
    type: String,
    required: true
  },

  items: [
    {
      stockItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StockItem",
        required: true
      },

      qtyBaseUnit: {
        type: Number,
        required: true
      }
    }
  ]
},
{ timestamps: true }
);

export const DailyUsage =
mongoose.model("DailyUsage", dailyUsageSchema);