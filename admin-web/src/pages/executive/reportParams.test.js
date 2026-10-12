import { describe, expect, it } from "vitest";
import { isDefault, sanitizeReportParams, toApiQuery, toSearchParams } from "./reportParams.js";

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
