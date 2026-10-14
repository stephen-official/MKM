import { describe, expect, it } from "vitest";
import { canFetchReport, customRangeBounds, isDefault, sanitizeReportParams, shouldShowKitchenReset, toApiQuery, toSearchParams } from "./reportParams.js";

const today = "2026-10-13";
const s = (q) => sanitizeReportParams(new URLSearchParams(q), { today });

describe("sanitizeReportParams", () => {
  it("defaults to all kitchens, last 30 days", () => {
    const r = s("");
    expect(r).toMatchObject({ godownId: "all", preset: "30d", from: "2026-09-14", to: "2026-10-13", changed: false, kitchenReset: false });
    expect(isDefault(r)).toBe(true);
  });
  it("presets ignore stray dates", () => {
    expect(s("range=7d&from=2020-01-01&to=2020-01-02")).toMatchObject({ preset: "7d", from: "2026-10-07", to: "2026-10-13", changed: true });
  });
  it("custom ranges are validated and fall back to the default", () => {
    expect(s("range=custom&from=2026-10-01&to=2026-10-05")).toMatchObject({ preset: "custom", from: "2026-10-01", to: "2026-10-05", changed: false });
    expect(s("range=custom&from=2026-10-05&to=2026-10-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2026-10-01&to=2026-10-20")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2025-01-01&to=2026-10-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("range=custom&from=2026-02-30&to=2026-03-01")).toMatchObject({ preset: "30d", changed: true });
    expect(s("from=2026-10-01&to=2026-10-05")).toMatchObject({ preset: "custom", changed: true });
    expect(s("range=yearly")).toMatchObject({ preset: "30d", changed: true });
  });
  it("flags an invalid custom range so the page can say why it fell back", () => {
    expect(s("range=custom&from=2025-01-01&to=2026-10-01").rangeReset).toBe(true);
    expect(s("range=custom&from=2026-10-01&to=2026-10-20").rangeReset).toBe(true);
    expect(s("from=2026-10-05&to=2026-10-01").rangeReset).toBe(true);
    expect(s("range=custom&from=2026-10-01&to=2026-10-05").rangeReset).toBe(false);
    expect(s("range=7d&from=2020-01-01&to=2020-01-02").rangeReset).toBe(false);
    expect(s("").rangeReset).toBe(false);
  });
  it("inherited Object keys are not treated as presets", () => {
    for (const range of ["toString", "constructor", "__proto__"]) {
      let result;
      expect(() => { result = s(`range=${range}`); }).not.toThrow();
      expect(result).toMatchObject({ preset: "30d", from: "2026-09-14", to: "2026-10-13", changed: true });
    }
  });
  it("kitchen ids are checked for shape and existence", () => {
    expect(s("godownId=not-an-id")).toMatchObject({ godownId: "all", kitchenReset: true, changed: true });
    const id = "65f0c0ffee0000000000abcd";
    expect(sanitizeReportParams(new URLSearchParams(`godownId=${id}`), { today })).toMatchObject({ godownId: id, kitchenReset: false });
    expect(sanitizeReportParams(new URLSearchParams(`godownId=${id}`), { today, kitchenIds: new Set(["x"]) })).toMatchObject({ godownId: "all", kitchenReset: true });
  });
  it("pages are positive integers", () => {
    expect(s("healthPage=3&unpricedPage=0&comparisonPage=x").pages).toEqual({ health: 3, unpriced: 1, comparison: 1 });
  });
});

describe("serialisation", () => {
  it("omits defaults from the URL", () => {
    expect(toSearchParams(s("")).toString()).toBe("");
    expect(toSearchParams(s("range=custom&from=2026-10-01&to=2026-10-05&healthPage=2")).toString())
      .toBe("range=custom&from=2026-10-01&to=2026-10-05&healthPage=2");
  });
  it("builds the API query", () => {
    expect(toApiQuery(s("range=7d"))).toEqual({ godownId: "all", from: "2026-10-07", to: "2026-10-13", healthPage: 1, unpricedPage: 1, comparisonPage: 1 });
  });
});

describe("canonical URLs", () => {
  const id = "65f0c0ffee0000000000abcd";
  it("lower-cases an upper-case kitchen id and flags the URL as changed", () => {
    const r = sanitizeReportParams(new URLSearchParams(`godownId=${id.toUpperCase()}`), { today });
    expect(r).toMatchObject({ godownId: id, kitchenReset: false, changed: true });
    expect(toSearchParams(r).toString()).toBe(`godownId=${id}`);
  });
  it("an already lower-case id is canonical", () => {
    expect(sanitizeReportParams(new URLSearchParams(`godownId=${id}`), { today }).changed).toBe(false);
  });
  it("an explicit range=30d and godownId=all are redirected to the bare URL", () => {
    expect(s("range=30d")).toMatchObject({ preset: "30d", changed: true });
    expect(s("godownId=all")).toMatchObject({ godownId: "all", changed: true, kitchenReset: false });
    expect(toSearchParams(s("range=30d&godownId=all")).toString()).toBe("");
  });
  it("other presets stay as they are", () => {
    expect(s("range=90d").changed).toBe(false);
  });
});

describe("customRangeBounds", () => {
  it("limits the pickable dates to a 366-day span ending no later than today", () => {
    expect(customRangeBounds({ from: "2026-10-01", to: "2026-10-05", today })).toEqual({
      fromMin: "2025-10-05", fromMax: "2026-10-05", toMin: "2026-10-01", toMax: "2026-10-13"
    });
  });
  it("every pickable endpoint combination is a valid span", () => {
    const b = customRangeBounds({ from: "2026-01-01", to: "2026-03-01", today });
    expect(s(`range=custom&from=${b.fromMin}&to=2026-03-01`).preset).toBe("custom");
    expect(s(`range=custom&from=2026-01-01&to=${b.toMax}`).preset).toBe("custom");
    expect(customRangeBounds({ from: "2025-10-14", to: "2025-10-20", today }).toMax).toBe(today);
    expect(customRangeBounds({ from: "2025-01-01", to: "2025-01-02", today }).toMax).toBe("2026-01-01");
  });
});

describe("canFetchReport", () => {
  it("all kitchens fetch immediately; a chosen kitchen waits for the list or its failure", () => {
    expect(canFetchReport({ godownId: "all", kitchensSettled: false })).toBe(true);
    expect(canFetchReport({ godownId: "65f0c0ffee0000000000abcd", kitchensSettled: false })).toBe(false);
    expect(canFetchReport({ godownId: "65f0c0ffee0000000000abcd", kitchensSettled: true })).toBe(true);
  });
});

describe("shouldShowKitchenReset", () => {
  it("shows for a fresh reset and after the redirect, but not after a reload (POP)", () => {
    expect(shouldShowKitchenReset({ resetNow: true, locationState: null, navigationType: "POP" })).toBe(true);
    expect(shouldShowKitchenReset({ resetNow: false, locationState: { kitchenReset: true }, navigationType: "REPLACE" })).toBe(true);
    expect(shouldShowKitchenReset({ resetNow: false, locationState: { kitchenReset: true }, navigationType: "POP" })).toBe(false);
    expect(shouldShowKitchenReset({ resetNow: false, locationState: null, navigationType: "PUSH" })).toBe(false);
  });
  it("reads another notice's flag when given its key", () => {
    expect(shouldShowKitchenReset({ resetNow: false, locationState: { rangeReset: true }, navigationType: "REPLACE", key: "rangeReset" })).toBe(true);
    expect(shouldShowKitchenReset({ resetNow: false, locationState: { kitchenReset: true }, navigationType: "REPLACE", key: "rangeReset" })).toBe(false);
  });
});
