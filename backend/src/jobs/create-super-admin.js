// Creates (or safely re-runs for) the super-admin account.
// Credentials come only from the environment; nothing is hard-coded.
//   SUPER_ADMIN_EMAIL=... SUPER_ADMIN_NAME=... SUPER_ADMIN_PASSWORD=... npm --prefix backend run create-super-admin
// Flags: --promote (turn an existing account with that email into super_admin)
//        --reset-password (replace the password of an existing super_admin)
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { User } from "../models/User.js";
import { ROLES } from "../utils/roles.js";
import { isValidPassword } from "../routes/authRoutes.js";

const fail = (code, message) => Object.assign(new Error(message), { code });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ensureSuperAdmin = async ({ email, name, password, promote = false, resetPassword = false }) => {
  const normalized = String(email || "").toLowerCase().trim();
  const cleanName = String(name || "").trim();
  if (!EMAIL.test(normalized)) throw fail("INVALID_INPUT", "SUPER_ADMIN_EMAIL must be a valid email address");
  if (!cleanName) throw fail("INVALID_INPUT", "SUPER_ADMIN_NAME is required");
  if (!isValidPassword(password)) throw fail("INVALID_INPUT", "SUPER_ADMIN_PASSWORD must be at least 8 characters");

  const existing = await User.findOne({ email: normalized });
  if (!existing) {
    const user = await User.create({
      name: cleanName, email: normalized, role: ROLES.SUPER_ADMIN, godownId: null, active: true,
      passwordHash: await bcrypt.hash(password, 10)
    });
    return { status: "created", userId: String(user._id) };
  }

  if (existing.role !== ROLES.SUPER_ADMIN) {
    if (!promote) throw fail("ROLE_CONFLICT", `${normalized} already exists with role "${existing.role}". Re-run with --promote to make it super_admin.`);
    existing.role = ROLES.SUPER_ADMIN;
    existing.godownId = null;
    existing.active = true;
    existing.refreshToken = null;
    await existing.save();
    return { status: "promoted", userId: String(existing._id) };
  }

  if (resetPassword) {
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.refreshToken = null;
    await existing.save();
    return { status: "password-reset", userId: String(existing._id) };
  }
  return { status: "unchanged", userId: String(existing._id) };
};

const main = async () => {
  const { connectDB } = await import("../config/db.js");
  await connectDB();
  try {
    const result = await ensureSuperAdmin({
      email: process.env.SUPER_ADMIN_EMAIL,
      name: process.env.SUPER_ADMIN_NAME,
      password: process.env.SUPER_ADMIN_PASSWORD,
      promote: process.argv.includes("--promote"),
      resetPassword: process.argv.includes("--reset-password")
    });
    console.log(`Super-admin ${result.status} (${result.userId})`);
    process.exitCode = 0;
  } catch (error) {
    console.error(`Super-admin not created: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
