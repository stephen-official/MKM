// // // // import express from "express";
// // // // import bcrypt from "bcryptjs";
// // // // import { User } from "../models/User.js";
// // // // import { Godown } from "../models/InventoryModels.js";
// // // // import { env } from "../config/env.js";
// // // // import { createResetToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
// // // // import { authenticate } from "../middleware/auth.js";

// // // // export const authRoutes = express.Router();

// // // // authRoutes.post("/register", async (req, res) => {
// // // //   const { name, email, password, role, godownId } = req.body;
// // // //   if (!name || !email || !password) return res.status(400).json({ message: "name, email and password are required" });
// // // //   if (!["admin", "user"].includes(role)) return res.status(400).json({ message: "Invalid role" });
// // // //   if (role === "user" && !godownId) return res.status(400).json({ message: "godownId is required for user" });
// // // //   const emailNormalized = email.toLowerCase().trim();
// // // //   const existing = await User.findOne({ email: emailNormalized });
// // // //   if (existing) return res.status(409).json({ message: "Email already exists" });
// // // //   const roleCount = await User.countDocuments({ role });
// // // //   const limit = role === "admin" ? env.adminRegistrationLimit : env.userRegistrationLimit;
// // // //   if (roleCount >= limit) return res.status(403).json({ message: `${role} registration limit reached` });
// // // //   if (role === "user") {
// // // //     const godown = await Godown.findById(godownId);
// // // //     if (!godown) return res.status(400).json({ message: "Invalid godownId" });
// // // //   }
// // // //   const passwordHash = await bcrypt.hash(password, 10);
// // // //   const user = await User.create({ name, email: emailNormalized, passwordHash, role, godownId: role === "user" ? godownId : null });
// // // //   return res.status(201).json({ id: user._id, role: user.role });
// // // // });

// // // // authRoutes.post("/login", async (req, res) => {
// // // //   const { email, password } = req.body;
// // // //   if (!email || !password) return res.status(400).json({ message: "email and password are required" });
// // // //   const user = await User.findOne({ email: email.toLowerCase() });
// // // //   if (!user) return res.status(401).json({ message: "Invalid credentials" });
// // // //   const ok = await bcrypt.compare(password, user.passwordHash);
// // // //   if (!ok) return res.status(401).json({ message: "Invalid credentials" });
// // // //   const accessToken = signAccessToken(user);
// // // //   const refreshToken = signRefreshToken(user);
// // // //   user.refreshToken = refreshToken;
// // // //   await user.save();
// // // //   return res.json({ accessToken, refreshToken, role: user.role, godownId: user.godownId });
// // // // });

// // // // authRoutes.get("/register-godowns", async (_req, res) => {
// // // //   const godowns = await Godown.find({ active: true }).select("_id name").sort({ name: 1 });
// // // //   res.json(godowns);
// // // // });

// // // // authRoutes.post("/refresh", async (req, res) => {
// // // //   const { refreshToken } = req.body;
// // // //   if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
// // // //   try {
// // // //     const decoded = verifyRefreshToken(refreshToken);
// // // //     const user = await User.findById(decoded.sub);
// // // //     if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });
// // // //     return res.json({ accessToken: signAccessToken(user) });
// // // //   } catch (error) {
// // // //     return res.status(401).json({ message: "Invalid refresh token" });
// // // //   }
// // // // });

// // // // authRoutes.post("/forgot-password", async (req, res) => {
// // // //   const { email } = req.body;
// // // //   const user = await User.findOne({ email: email.toLowerCase() });
// // // //   if (user) {
// // // //     user.resetToken = createResetToken();
// // // //     user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
// // // //     await user.save();
// // // //   }
// // // //   return res.json({ message: "If account exists, reset token generated", token: user?.resetToken || null });
// // // // });

// // // // authRoutes.post("/reset-password", async (req, res) => {
// // // //   const { token, newPassword } = req.body;
// // // //   const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
// // // //   if (!user) return res.status(400).json({ message: "Invalid or expired token" });
// // // //   user.passwordHash = await bcrypt.hash(newPassword, 10);
// // // //   user.resetToken = null;
// // // //   user.resetTokenExpiry = null;
// // // //   await user.save();
// // // //   return res.json({ message: "Password reset successful" });
// // // // });

