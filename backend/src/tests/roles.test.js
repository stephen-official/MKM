import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_ROLES, PRIVILEGED_ROLES, ROLES, expandAllowedRoles, isAdminRole, isKitchenRole, isSuperAdmin
} from "../utils/roles.js";
import { authorize } from "../middleware/auth.js";
import { User } from "../models/User.js";

test("role constants are the exact strings used everywhere", () => {
  assert.deepEqual(ROLES, { SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
  assert.deepEqual([...ALL_ROLES].sort(), ["admin", "super_admin", "user"]);
  assert.deepEqual([...PRIVILEGED_ROLES].sort(), ["admin", "super_admin"]);
});

test("role predicates", () => {
  assert.equal(isSuperAdmin("super_admin"), true);
  assert.equal(isSuperAdmin("admin"), false);
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("super_admin"), true);
  assert.equal(isAdminRole("user"), false);
  assert.equal(isAdminRole(undefined), false);
  assert.equal(isKitchenRole("user"), true);
  assert.equal(isKitchenRole("super_admin"), false);
});

test("expandAllowedRoles adds super_admin only where admin is allowed", () => {
  assert.deepEqual(expandAllowedRoles(["admin"]).sort(), ["admin", "super_admin"]);
  assert.deepEqual(expandAllowedRoles(["user", "admin"]).sort(), ["admin", "super_admin", "user"]);
  assert.deepEqual(expandAllowedRoles(["user"]), ["user"]);
  assert.deepEqual(expandAllowedRoles(["super_admin"]), ["super_admin"]);
});

const run = (middleware, role) => {
  let status = null;
  let nextCalled = false;
  const res = { status: (code) => { status = code; return { json: () => res }; } };
  middleware({ user: role ? { role } : undefined }, res, () => { nextCalled = true; });
  return { status, nextCalled };
};

test("authorize admits super_admin wherever admin is admitted", () => {
  assert.equal(run(authorize(["admin"]), "super_admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), "admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), "user").status, 403);
  assert.equal(run(authorize(["user"]), "super_admin").status, 403);
  assert.equal(run(authorize(["super_admin"]), "admin").status, 403);
  assert.equal(run(authorize(["super_admin"]), "super_admin").nextCalled, true);
  assert.equal(run(authorize(["admin"]), null).status, 403);
});

test("the User model accepts super_admin and rejects unknown roles", () => {
  const ok = new User({ name: "S", email: "s@x.io", passwordHash: "h", role: "super_admin" });
  assert.equal(ok.validateSync(), undefined);
  const bad = new User({ name: "S", email: "s@x.io", passwordHash: "h", role: "owner" });
  assert.ok(bad.validateSync()?.errors?.role);
});
