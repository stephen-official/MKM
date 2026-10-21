import test from "node:test";
import assert from "node:assert/strict";
import { cleanLabelText, findBatchNumber, findDates, findShelfLife, parseLabel, scanChanges, scanSummary } from "./labelScan.js";

const today = "2026-10-21";
const values = (parsed) => ({ expiry: parsed.expiryDate?.value ?? null, mfg: parsed.mfgDate?.value ?? null, lot: parsed.lotNumber?.value ?? null });

test("month-and-year expiry runs to the end of the month", () => {
  assert.deepEqual(values(parseLabel("EXP 12/2027", today)), { expiry: "2027-12-31", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("Expiry Date: 02-2028", today)), { expiry: "2028-02-29", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("BEST BEFORE END 06/27", today)), { expiry: "2027-06-30", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("Use by MAR 2027", today)), { expiry: "2027-03-31", mfg: null, lot: null });
});

test("day-month-year in the usual Indian spellings", () => {
  for (const text of ["EXP 31 MAR 27", "EXP. 31MAR27", "Exp Date 31-Mar-2027", "EXPIRES ON 31st March 2027", "USE BEFORE 31/03/2027", "Exp: 31.03.27", "BB 2027-03-31"]) {
    assert.equal(parseLabel(text, today).expiryDate?.value, "2027-03-31", text);
  }
});

test("made-on date and batch number come from their own label words", () => {
  const parsed = parseLabel("MFD: 15/09/2026  EXP: 14/09/2027  BATCH NO: B-4471  NET WT 1 kg  MRP Rs. 120.00", today);
  assert.deepEqual(values(parsed), { expiry: "2027-09-14", mfg: "2026-09-15", lot: "B-4471" });
  assert.equal(parsed.expiryDate.from, "EXP: 14/09/2027");
  assert.equal(parsed.mfgDate.from, "MFD: 15/09/2026");
  assert.equal(parsed.lotNumber.from, "BATCH NO: B-4471");
  assert.equal(parsed.expiryDate.guessed, false);
});

test("month-only made-on date starts on the first of the month", () => {
  assert.deepEqual(values(parseLabel("Pkd. 09/2026\nBest before 12/2027", today)), { expiry: "2027-12-31", mfg: "2026-09-01", lot: null });
  assert.equal(parseLabel("Date of manufacture: SEP 2026", today).mfgDate.value, "2026-09-01");
  assert.equal(parseLabel("Manufactured on 15 Sep 2026", today).mfgDate.value, "2026-09-15");
});

test("'best before N months' sets the expiry only when the made-on date was read", () => {
  assert.deepEqual(values(parseLabel("MFG 15/09/2026. Best before 6 months from MFG", today)), { expiry: "2027-03-15", mfg: "2026-09-15", lot: null });
  assert.deepEqual(values(parseLabel("Best before six months from the date of packaging. PKD 31/08/2026", today)), { expiry: "2027-02-28", mfg: "2026-08-31", lot: null });
  assert.deepEqual(values(parseLabel("Best before 90 days from packaging. Packed on 01/10/2026", today)), { expiry: "2026-12-30", mfg: "2026-10-01", lot: null });
  assert.deepEqual(values(parseLabel("Best before 2 years from mfg. MFD 09/2026", today)), { expiry: "2028-09-01", mfg: "2026-09-01", lot: null });
  assert.deepEqual(values(parseLabel("Best before 6 months from MFG", today)), { expiry: null, mfg: null, lot: null });
  assert.deepEqual(findShelfLife("Best before 18 months"), { from: "Best before 18 months", months: 18 });
  assert.equal(findShelfLife("Best before 12/2027"), null);
});

test("a written expiry wins over a best-before phrase", () => {
  assert.equal(parseLabel("MFD 09/2026 Best before 6 months. EXP 02/2027", today).expiryDate.value, "2027-02-28");
});

