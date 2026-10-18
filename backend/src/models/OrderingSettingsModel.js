import mongoose from "mongoose";

export const ORDERING_SETTINGS_ID = "global";

// One document; absent until a super-admin first saves, so DEFAULT_ORDERING_SETTINGS applies until then.
const orderingSettingsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  neededInOptions: [{ _id: false, key: String, label: String, hours: Number }],
  emergencyHours: Number,
  closeBeforeHours: Number,
  minOpenShare: Number,
  version: { type: Number, default: 0, min: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

export const OrderingSettings = mongoose.model("OrderingSettings", orderingSettingsSchema, "orderingsettings");
