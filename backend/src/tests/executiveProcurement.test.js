import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { distribution, indent, kitchen, makeCtx, purchaseOrder, seedCatalog, supplyRequest } from "./helpers/fixtures.js";
import { memo } from "../executive/context.js";
import { aggregateDistributions, procurementSection } from "../executive/sections/procurement.js";

let f;
before(startDb);
after(stopDb);
const ctxFor = async (query = {}) => {
  const ctx = await makeCtx({ from: "2026-10-01", to: "2026-10-10", ...query });
  ctx.distributions = memo(() => aggregateDistributions(ctx));
  return ctx;
};

beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Kitchen A");
  const B = await kitchen("Kitchen B");
  // PO for 100 rice @ 40 received in range.
  await purchaseOrder("2026-10-02T05:00:00Z", [[items.Rice, 100, 40]], { status: "distributed" });
  // Original distribution: 60 to A, 40 left over.
  const first = await distribution("2026-10-02T06:00:00Z", [[A, items.Rice, 60, 40]], { leftovers: [{ stockItemId: items.Rice._id, qtyBaseUnit: 0 }] });
  // Leftover redistribution: the 40 go to B. Must not double count.
  await distribution("2026-10-05T06:00:00Z", [[B, items.Rice, 40, 40]], { leftoverSourceId: first._id });
  // Unpriced allocation and a zero-qty allocation (ignored entirely).
  await distribution("2026-10-06T06:00:00Z", [[A, items.Dal, 5, null], [A, items.Dal, 0, 10]]);
  // Out of range.
  await distribution("2026-10-11T06:00:00Z", [[A, items.Rice, 1, 999]]);
  await purchaseOrder("2026-09-01T05:00:00Z", [[items.Dal, 10, 30]], { status: "pending" });
  await purchaseOrder("2026-10-11T05:00:00Z", [[items.Dal, 1, 999]], { status: "pending" });
  await indent({ status: "pending", createdAt: "2026-10-03T05:00:00Z", totalAmount: 500 });
  await indent({ status: "stock_received", createdAt: "2026-10-04T05:00:00Z", totalAmount: 4000 });
  await indent({ status: "pending", createdAt: "2026-09-01T05:00:00Z", totalAmount: 1 });
  await supplyRequest(A, { status: "pending", createdAt: "2026-10-03T05:00:00Z" });
  await supplyRequest(B, { status: "received", createdAt: "2026-10-04T05:00:00Z" });
  f = { items, A, B };
});

test("leftover redistributions are not double-counted", async () => {
  const { kpis, sections } = await procurementSection(await ctxFor());
  assert.equal(kpis.stockReceivedValue.value, 4000);
  assert.equal(kpis.stockReceivedValue.details.unpricedAllocationCount, 1);
  assert.equal(kpis.stockReceivedValue.details.distributionCount, 3);
  assert.equal(sections.procurement.stockReceived.value, 4000);
});

test("all kitchens: spend is received PO value in range; awaiting distribution is current", async () => {
  const { kpis, sections } = await procurementSection(await ctxFor());
  assert.equal(kpis.procurementSpend.value, 4000);
  assert.equal(kpis.procurementSpend.details.poCount, 1);
  assert.equal(kpis.poAwaitingDistribution.value, 2);
  assert.equal(kpis.poAwaitingDistribution.details.value, 1299);
  assert.deepEqual(sections.procurement.indents, [
    { status: "pending", count: 1, value: 500 },
    { status: "purchased", count: 0, value: 0 },
    { status: "stock_received", count: 1, value: 4000 }
  ]);
  assert.equal(sections.procurement.spend.daily.length, 10);
  assert.equal(sections.procurement.spend.daily.find((d) => d.date === "2026-10-02").value, 4000);
});

test("single kitchen: only its received value; no spend KPIs", async () => {
  const a = await procurementSection(await ctxFor({ godownId: String(f.A._id) }));
  assert.equal(a.kpis.stockReceivedValue.value, 2400);
  assert.equal(a.kpis.procurementSpend, undefined);
  assert.equal(a.sections.procurement.scope, "kitchen");
  assert.deepEqual(a.sections.procurement.supplyRequests.find((s) => s.status === "pending"), { status: "pending", count: 1 });
  const b = await procurementSection(await ctxFor({ godownId: String(f.B._id) }));
  assert.equal(b.kpis.stockReceivedValue.value, 1600);
});

test("empty range", async () => {
  const { kpis } = await procurementSection(await ctxFor({ from: "2026-08-01", to: "2026-08-03" }));
  assert.equal(kpis.stockReceivedValue.value, 0);
  assert.equal(kpis.procurementSpend.value, 0);
});
