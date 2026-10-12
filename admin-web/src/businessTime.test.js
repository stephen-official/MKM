import { describe, expect, it } from "vitest";
import { addDays, formatDateTime, todayInBusinessTz } from "./businessTime.js";

describe("businessTime", () => {
  it("computes today in Asia/Kolkata, not the browser zone", () => {
    expect(todayInBusinessTz(new Date("2026-10-12T19:00:00Z"))).toBe("2026-10-13"); // 00:30 IST
    expect(todayInBusinessTz(new Date("2026-10-12T18:00:00Z"))).toBe("2026-10-12"); // 23:30 IST
  });
  it("adds calendar days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("formats instants in IST", () => {
    expect(formatDateTime("2026-10-13T08:35:00Z")).toBe("13/10/2026, 14:05 IST");
    expect(formatDateTime(null)).toBe("—");
  });
});
