import { describe, expect, it } from "vitest";
import { lineQuantityLabel, packagingLine } from "./procurementPackaging.js";

const rice = { unitId: { symbol: "kg" }, soldInPacks: true, packs: [{ _id: "bag", name: "Bag", size: 25, price: 1450 }] };

describe("procurement packaging", () => {
  it("converts pack counts and prices to authoritative base-unit values", () => {
    expect(packagingLine(rice, "bag", 3, 1500)).toEqual({
      qtyBaseUnit: 75, unitPrice: 60, amount: 4500, packId: "bag", packName: "Bag",
      packSize: 25, packQuantity: 3, packPrice: 1500,
    });
  });

  it("keeps base-unit entry compatible", () => {
    expect(packagingLine(rice, "base", 4, 58)).toEqual({ qtyBaseUnit: 4, unitPrice: 58, amount: 232 });
    expect(lineQuantityLabel({ packId: "bag", packName: "Bag", packQuantity: 3, orderedQty: 75 }, "kg")).toBe("3 Bag (75 kg)");
  });
});
