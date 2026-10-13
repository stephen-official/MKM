import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import mongoose from "mongoose";
import { mailer } from "../utils/mailer.js";
import { User } from "../models/User.js";
import { assertNotLastActiveSuperAdmin } from "../routes/userRoutes.js";
import { setIo } from "../realtime.js";
import { Godown } from "../models/InventoryModels.js";
import { UserAdminAudit } from "../models/AdminAuditModels.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async (t) => {
  await clearDb();
  t.mock.method(mailer, "sendInviteEmail", async () => {});
  t.mock.method(mailer, "sendResetEmail", async () => {});
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    kitchen,
    root: await createUser({ role: "super_admin", name: "Root", email: "root@x.io" }),
    admin: await createUser({ role: "admin", name: "Amy", email: "amy@x.io" }),
    cook: await createUser({ role: "user", name: "cook", email: "cook@x.io", godownId: kitchen._id })
  };
});

const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);

test("only super-admins can manage users", async () => {
  assert.equal((await as("admin", "get", "/api/users")).status, 403);
  assert.equal((await as("cook", "post", "/api/users").send({})).status, 403);
});

test("list is sorted, filtered and never leaks secrets", async () => {
  const res = await as("root", "get", "/api/users");
  assert.deepEqual(res.body.items.map((u) => u.name), ["Amy", "cook", "Root"]);
  for (const u of res.body.items) for (const secret of ["passwordHash", "refreshToken", "resetToken", "resetTokenExpiry"]) assert.equal(secret in u, false);
  assert.equal(res.body.items.find((u) => u.name === "cook").kitchenName, "Kitchen A");
  assert.equal((await as("root", "get", "/api/users?role=admin")).body.total, 1);
  assert.equal((await as("root", "get", "/api/users?q=AM")).body.items[0].email, "amy@x.io");
  assert.equal((await as("root", "get", `/api/users?q=${encodeURIComponent(".*")}`)).body.total, 0, "regex is escaped");
});

test("create users with invites; validation", async (t) => {
  const ok = await as("root", "post", "/api/users").send({ name: "New Cook", email: "New@X.io", role: "user", godownId: ctx.kitchen._id });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.inviteSent, true);
  assert.equal(ok.body.user.email, "new@x.io");
  assert.equal(mailer.sendInviteEmail.mock.callCount(), 1);
  const saved = await User.findOne({ email: "new@x.io" });
  assert.ok(saved.resetTokenExpiry > new Date(Date.now() + 23 * 3_600_000));

  assert.equal((await as("root", "post", "/api/users").send({ name: "Dup", email: "amy@x.io", role: "admin" })).body.code, "EMAIL_EXISTS");
  assert.equal((await as("root", "post", "/api/users").send({ name: "K", email: "k@x.io", role: "user" })).body.code, "KITCHEN_REQUIRED");
  assert.equal((await as("root", "post", "/api/users").send({ name: "S", email: "s@x.io", role: "super_admin" })).body.code, "CONFIRMATION_REQUIRED");
  assert.equal((await as("root", "post", "/api/users").send({ name: "S", email: "s@x.io", role: "super_admin", confirmSuperAdmin: true })).status, 201);

  t.mock.method(mailer, "sendInviteEmail", async () => { throw new Error("smtp down"); });
  const errors = t.mock.method(console, "error", () => {});
  const noMail = await as("root", "post", "/api/users").send({ name: "Z", email: "z@x.io", role: "admin" });
  assert.equal(noMail.status, 201);
  assert.equal(noMail.body.inviteSent, false);
  assert.deepEqual(errors.mock.calls.map((c) => c.arguments[0]), ["[users] invite email to z@x.io failed: smtp down"]);
  assert.ok(await User.exists({ email: "z@x.io" }), "the account is kept when only the email fails");
});

test("create: the account and its audit row commit together, and the invite goes out only after the commit", async (t) => {
  let existedWhenMailed = null;
  t.mock.method(mailer, "sendInviteEmail", async ({ email }) => {
    existedWhenMailed = {
      user: !!(await User.exists({ email })),
      audit: (await UserAdminAudit.countDocuments({ action: "create" })) === 1
    };
  });
  const ok = await as("root", "post", "/api/users").send({ name: "Atomic", email: "atomic@x.io", role: "admin" });
  assert.equal(ok.status, 201);
  assert.deepEqual(existedWhenMailed, { user: true, audit: true });

  // A failing audit write rolls the account back and no invite is sent.
  const calls = mailer.sendInviteEmail.mock.callCount();
  t.mock.method(UserAdminAudit, "create", async () => { throw new Error("audit down"); });
  const errors = t.mock.method(console, "error", () => {});
  const failed = await as("root", "post", "/api/users").send({ name: "Lost", email: "lost@x.io", role: "admin" });
  assert.equal(failed.status, 500);
  assert.equal(await User.exists({ email: "lost@x.io" }), null, "no account without its audit row");
  assert.equal(mailer.sendInviteEmail.mock.callCount(), calls);
  assert.equal(errors.mock.callCount(), 1);
});

