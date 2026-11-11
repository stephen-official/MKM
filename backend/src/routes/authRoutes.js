import { asyncRoute, legacyErrorPolicy } from "../shared/httpErrors.js";
import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { createResetToken, hashResetToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { authenticate } from "../middleware/auth.js";
import { sendResetEmail } from "../utils/mailer.js";
import { isValidPassword, MIN_PASSWORD_LENGTH } from "../utils/passwordRules.js";
export { isValidPassword } from "../utils/passwordRules.js";

export const authRoutes = express.Router();

// --- Login ---
authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "email and password are required" });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  if (!user.active) return res.status(401).json({ message: "Account is inactive" });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();
  return res.json({ accessToken, refreshToken, role: user.role, godownId: user.godownId });
});

// --- Token Management ---
authRoutes.post("/refresh", asyncRoute(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);
    if (!user || !user.active || user.refreshToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });
    return res.json({ accessToken: signAccessToken(user) });

}, legacyErrorPolicy({ status: 401, field: "message", message: "Invalid refresh token" })));

// --- Logout: revoke the refresh token so it cannot mint new access tokens ---
authRoutes.post("/logout", authenticate, asyncRoute(async (req, res) => {

    await User.updateOne({ _id: req.user.sub }, { $set: { refreshToken: null } });
    return res.status(204).end();

}, legacyErrorPolicy({ status: 500, field: "message", message: "Could not sign out. Try again." })));

// --- Password Reset Flow ---
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (typeof email !== "string" || !email.trim()) return res.status(400).json({ message: "email is required" });
  const emailNormalized = email.toLowerCase().trim();
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
  if (!token || typeof token !== "string" || !isValidPassword(newPassword)) {
    return res.status(400).json({ message: `A valid token and password of at least ${MIN_PASSWORD_LENGTH} characters are required` });
  }
  const user = await User.findOne({
    resetToken: hashResetToken(token),
    resetTokenExpiry: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.viewablePassword = null; // the user chose this one: super-admins no longer see it
  user.resetToken = null;
  user.resetTokenExpiry = null;
  user.refreshToken = null;
  await user.save();
  return res.json({ message: "Password reset successful" });
});








authRoutes.get("/me", authenticate, asyncRoute(async (req, res) => {

    const user = await User.findById(req.user.sub)
      .select("-passwordHash -refreshToken -resetToken")
      .populate("godownId", "name logoUrl"); // the kitchen app shows the kitchen's name and logo

    if (!user || !user.active) return res.status(401).json({ message: "Account is inactive" });

    return res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      godown: user.godownId   // ✅ clean structure for frontend
    });


}, legacyErrorPolicy({ status: 500, field: "message", message: "Failed to fetch user" })));
