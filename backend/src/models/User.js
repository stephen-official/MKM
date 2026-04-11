import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], required: true },
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", default: null },
    active: { type: Boolean, default: true },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