test("a duplicate-key error maps to EMAIL_EXISTS only for the email key", async (t) => {
  // Simulate losing the race: the pre-check sees nothing, the unique index then rejects the insert.
  t.mock.method(User, "exists", async () => null);
  const raced = await as("root", "post", "/api/users").send({ name: "Dup", email: "amy@x.io", role: "admin" });
  assert.equal(raced.status, 409);
  assert.equal(raced.body.code, "EMAIL_EXISTS");
  assert.equal(await User.countDocuments({ email: "amy@x.io" }), 1);

  const errors = t.mock.method(console, "error", () => {});
  t.mock.method(User.prototype, "save", async () => { throw Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern: { somethingElse: 1 } }); });
  const other = await as("root", "post", "/api/users").send({ name: "Other", email: "other@x.io", role: "admin" });
  assert.equal(other.status, 500);
  assert.equal(other.body.code, "INTERNAL_ERROR");
  assert.equal(errors.mock.callCount(), 1);
});

test("PATCH re-checks inside the transaction that the actor is still an active super-admin, even for a rename", async (t) => {
  const target = await User.findById(ctx.admin.user._id).lean();
  const realFindOne = User.findOne.bind(User);
  t.mock.method(User, "findOne", (filter, ...rest) =>
    (String(filter?._id) === String(ctx.root.user._id) && filter.role === "super_admin"
      ? { session: () => ({ lean: async () => null }) }
      : realFindOne(filter, ...rest)));
  const res = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Should Not Apply" });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "FORBIDDEN");
  assert.equal((await User.findById(target._id)).name, "Amy");
  assert.equal(await UserAdminAudit.countDocuments(), 0);
});

test("create and send-reset refuse an actor who is no longer an active super-admin", async (t) => {
  const realFindOne = User.findOne.bind(User);
  t.mock.method(User, "findOne", (filter, ...rest) =>
    (String(filter?._id) === String(ctx.root.user._id) && filter.role === "super_admin"
      ? { session: () => ({ lean: async () => null }) }
      : realFindOne(filter, ...rest)));
  const created = await as("root", "post", "/api/users").send({ name: "Nope", email: "nope@x.io", role: "admin" });
  assert.equal(created.status, 403);
  assert.equal(await User.exists({ email: "nope@x.io" }), null);
  assert.equal(await UserAdminAudit.countDocuments(), 0);
  const reset = await as("root", "post", `/api/users/${ctx.admin.user._id}/send-reset`);
  assert.equal(reset.status, 403);
  assert.equal(mailer.sendInviteEmail.mock.callCount(), 0);
});

test("create is retried as a whole: a transient transaction error still yields one account and one audit row", async (t) => {
  const realSave = User.prototype.save;
  let attempts = 0;
  t.mock.method(User.prototype, "save", async function (...args) {
    attempts += 1;
    const saved = await realSave.apply(this, args);
    if (attempts === 1) {
      const transient = new mongoose.mongo.MongoServerError({ message: "transient" });
      transient.addErrorLabel("TransientTransactionError");
      throw transient;
    }
    return saved;
  });
  const res = await as("root", "post", "/api/users").send({ name: "Retry", email: "retry@x.io", role: "admin" });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(attempts >= 2);
  assert.equal(await User.countDocuments({ email: "retry@x.io" }), 1);
  assert.equal(await UserAdminAudit.countDocuments({ action: "create" }), 1);
});

test("PATCH without a body is a version conflict, not a crash", async () => {
  const res = await as("root", "patch", `/api/users/${ctx.admin.user._id}`);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "VERSION_CONFLICT");
});

