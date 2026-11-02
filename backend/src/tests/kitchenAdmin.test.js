import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { User } from "../models/User.js";
import { UserAdminAudit } from "../models/AdminAuditModels.js";
import { createResetToken, hashResetToken } from "../utils/tokens.js";

const KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PASSWORD_VIEW_KEY = KEY;

// Master data › Kitchens: a kitchen's logo, and (super-admin) the kitchen's users and their passwords.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    kitchen,
    root: await createUser({ role: "super_admin" }),
    admin: await createUser({ role: "admin" }),
    cook: await createUser({ role: "user", godownId: kitchen._id })
  };
});
const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);
// A 1×1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("a kitchen's logo: an admin sets it, the kitchen app gets it from /me, and it can be removed; a cook cannot set it", async () => {
  assert.equal((await as("cook", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", PNG, "logo.png")).status, 403);
  const set = await as("admin", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", PNG, "logo.png");
  assert.equal(set.status, 200, JSON.stringify(set.body));
  assert.match(set.body.logoUrl, /\/uploads\/kitchen-logos\/.+\.png$/);
  assert.equal((await as("cook", "get", "/api/auth/me")).body.godown.logoUrl, set.body.logoUrl);
  assert.equal((await as("admin", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", Buffer.from("not an image"), "x.txt")).status, 400);
  assert.equal((await as("admin", "delete", `/api/inventory/godowns/${ctx.kitchen._id}/logo`)).body.logoUrl, "");
});

const login = (email, password) => request(app).post("/api/auth/login").send({ email, password });

test("a super-admin adds a kitchen user with a password (no email), can view it later, and every look is audited; admins cannot", async () => {
  const added = await as("root", "post", "/api/users").send({ name: "Lakshmi", email: "lakshmi@kitchen.test", role: "user", godownId: String(ctx.kitchen._id), password: "Rice-4821" });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  assert.deepEqual([added.body.inviteSent, added.body.passwordSet, added.body.user.passwordViewable], [false, true, true]);
  assert.equal((await login("lakshmi@kitchen.test", "Rice-4821")).status, 200);

  const id = added.body.user._id;
  assert.equal((await as("admin", "get", `/api/users/${id}/password`)).status, 403);
  const shown = await as("root", "get", `/api/users/${id}/password`);
  assert.equal(shown.body.password, "Rice-4821");
  assert.equal(await UserAdminAudit.countDocuments({ targetUserId: id, action: "view-password" }), 1);

  const list = await as("root", "get", "/api/users").query({ godownId: String(ctx.kitchen._id) });
  const stored = (await User.findById(id).select("+viewablePassword").lean()).viewablePassword;
  assert.ok(stored && !JSON.stringify(list.body).includes(stored) && !JSON.stringify(list.body).includes("Rice-4821"), "the list never carries the password");
  assert.equal(list.body.items.find((u) => u._id === id).passwordViewable, true);
  assert.equal((await as("root", "post", "/api/users").send({ name: "X", email: "x@kitchen.test", role: "user", godownId: String(ctx.kitchen._id), password: "short" })).body.code, "INVALID_PASSWORD");
});

test("setting a password signs the user out, the old one stops working, and an admin account's password is never viewable", async () => {
  const set = await as("root", "post", `/api/users/${ctx.cook.user._id}/password`).send({ password: "Dal-77777" });
  assert.deepEqual(set.body, { viewable: true });
  assert.equal((await User.findById(ctx.cook.user._id).lean()).refreshToken, null);
  assert.equal((await login(ctx.cook.user.email, ctx.cook.password)).status, 401);
  assert.equal((await login(ctx.cook.user.email, "Dal-77777")).status, 200);
  assert.equal(await UserAdminAudit.countDocuments({ targetUserId: ctx.cook.user._id, action: "set-password" }), 1);

  assert.deepEqual((await as("root", "post", `/api/users/${ctx.admin.user._id}/password`).send({ password: "Admin-12345" })).body, { viewable: false });
  assert.equal((await as("root", "get", `/api/users/${ctx.admin.user._id}/password`)).body.code, "NOT_VIEWABLE");
});

test("a user who chooses their own password (reset link) hides it from super-admins; without the key nothing is stored", async () => {
  await as("root", "post", `/api/users/${ctx.cook.user._id}/password`).send({ password: "Dal-77777" });
  const token = createResetToken();
  await User.updateOne({ _id: ctx.cook.user._id }, { resetToken: hashResetToken(token), resetTokenExpiry: new Date(Date.now() + 60_000) });
  assert.equal((await request(app).post("/api/auth/reset-password").send({ token, newPassword: "MyOwn-9999" })).status, 200);
  assert.equal((await as("root", "get", `/api/users/${ctx.cook.user._id}/password`)).body.code, "PASSWORD_NOT_VIEWABLE");

  delete process.env.PASSWORD_VIEW_KEY;
  try {
    assert.deepEqual((await as("root", "post", `/api/users/${ctx.cook.user._id}/password`).send({ password: "Dal-88888" })).body, { viewable: false });
    assert.equal((await as("root", "get", `/api/users/${ctx.cook.user._id}/password`)).body.code, "PASSWORD_VIEW_OFF");
  } finally {
    process.env.PASSWORD_VIEW_KEY = KEY;
  }
});

test("a super-admin can change a kitchen user's email; one already in use is refused", async () => {
  const other = await createUser({ role: "user", godownId: ctx.kitchen._id });
  const user = await User.findById(ctx.cook.user._id).lean();
  const moved = await as("root", "patch", `/api/users/${user._id}`).send({ email: "New@Kitchen.test", expectedVersion: user.version ?? 0 });
  assert.equal(moved.body.user.email, "new@kitchen.test");
  const clash = await as("root", "patch", `/api/users/${user._id}`).send({ email: other.user.email, expectedVersion: moved.body.user.version });
  assert.equal(clash.body.code, "EMAIL_EXISTS");
});

test("a kitchen user's WhatsApp number is saved on add and on edit; a bad one is refused", async () => {
  const added = await as("root", "post", "/api/users").send({ name: "Ravi", email: "ravi@kitchen.test", role: "user", godownId: String(ctx.kitchen._id), password: "Dal-12345", phone: "98765 43210" });
  assert.equal(added.body.user.phone, "+919876543210");
  const changed = await as("root", "patch", `/api/users/${added.body.user._id}`).send({ phone: "+44 7700 900123", expectedVersion: added.body.user.version });
  assert.equal(changed.body.user.phone, "+447700900123");
  assert.equal((await as("root", "patch", `/api/users/${added.body.user._id}`).send({ phone: "123", expectedVersion: changed.body.user.version })).body.code, "INVALID_PHONE");
});

test("a kitchen's details: address, person in charge and phone are saved, other fields are ignored, and only one place is the central store", async () => {
  const store = await as("admin", "post", "/api/inventory/godowns").send({ name: "Central Store", isCentralStore: true, phone: "0851-8234567" });
  assert.equal(store.status, 201, JSON.stringify(store.body));
  assert.deepEqual([store.body.isCentralStore, store.body.phone, store.body.active], [true, "08518234567", true]);
  const saved = await as("admin", "put", `/api/inventory/godowns/${ctx.kitchen._id}`).send({ address: "12 School Road, Kurnool", inChargeName: "Sita", phone: "98765 43210", active: false, logoUrl: "https://evil.test/x.png" });
  assert.deepEqual([saved.body.address, saved.body.inChargeName, saved.body.phone, saved.body.active, saved.body.logoUrl], ["12 School Road, Kurnool", "Sita", "9876543210", true, ""]);
  assert.equal((await as("admin", "put", `/api/inventory/godowns/${ctx.kitchen._id}`).send({ phone: "12" })).body.code, "INVALID_INPUT");
  assert.equal((await as("admin", "put", `/api/inventory/godowns/${ctx.kitchen._id}`).send({ name: "  " })).status, 400);
  await as("admin", "put", `/api/inventory/godowns/${ctx.kitchen._id}`).send({ isCentralStore: true });
  const list = (await as("admin", "get", "/api/inventory/godowns")).body;
  assert.deepEqual(list.filter((g) => g.isCentralStore).map((g) => g.name), ["Kitchen A"]);
});

test("signing in records when, and the users list shows it", async () => {
  assert.equal((await as("root", "get", "/api/users").query({ role: "user" })).body.items[0].lastLoginAt, null);
  const before = Date.now();
  assert.equal((await request(app).post("/api/auth/login").send({ email: ctx.cook.user.email, password: ctx.cook.password })).status, 200);
  const seen = (await as("root", "get", "/api/users").query({ role: "user" })).body.items[0].lastLoginAt;
  assert.ok(new Date(seen).getTime() >= before);
});
