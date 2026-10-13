import { describe, expect, it } from "vitest";
import { effectivePreview, fromTri, overrideChanges, toTri } from "./overrides.js";

describe("override helpers", () => {
  it("maps tri-state values", () => {
    expect(toTri(undefined)).toBe("inherit");
    expect(toTri(true)).toBe("shown");
    expect(toTri(false)).toBe("hidden");
    expect(fromTri("inherit")).toBe(null);
    expect(fromTri("hidden")).toBe(false);
  });
  it("sends only changed keys, using null for inherit", () => {
    expect(overrideChanges({ requests: false }, { requests: "inherit", consumption: "hidden" })).toEqual({ requests: null, consumption: false });
    expect(overrideChanges({ requests: false }, { requests: "hidden" })).toEqual({});
  });
  it("previews effective values: user > kitchen > base", () => {
    expect(effectivePreview({ base: { requests: true }, kitchen: { requests: false }, user: {} }).requests).toBe(false);
    expect(effectivePreview({ base: { requests: true }, kitchen: { requests: false }, user: { requests: true } }).requests).toBe(true);
  });
});