test("PATCH ignores fields it does not manage (mass assignment)", async () => {
  const before = await User.findById(ctx.admin.user._id).lean();
  const res = await as("root", "patch", `/api/users/${before._id}`).send({
    expectedUpdatedAt: before.updatedAt, name: "Amy Renamed",
    email: "evil@x.io", passwordHash: "plain", refreshToken: "forged", resetToken: "forged", _id: String(ctx.root.user._id)
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const after = await User.findById(before._id).lean();
  assert.equal(after.name, "Amy Renamed");
  assert.equal(after.email, before.email);
  assert.equal(after.passwordHash, before.passwordHash);
  assert.equal(after.refreshToken, before.refreshToken, "a rename does not touch the session");
  assert.equal(after.resetToken, before.resetToken);
  assert.equal(await User.countDocuments({ email: "evil@x.io" }), 0);
});

test("deactivating or moving a user revokes their refresh token; a rename keeps it", async () => {
  const other = await createGodown("Kitchen B");
  assert.ok((await User.findById(ctx.cook.user._id)).refreshToken);

  let target = await User.findById(ctx.cook.user._id).lean();
  await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Cook 2" });
  assert.ok((await User.findById(target._id)).refreshToken, "rename keeps the session");

  target = await User.findById(ctx.cook.user._id).lean();
  const moved = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, godownId: other._id });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal((await User.findById(target._id)).refreshToken, null, "kitchen change revokes");

  await User.updateOne({ _id: target._id }, { refreshToken: "again" });
  target = await User.findById(ctx.cook.user._id).lean();
  const off = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, active: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal((await User.findById(target._id)).refreshToken, null, "deactivation revokes");
});

test("send-reset refuses an inactive account and sends nothing", async () => {
  await User.updateOne({ _id: ctx.cook.user._id }, { active: false });
  const res = await as("root", "post", `/api/users/${ctx.cook.user._id}/send-reset`);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "USER_INACTIVE");
  assert.equal(mailer.sendInviteEmail.mock.callCount(), 0);
  assert.equal((await User.findById(ctx.cook.user._id)).resetToken, null);
  assert.equal(await UserAdminAudit.countDocuments({ action: "send-reset" }), 0);
  // active accounts still work
  const ok = await as("root", "post", `/api/users/${ctx.admin.user._id}/send-reset`);
  assert.deepEqual([ok.status, ok.body.sent], [200, true]);
});

test("deactivating a user clears any outstanding invite/reset token", async () => {
  await as("root", "post", `/api/users/${ctx.cook.user._id}/send-reset`);
  const issued = await User.findById(ctx.cook.user._id).lean();
  assert.ok(issued.resetToken && issued.resetTokenExpiry);
  const res = await as("root", "patch", `/api/users/${issued._id}`).send({ expectedUpdatedAt: issued.updatedAt, active: false });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const after = await User.findById(issued._id).lean();
  assert.equal(after.resetToken, null);
  assert.equal(after.resetTokenExpiry, null);
});

test("reactivating a super-admin needs explicit confirmation; reactivating anyone else does not", async () => {
  const dormant = await createUser({ role: "super_admin", email: "dormant@x.io", active: false });
  let doc = await User.findById(dormant.user._id).lean();
  const refused = await as("root", "patch", `/api/users/${doc._id}`).send({ expectedUpdatedAt: doc.updatedAt, active: true });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.code, "CONFIRMATION_REQUIRED");
  assert.equal((await User.findById(doc._id)).active, false);
  const allowed = await as("root", "patch", `/api/users/${doc._id}`).send({ expectedUpdatedAt: doc.updatedAt, active: true, confirmSuperAdmin: true });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));

  await User.updateOne({ _id: ctx.cook.user._id }, { active: false });
  doc = await User.findById(ctx.cook.user._id).lean();
  const cook = await as("root", "patch", `/api/users/${doc._id}`).send({ expectedUpdatedAt: doc.updatedAt, active: true });
  assert.equal(cook.status, 200, JSON.stringify(cook.body));
});

test("role change revokes sessions and applies on the next request", async () => {
  const target = await User.findById(ctx.admin.user._id).lean();
  const res = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, role: "user", godownId: ctx.kitchen._id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await User.findById(target._id)).refreshToken, null);
  assert.equal((await as("admin", "get", "/api/consumptions")).status, 403);
});

test("concurrent edits conflict", async () => {
  const target = await User.findById(ctx.admin.user._id).lean();
  await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Amy A" });
  const stale = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Amy B" });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
});

test("guards: you cannot demote or deactivate yourself, but can rename yourself", async () => {
  const me = await User.findById(ctx.root.user._id).lean();
  assert.equal((await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, role: "admin" })).body.code, "CANNOT_MODIFY_SELF");
  assert.equal((await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, active: false })).body.code, "CANNOT_MODIFY_SELF");
  const renamed = await as("root", "patch", `/api/users/${me._id}`).send({ expectedUpdatedAt: me.updatedAt, name: "Root 2" });
  assert.equal(renamed.status, 200);
});

