import { describe, expect, it } from "vitest";
import { DEFAULT_EXPIRY_WINDOW, daysLeft, daysLeftLabel, expiringBatches } from "./expiring.js";

const today = "2026-10-20";
const batch = (kitchen, product, expiryDate, remaining = 10) =>
  ({ _id: `${kitchen}-${product}-${expiryDate}`, godownId: { name: kitchen }, stockItemId: { name: product }, expiryDate, remainingQtyBaseUnit: remaining });

describe("expiring stock", () => {
  it("counts days to an Indian business date, whatever instant the expiry was stored as", () => {
    expect(daysLeft("2026-10-23T00:00:00+05:30", today)).toBe(3);
    expect(daysLeft("2026-10-22T18:30:00.000Z", today)).toBe(3); // the same IST midnight, stored in UTC
    expect(daysLeft("2026-10-18T00:00:00.000Z", today)).toBe(-2);
  });

  it("says it in plain words", () => {
    expect([-3, -1, 0, 1, 5].map(daysLeftLabel)).toEqual(["Expired 3 days ago", "Expired yesterday", "Expires today", "1 day left", "5 days left"]);
  });

  it("lists expired and soon-to-expire batches, most urgent first, ignoring empty or undated ones", () => {
    const rows = expiringBatches([
      batch("B kitchen", "Rice", "2026-10-23T00:00:00+05:30"),
      batch("A kitchen", "Oil", "2026-10-23T00:00:00+05:30"),
      batch("A kitchen", "Milk", "2026-10-19T00:00:00+05:30"),
      batch("A kitchen", "Wheat", "2026-12-01T00:00:00+05:30"),
      batch("A kitchen", "Dal", "2026-10-21T00:00:00+05:30", 0),
      { ...batch("A kitchen", "Salt", null) },
    ], { todayKey: today });
    expect(rows.map((row) => [row.batch.stockItemId.name, row.daysLeft])).toEqual([["Milk", -1], ["Oil", 3], ["Rice", 3]]);
    expect(DEFAULT_EXPIRY_WINDOW).toBe(7);
  });

  it("widens with the chosen window", () => {
    const rows = expiringBatches([batch("A", "Wheat", "2026-11-10T00:00:00+05:30")], { todayKey: today, days: 30 });
    expect(rows).toHaveLength(1);
    expect(expiringBatches([batch("A", "Wheat", "2026-11-10T00:00:00+05:30")], { todayKey: today, days: 14 })).toHaveLength(0);
  });
});