// // // // authRoutes.get("/me", authenticate, async (req, res) => {
// // // //   const user = await User.findById(req.user.sub).select("-passwordHash -refreshToken -resetToken");
// // // //   return res.json(user);
// // // // });





// // // import express from "express";
// // // import bcrypt from "bcryptjs";
// // // import { User } from "../models/User.js";
// // // import { Godown } from "../models/InventoryModels.js";
// // // import { env } from "../config/env.js";
// // // import { createResetToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
// // // import { authenticate } from "../middleware/auth.js";
// // // import { sendResetEmail } from "../utils/mailer.js"; // Integrated mailer

// // // export const authRoutes = express.Router();

// // // authRoutes.post("/register", async (req, res) => {
// // //   const { name, email, password, role, godownId } = req.body;
// // //   if (!name || !email || !password) return res.status(400).json({ message: "name, email and password are required" });
// // //   if (!["admin", "user"].includes(role)) return res.status(400).json({ message: "Invalid role" });
// // //   if (role === "user" && !godownId) return res.status(400).json({ message: "godownId is required for user" });
  
// // //   const emailNormalized = email.toLowerCase().trim();
// // //   const existing = await User.findOne({ email: emailNormalized });
// // //   if (existing) return res.status(409).json({ message: "Email already exists" });
  
// // //   const roleCount = await User.countDocuments({ role });
// // //   const limit = role === "admin" ? env.adminRegistrationLimit : env.userRegistrationLimit;
// // //   if (roleCount >= limit) return res.status(403).json({ message: `${role} registration limit reached` });
  
// // //   if (role === "user") {
// // //     const godown = await Godown.findById(godownId);
// // //     if (!godown) return res.status(400).json({ message: "Invalid godownId" });
// // //   }
  
// // //   const passwordHash = await bcrypt.hash(password, 10);
// // //   const user = await User.create({ name, email: emailNormalized, passwordHash, role, godownId: role === "user" ? godownId : null });
// // //   return res.status(201).json({ id: user._id, role: user.role });
// // // });

// // // authRoutes.post("/login", async (req, res) => {
// // //   const { email, password } = req.body;
// // //   if (!email || !password) return res.status(400).json({ message: "email and password are required" });
// // //   const user = await User.findOne({ email: email.toLowerCase() });
// // //   if (!user) return res.status(401).json({ message: "Invalid credentials" });
// // //   const ok = await bcrypt.compare(password, user.passwordHash);
// // //   if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  
// // //   const accessToken = signAccessToken(user);
// // //   const refreshToken = signRefreshToken(user);
// // //   user.refreshToken = refreshToken;
// // //   await user.save();
// // //   return res.json({ accessToken, refreshToken, role: user.role, godownId: user.godownId });
// // // });

// // // authRoutes.get("/register-godowns", async (_req, res) => {
// // //   const godowns = await Godown.find({ active: true }).select("_id name").sort({ name: 1 });
// // //   res.json(godowns);
// // // });

// // // authRoutes.post("/refresh", async (req, res) => {
// // //   const { refreshToken } = req.body;
// // //   if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
// // //   try {
// // //     const decoded = verifyRefreshToken(refreshToken);
// // //     const user = await User.findById(decoded.sub);
// // //     if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });
// // //     return res.json({ accessToken: signAccessToken(user) });
// // //   } catch (error) {
// // //     return res.status(401).json({ message: "Invalid refresh token" });
// // //   }
// // // });

// // // // Updated Forgot Password with Email Integration
// // // authRoutes.post("/forgot-password", async (req, res) => {
// // //   const { email } = req.body;
// // //   const user = await User.findOne({ email: email.toLowerCase() });
  
// // //   if (user) {
// // //     user.resetToken = createResetToken();
// // //     user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
// // //     await user.save();
    
// // //     try {
// // //       await sendResetEmail(user.email, user.resetToken);
// // //     } catch (error) {
// // //       // Log the error internally if needed
// // //       return res.status(500).json({ message: "Error sending email" });
// // //     }
// // //   }
  
// // //   // Security best practice: return generic success message so attackers can't verify emails
// // //   return res.json({ message: "If account exists, a reset link has been sent to your email." });
// // // });

