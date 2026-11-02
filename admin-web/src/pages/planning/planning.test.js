import { describe, expect, it } from "vitest";
import { allItems, changeCount, neededByPreview, closingRange, editableLines, fromIstInput, linesPayload, linesReady, newLine, rowChange, stepAmount, orderTitle, planningOrders, planningStep, timeLeft, toIstInput } from "./planning.js";

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

describe("editing a kitchen's lines", () => {
  const share = {
    items: [
      { stockItemId: { _id: "r", name: "Rice", unitId: { symbol: "kg" } }, packId: "p1", packName: "25 kg bag", packSize: 25, packQuantity: 2, qtyBaseUnit: 50, approvedAt: "2026-11-03" },
      { stockItemId: { _id: "d", name: "Dal", unitId: { symbol: "kg" } }, qtyBaseUnit: 4 },
    ],
  };

  it("edits pack lines in packs and other lines in the base unit, approved ones locked", () => {
    const rows = editableLines(share);
    expect(rows.map((row) => [row.name, row.unit, row.amount, row.approved])).toEqual([["Rice", "25 kg bag", "2", true], ["Dal", "kg", "4", false]]);
  });

  it("turns rows back into server lines, packs converted to the base unit", () => {
    const rows = editableLines(share).map((row) => (row.name === "Rice" ? { ...row, amount: "3" } : row));
    const added = { ...newLine({ _id: "o", name: "Oil", unitId: { symbol: "L" } }), amount: "5" };
    const dropped = { ...newLine({ _id: "x", name: "Salt", unitId: { symbol: "kg" } }), removed: true };
    expect(linesPayload([...rows, added, dropped])).toEqual([
      { stockItemId: "r", packId: "p1", packName: "25 kg bag", packSize: 25, packQuantity: 3, qtyBaseUnit: 75 },
      { stockItemId: "d", qtyBaseUnit: 4 },
      { stockItemId: "o", qtyBaseUnit: 5 },
    ]);
  });

  it("is ready only with at least one kept row and every kept amount above 0", () => {
    expect(linesReady([])).toBe(false);
    expect(linesReady([{ amount: "0" }])).toBe(false);
    expect(linesReady([{ amount: "3", removed: true }])).toBe(false);
    expect(linesReady([{ amount: "2.5" }, { amount: "", removed: true }])).toBe(true);
  });

  it("says what each row will show the kitchen, and counts the changes", () => {
    const rows = [
      { amount: "12", original: "10", removed: false },
      { amount: "3", original: "4", removed: false },
      { amount: "5", original: "5", removed: false },
      { amount: "2", original: "2", removed: true },
      { amount: "1", original: null, removed: false },
      { amount: "1", original: null, removed: true },
    ];
    expect(rows.map(rowChange)).toEqual(["up", "down", "same", "removed", "added", "same"]);
    expect(changeCount(rows)).toBe(4);
  });

  it("steps by 1 and never below 1", () => {
    expect(stepAmount("2", 1)).toBe("3");
    expect(stepAmount("2.5", -1)).toBe("1.5");
    expect(stepAmount("1", -1)).toBe("1");
    expect(stepAmount("", 1)).toBe("1");
  });
});

describe("neededByPreview", () => {
  const settings = { emergencyHours: 1, neededInOptions: [{ key: "1d", hours: 24 }, { key: "1w", hours: 168 }] };
  it("adds the chosen option's hours, or the emergency period, to now", () => {
    expect(neededByPreview("1w", settings, now).toISOString()).toBe(at(168));
    expect(neededByPreview("urgent", settings, now).toISOString()).toBe(at(1));
    expect(neededByPreview("", settings, now)).toBeNull();
    expect(neededByPreview("9y", settings, now)).toBeNull();
  });
});
