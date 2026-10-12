import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { kitchen, makeCtx, stockRequest, supplyRequest, transfer } from "./helpers/fixtures.js";
import { pendingRequestsByKitchen, requestsTransfersSection } from "../executive/sections/requestsTransfers.js";
import { orderStatuses } from "../executive/statuses.js";

let f;
before(startDb);
after(stopDb);
const NOW = new Date("2026-10-13T06:00:00Z");
const ctxFor = (query = {}) => makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query }, { now: NOW });

beforeEach(async () => {
  await clearDb();
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  const C = await kitchen("Kitchen C");
  await stockRequest(A, { status: "pending", createdAt: "2026-10-13T00:00:00Z" });   // 0.25 d
  await stockRequest(A, { status: "pending", createdAt: "2026-10-11T06:00:00Z" });   // 2 d
  await stockRequest(B, { status: "pending", createdAt: "2026-10-01T06:00:00Z" });   // 12 d
  await stockRequest(B, { status: "approved", createdAt: "2026-10-02T06:00:00Z" });
  await stockRequest(B, { status: "approved", createdAt: "2026-10-03T06:00:00Z", requestType: "daily_usage" });
  await stockRequest(A, { status: "rejected", createdAt: "2026-10-04T06:00:00Z" });
  await stockRequest(A, { status: "approved", createdAt: "2026-09-01T06:00:00Z" });   // out of range
  await transfer(A, B, { status: "pending", createdAt: "2026-10-09T06:00:00Z" });     // 4 d
  await transfer(C, B, { status: "accepted", createdAt: "2026-10-05T06:00:00Z" });
  await transfer(B, C, { status: "rejected", createdAt: "2026-10-06T06:00:00Z" });
  await supplyRequest(A, { status: "pending", createdAt: "2026-10-03T05:00:00Z" });
  f = { A, B, C };
});

test("all kitchens", async () => {
  const { kpis, sections } = await requestsTransfersSection(await ctxFor());
  assert.equal(kpis.pendingRequests.value, 3);
  assert.equal(kpis.pendingRequests.details.oldestAgeDays, 12);
  assert.equal(kpis.pendingSupplyRequests.value, 1);
  assert.equal(kpis.openTransfers.value, 1);
  const r = sections.requestsTransfers.requests;
  assert.deepEqual(r.byStatus, [{ status: "pending", count: 1 }, { status: "approved", count: 2 }, { status: "rejected", count: 1 }]);
  assert.equal(r.approvalRate, 66.67);
  assert.deepEqual(r.pendingAgeing.buckets.map((b) => b.count), [1, 1, 0, 1]);
  assert.deepEqual(sections.requestsTransfers.transfers.byStatus, [
    { status: "pending", count: 1 }, { status: "accepted", count: 1 }, { status: "rejected", count: 1 }
  ]);
  assert.deepEqual(sections.requestsTransfers.transfers.openAgeing.buckets.map((b) => b.count), [0, 0, 1, 0]);
});

test("kitchen scope matches sender or receiver for transfers", async () => {
  const { kpis, sections } = await requestsTransfersSection(await ctxFor({ godownId: String(f.C._id) }));
  assert.equal(kpis.pendingRequests.value, 0);
  assert.equal(kpis.pendingRequests.details.oldestAgeDays, null);
  assert.equal(kpis.openTransfers.value, 0);
  assert.equal(sections.requestsTransfers.transfers.byStatus.reduce((s, x) => s + x.count, 0), 2);
  assert.equal(sections.requestsTransfers.requests.approvalRate, null);
});

test("pending requests by kitchen", async () => {
  const map = await pendingRequestsByKitchen(await ctxFor());
  assert.equal(map.get(String(f.A._id)), 2);
  assert.equal(map.get(String(f.B._id)), 1);
});

test("unexpected statuses are reported as other, never dropped", () => {
  assert.deepEqual(orderStatuses(["pending", "approved"], [{ _id: "approved", count: 2 }, { _id: "weird", count: 1 }]), [
    { status: "pending", count: 0 }, { status: "approved", count: 2 }, { status: "other", count: 1 }
  ]);
});
