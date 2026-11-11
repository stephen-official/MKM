import { describe, expect, it } from "vitest";
import { correctionChanges, describeCorrection, longDay } from "./correctionSummary.js";

const line = (stockItemId, name, qtyBaseUnit, unit = "kg") => ({ stockItemId, name, unit, qtyBaseUnit });
const kitchen = { name: "Main Kitchen" };

describe("correctionChanges", () => {
  it("lists changed, removed and added lines against the before snapshot", () => {
    const row = { before: [line("r", "Rice", 10), line("d", "Dal", 2), line("o", "Oil", 1, "L")], items: [line("r", "Rice", 8), line("o", "Oil", 1, "L"), line("s", "Salt", 0.5)] };
    expect(correctionChanges(row)).toEqual([
      { name: "Rice", unit: "kg", before: 10, after: 8, kind: "changed" },
      { name: "Dal", unit: "kg", before: 2, after: null, kind: "removed" },
      { name: "Oil", unit: "L", before: 1, after: 1, kind: "same" },
      { name: "Salt", unit: "kg", before: null, after: 0.5, kind: "added" },
    ]);
  });
});

describe("describeCorrection", () => {
  it("says what a reopen_day ask wants to record", () => {
    const out = describeCorrection({ kind: "reopen_day", date: "2026-10-27", kitchen, items: [line("r", "Rice", 8), line("d", "Dal", 2)] });
    expect(out.title).toBe("Record usage on 27 Oct 2026 · Main Kitchen");
    expect(out.lines).toEqual([
      '27 Oct 2026 is marked "no usage". Main Kitchen says that was a mistake and stock was used.',
      "Wants to record: Rice 8 kg · Dal 2 kg.",
    ]);
  });
  it("summarises an edit in a few words and caps long lists", () => {
    const before = [line("a", "A", 1), line("b", "B", 1), line("c", "C", 1), line("d", "D", 1), line("e", "E", 1)];
    const out = describeCorrection({ kind: "edit_usage", date: "2026-10-27", kitchen, before, items: [line("a", "A", 2), line("b", "B", 1), line("f", "F", 3, "L")] });
    expect(out.title).toBe("Change usage of 27 Oct 2026 · Main Kitchen");
    expect(out.lines[0]).toBe("A 1 → 2 kg · C removed · D removed · +2 more.");
    expect(out.lines[1]).toBe("5 items before, 3 after (1 unchanged). Stock moves by the difference.");
  });
  it("says when the kitchen wants the whole record cancelled", () => {
    const out = describeCorrection({ kind: "edit_usage", date: "2026-10-27", kitchen, before: [line("r", "Rice", 10)], items: [] });
    expect(out.title).toBe("Cancel usage record of 27 Oct 2026 · Main Kitchen");
    expect(out.lines[0]).toBe("Wants the whole record removed: Rice 10 kg.");
  });
  it("says when the kitchen wants the day marked no usage instead", () => {
    const out = describeCorrection({ kind: "edit_usage", date: "2026-10-27", kitchen, before: [line("r", "Rice", 10)], items: [], noUsageReason: "holiday", note: "Diwali" });
    expect(out.title).toMatch(/^No usage on 27 Oct 2026/);
    expect(out.lines[0]).toMatch(/Holiday: Diwali/);
    expect(out.lines[1]).toMatch(/marks the day "no usage"/);
  });

  it("longDay keeps the business date as written", () => {
    expect(longDay("2026-01-05")).toBe("5 Jan 2026");
    expect(longDay("")).toBe("-");
  });
});
