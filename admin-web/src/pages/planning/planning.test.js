import { describe, expect, it } from "vitest";
import { closingRange, fromIstInput, kitchenNames, planningOrders, productSummary, toIstInput } from "./planning.js";

const now = new Date("2026-11-02T12:00:00.000Z");
const at = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();
const line = (name) => ({ stockItemId: { name } });

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

describe("productSummary", () => {
  it("names three products and counts the rest, without repeats", () => {
    const order = { combinedItems: ["Rice", "Dal", "Rice", "Oil", "Sugar", "Salt"].map(line) };
    expect(productSummary(order)).toBe("Rice, Dal, Oil +2 more");
    expect(productSummary({ combinedItems: [line("Rice")] })).toBe("Rice");
    expect(productSummary({})).toBe("No items yet");
  });
});

describe("kitchenNames", () => {
  it("lists the opening kitchen first, each kitchen once", () => {
    const order = {
      createdByGodown: { name: "Junior" },
      contributions: [{ godownId: { name: "Main" } }, { godownId: { name: "Junior" } }],
    };
    expect(kitchenNames(order)).toEqual(["Junior", "Main"]);
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
