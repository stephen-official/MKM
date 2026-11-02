import { describe, expect, it } from "vitest";
import { allItems, closingRange, fromIstInput, orderTitle, planningOrders, planningStep, timeLeft, toIstInput } from "./planning.js";

const now = new Date("2026-11-02T12:00:00.000Z");
const at = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();

describe("planningOrders", () => {
  it("keeps only open and closed orders, soonest needed first, undated last", () => {
    const list = [
      { _id: "late", status: "open", neededBy: at(200) },
      { _id: "approved", status: "approved", neededBy: at(1) },
      { _id: "undated", status: "open", neededBy: null },
      { _id: "soon", status: "closed", neededBy: at(10) },
      { _id: "cancelled", status: "cancelled", neededBy: at(2) },
    ];
    expect(planningOrders(list).map((o) => o._id)).toEqual(["soon", "late", "undated"]);
  });
});

describe("orderTitle", () => {
  it("names the order by its needed-by day, with the time when urgent", () => {
    expect(orderTitle({ neededBy: "2026-11-09T06:30:00.000Z" })).toBe("Order for Mon, 9 Nov");
    expect(orderTitle({ neededBy: "2026-11-09T06:30:00.000Z", emergency: true })).toBe("Order for Mon, 9 Nov, 12:00 pm");
    expect(orderTitle({})).toBe("Order (no date)");
  });
});

describe("planningStep and timeLeft", () => {
  it("puts open orders on the first step and closed ones on approval", () => {
    expect(planningStep({ status: "open" })).toBe(0);
    expect(planningStep({ status: "closed" })).toBe(1);
  });

  it("says how long kitchens still have, in whole units", () => {
    expect(timeLeft(at(95), now)).toBe("3 days left");
    expect(timeLeft(at(24), now)).toBe("1 day left");
    expect(timeLeft(at(5.5), now)).toBe("5 h left");
    expect(timeLeft(at(0.25), now)).toBe("15 min left");
    expect(timeLeft(at(-1), now)).toBe("Closing now");
  });
});

describe("allItems", () => {
  it("totals each product across kitchens and shows each kitchen's part", () => {
    const kg = { symbol: "kg" };
    const rice = { _id: "r", name: "Rice", unitId: kg };
    const dal = { _id: "d", name: "Toor Dal", unitId: kg };
    const order = {
      contributions: [
        { godownId: { _id: "a" }, items: [{ stockItemId: rice, qtyBaseUnit: 5 }, { stockItemId: dal, qtyBaseUnit: 3 }] },
        { godownId: { _id: "b" }, items: [{ stockItemId: rice, qtyBaseUnit: 2 }] },
      ],
    };
    expect(allItems(order)).toEqual([
      { id: "r", name: "Rice", unit: "kg", total: "7 kg", parts: ["5", "2"] },
      { id: "d", name: "Toor Dal", unit: "kg", total: "3 kg", parts: [] },
    ]);
  });
});

describe("closingRange", () => {
  it("runs from now to 2 days before needed-by", () => {
    const range = closingRange({ status: "open", neededBy: at(168) }, now);
    expect(range.min).toEqual(now);
    expect(range.max.toISOString()).toBe(at(120));
  });

  it("is null when the order is closed or needed within 2 days", () => {
    expect(closingRange({ status: "closed", neededBy: at(168) }, now)).toBeNull();
    expect(closingRange({ status: "open", neededBy: at(48) }, now)).toBeNull();
    expect(closingRange({ status: "open", neededBy: null }, now)).toBeNull();
  });
});

describe("India-time input values", () => {
  it("round-trip through datetime-local in India time", () => {
    expect(toIstInput("2026-11-06T18:16:54.824Z")).toBe("2026-11-06T23:46");
    expect(fromIstInput("2026-11-06T23:46")).toBe("2026-11-06T18:16:00.000Z");
    expect(fromIstInput("2026-11-06")).toBeNull();
    expect(fromIstInput("")).toBeNull();
  });
});
