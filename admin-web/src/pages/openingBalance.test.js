import { describe, expect, it } from "vitest";
import { eligibleOpeningProducts, openingBalanceErrors } from "./openingBalance.js";

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
