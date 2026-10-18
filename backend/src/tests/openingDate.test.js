import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOpeningDate } from "../stock/openingDate.js";

// 02:00 on 18 Oct in India is still 17 Oct in UTC.
const earlyIndianMorning = new Date("2026-10-17T20:30:00.000Z");

test("today in business time is accepted even before UTC has reached that date", () => {
  assert.deepEqual(parseOpeningDate("2026-10-18", earlyIndianMorning), new Date("2026-10-17T18:30:00.000Z"));
});

test("tomorrow in business time and malformed dates are refused", () => {
  assert.equal(parseOpeningDate("2026-10-19", earlyIndianMorning), null);
  assert.equal(parseOpeningDate("2026-02-30", earlyIndianMorning), null);
  assert.equal(parseOpeningDate("18/10/2026", earlyIndianMorning), null);
});
