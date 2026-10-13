import mongoose from "mongoose";
import { Godown, StockGroup, StockItem, Unit } from "../../models/InventoryModels.js";
import { Consumption, Distribution, GodownStock, Indent, IndentRequest, PurchaseOrder, Request, Transfer } from "../../models/FlowModels.js";
import { DailyUsage } from "../../models/DailyUsageModel.js";

const { ObjectId } = mongoose.Types;
const DAY = 86_400_000;

// README Decision 8 — replace with real production counts if they are larger.
export const PRODUCTION_SIZE = Object.freeze({
  kitchens: 40, items: 1200, days: 365,
  // Consumption also exists for the 366 days before the benchmark window, so the "previous period" comparison has real data to aggregate.
  previousPeriodDays: 366,
  consumptionsPerKitchenPerDay: 2, linesPerConsumption: 6,
  dailyUsagesPerKitchenPerDay: 1, linesPerDailyUsage: 4,
  indents: 3000,
  distributions: 3000, allocationsPerDistribution: 40,
  purchaseOrders: 1500, linesPerPO: 30,
  requests: 15000, transfers: 6000, supplyRequests: 4000
});

const insertBatches = async (collection, docs, size = 5000) => {
  for (let i = 0; i < docs.length; i += size) await collection.insertMany(docs.slice(i, i + size), { ordered: false });
};

/** Deterministic, fast raw inserts (no Mongoose validation) shaped like real documents. */
export const seedProductionSized = async (size = PRODUCTION_SIZE, end = new Date("2026-10-13T06:00:00Z")) => {
  const group = await StockGroup.create({ name: "Perf group" });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const godowns = Array.from({ length: size.kitchens }, (_, k) => ({ _id: new ObjectId(), name: `Kitchen ${String(k).padStart(3, "0")}`, active: k % 10 !== 9 }));
  const items = Array.from({ length: size.items }, (_, i) => ({ _id: new ObjectId(), name: `Item ${String(i).padStart(5, "0")}`, stockGroupId: group._id, unitId: unit._id, itemType: "stock", defaultThreshold: 0 }));
  await Godown.collection.insertMany(godowns);
  await StockItem.collection.insertMany(items);

  const at = (daysAgo, hour = 6) => new Date(end.getTime() - daysAgo * DAY - hour * 3_600_000);
  const isoDay = (date) => date.toISOString().slice(0, 10);

  await insertBatches(GodownStock.collection, godowns.flatMap((g, gi) => items.map((it, ii) => ({
    godownId: g._id, stockItemId: it._id, qtyBaseUnit: (ii * 7 + gi * 13) % 60 - 3, thresholdBaseUnit: ii % 5 === 0 ? 20 : 0
  }))));

  const consumptions = [];
  const dailyUsages = [];
  for (let d = 0; d < size.days + size.previousPeriodDays; d += 1) {
    for (const [gi, g] of godowns.entries()) {
      for (let u = 0; u < size.dailyUsagesPerKitchenPerDay; u += 1) {
        const createdAt = at(d, u + 3);
        dailyUsages.push({
          godownId: g._id, userId: new ObjectId(), date: (d + gi) % 19 === 0 ? String(createdAt) : isoDay(createdAt), createdAt, updatedAt: createdAt,
          items: Array.from({ length: size.linesPerDailyUsage }, (_, l) => ({ stockItemId: items[(d * 17 + gi * 3 + l) % items.length]._id, qtyBaseUnit: 1 + ((d + l) % 3) }))
        });
      }
      for (let c = 0; c < size.consumptionsPerKitchenPerDay; c += 1) {
        const createdAt = at(d, c + 1);
        consumptions.push({
          godownId: g._id, userId: new ObjectId(), date: (d + gi) % 17 === 0 ? String(createdAt) : isoDay(createdAt), createdAt, updatedAt: createdAt,
          items: Array.from({ length: size.linesPerConsumption }, (_, l) => {
            const it = items[(d * 31 + gi * 7 + l) % items.length];
            const qty = 1 + ((d + l) % 4);
            return (d + l) % 9 === 0
              ? { stockItemId: it._id, qtyBaseUnit: qty }
              : { stockItemId: it._id, qtyBaseUnit: qty, unitPriceAtIssue: 40, amountAtIssue: qty * 40 };
          })
        });
      }
    }
  }
  await insertBatches(Consumption.collection, consumptions);
  await insertBatches(DailyUsage.collection, dailyUsages);

  await insertBatches(Indent.collection, Array.from({ length: size.indents }, (_, n) => {
    const createdAt = at(n % size.days);
    return {
      indentNo: `IND-PERF-${n}`, createdBy: new ObjectId(), status: ["pending", "purchased", "stock_received"][n % 3],
      items: [], totalAmount: 1000 + (n % 40) * 125, createdAt, updatedAt: createdAt
    };
  }));

  await insertBatches(Distribution.collection, Array.from({ length: size.distributions }, (_, n) => {
    const createdAt = at(n % size.days);
    return {
      purchaseOrderId: null, leftoverSourceId: null, createdAt, updatedAt: createdAt, leftovers: [],
      allocations: Array.from({ length: size.allocationsPerDistribution }, (_, a) => ({
        godownId: godowns[(n + a) % godowns.length]._id, stockItemId: items[(n * 3 + a) % items.length]._id,
        qtyBaseUnit: 5 + (a % 10), unitPrice: a % 13 === 0 ? null : 20 + (a % 50)
      }))
    };
  }));

  await insertBatches(PurchaseOrder.collection, Array.from({ length: size.purchaseOrders }, (_, n) => {
    const receivedAt = at(n % size.days);
    const lines = Array.from({ length: size.linesPerPO }, (_, l) => ({ stockItemId: items[(n * 5 + l) % items.length]._id, orderedQty: 10, receivedQty: 10, unitPrice: 30 + (l % 20), amount: 10 * (30 + (l % 20)), status: "approved" }));
    return { indentId: new ObjectId(), items: lines, totalAmount: lines.reduce((s, l) => s + l.amount, 0), receivedAt, status: n % 4 === 0 ? "pending" : "distributed", createdAt: receivedAt, updatedAt: receivedAt };
  }));

  const statuses = ["pending", "approved", "rejected"];
  await insertBatches(Request.collection, Array.from({ length: size.requests }, (_, n) => {
    const createdAt = at(n % size.days);
    return { godownId: godowns[n % godowns.length]._id, userId: new ObjectId(), requestType: "stock_request", targetDate: isoDay(createdAt), reason: "perf", items: [], status: statuses[n % 3], adminDecision: "", createdAt, updatedAt: createdAt };
  }));
  await insertBatches(Transfer.collection, Array.from({ length: size.transfers }, (_, n) => {
    const createdAt = at(n % size.days);
    return { fromGodownId: godowns[n % godowns.length]._id, toGodownId: godowns[(n + 1) % godowns.length]._id, items: [], createdBy: new ObjectId(), status: ["pending", "accepted", "rejected"][n % 3], createdAt, updatedAt: createdAt };
  }));
  await insertBatches(IndentRequest.collection, Array.from({ length: size.supplyRequests }, (_, n) => {
    const createdAt = at(n % size.days);
    return { godownId: godowns[n % godowns.length]._id, userId: new ObjectId(), items: [], note: "", targetDate: null, status: ["pending", "confirmed", "received"][n % 3], createdAt, updatedAt: createdAt };
  }));
  return { godownIds: godowns.map((g) => g._id) };
};
