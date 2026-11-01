import test from "node:test";
import assert from "node:assert/strict";
import { cartFromRecord, correctionForDay, correctionForRecord, historyEntries } from "./corrections.js";

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

test("correctionForRecord: matches edit_usage rows by record id, pending first", () => {
  const rows = [
    { kind: "edit_usage", consumptionId: "c1", status: "rejected", createdAt: "2026-10-27T05:00:00Z", _id: "old" },
    { kind: "edit_usage", consumptionId: "c1", status: "approved", createdAt: "2026-10-27T07:00:00Z", _id: "newer" },
    { kind: "reopen_day", date: "2026-10-27", status: "pending", createdAt: "2026-10-27T08:00:00Z", _id: "day" },
  ];
  assert.equal(correctionForRecord(rows, "c1")._id, "newer");
  assert.equal(correctionForRecord([...rows, { kind: "edit_usage", consumptionId: "c1", status: "pending", createdAt: "2026-10-27T01:00:00Z", _id: "wait" }], "c1")._id, "wait");
  assert.equal(correctionForRecord(rows, "c2"), null);
  assert.equal(correctionForRecord(undefined, "c1"), null);
});

test("cartFromRecord: lines become cart entries in the pack they were counted in; unknown products are reported", () => {
  const products = [
    { _id: "rice", name: "Rice", stockRecordId: "row-rice", packs: [{ _id: "bag", name: "25 kg bag", size: 25 }] },
    { _id: "dal", name: "Dal", stockRecordId: "row-dal", packs: [] },
  ];
  const lines = [
    { stockItemId: { _id: "rice", name: "Rice" }, qtyBaseUnit: 50, packId: "bag", packName: "25 kg bag", packSize: 25, packQuantity: 2 },
    { stockItemId: { _id: "dal" }, qtyBaseUnit: 2 },
    { stockItemId: { _id: "oil", name: "Oil" }, qtyBaseUnit: 1 },
    { stockItemId: "rice", qtyBaseUnit: 0 },
  ];
  const { cart, missing } = cartFromRecord(lines, products);
  assert.deepEqual(cart.map((entry) => [entry._id, entry.requestedQty, entry.packId || null, entry.packSize || null]), [["rice", 2, "bag", 25], ["dal", 2, null, null]]);
  assert.equal(cart[0].stockRecordId, "row-rice");
  assert.deepEqual(missing, ["Oil", "an item"]);
  // A pack the product no longer has: counted in the base unit instead.
  assert.deepEqual(cartFromRecord([lines[0]], [{ ...products[0], packs: [] }]).cart.map((entry) => [entry.requestedQty, entry.packId]), [[50, undefined]]);
  assert.deepEqual(cartFromRecord(), { cart: [], missing: [] });
});
