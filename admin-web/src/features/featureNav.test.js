import { describe, expect, it } from "vitest";
import { buildSections, disabledFeatureForPath, firstAllowedPath, isPathAllowed } from "./featureNav.js";

const all = { products: true, inventory: true, indent: true, "purchase-orders": true, "stock-distribution": true, godowns: true,
  "transfer-stock": true, requests: true, consumption: true, reports: true, "product-ledger": true };

describe("featureNav", () => {
  it("admins lose disabled items and never see the Executive section", () => {
    const sections = buildSections({ flags: { ...all, reports: false }, role: "admin" });
    const paths = sections.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).toContain("/records");
    expect(paths).not.toContain("/executive-report");
    expect(sections.map((s) => s.title)).toEqual(["Workspace"]);
  });
  it("super-admins see everything, disabled items flagged", () => {
    const sections = buildSections({ flags: { ...all, reports: false }, role: "super_admin" });
    const reports = sections.flatMap((s) => s.items).find((i) => i.path === "/records");
    expect(reports.hiddenFromAdmins).toBe(false);
    expect(sections.at(-2).title).toBe("Insights");
    expect(sections.at(-2).items.map((i) => i.path)).toEqual(["/executive-report"]);
    expect(sections.at(-1).title).toBe("Manage");
    expect(sections.at(-1).items.map((i) => i.path)).toEqual(["/administration"]);
  });
  it("empty sections are dropped", () => {
    const flags = { ...all, reports: false, consumption: false, requests: false, "product-ledger": false, "transfer-stock": false };
    const titles = buildSections({ flags, role: "admin" }).map((s) => s.title);
    expect(titles).toEqual(["Workspace"]);
  });
  it("route checks and first allowed path", () => {
    expect(isPathAllowed("/reports", { flags: { ...all, reports: false }, role: "admin" })).toBe(false);
    expect(isPathAllowed("/feature-visibility", { flags: all, role: "admin" })).toBe(false);
    expect(isPathAllowed("/feature-visibility", { flags: all, role: "super_admin" })).toBe(true);
    expect(disabledFeatureForPath("/reports", { flags: { ...all, reports: false }, role: "admin" })).toBe("reports");
    expect(disabledFeatureForPath("/reports", { flags: { ...all, reports: false }, role: "super_admin" })).toBe(null);
    expect(isPathAllowed("/catalog", { flags: { ...all, products: false, inventory: false }, role: "admin" })).toBe(false);
    expect(isPathAllowed("/catalog", { flags: { ...all, inventory: false }, role: "admin" })).toBe(true);
    expect(firstAllowedPath({ flags: { ...all, inventory: false }, role: "admin" })).toBe("/catalog");
    expect(firstAllowedPath({ flags: { ...all, products: false, inventory: false }, role: "admin" })).toBe("/purchasing");
    expect(firstAllowedPath({ flags: Object.fromEntries(Object.keys(all).map((k) => [k, false])), role: "admin" })).toBe("/no-access");
    expect(firstAllowedPath({ flags: null, role: "admin" })).toBe("/catalog");
  });
});
