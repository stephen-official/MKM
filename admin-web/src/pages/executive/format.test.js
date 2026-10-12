import { describe, expect, it } from "vitest";
import { filenameFromDisposition, formatCount, formatDays, formatMoney, formatPct, formatQty } from "./format.js";

describe("format", () => {
  it("money uses rupees with Indian grouping and two decimals", () => {
    expect(formatMoney(123456.7)).toBe("₹1,23,456.70");
    expect(formatMoney(-10)).toBe("-₹10.00");
    expect(formatMoney(null)).toBe("—");
  });
  it("counts, quantities, percentages, ages", () => {
    expect(formatCount(1234567)).toBe("12,34,567");
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatPct(468.13)).toBe("+468.1%");
    expect(formatPct(-3.04)).toBe("-3.0%");
    expect(formatPct(null)).toBe("—");
    expect(formatDays(0.25)).toBe("under 1 day");
    expect(formatDays(12)).toBe("12 days");
  });
  it("reads the export filename from Content-Disposition", () => {
    expect(filenameFromDisposition(`attachment; filename="a.xlsx"; filename*=UTF-8''Caf%C3%A9.xlsx`)).toBe("Café.xlsx");
    expect(filenameFromDisposition(`attachment; filename="a.xlsx"`)).toBe("a.xlsx");
    expect(filenameFromDisposition(undefined)).toBe(null);
  });
});
