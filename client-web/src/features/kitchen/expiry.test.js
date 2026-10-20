import test from "node:test";
import assert from "node:assert/strict";
import { EXPIRY_WARNING_DAYS, datedLots, daysUntil, expiryStatus, itemsToUseFirst, needsAttention, sortByExpiry } from "./expiry.js";

const today = "2026-10-20";
const item = (name, expiries) => ({ name, currentQty: 100, expiries });

test("daysUntil counts whole days and goes negative once the date has passed", () => {
  assert.equal(daysUntil("2026-10-23", today), 3);
  assert.equal(daysUntil("2026-10-20", today), 0);
  assert.equal(daysUntil("2026-10-18", today), -2);
  assert.equal(daysUntil("", today), null);
  assert.equal(daysUntil("2026-10-23", "nope"), null);
});

test("datedLots keeps only dated lots with stock, soonest first", () => {
  const lots = datedLots(item("Rice", [
    { date: "2026-12-01", qtyBaseUnit: 80 }, { date: null, qtyBaseUnit: 5 }, { date: "2026-10-23", qtyBaseUnit: 20 }, { date: "2026-10-25", qtyBaseUnit: 0 },
  ]), today);
  assert.deepEqual(lots.map((lot) => [lot.date, lot.qtyBaseUnit, lot.daysLeft]), [["2026-10-23", 20, 3], ["2026-12-01", 80, 42]]);
});

test("an item with nothing dated has no expiry status", () => {
  assert.equal(expiryStatus(item("Salt", []), today).key, "none");
  assert.equal(expiryStatus({ name: "Salt" }, today).key, "none");
  assert.equal(needsAttention(expiryStatus(item("Salt", []), today)), false);
});

test("the soonest lot within the window reads as days left, in plain words", () => {
  assert.deepEqual(
    [["2026-10-20", "Expires today"], ["2026-10-21", "1 day left"], ["2026-10-23", "3 days left"], ["2026-10-27", `${EXPIRY_WARNING_DAYS} days left`]]
      .map(([date]) => expiryStatus(item("Rice", [{ date, qtyBaseUnit: 20 }]), today)).map((s) => [s.key, s.label, s.qtyBaseUnit]),
    [["soon", "Expires today", 20], ["soon", "1 day left", 20], ["soon", "3 days left", 20], ["soon", `${EXPIRY_WARNING_DAYS} days left`, 20]],
  );
});

test("beyond the window the item shows its date but needs no attention", () => {
  const status = expiryStatus(item("Rice", [{ date: "2026-10-28", qtyBaseUnit: 20 }]), today);
  assert.equal(status.key, "later");
  assert.equal(status.label, "Expires Wed, 28 Oct 2026");
  assert.equal(needsAttention(status), false);
});

test("expired stock is critical and adds up every lot past its date", () => {
  const status = expiryStatus(item("Milk", [{ date: "2026-10-19", qtyBaseUnit: 4 }, { date: "2026-10-15", qtyBaseUnit: 6 }, { date: "2026-10-22", qtyBaseUnit: 30 }]), today);
  assert.equal(status.key, "expired");
  assert.equal(status.label, "Expired 5 days ago");
  assert.equal(status.qtyBaseUnit, 10);
  assert.equal(expiryStatus(item("Curd", [{ date: "2026-10-19", qtyBaseUnit: 4 }]), today).label, "Expired yesterday");
});

test("sortByExpiry puts expired and expiring items first, the rest alphabetical", () => {
  const sorted = sortByExpiry([
    item("Wheat", [{ date: "2027-01-01", qtyBaseUnit: 50 }]),
    item("Dal", []),
    item("Rice", [{ date: "2026-10-23", qtyBaseUnit: 20 }]),
    item("Milk", [{ date: "2026-10-19", qtyBaseUnit: 4 }]),
    item("Oil", [{ date: "2026-10-21", qtyBaseUnit: 2 }]),
  ], today);
  assert.deepEqual(sorted.map((entry) => entry.name), ["Milk", "Oil", "Rice", "Dal", "Wheat"]);
});

test("itemsToUseFirst lists only what needs attention", () => {
  const items = [item("Dal", []), item("Rice", [{ date: "2026-10-23", qtyBaseUnit: 20 }]), item("Wheat", [{ date: "2027-01-01", qtyBaseUnit: 50 }])];
  assert.deepEqual(itemsToUseFirst(items, today).map((entry) => entry.name), ["Rice"]);
});
