import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import mongoose from "mongoose";
import { mailer } from "../utils/mailer.js";
import { User } from "../models/User.js";
import { assertNotLastActiveSuperAdmin } from "../routes/userRoutes.js";

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
  const noMail = await as("root", "post", "/api/users").send({ name: "Z", email: "z@x.io", role: "admin" });
  assert.equal(noMail.status, 201);
  assert.equal(noMail.body.inviteSent, false);
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
