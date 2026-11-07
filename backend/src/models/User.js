import mongoose from "mongoose";
import { ALL_ROLES } from "../utils/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ALL_ROLES, required: true },
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown", default: null },
    // WhatsApp number, stored as +<country><number> (utils/phone.js). Required for new kitchen users in the admin app.
    phone: { type: String, default: "" },
    active: { type: Boolean, default: true },
    // When the user last signed in with their password (shown on Master data › Kitchens).
    lastLoginAt: { type: Date, default: null },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    // A kitchen password a super-admin set, sealed so super-admins can view it again (utils/passwordVault.js).
    // Never selected unless asked for; cleared when the user sets their own password or stops being a kitchen account.
    viewablePassword: { type: String, default: null, select: false },
    // Optimistic-concurrency token for admin edits. Not updatedAt: sign-in, sign-out and
    // password resets also write the document and must not make a pending edit conflict.
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
