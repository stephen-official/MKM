import test from "node:test";
import assert from "node:assert/strict";
import { correctionForDay, historyEntries } from "./corrections.js";

const row = (date, status, createdAt, extra = {}) => ({ kind: "reopen_day", date, status, createdAt, ...extra });

test("correctionForDay: a pending ask wins, else the newest decided one, else null", () => {
  const rows = [
    row("2026-10-27", "rejected", "2026-10-27T05:00:00Z", { _id: "old" }),
    row("2026-10-27", "rejected", "2026-10-27T07:00:00Z", { _id: "newer" }),
    row("2026-10-26", "pending", "2026-10-27T08:00:00Z", { _id: "other-day" }),
  ];
  assert.equal(correctionForDay(rows, "2026-10-27")._id, "newer");
  assert.equal(correctionForDay(rows, "2026-10-26")._id, "other-day");
  assert.equal(correctionForDay([...rows, row("2026-10-27", "pending", "2026-10-27T04:00:00Z", { _id: "waiting" })], "2026-10-27")._id, "waiting");
  assert.equal(correctionForDay(rows, "2026-10-25"), null);
  assert.equal(correctionForDay(undefined, "2026-10-25"), null);
});

test("historyEntries: usage records and no-usage marks are one list, newest recorded first", () => {
  const usage = [{ _id: "u1", createdAt: "2026-10-27T06:00:00Z", date: "2026-10-27", items: [{ name: "Rice" }] }];
  const marks = [{ date: "2026-10-26", reason: "holiday", note: "Diwali", createdAt: "2026-10-27T09:00:00Z" }];
  const entries = historyEntries(usage, marks);
  assert.deepEqual(entries.map((entry) => [entry._id, entry.type]), [["none-2026-10-26", "none"], ["u1", "consumption"]]);
  assert.deepEqual(entries[0], { _id: "none-2026-10-26", type: "none", date: "2026-10-26", reason: "holiday", note: "Diwali", historyTime: "2026-10-27T09:00:00Z", items: [] });
  assert.equal(entries[1].historyTime, "2026-10-27T06:00:00Z");
  assert.deepEqual(historyEntries(), []);
});
