import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import bcrypt from "bcryptjs";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { ensureSuperAdmin } from "../jobs/create-super-admin.js";
import { User } from "../models/User.js";

before(startDb);
beforeEach(clearDb);
after(stopDb);

const input = { email: "Root@Example.com", name: "Root", password: "Sup3rSecret!" };

test("creates once, then is a no-op", async () => {
  const first = await ensureSuperAdmin(input);
  assert.equal(first.status, "created");
  const second = await ensureSuperAdmin(input);
  assert.equal(second.status, "unchanged");
  assert.equal(await User.countDocuments({ role: "super_admin" }), 1);
  const user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Sup3rSecret!", user.passwordHash), true);
});

test("does not change the password unless asked", async () => {
  await ensureSuperAdmin(input);
  await ensureSuperAdmin({ ...input, password: "Different1!" });
  let user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Sup3rSecret!", user.passwordHash), true);
  const res = await ensureSuperAdmin({ ...input, password: "Different1!", resetPassword: true });
  assert.equal(res.status, "password-reset");
  user = await User.findOne({ email: "root@example.com" });
  assert.equal(await bcrypt.compare("Different1!", user.passwordHash), true);
  assert.equal(user.refreshToken, null);
});

test("refuses to promote an existing account without --promote", async () => {
  await createUser({ role: "admin", email: "root@example.com" });
  await assert.rejects(ensureSuperAdmin(input), (err) => err.code === "ROLE_CONFLICT");
  const res = await ensureSuperAdmin({ ...input, promote: true });
  assert.equal(res.status, "promoted");
  const user = await User.findOne({ email: "root@example.com" });
  assert.equal(user.role, "super_admin");
  assert.equal(user.godownId, null);
  assert.equal(user.refreshToken, null);
});

test("validates input", async () => {
  await assert.rejects(ensureSuperAdmin({ ...input, email: "" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, email: "not-an-email" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, password: "short" }), (err) => err.code === "INVALID_INPUT");
  await assert.rejects(ensureSuperAdmin({ ...input, name: "  " }), (err) => err.code === "INVALID_INPUT");
});
