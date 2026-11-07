import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOrderListParams } from "../modules/collaborative-orders/orderReadService.js";

test("shared-order list parameters have stable defaults and bounds", () => {
  assert.deepEqual(normalizeOrderListParams(), { filter: {}, page: 1, limit: 25 });
  assert.deepEqual(normalizeOrderListParams({ status: "ordered", page: "3", limit: "500" }), {
    filter: { status: "ordered" }, page: 3, limit: 100,
  });
  assert.deepEqual(normalizeOrderListParams({ page: "-2", limit: "0" }), { filter: {}, page: 1, limit: 25 });
});

test("shared-order list parameters reject unknown statuses", () => {
  assert.throws(
    () => normalizeOrderListParams({ status: "delivered" }),
    (error) => error.status === 400 && error.code === "INVALID_INPUT" && error.message === "Invalid status filter",
  );
});
