import { describe, expect, it } from "vitest";
import { ROLES, isAdminRole, isKitchenRole, isSuperAdmin } from "./roles.js";

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
  it("rejects undefined and unknown role strings", () => {
    for (const bad of [undefined, null, "", "superadmin", "Admin", "SUPER_ADMIN", "kitchen"]) {
      expect(isAdminRole(bad)).toBe(false);
      expect(isSuperAdmin(bad)).toBe(false);
      expect(isKitchenRole(bad)).toBe(false);
    }
  });
  it("isSuperAdmin is false for user and null", () => {
    expect(isSuperAdmin("user")).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
  it("isKitchenRole matches only user", () => {
    expect(isKitchenRole("user")).toBe(true);
    expect(isKitchenRole("admin")).toBe(false);
  });
});