test("assertNotLastActiveSuperAdmin: refuses to remove the last active super-admin", async () => {
  const session = await mongoose.startSession();
  try {
    // Only root is an active super-admin; removing root would leave none.
    await assert.rejects(
      session.withTransaction(() => assertNotLastActiveSuperAdmin(session, ctx.root.user._id, ctx.root.user._id)),
      (e) => e.code === "LAST_SUPER_ADMIN"
    );
    const two = await createUser({ role: "super_admin", email: "two@x.io" });
    await session.withTransaction(() => assertNotLastActiveSuperAdmin(session, two.user._id, ctx.root.user._id));
    await assert.rejects(
      session.withTransaction(() => assertNotLastActiveSuperAdmin(session, two.user._id, ctx.admin.user._id)),
      (e) => e.code === "FORBIDDEN",
      "an actor who is no longer an active super-admin is refused"
    );
  } finally {
    await session.endSession();
  }
});

test("two super-admins demoting each other at the same time leaves one super-admin", async () => {
  const two = await createUser({ role: "super_admin", email: "two@x.io" });
  const rootDoc = await User.findById(ctx.root.user._id).lean();
  const twoDoc = await User.findById(two.user._id).lean();
  const results = await Promise.all([
    as("root", "patch", `/api/users/${two.user._id}`).send({ expectedUpdatedAt: twoDoc.updatedAt, role: "admin" }),
    request(app).patch(`/api/users/${ctx.root.user._id}`).set("Authorization", `Bearer ${two.token}`)
      .send({ expectedUpdatedAt: rootDoc.updatedAt, role: "admin" })
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.body)));
  assert.equal(await User.countDocuments({ role: "super_admin", active: true }), 1);
});

test("audit rows record before/after without secrets", async () => {
  await as("root", "post", "/api/users").send({ name: "A2", email: "a2@x.io", role: "admin" });
  const audit = await as("root", "get", "/api/users/audit");
  assert.equal(audit.body.items[0].action, "create");
  assert.equal(JSON.stringify(audit.body.items[0]).includes("passwordHash"), false);
});

test("a kitchen user whose kitchen is inactive can still be renamed and deactivated", async () => {
  await Godown.updateOne({ _id: ctx.kitchen._id }, { $set: { active: false } });
  const target = await User.findById(ctx.cook.user._id).lean();
  const renamed = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Cook Renamed" });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
  assert.equal(renamed.body.user.name, "Cook Renamed");
  assert.equal(String(renamed.body.user.godownId), String(ctx.kitchen._id));
  const again = await User.findById(target._id).lean();
  const off = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: again.updatedAt, active: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal(off.body.user.active, false);
  // reactivating while keeping the (inactive) kitchen is fine: an unchanged kitchen is not re-validated
  const back = await User.findById(target._id).lean();
  const reactivated = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: back.updatedAt, godownId: ctx.kitchen._id, role: "user", active: true });
  assert.equal(reactivated.status, 200, `unchanged kitchen is not re-validated: ${JSON.stringify(reactivated.body)}`);
  // ...but moving to an inactive kitchen is still refused
  const other = await createGodown("Kitchen B");
  await Godown.updateOne({ _id: other._id }, { $set: { active: false } });
  const last = await User.findById(target._id).lean();
  const bad = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: last.updatedAt, godownId: other._id });
  assert.equal(bad.body.code, "INVALID_KITCHEN");
});

test("demoting a user disconnects their live sockets; a rename does not", async () => {
  const calls = [];
  setIo({ in: (room) => ({ disconnectSockets: (close) => calls.push([room, close]) }) });
  try {
    const target = await User.findById(ctx.admin.user._id).lean();
    const renamed = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: target.updatedAt, name: "Amy 2" });
    assert.equal(renamed.status, 200);
    assert.deepEqual(calls, []);
    const fresh = await User.findById(target._id).lean();
    const demoted = await as("root", "patch", `/api/users/${target._id}`).send({ expectedUpdatedAt: fresh.updatedAt, role: "user", godownId: ctx.kitchen._id });
    assert.equal(demoted.status, 200, JSON.stringify(demoted.body));
    assert.deepEqual(calls, [[`user:${target._id}`, true]]);
  } finally {
    setIo(null);
  }
});

test("absurd page numbers are clamped instead of failing", async () => {
  assert.equal((await as("root", "get", "/api/users?page=100000000000000000000")).status, 200);
  assert.equal((await as("root", "get", "/api/users/audit?page=100000000000000000000")).status, 200);
});
