import { describe, expect, it } from "vitest";
import { buildSchedulePayload, describeSchedule, isRemovedKitchen, parseRecipients } from "./scheduleText.js";

describe("schedule text", () => {
  it("describes cadence, time, period, format and recipients", () => {
    expect(describeSchedule({ cadence: "weekly", dayOfWeek: 1, time: "08:00", rangePreset: "last-7-days", format: "xlsx", recipients: ["a", "b"] }))
      .toBe("Every Monday at 08:00 IST · last 7 days · Excel · 2 recipients");
    expect(describeSchedule({ cadence: "monthly", dayOfMonth: 1, time: "06:00", rangePreset: "previous-month", format: "pdf", recipients: ["a"] }))
      .toBe("Monthly on day 1 at 06:00 IST · previous month · PDF · 1 recipient");
    expect(describeSchedule({ cadence: "daily", time: "07:30", rangePreset: "last-30-days", format: "pdf", recipients: ["a"] }))
      .toBe("Every day at 07:30 IST · last 30 days · PDF · 1 recipient");
  });
  it("parses recipient lists", () => {
    expect(parseRecipients("a@x.io, b@x.io;c@x.io\n d@x.io  ")).toEqual(["a@x.io", "b@x.io", "c@x.io", "d@x.io"]);
  });
  describe("buildSchedulePayload", () => {
    const base = { name: "Weekly", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: "2", dayOfMonth: 5, time: "08:00", format: "xlsx", active: true, recipientsText: "a@x.io, b@x.io\nb2@x.io" };
    it("parses recipients, drops the text field and keeps only the weekly day", () => {
      const body = buildSchedulePayload(base);
      expect(body.recipients).toEqual(["a@x.io", "b@x.io", "b2@x.io"]);
      expect(body).not.toHaveProperty("recipientsText");
      expect(body).toMatchObject({ dayOfWeek: 2, dayOfMonth: null, name: "Weekly", active: true });
    });
    it("keeps only the monthly day for monthly and neither for daily", () => {
      expect(buildSchedulePayload({ ...base, cadence: "monthly", dayOfMonth: "15" })).toMatchObject({ dayOfWeek: null, dayOfMonth: 15 });
      expect(buildSchedulePayload({ ...base, cadence: "daily" })).toMatchObject({ dayOfWeek: null, dayOfMonth: null });
    });
    it("sends no recipients for blank text", () => {
      expect(buildSchedulePayload({ ...base, recipientsText: " \n " }).recipients).toEqual([]);
    });
  });
  it("detects a schedule whose kitchen was removed", () => {
    const kitchens = [{ _id: "k1" }, { _id: "k2" }];
    expect(isRemovedKitchen("all", kitchens)).toBe(false);
    expect(isRemovedKitchen("k2", kitchens)).toBe(false);
    expect(isRemovedKitchen("gone", kitchens)).toBe(true);
    expect(isRemovedKitchen("k1", [])).toBe(true);
  });
});
