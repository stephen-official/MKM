import assert from "node:assert/strict";
import test from "node:test";
import { computeNextRun, rangeForPreset, validateSchedule } from "../executive/schedule.js";
import { zonedInstant } from "../executive/params.js";

test("zonedInstant converts business wall-clock time to UTC", () => {
  assert.equal(zonedInstant("2026-10-13", "07:30").toISOString(), "2026-10-13T02:00:00.000Z");
  assert.equal(zonedInstant("2026-07-01", "09:00", "Europe/London").toISOString(), "2026-07-01T08:00:00.000Z");
});

test("daily: later today if the time has not passed, else tomorrow", () => {
  const s = { cadence: "daily", time: "07:30" };
  assert.equal(computeNextRun(s, new Date("2026-10-13T01:00:00Z")).toISOString(), "2026-10-13T02:00:00.000Z");
  assert.equal(computeNextRun(s, new Date("2026-10-13T02:00:00Z")).toISOString(), "2026-10-14T02:00:00.000Z", "strictly after");
});

test("weekly and monthly", () => {
  // 2026-10-13 is a Tuesday.
  assert.equal(computeNextRun({ cadence: "weekly", dayOfWeek: 1, time: "08:00" }, new Date("2026-10-13T06:00:00Z")).toISOString(), "2026-10-19T02:30:00.000Z");
  assert.equal(computeNextRun({ cadence: "monthly", dayOfMonth: 1, time: "06:00" }, new Date("2026-10-13T06:00:00Z")).toISOString(), "2026-11-01T00:30:00.000Z");
  assert.equal(computeNextRun({ cadence: "monthly", dayOfMonth: 28, time: "06:00" }, new Date("2027-02-01T00:00:00Z")).toISOString(), "2027-02-28T00:30:00.000Z");
});

test("ranges end yesterday in business time", () => {
  const runAt = new Date("2026-10-13T02:00:00Z"); // 07:30 IST on 13 Oct
  assert.deepEqual(rangeForPreset("last-7-days", runAt), { from: "2026-10-06", to: "2026-10-12" });
  assert.deepEqual(rangeForPreset("last-30-days", runAt), { from: "2026-09-13", to: "2026-10-12" });
  assert.deepEqual(rangeForPreset("previous-month", runAt), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(rangeForPreset("previous-month", new Date("2027-01-01T01:00:00Z")), { from: "2026-12-01", to: "2026-12-31" });
});

test("validation", () => {
  const good = { name: "Weekly", godownId: "all", rangePreset: "last-7-days", cadence: "weekly", dayOfWeek: 1, time: "08:00", recipients: ["A@x.io", "a@x.io", "b@x.io"], format: "xlsx" };
  assert.deepEqual(validateSchedule(good).value.recipients, ["a@x.io", "b@x.io"]);
  const fields = (input) => { try { validateSchedule(input); return null; } catch (e) { return Object.keys(e.fields).sort(); } };
  assert.deepEqual(fields({ ...good, time: "25:00", recipients: [], format: "doc", dayOfWeek: 9 }), ["dayOfWeek", "format", "recipients", "time"]);
  assert.deepEqual(fields({ ...good, cadence: "monthly", dayOfMonth: 31 }), ["dayOfMonth"]);
  assert.deepEqual(fields({ ...good, recipients: Array.from({ length: 21 }, (_, i) => `u${i}@x.io`) }), ["recipients"]);
  assert.deepEqual(fields({ ...good, godownId: "nope" }), ["godownId"]);
  assert.deepEqual(fields({ ...good, recipients: ["a,b@x.io"] }), ["recipients"]);
  assert.deepEqual(fields({ ...good, recipients: ["<a@x.io>", "a@x.io;b@x.io"] }), ["recipients"]);
});
