import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { buildReceiptPayload, buildTransactionItems, canRecordUsage, outstandingEntryQuantity, outstandingQuantity } from "./workflows.js";
import { formatDateKey, isSameLocalDate, localDateFromKey, toLocalDateKey } from "../../utils/date.js";
import { isAccessTokenValid } from "../../utils/session.js";

test("uses the local calendar date without UTC conversion", () => {
  const local = new Date(2026, 9, 9, 0, 15);
  assert.equal(toLocalDateKey(local), "2026-10-09");
  assert.equal(toLocalDateKey(localDateFromKey("2026-10-09")), "2026-10-09");
  assert.equal(isSameLocalDate(local, "2026-10-09"), true);
});

test("builds a safe partial receipt and rejects over-receiving", () => {
  const indent = { items: [
    { stockItemId: { _id: "rice" }, status: "approved", qtyBaseUnit: 10, receivedQty: 4 },
    { stockItemId: { _id: "oil" }, status: "rejected", qtyBaseUnit: 5, receivedQty: 0 },
  ] };
  assert.equal(outstandingQuantity(indent.items[0]), 6);
  assert.deepEqual(buildReceiptPayload(indent, { rice: "2.5", oil: "1" }), [{ stockItemId: "rice", receivedQty: 2.5, condition: "good" }]);
  assert.deepEqual(buildReceiptPayload(indent, { rice: "7" }), []);

  const packed = { items: [{ stockItemId: { _id: "flour" }, status: "approved", qtyBaseUnit: 75, receivedQty: 25, packId: "bag", packSize: 25 }] };
  assert.equal(outstandingEntryQuantity(packed.items[0]), 2);
  assert.deepEqual(buildReceiptPayload(packed, { flour: "2" }, { flour: { expiryDate: "2026-12-31", condition: "partial_damage", lotNumber: "LOT-7" } }), [{
    stockItemId: "flour", receivedQty: 50, expiryDate: "2026-12-31", condition: "partial_damage", lotNumber: "LOT-7",
  }]);
});

test("builds valid usage and supply-request transaction lines", () => {
  const stockCart = [{ stockRecordId: "stock-1", _id: "rice", requestedQty: "2.250" }, { _id: "oil", requestedQty: 0 }];
  assert.deepEqual(buildTransactionItems(stockCart), [{ stockItemId: "rice", stockRecordId: "stock-1", qtyBaseUnit: 2.25 }]);
  assert.equal(canRecordUsage(5, 2.25), true);
  assert.equal(canRecordUsage(2, 2.25), false);

  const dailyCart = [{ stockItemId: "meals", qtyBaseUnit: "125" }];
  assert.deepEqual(buildTransactionItems(dailyCart, "daily"), [{ stockItemId: "meals", stockRecordId: undefined, qtyBaseUnit: 125 }]);

  const packed = [{ _id: "rice", requestedQty: "3", packId: "bag", packName: "Bag", packSize: 25 }];
  assert.deepEqual(buildTransactionItems(packed), [{
    stockItemId: "rice", stockRecordId: undefined, qtyBaseUnit: 75,
    packId: "bag", packName: "Bag", packSize: 25, packQuantity: 3,
  }]);
});

test("accepts only an unexpired access token", () => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = (exp) => `${encode({ alg: "none" })}.${encode({ exp })}.signature`;
  assert.equal(isAccessTokenValid(token(2_000), 1_000_000), true);
  assert.equal(isAccessTokenValid(token(500), 1_000_000), false);
  assert.equal(isAccessTokenValid("not-a-token"), false);
});

test("shows dates the Indian way whatever the phone's language", () => {
  assert.equal(formatDateKey("2026-10-18"), "Sun, 18 Oct 2026");
  assert.equal(formatDateKey(""), "");
  assert.equal(formatDateKey("18/10/2026"), "");
});
