import assert from "node:assert/strict";
import test from "node:test";
import { round2, round3 } from "../utils/money.js";
import {
  addDays, businessDateOf, daysInclusive, isIsoDate, normalizeBusinessDate, parseReportParams, startOfBusinessDay, windowFor
} from "../executive/params.js";
import { DEFINITIONS } from "../executive/definitions.js";

const NOW = new Date("2026-10-13T06:00:00Z"); // 11:30 IST on 13 Oct

test("round2 rounds half away from zero and never returns -0", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(Object.is(round2(-0.001), 0), true);
  assert.equal(round3(1.0005), 1.001);
  assert.equal(round2(10.075), 10.08);
  assert.equal(round2(-10.075), -10.08);
  assert.equal(round2(1234567.125), 1234567.13);
  assert.equal(round3(2.0005), 2.001);
});

test("ISO date validation rejects impossible dates", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-2-3"), false);
  assert.equal(isIsoDate("Mon Oct 12 2026"), false);
  assert.equal(isIsoDate(undefined), false);
});

test("business day boundaries are in Asia/Kolkata", () => {
  assert.equal(startOfBusinessDay("2026-10-01").toISOString(), "2026-09-30T18:30:00.000Z");
  const w = windowFor("2026-10-01", "2026-10-10");
  assert.equal(w.start.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(w.end.toISOString(), "2026-10-10T18:30:00.000Z");
  assert.equal(businessDateOf(new Date("2026-10-10T18:29:59Z")), "2026-10-10");
  assert.equal(businessDateOf(new Date("2026-10-10T18:30:00Z")), "2026-10-11");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysInclusive("2026-10-01", "2026-10-10"), 10);
});

test("DST zones still get correct midnights", () => {
  assert.equal(startOfBusinessDay("2026-03-29", "Europe/London").toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(startOfBusinessDay("2026-03-30", "Europe/London").toISOString(), "2026-03-29T23:00:00.000Z");
});

test("normalizeBusinessDate keeps plain dates, converts instants to the business date and falls back", () => {
  assert.equal(normalizeBusinessDate("2026-10-12", NOW), "2026-10-12");
  // client-web sends local midnight as an ISO instant: IST 12 Oct 00:00 is 11 Oct 18:30 UTC
  assert.equal(normalizeBusinessDate("2026-10-11T18:30:00.000Z", NOW), "2026-10-12");
  assert.equal(normalizeBusinessDate("2026-10-12T22:00:00.000Z", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate(new Date("2026-10-11T18:30:00.000Z"), NOW), "2026-10-12");
  assert.equal(normalizeBusinessDate("next Monday", NOW, undefined), "2026-10-13");
  assert.equal(normalizeBusinessDate("next Monday", new Date("nope")), businessDateOf(new Date()));
  assert.equal(normalizeBusinessDate("next Monday", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate(null, NOW), "2026-10-13");
});

test("normalizeBusinessDate only trusts ISO-8601 strings and Date objects", () => {
  // Date-time strings with and without zone/seconds are parsed.
  assert.equal(normalizeBusinessDate("2026-10-12T22:00Z", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate("2026-10-11T18:30:00+00:00", NOW), "2026-10-12");
  // Loose strings that Date.parse would happily accept fall back instead.
  assert.equal(normalizeBusinessDate("2026", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate("Oct 5", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate("Oct 5 2026", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate("2026-10", NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate(1760000000000, NOW), "2026-10-13");
  assert.equal(normalizeBusinessDate(new Date("nope"), NOW), "2026-10-13");
  // null / invalid fallback uses now.
  assert.equal(normalizeBusinessDate(null, null), businessDateOf(new Date()));
  assert.equal(normalizeBusinessDate("Oct 5", "garbage"), businessDateOf(new Date()));
});

test("defaults: last 30 days including today, previous period of equal length", () => {
  const p = parseReportParams({}, { now: NOW });
  assert.equal(p.godownId, "all");
  assert.equal(p.to, "2026-10-13");
  assert.equal(p.from, "2026-09-14");
  assert.equal(p.days, 30);
  assert.deepEqual([p.previous.from, p.previous.to], ["2026-08-15", "2026-09-13"]);
  assert.deepEqual(p.pages, { health: 1, unpriced: 1, comparison: 1 });
});

test("parameter errors carry codes", () => {
  const code = (query) => { try { parseReportParams(query, { now: NOW }); return null; } catch (e) { return `${e.status}:${e.code}`; } };
  assert.equal(code({ godownId: "kitchen-1" }), "400:INVALID_KITCHEN");
  assert.equal(code({ godownId: ["a", "b"] }), "400:INVALID_KITCHEN");
  assert.equal(code({ from: "2026-13-01" }), "400:INVALID_DATE");
  assert.equal(code({ from: "1999-12-31", to: "2000-01-05" }), "400:INVALID_DATE");
  assert.equal(code({ to: "2026-10-14" }), "400:FUTURE_DATE");
  assert.equal(code({ from: "2026-10-10", to: "2026-10-01" }), "400:INVALID_RANGE");
  assert.equal(code({ from: "2025-10-12", to: "2026-10-13" }), "400:RANGE_TOO_LONG");
  assert.equal(code({ from: "2025-10-13", to: "2026-10-13" }), null, "366 days inclusive is allowed");
});

test("an explicit `to` near the minimum date clamps the default `from` instead of failing", () => {
  const near = parseReportParams({ to: "2000-01-10" }, { now: NOW });
  assert.equal(near.from, "2000-01-01");
  assert.equal(near.days, 10);
  assert.equal(parseReportParams({ to: "2000-01-30" }, { now: NOW }).from, "2000-01-01");
  assert.equal(parseReportParams({ to: "2000-01-31" }, { now: NOW }).from, "2000-01-02", "no clamp needed once 30 days fit");
  assert.throws(() => parseReportParams({ to: "1999-12-31" }, { now: NOW }), (e) => e.code === "INVALID_DATE");
  assert.throws(() => parseReportParams({ from: "1999-12-31", to: "2000-01-05" }, { now: NOW }), (e) => e.code === "INVALID_DATE");
});

test("page params are lenient", () => {
  const p = parseReportParams({ healthPage: "3", unpricedPage: "-1", comparisonPage: "abc", godownId: "65F0C0FFEE0000000000ABCD" }, { now: NOW });
  assert.deepEqual(p.pages, { health: 3, unpriced: 1, comparison: 1 });
  assert.equal(p.godownId, "65f0c0ffee0000000000abcd");
});

test("definitions state the normative date rules", () => {
  const text = (id) => DEFINITIONS.find((d) => d.id === id).text;
  assert.match(text("procurementSpend"), /received date/);
  assert.match(text("consumptionValue"), /recorded date/);
  assert.match(text("consumptionValue"), /business date it was created/);
  assert.match(text("dailyUseLines"), /business date of creation/);
});

test("every definition has id, label, kind, format and text", () => {
  for (const d of DEFINITIONS) {
    assert.ok(d.id && d.label && d.text, d.id);
    assert.ok(["snapshot", "period"].includes(d.kind), d.id);
    assert.ok(["money", "count"].includes(d.format), d.id);
  }
});
