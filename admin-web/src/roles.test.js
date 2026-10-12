import { describe, expect, it } from "vitest";
import { ROLES, isAdminRole, isSuperAdmin } from "./roles.js";

describe("roles", () => {
  it("matches backend role strings", () => {
    expect(ROLES).toEqual({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
  });
  it("treats super_admin as admin-tier", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("admin")).toBe(false);
  });
});
