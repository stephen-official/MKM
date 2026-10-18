import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ORDERING_SETTINGS, closesAtFor, neededByFor } from "../ordering/window.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = new Date("2026-10-18T04:30:00.000Z"); // 10:00 in India
const after = (ms) => new Date(now.getTime() + ms);
const settings = DEFAULT_ORDERING_SETTINGS;

test("needed-by is now plus the chosen option, or the emergency period", () => {
  assert.deepEqual(neededByFor({ neededIn: "3d" }, settings, now), after(3 * DAY));
  assert.deepEqual(neededByFor({ neededIn: "1w" }, settings, now), after(7 * DAY));
  assert.deepEqual(neededByFor({ neededIn: "1m" }, settings, now), after(30 * DAY));
  assert.deepEqual(neededByFor({ emergency: true, neededIn: "1m" }, settings, now), after(1 * HOUR));
});

test("an unknown or missing option gives no date", () => {
  assert.equal(neededByFor({ neededIn: "5y" }, settings, now), null);
  assert.equal(neededByFor({}, settings, now), null);
});

test("far-off orders close 3 days before they are needed", () => {
  assert.deepEqual(closesAtFor(now, after(10 * DAY), settings), after(7 * DAY));
  assert.deepEqual(closesAtFor(now, after(7 * DAY), settings), after(4 * DAY));
});

test("near orders stay open for 25% of the time until they are needed", () => {
  assert.deepEqual(closesAtFor(now, after(3 * DAY), settings), after(18 * HOUR));
  assert.deepEqual(closesAtFor(now, after(1 * DAY), settings), after(6 * HOUR));
  assert.deepEqual(closesAtFor(now, after(5 * HOUR), settings), after(1.25 * HOUR));
  assert.deepEqual(closesAtFor(now, after(1 * HOUR), settings), after(15 * 60_000));
});

test("the admin's figures replace the defaults", () => {
  const custom = { ...settings, closeBeforeHours: 24, minOpenShare: 0.5, emergencyHours: 2 };
  assert.deepEqual(closesAtFor(now, after(10 * DAY), custom), after(9 * DAY));
  assert.deepEqual(closesAtFor(now, after(1 * DAY), custom), after(12 * HOUR));
  assert.deepEqual(neededByFor({ emergency: true }, custom, now), after(2 * HOUR));
});
