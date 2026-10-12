import { describe, expect, it } from "vitest";
import { applyEdits, describeChange, pendingChanges, pruneEdits } from "./diff.js";

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
});
