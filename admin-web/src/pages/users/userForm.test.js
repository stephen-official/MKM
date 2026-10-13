import { describe, expect, it } from "vitest";
import { patchFromForm, validateUserForm } from "./userForm.js";

describe("user form", () => {
  it("validates", () => {
    expect(validateUserForm({ name: "", email: "x", role: "user" })).toEqual({ name: "Enter a name.", email: "Enter a valid email.", godownId: "Choose a kitchen." });
    expect(validateUserForm({ name: "A", email: "a@b.co", role: "super_admin" })).toEqual({ confirmSuperAdmin: "Tick to confirm super-admin access." });
    expect(validateUserForm({ name: "A", email: "a@b.co", role: "admin" })).toEqual({});
  });
  it("sends only changed fields with the version", () => {
    const original = { _id: "1", name: "A", role: "admin", godownId: null, active: true, updatedAt: "t1" };
    expect(patchFromForm(original, { name: "A", role: "user", godownId: "g", active: true })).toEqual({ expectedUpdatedAt: "t1", role: "user", godownId: "g" });
    expect(patchFromForm(original, { name: "B", role: "admin", godownId: "", active: false })).toEqual({ expectedUpdatedAt: "t1", name: "B", active: false });
  });
  it("sends confirmSuperAdmin only when promoting to super_admin", () => {
    const admin = { _id: "1", name: "A", role: "admin", godownId: null, active: true, updatedAt: "t1" };
    expect(patchFromForm(admin, { name: "A", role: "super_admin", godownId: "", active: true, confirmSuperAdmin: true }))
      .toEqual({ expectedUpdatedAt: "t1", role: "super_admin", confirmSuperAdmin: true });
    expect(patchFromForm(admin, { name: "A", role: "user", godownId: "g", active: true, confirmSuperAdmin: true }))
      .not.toHaveProperty("confirmSuperAdmin");
    const sup = { ...admin, role: "super_admin" };
    expect(patchFromForm(sup, { name: "B", role: "super_admin", godownId: "", active: true, confirmSuperAdmin: true }))
      .toEqual({ expectedUpdatedAt: "t1", name: "B" });
  });
});
