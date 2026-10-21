import { describe, expect, it } from "vitest";
import { reasonLabel, settleDefaults, settlePayload, shortfallFor, validateSettle } from "./problems.js";

const ticket = { orderedQtyBaseUnit: 100, receivedQtyBaseUnit: 60, stockItemId: { unitId: { symbol: "kg" } } };

describe("delivery problems", () => {
  it("names reasons in plain words", () => {
    expect(reasonLabel("short")).toBe("Less than ordered");
    expect(reasonLabel("wrong_item")).toBe("Wrong item");
    expect(reasonLabel(undefined)).toBe("Problem");
  });

  it("starts by accepting what usably arrived and reordering the rest", () => {
    expect(settleDefaults(ticket)).toEqual({ acceptedQty: "60", reorder: true, note: "" });
    expect(settleDefaults({ ...ticket, receivedQtyBaseUnit: 120 })).toEqual({ acceptedQty: "120", reorder: false, note: "" });
    expect(shortfallFor(ticket, 60)).toBe(100 - 60);
    expect(shortfallFor(ticket, 150)).toBe(0);
  });

  it("refuses accepting more than arrived or a blank quantity", () => {
    expect(validateSettle({ acceptedQty: "60", reorder: true, note: "" }, ticket)).toEqual({});
    expect(validateSettle({ acceptedQty: "", reorder: true, note: "" }, ticket).acceptedQty).toBeTruthy();
    expect(validateSettle({ acceptedQty: "61", reorder: true, note: "" }, ticket).acceptedQty).toMatch(/Only 60 kg/);
    expect(settlePayload({ acceptedQty: " 40 ", reorder: true, note: " Vendor sends rest " })).toEqual({ acceptedQtyBaseUnit: 40, reorderShortfall: true, note: "Vendor sends rest" });
  });
});