// // // authRoutes.post("/reset-password", async (req, res) => {
// // //   const { token, newPassword } = req.body;
// // //   const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
// // //   if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  
// // //   user.passwordHash = await bcrypt.hash(newPassword, 10);
// // //   user.resetToken = null;
// // //   user.resetTokenExpiry = null;
// // //   await user.save();
// // //   return res.json({ message: "Password reset successful" });
// // // });

// // // authRoutes.get("/me", authenticate, async (req, res) => {
// // //   const user = await User.findById(req.user.sub).select("-passwordHash -refreshToken -resetToken");
// // //   return res.json(user);
// // // });






import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import { env } from "../config/env.js";
import { createResetToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { authenticate } from "../middleware/auth.js";
import { sendResetEmail } from "../utils/mailer.js"; // Integrated mailer

export const authRoutes = express.Router();

authRoutes.post("/register", async (req, res) => {
  const { name, email, password, role, godownId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "name, email and password are required" });
  if (!["admin", "user"].includes(role)) return res.status(400).json({ message: "Invalid role" });
  if (role === "user" && !godownId) return res.status(400).json({ message: "godownId is required for user" });
  
  const emailNormalized = email.toLowerCase().trim();
  const existing = await User.findOne({ email: emailNormalized });
  if (existing) return res.status(409).json({ message: "Email already exists" });
  
  const roleCount = await User.countDocuments({ role });
  const limit = role === "admin" ? env.adminRegistrationLimit : env.userRegistrationLimit;
  if (roleCount >= limit) return res.status(403).json({ message: `${role} registration limit reached` });
  
  if (role === "user") {
    const godown = await Godown.findById(godownId);
    if (!godown) return res.status(400).json({ message: "Invalid godownId" });
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: emailNormalized, passwordHash, role, godownId: role === "user" ? godownId : null });
  return res.status(201).json({ id: user._id, role: user.role });
});

authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();
  return res.json({ accessToken, refreshToken, role: user.role, godownId: user.godownId });
});

// authRoutes.get("/register-godowns", async (_req, res) => {
//   const godowns = await Godown.find({ active: true }).select("_id name").sort({ name: 1 });
//   res.json(godowns);
// });

// authRoutes.js
authRoutes.get("/register-godowns", async (_req, res) => {
  // Make sure the filter { active: true } matches your godowns
  const godowns = await Godown.find({ active: true }).select("_id name").sort({ name: 1 });
  res.json(godowns);
});


authRoutes.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);
    if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });
    return res.json({ accessToken: signAccessToken(user) });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

// Fully Integrated Forgot Password with Debugging
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (user) {
    user.resetToken = createResetToken();
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    
    try {
      await sendResetEmail(user.email, user.resetToken);
    } catch (error) {
      // This helps you see why it failed in your terminal
      console.error("Nodemailer Error:", error.message); 
      return res.status(500).json({ message: "Error sending email" });
    }
  }
  
  // Security best practice: generic success message
  return res.json({ message: "If account exists, a reset link has been sent to your email." });
});

authRoutes.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();
  return res.json({ message: "Password reset successful" });
});

authRoutes.get("/me", authenticate, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash -refreshToken -resetToken");
  return res.json(user);
});






// // good until









// import express from "express";
// import bcrypt from "bcryptjs";
// import { User } from "../models/User.js";
// import { Godown } from "../models/InventoryModels.js";
// import { env } from "../config/env.js";
// import { 
//   createResetToken, 
//   signAccessToken, 
//   signRefreshToken, 
//   verifyRefreshToken 
// } from "../utils/tokens.js";
// import { authenticate } from "../middleware/auth.js";
// import { sendResetEmail } from "../utils/mailer.js";

// export const authRoutes = express.Router();

// /**
//  * PUBLIC: Fetch active Godowns for the registration dropdown
//  */
// // authRoutes.get("/register-godowns", async (_req, res) => {
// //   try {
// //     const godowns = await Godown.find({ active: true })
// //       .select("_id name")
// //       .sort({ name: 1 });
// //     res.json(godowns);
// //   } catch (error) {
// //     res.status(500).json({ message: "Error fetching godowns" });
// //   }
// // });



