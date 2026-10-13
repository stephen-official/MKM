import { describe, expect, it } from "vitest";
import { applyEdits, describeChange, describeScope, pendingChanges, pruneEdits } from "./diff.js";

const saved = { reports: true, inventory: false };

describe("feature edit diff", () => {
  it("applies edits over saved values", () => {
    expect(applyEdits(saved, { reports: false })).toEqual({ reports: false, inventory: false });
  });
  it("only sends keys that differ from saved", () => {
    expect(pendingChanges(saved, { reports: false, inventory: false })).toEqual({ reports: false });
    expect(pendingChanges(saved, {})).toEqual({});
  });
  it("after a reload, edits equal to the new saved values are dropped", () => {
    expect(pruneEdits({ reports: false, inventory: false }, { reports: false, inventory: true })).toEqual({ inventory: true });
  });
  it("describes audit changes in words", () => {
    expect(describeChange({ key: "reports", previous: true, next: false }, { reports: "Reports" })).toBe("Reports: shown → hidden");
    expect(describeChange({ key: "x", previous: false, next: true }, {})).toBe("x: hidden → shown");
  });
  it("describes cleared and newly set overrides as inherited", () => {
    expect(describeChange({ key: "x", previous: null, next: false }, { x: "X" })).toBe("X: inherited → hidden");
    expect(describeChange({ key: "x", previous: false, next: null }, { x: "X" })).toBe("X: hidden → inherited");
  });
  it("describes audit scopes with names, falling back to ids", () => {
    const names = { kitchen: { k1: "Main Kitchen" }, user: { u1: "Amy" } };
    expect(describeScope({ scope: "global" }, names)).toBe("All admins");
    expect(describeScope({ scope: "kitchen", targetId: "k1" }, names)).toBe("Kitchen: Main Kitchen");
    expect(describeScope({ scope: "user", targetId: "u1" }, names)).toBe("User: Amy");
    expect(describeScope({ scope: "user", targetId: "gone" }, names)).toBe("User: gone");
    expect(describeScope({ scope: "kitchen", targetId: "k2" })).toBe("Kitchen: k2");
  });
});
