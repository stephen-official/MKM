import { describe, expect, it } from "vitest";
import { DISABLED_REFRESH_DEBOUNCE_MS, reconcileAudience, shouldRefreshAfterDisabled } from "./featureSync.js";

describe("shouldRefreshAfterDisabled", () => {
  it("refreshes when nothing was loaded yet or the last refresh is at least 2 s old", () => {
    expect(shouldRefreshAfterDisabled(0, 5000)).toBe(true);
    expect(shouldRefreshAfterDisabled(1000, 1000 + DISABLED_REFRESH_DEBOUNCE_MS)).toBe(true);
  });
  it("skips a refresh within 2 s of the last one", () => {
    expect(shouldRefreshAfterDisabled(1000, 1500)).toBe(false);
    expect(shouldRefreshAfterDisabled(1000, 1000 + DISABLED_REFRESH_DEBOUNCE_MS - 1)).toBe(false);
  });
});

describe("reconcileAudience", () => {
  it("does nothing when the audience matches the session role", () => {
    expect(reconcileAudience("super_admin", "super_admin")).toEqual({ type: "none" });
    expect(reconcileAudience("admin", "admin")).toEqual({ type: "none" });
  });
  it("updates the session role when an admin-tier role changed", () => {
    expect(reconcileAudience("admin", "super_admin")).toEqual({ type: "set-role", role: "admin" });
    expect(reconcileAudience("super_admin", "admin")).toEqual({ type: "set-role", role: "super_admin" });
  });
  it("signs out a kitchen or unknown audience", () => {
    expect(reconcileAudience("kitchen", "admin")).toEqual({ type: "sign-out" });
    expect(reconcileAudience(undefined, "admin")).toEqual({ type: "sign-out" });
  });
});
