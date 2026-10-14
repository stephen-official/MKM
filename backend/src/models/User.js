import mongoose from "mongoose";
import { ALL_ROLES } from "../utils/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ALL_ROLES, required: true },
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", default: null },
    active: { type: Boolean, default: true },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    // Optimistic-concurrency token for admin edits. Not updatedAt: sign-in, sign-out and
    // password resets also write the document and must not make a pending edit conflict.
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
