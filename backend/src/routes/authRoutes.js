import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import { env } from "../config/env.js";
import { createResetToken, hashResetToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { authenticate } from "../middleware/auth.js";
import { sendResetEmail } from "../utils/mailer.js";
import { PRIVILEGED_ROLES } from "../utils/roles.js";

export const authRoutes = express.Router();
const MIN_PASSWORD_LENGTH = 8;

export const isValidPassword = (password) =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;

// --- Registration ---
authRoutes.post("/register", async (req, res) => {
  const { name, email, password, role = "user", godownId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "name, email and password are required" });
  if (PRIVILEGED_ROLES.includes(role)) return res.status(403).json({ message: "Privileged accounts cannot be created through public registration" });
  if (role !== "user") return res.status(400).json({ message: "Invalid role" });
  if (!isValidPassword(password)) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  if (!godownId) return res.status(400).json({ message: "godownId is required for user" });
  
  const emailNormalized = email.toLowerCase().trim();
  const existing = await User.findOne({ email: emailNormalized });
  if (existing) return res.status(409).json({ message: "Email already exists" });
  
  const roleCount = await User.countDocuments({ role: "user" });
  const limit = env.userRegistrationLimit;
  if (roleCount >= limit) return res.status(403).json({ message: `${role} registration limit reached` });
  
  const godown = await Godown.findById(godownId);
  if (!godown) return res.status(400).json({ message: "Invalid godownId" });
  
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ 
    name, 
    email: emailNormalized, 
    passwordHash, 
    role: "user",
    godownId
  });
  return res.status(201).json({ id: user._id, role: user.role });
});

// --- Login ---
authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  if (!user.active) return res.status(401).json({ message: "Account is inactive" });
  
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();
  return res.json({ accessToken, refreshToken, role: user.role, godownId: user.godownId });
});

// --- Helpers ---
authRoutes.get("/register-godowns", async (_req, res) => {
  const godowns = await Godown.find({ active: true }).select("_id name").sort({ name: 1 });
  res.json(godowns);
});

// --- Token Management ---
authRoutes.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);
    if (!user || !user.active || user.refreshToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });
    return res.json({ accessToken: signAccessToken(user) });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

// --- Logout: revoke the refresh token so it cannot mint new access tokens ---
authRoutes.post("/logout", authenticate, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.sub }, { $set: { refreshToken: null } });
    return res.status(204).end();
  } catch (error) {
    console.error("[auth] logout failed", error);
    return res.status(500).json({ message: "Could not sign out. Try again." });
  }
});

// --- Password Reset Flow ---
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  // Normalize input
  const emailNormalized = email ? email.toLowerCase().trim() : "";
  const user = await User.findOne({ email: emailNormalized });
  
  if (user) {
    const resetToken = createResetToken();
    user.resetToken = hashResetToken(resetToken);
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 Minute expiry
    await user.save();
    
    try {
      await sendResetEmail(user.email, resetToken);
    } catch (error) {
      // LOG IT: This prints to your terminal so you can fix SMTP issues
      console.error("CRITICAL: Email failed to send to", user.email, "Error:", error.message);
      
      // Returning 500 helps you identify the crash during development
      return res.status(500).json({ message: "Mail server error. Check backend logs." });
    }
  }
  
  // Generic success message for security
  return res.json({ message: "If account exists, a reset link has been sent to your email." });
});

authRoutes.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !isValidPassword(newPassword)) {
    return res.status(400).json({ message: `A valid token and password of at least ${MIN_PASSWORD_LENGTH} characters are required` });
  }
  const user = await User.findOne({ 
    resetToken: hashResetToken(token),
    resetTokenExpiry: { $gt: new Date() } 
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  user.refreshToken = null;
  await user.save();
  return res.json({ message: "Password reset successful" });
});








authRoutes.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
      .select("-passwordHash -refreshToken -resetToken")
      .populate("godownId", "name"); // ✅ IMPORTANT

    if (!user || !user.active) return res.status(401).json({ message: "Account is inactive" });

    return res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      godown: user.godownId   // ✅ clean structure for frontend
    });

  } catch (err) {
    console.error("❌ /me error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
