import { afterEach, describe, expect, it, vi } from "vitest";
import { eligibleOpeningProducts, emptyOpeningBalance, openingBalanceErrors } from "./openingBalance.js";

describe("opening balances", () => {
  it("requires a complete positive entry", () => {
    expect(Object.keys(openingBalanceErrors({}))).toEqual(["godownId", "stockItemId", "quantityBaseUnit", "effectiveDate", "reason"]);
    expect(openingBalanceErrors({ godownId: "g", stockItemId: "p", quantityBaseUnit: "2", effectiveDate: "2026-10-18", reason: "Counted" })).toEqual({});
  });

  it("only offers priced products without visible stock history", () => {
    const products = [{ _id: "a", pricePerUnit: 10 }, { _id: "b", pricePerUnit: null }, { _id: "c", pricePerUnit: 3 }];
    expect(eligibleOpeningProducts(products, [{ godownId: "g", stockItemId: { _id: "a" } }], [], "g").map((p) => p._id)).toEqual(["c"]);
  });
});

describe("emptyOpeningBalance date", () => {
  afterEach(() => vi.useRealTimers());

  it("defaults to today in India time, not the UTC date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T20:30:00.000Z")); // 02:00 on 18 Oct in India
    expect(emptyOpeningBalance("").effectiveDate).toBe("2026-10-18");
  });
});