test("batch numbers in the shapes seen on Indian packs", () => {
  assert.equal(findBatchNumber("Batch No. A2B/0926")?.value, "A2B/0926");
  assert.equal(findBatchNumber("B.No: 4471")?.value, "4471");
  assert.equal(findBatchNumber("LOT 2609K12 MRP 55")?.value, "2609K12");
  assert.equal(findBatchNumber("Lot No.: ab-12 ")?.value, "AB-12");
  assert.equal(findBatchNumber("Batch size 500 units"), null);
  assert.equal(findBatchNumber("Batch No: 09/2026"), null);
  assert.equal(findBatchNumber("No batch here"), null);
});

test("bare dates with no label word are guessed from past or future, and flagged", () => {
  const parsed = parseLabel("15/09/2026   14/09/2027", today);
  assert.deepEqual(values(parsed), { expiry: "2027-09-14", mfg: "2026-09-15", lot: null });
  assert.equal(parsed.expiryDate.guessed, true);
  assert.equal(parsed.mfgDate.guessed, true);
  assert.deepEqual(values(parseLabel("12/2027", today)), { expiry: "2027-12-31", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("09/2026", today)), { expiry: null, mfg: "2026-09-01", lot: null });
});

test("an expired date is kept so the form can flag it; a future made-on date is dropped", () => {
  assert.deepEqual(values(parseLabel("EXP 01/2026", today)), { expiry: "2026-01-31", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("MFD 01/2028", today)), { expiry: null, mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("MFD 09/2027 EXP 09/2026", today)), { expiry: "2026-09-30", mfg: null, lot: null });
  assert.deepEqual(values(parseLabel("MFD 09/2026 EXP 01/2026", today)), { expiry: null, mfg: "2026-09-01", lot: null });
});

test("OCR slips inside numbers are repaired", () => {
  assert.equal(cleanLabelText("EXP 3I/O3/2O27"), "EXP 31/03/2027");
  assert.equal(parseLabel("EXP 3I/O3/2O27", today).expiryDate?.value, "2027-03-31");
  assert.equal(parseLabel("EXP  12 /  2027", today).expiryDate, null); // too broken to read, not a wrong guess
});

test("prices, weights, licence numbers and plain words are not dates or batches", () => {
  for (const text of ["MRP Rs. 120.00 incl. of all taxes", "Net Qty 500 g", "FSSAI Lic. No. 10012345678901", "1/2 tsp per cup", "Serves 4-6 people", "Store in a cool, dry place", "", "   "]) {
    assert.deepEqual(values(parseLabel(text, today)), { expiry: null, mfg: null, lot: null }, text);
  }
  assert.deepEqual(findDates("Lic 10012345678901 code 98/76", today), []);
});

test("imported goods written month-first are still read", () => {
  assert.equal(parseLabel("EXP 03/31/2027", today).expiryDate.value, "2027-03-31");
  assert.deepEqual(findDates("31/31/2027", today), []);
});

test("scanChanges only carries the fields that were found", () => {
  assert.deepEqual(scanChanges(parseLabel("EXP 12/2027", today)), { expiryDate: "2027-12-31" });
  assert.deepEqual(scanChanges(parseLabel("Store cool and dry", today)), {});
  assert.deepEqual(scanChanges(null), {});
  const all = scanChanges(parseLabel("MFD 15/09/2026 EXP 14/09/2027 Batch B-1", today));
  assert.deepEqual(all, { expiryDate: "2027-09-14", mfgDate: "2026-09-15", lotNumber: "B-1" });
});

test("scanSummary lists what was read, in the cook's words", () => {
  const summary = scanSummary(parseLabel("MFD 15/09/2026 EXP 14/09/2027 Batch B-1", today));
  assert.deepEqual(summary.map((row) => [row.label, row.from, row.guessed]), [["Expiry", "EXP 14/09/2027", false], ["Made on", "MFD 15/09/2026", false], ["Batch no.", "Batch B-1", false]]);
  assert.deepEqual(scanSummary(parseLabel("nothing", today)), []);
});
