import { describe, expect, it } from "vitest";
import { describeSchedule, parseRecipients } from "./scheduleText.js";

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
});
