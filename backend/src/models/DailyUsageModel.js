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

dailyUsageSchema.index({ godownId: 1, date: 1 });
dailyUsageSchema.index({ date: 1 }); // all-kitchens report range prefilter (OR of date / createdAt)
dailyUsageSchema.index({ createdAt: 1 });

export const DailyUsage =
mongoose.model("DailyUsage", dailyUsageSchema);