// // authRoutes.js
// authRoutes.get("/register-godowns", async (_req, res) => {
//   try {
//     // This ensures that as soon as an admin adds a godown, 
//     // the registration page gets the fresh list.
//     res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
//     const godowns = await Godown.find({ active: true })
//       .select("_id name")
//       .sort({ name: 1 });
      
//     res.json(godowns);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching godowns" });
//   }
// });





// /**
//  * REGISTER: Create new user or admin
//  */
// authRoutes.post("/register", async (req, res) => {
//   const { name, email, password, role, godownId } = req.body;
//   const userRole = role || "user";

//   if (!name || !email || !password) {
//     return res.status(400).json({ message: "Name, email and password are required" });
//   }

//   const emailNormalized = email.toLowerCase().trim();
//   const existing = await User.findOne({ email: emailNormalized });
//   if (existing) return res.status(409).json({ message: "Email already exists" });

//   // Optional: Check registration limits from env
//   const roleCount = await User.countDocuments({ role: userRole });
//   const limit = userRole === "admin" ? env.adminRegistrationLimit : env.userRegistrationLimit;
//   if (roleCount >= limit) {
//     return res.status(403).json({ message: `${userRole} registration limit reached` });
//   }

//   const passwordHash = await bcrypt.hash(password, 10);
//   const user = await User.create({
//     name,
//     email: emailNormalized,
//     passwordHash,
//     role: userRole,
//     godownId: userRole === "admin" ? null : godownId
//   });

//   return res.status(201).json({ id: user._id, role: user.role });
// });

// /**
//  * LOGIN: Authenticate user and issue tokens
//  */
// authRoutes.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required" });
//   }

//   const user = await User.findOne({ email: email.toLowerCase() });
//   if (!user) return res.status(401).json({ message: "Invalid credentials" });

//   const isMatch = await bcrypt.compare(password, user.passwordHash);
//   if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

//   const accessToken = signAccessToken(user);
//   const refreshToken = signRefreshToken(user);

//   user.refreshToken = refreshToken;
//   await user.save();

//   return res.json({ 
//     accessToken, 
//     refreshToken, 
//     role: user.role, 
//     godownId: user.godownId 
//   });
// });

// /**
//  * REFRESH: Issue new access token using a valid refresh token
//  */
// authRoutes.post("/refresh", async (req, res) => {
//   const { refreshToken } = req.body;
//   if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

//   try {
//     const decoded = verifyRefreshToken(refreshToken);
//     const user = await User.findById(decoded.sub);
    
//     if (!user || user.refreshToken !== refreshToken) {
//       return res.status(401).json({ message: "Invalid refresh token" });
//     }

//     return res.json({ accessToken: signAccessToken(user) });
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid refresh token" });
//   }
// });

// /**
//  * FORGOT PASSWORD: Create reset token and send email
//  */
// authRoutes.post("/forgot-password", async (req, res) => {
//   const { email } = req.body;
//   const user = await User.findOne({ email: email.toLowerCase() });

//   if (user) {
//     user.resetToken = createResetToken();
//     user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes
//     await user.save();

//     try {
//       await sendResetEmail(user.email, user.resetToken);
//     } catch (error) {
//       console.error("Nodemailer Error:", error.message);
//       return res.status(500).json({ message: "Error sending email" });
//     }
//   }

//   // Security: Generic message to prevent email enumeration
//   return res.json({ message: "If account exists, a reset link has been sent to your email." });
// });

// /**
//  * RESET PASSWORD: Use token to update password
//  */
// authRoutes.post("/reset-password", async (req, res) => {
//   const { token, newPassword } = req.body;
  
//   const user = await User.findOne({ 
//     resetToken: token, 
//     resetTokenExpiry: { $gt: new Date() } 
//   });

//   if (!user) return res.status(400).json({ message: "Invalid or expired token" });

//   user.passwordHash = await bcrypt.hash(newPassword, 10);
//   user.resetToken = null;
//   user.resetTokenExpiry = null;
//   await user.save();

//   return res.json({ message: "Password reset successful" });
// });

// /**
//  * ME: Get profile of currently logged-in user
//  */
// authRoutes.get("/me", authenticate, async (req, res) => {
//   const user = await User.findById(req.user.sub)
//     .select("-passwordHash -refreshToken -resetToken");
//   return res.json(user);
// });