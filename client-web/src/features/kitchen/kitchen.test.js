import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveDashboardMetrics,
  getStockHealth,
  normalizeDeliveryRecord,
  normalizeSupplyRequests,
} from "./index.js";

test("normalizes both legacy request sources into supply requests", () => {
  const result = normalizeSupplyRequests({
    requests: [{ _id: "request-1", requestType: "stock_request", status: "pending", items: [] }],
    indentRequests: [{ _id: "indent-1", status: "confirmed", items: [] }],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].kind, "supply-request");
});

test("derives a partially received delivery from line quantities", () => {
  const delivery = normalizeDeliveryRecord({
    _id: "indent-1",
    status: "confirmed",
    items: [{ stockItemId: { _id: "rice", name: "Rice" }, qtyBaseUnit: 10, receivedQty: 4 }],
  });
  assert.equal(delivery.status.key, "partially_received");
  assert.equal(delivery.remainingQuantity, 6);
  assert.equal(delivery.canReceive, true);
});

test("shows a mixed admin decision as partially approved", () => {
  const [request] = normalizeSupplyRequests({
    indentRequests: [{
      _id: "indent-2",
      status: "confirmed",
      items: [
        { stockItemId: "rice", qtyBaseUnit: 10, status: "approved" },
        { stockItemId: "oil", qtyBaseUnit: 2, status: "rejected" },
      ],
    }],
  });
  assert.equal(request.status.key, "partially_approved");
  assert.equal(request.approvedQuantity, 10);
});

test("categorizes stock and derives dashboard attention counts", () => {
  assert.equal(getStockHealth({ currentQty: 2, thresholdBaseUnit: 3 }).key, "low");
  const metrics = deriveDashboardMetrics({
    stock: [
      { currentQty: 0, thresholdBaseUnit: 2 },
      { currentQty: 2, thresholdBaseUnit: 3 },
      { currentQty: 8, thresholdBaseUnit: 3 },
    ],
    deliveries: [{ status: { key: "dispatched" } }],
    today: "2026-10-09T12:00:00.000Z",
  });
  assert.equal(metrics.attentionCount, 3);
  assert.equal(metrics.deliveriesToReceive, 1);
});
