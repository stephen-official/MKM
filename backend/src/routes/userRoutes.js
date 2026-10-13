import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Godown } from "../models/InventoryModels.js";
import { UserAdminAudit } from "../models/AdminAuditModels.js";
import { ALL_ROLES, ROLES, isSuperAdmin } from "../utils/roles.js";
import { createResetToken, hashResetToken } from "../utils/tokens.js";
import { mailer } from "../utils/mailer.js";
import { clampPage } from "../utils/pagination.js";
import { disconnectUser } from "../realtime.js";

export const userRoutes = express.Router();
const superAdminOnly = authorize(["super_admin"]);
userRoutes.use(superAdminOnly);

const INVITE_TTL_MS = 24 * 3_600_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_FIELDS = "name email role godownId active createdAt updatedAt";

class UserAdminError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new UserAdminError(status, code, message); };
const isDuplicateEmail = (error) => Object.keys(error?.keyPattern || error?.keyValue || {}).includes("email");
const sendError = (res, error) => {
  if (error instanceof UserAdminError) return res.status(error.status).json({ code: error.code, message: error.message });
  // Only a duplicate email is the caller's mistake; any other unique index tripping is a server problem.
  if (error?.code === 11000 && isDuplicateEmail(error)) return res.status(409).json({ code: "EMAIL_EXISTS", message: "That email is already in use." });
  console.error("[users]", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong." });
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const safe = (u) => u && ({ _id: u._id, name: u.name, email: u.email, role: u.role, godownId: u.godownId?._id ?? u.godownId ?? null, kitchenName: u.godownId?.name ?? null, active: u.active, createdAt: u.createdAt, updatedAt: u.updatedAt });
const snapshot = (u) => u && ({ name: u.name, email: u.email, role: u.role, godownId: u.godownId ? String(u.godownId._id ?? u.godownId) : null, active: u.active });

const actorOf = async (req) => {
  const me = await User.findById(req.user.sub).select("email").lean();
  return { actorId: req.user.sub, actorEmail: me?.email || "" };
};

const validateKitchen = async (role, godownId) => {
  if (role !== ROLES.USER) return null;
  if (!godownId) fail(400, "KITCHEN_REQUIRED", "Kitchen accounts need a kitchen.");
  if (!mongoose.isValidObjectId(godownId) || !(await Godown.exists({ _id: godownId, active: true }))) fail(400, "INVALID_KITCHEN", "Choose an active kitchen.");
  return godownId;
};

/**
 * Run inside the write transaction whenever a super-admin is about to lose access.
 * Every such transaction increments one shared lock document, so two concurrent demotions
 * conflict and one is retried; the retry re-checks that the actor is still an active
 * super-admin and that another active super-admin remains.
 */
/** The request was authorised before the transaction began; make sure the actor still holds that power. */
export const assertActorIsActiveSuperAdmin = async (session, actorId) => {
  const actor = await User.findOne({ _id: actorId, role: ROLES.SUPER_ADMIN, active: true }).session(session ?? null).lean();
  if (!actor) fail(403, "FORBIDDEN", "Your access has changed. Sign in again.");
};

export const assertNotLastActiveSuperAdmin = async (session, targetId, actorId) => {
  await mongoose.connection.collection("locks").updateOne({ _id: "super-admin-guard" }, { $inc: { n: 1 } }, { upsert: true, session });
  await assertActorIsActiveSuperAdmin(session, actorId);
  const others = await User.countDocuments({ role: ROLES.SUPER_ADMIN, active: true, _id: { $ne: targetId } }).session(session);
  if (others === 0) fail(409, "LAST_SUPER_ADMIN", "At least one active super-admin must remain.");
};

/** Sets a fresh single-use password token on the (unsaved or loaded) user document and returns the plain token. */
const stageToken = (user, ttlMs) => {
  const token = createResetToken();
  user.resetToken = hashResetToken(token);
  user.resetTokenExpiry = new Date(Date.now() + ttlMs);
  return token;
};

userRoutes.get("/", async (req, res) => {
  try {
    const filter = {};
    if (ALL_ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (mongoose.isValidObjectId(req.query.godownId)) filter.godownId = req.query.godownId;
    if (req.query.active === "true" || req.query.active === "false") filter.active = req.query.active === "true";
    const q = String(req.query.q || "").trim();
    if (q) filter.$or = [{ name: { $regex: escapeRegex(q), $options: "i" } }, { email: { $regex: escapeRegex(q), $options: "i" } }];
    const pageSize = req.query.pageSize === "all" ? 1000 : Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
    const page = clampPage(req.query.page);
    const [items, total] = await Promise.all([
      User.find(filter).select(SAFE_FIELDS).populate("godownId", "name").collation({ locale: "en", strength: 2 })
        .sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      User.countDocuments(filter)
    ]);
    return res.json({ items: items.map(safe), total, page, pageSize });
  } catch (error) {
    return sendError(res, error);
  }
});

userRoutes.get("/audit", async (req, res) => {
  try {
    const page = clampPage(req.query.page);
    const [items, total] = await Promise.all([
      UserAdminAudit.find().sort({ at: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      UserAdminAudit.countDocuments()
    ]);
    return res.json({ items, total, page, pageSize: 25 });
  } catch (error) {
    return sendError(res, error);
  }
});

userRoutes.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").toLowerCase().trim();
    const role = req.body?.role;
    if (!name || name.length > 100) fail(400, "INVALID_INPUT", "Name is required (100 characters max).");
    if (!EMAIL.test(email)) fail(400, "INVALID_INPUT", "A valid email is required.");
    if (!ALL_ROLES.includes(role)) fail(400, "INVALID_INPUT", "Choose a valid role.");
    if (isSuperAdmin(role) && req.body?.confirmSuperAdmin !== true) fail(400, "CONFIRMATION_REQUIRED", "Confirm that this account should be a super-admin.");
    const godownId = await validateKitchen(role, req.body?.godownId);
    if (await User.exists({ email })) fail(409, "EMAIL_EXISTS", "That email is already in use.");

    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const actor = await actorOf(req);
    let user;
    let token;
    // The account and its audit row commit together; the email goes out only once they are durable.
    // Everything is built inside the callback so a retried attempt starts from a fresh, new document.
    await session.withTransaction(async () => {
      await assertActorIsActiveSuperAdmin(session, req.user.sub);
      user = new User({ name, email, role, godownId, active: true, passwordHash });
      token = stageToken(user, INVITE_TTL_MS);
      await user.save({ session });
      await UserAdminAudit.create([{ ...actor, targetUserId: user._id, action: "create", before: null, after: snapshot(user) }], { session });
    });
    let inviteSent = true;
    try {
      await mailer.sendInviteEmail({ email, name, token });
    } catch (error) {
      inviteSent = false;
      console.error(`[users] invite email to ${email} failed: ${error.message}`);
    }
    const created = await User.findById(user._id).select(SAFE_FIELDS).populate("godownId", "name").lean();
    return res.status(201).json({ user: safe(created), inviteSent });
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
});

userRoutes.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  const body = req.body ?? {};
  try {
    if (!mongoose.isValidObjectId(req.params.id)) fail(404, "USER_NOT_FOUND", "No such user.");
    let result;
    let revoke = false;
    await session.withTransaction(async () => {
      // Authorised before the transaction started; confirm the actor still holds super-admin now.
      await assertActorIsActiveSuperAdmin(session, req.user.sub);
      const user = await User.findById(req.params.id).session(session);
      if (!user) fail(404, "USER_NOT_FOUND", "No such user.");
      const expected = body.expectedUpdatedAt ? new Date(body.expectedUpdatedAt).getTime() : NaN;
      if (expected !== user.updatedAt.getTime()) fail(409, "VERSION_CONFLICT", "This account was changed by someone else. Reload and try again.");
      const before = snapshot(user);
      const self = String(user._id) === String(req.user.sub);
      const { name, role, godownId, active } = body;

      if (name !== undefined) {
        const clean = String(name).trim();
        if (!clean || clean.length > 100) fail(400, "INVALID_INPUT", "Name is required (100 characters max).");
        user.name = clean;
      }
      const nextRole = role ?? user.role;
      if (role !== undefined) {
        if (!ALL_ROLES.includes(role)) fail(400, "INVALID_INPUT", "Choose a valid role.");
        if (self && role !== user.role) fail(400, "CANNOT_MODIFY_SELF", "You cannot change your own role.");
        if (isSuperAdmin(role) && !isSuperAdmin(user.role) && body.confirmSuperAdmin !== true) fail(400, "CONFIRMATION_REQUIRED", "Confirm that this account should be a super-admin.");
      }
      if (active !== undefined && typeof active !== "boolean") fail(400, "INVALID_INPUT", "active must be true or false.");
      if (active === true && !user.active && isSuperAdmin(nextRole) && body.confirmSuperAdmin !== true) {
        fail(400, "CONFIRMATION_REQUIRED", "Confirm that this super-admin account should be reactivated.");
      }
      if (self && active === false) fail(400, "CANNOT_MODIFY_SELF", "You cannot deactivate your own account.");

      const losingSuper = isSuperAdmin(user.role) && user.active && (!isSuperAdmin(nextRole) || active === false);
      if (losingSuper) await assertNotLastActiveSuperAdmin(session, user._id, req.user.sub);

      const accessChanged = (role !== undefined && role !== user.role) || (active !== undefined && active !== user.active) ||
        (godownId !== undefined && String(godownId || "") !== String(user.godownId || ""));
      const roleChanged = nextRole !== user.role;
      const kitchenChanged = godownId !== undefined && String(godownId || "") !== String(user.godownId || "");
      user.role = nextRole;
      if (nextRole !== ROLES.USER) user.godownId = null;
      else if (roleChanged || kitchenChanged) user.godownId = await validateKitchen(nextRole, godownId ?? user.godownId);
      if (active !== undefined) user.active = active;
      if (accessChanged) user.refreshToken = null;
      // A deactivated account must not keep a live invite/reset link that would work after reactivation.
      if (active === false) { user.resetToken = null; user.resetTokenExpiry = null; }
      await user.save({ session });
      await UserAdminAudit.create([{ ...(await actorOf(req)), targetUserId: user._id, action: "update", before, after: snapshot(user) }], { session });
      result = user._id;
      revoke = accessChanged;
    });
    if (revoke) disconnectUser(result);
    const updated = await User.findById(result).select(SAFE_FIELDS).populate("godownId", "name").lean();
    return res.json({ user: safe(updated) });
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
});

userRoutes.post("/:id/send-reset", async (req, res) => {
  try {
    await assertActorIsActiveSuperAdmin(null, req.user.sub);
    if (!mongoose.isValidObjectId(req.params.id)) fail(404, "USER_NOT_FOUND", "No such user.");
    const user = await User.findById(req.params.id);
    if (!user) fail(404, "USER_NOT_FOUND", "No such user.");
    if (!user.active) fail(409, "USER_INACTIVE", "This account is deactivated. Reactivate it before sending a password link.");
    const token = stageToken(user, INVITE_TTL_MS);
    await user.save();
    let sent = true;
    try {
      await mailer.sendInviteEmail({ email: user.email, name: user.name, token });
    } catch (error) {
      sent = false;
      console.error(`[users] reset email to ${user.email} failed: ${error.message}`);
    }
    await UserAdminAudit.create({ ...(await actorOf(req)), targetUserId: user._id, action: "send-reset", before: null, after: null });
    return res.json({ sent });
  } catch (error) {
    return sendError(res, error);
  }
});
