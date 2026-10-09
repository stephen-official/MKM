import assert from "node:assert/strict";
import test from "node:test";
import { normalizePositiveItems, userOwnsRequest } from "../routes/indentRequestRoutes.js";

const itemA = "507f1f77bcf86cd799439011";
const itemB = "507f1f77bcf86cd799439012";

test("normalizes and combines duplicate supply request lines", () => {
  assert.deepEqual(
    normalizePositiveItems([
      { stockItemId: itemA, qtyBaseUnit: 2 },
      { stockItemId: itemA, qty: 1.5 },
      { stockItemId: itemB, qtyBaseUnit: 4 },
    ]),
    [
      { stockItemId: itemA, qtyBaseUnit: 3.5 },
      { stockItemId: itemB, qtyBaseUnit: 4 },
    ],
  );
});

test("rejects empty, invalid and non-positive request quantities", () => {
  assert.equal(normalizePositiveItems([]), null);
  assert.equal(normalizePositiveItems([{ stockItemId: "bad", qtyBaseUnit: 1 }]), null);
  assert.equal(normalizePositiveItems([{ stockItemId: itemA, qtyBaseUnit: 0 }]), null);
  assert.equal(normalizePositiveItems([{ stockItemId: itemA, qtyBaseUnit: -1 }]), null);
});

test("requires both the user and kitchen to own a supply request", () => {
  const request = { userId: "user-1", godownId: "kitchen-1" };
  assert.equal(userOwnsRequest(request, { sub: "user-1", godownId: "kitchen-1" }), true);
  assert.equal(userOwnsRequest(request, { sub: "user-2", godownId: "kitchen-1" }), false);
  assert.equal(userOwnsRequest(request, { sub: "user-1", godownId: "kitchen-2" }), false);
});
