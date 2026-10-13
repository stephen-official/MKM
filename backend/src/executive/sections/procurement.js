import { Distribution, Indent, IndentRequest, PurchaseOrder } from "../../models/FlowModels.js";
import { round2 } from "../../utils/money.js";
import { addDays } from "../params.js";
import { validPriceExpr } from "../valuation.js";
import { INDENT_STATUSES, SUPPLY_STATUSES, orderStatuses } from "../statuses.js";

const priced = validPriceExpr("$price");

/** Every Distribution document counts once; Distribution.leftovers are never summed. */
export const aggregateDistributions = async (ctx) => {
  const { window } = ctx.params;
  const [result] = await Distribution.aggregate([
    { $match: { createdAt: { $gte: window.start, $lt: window.end } } },
    { $unwind: "$allocations" },
    ...(ctx.scopeIds ? [{ $match: { "allocations.godownId": { $in: ctx.scopeIds } } }] : []),
    { $project: { distributionId: "$_id", godownId: "$allocations.godownId", qty: { $ifNull: ["$allocations.qtyBaseUnit", 0] }, price: "$allocations.unitPrice" } },
    { $match: { qty: { $gt: 0 } } },
    { $addFields: { priced, lineValue: { $cond: [priced, { $multiply: ["$qty", "$price"] }, 0] } } },
    {
      $facet: {
        totals: [
          { $group: { _id: "$distributionId", value: { $sum: "$lineValue" }, unpriced: { $sum: { $cond: ["$priced", 0, 1] } } } },
          { $group: { _id: null, value: { $sum: "$value" }, unpriced: { $sum: "$unpriced" }, distributionCount: { $sum: 1 } } }
        ],
        byKitchen: [{ $group: { _id: "$godownId", value: { $sum: "$lineValue" } } }]
      }
    }
  ]).allowDiskUse(true).option(ctx.aggOptions());
  const totals = result?.totals?.[0] || { value: 0, unpriced: 0, distributionCount: 0 };
  return {
    value: totals.value,
    unpricedAllocationCount: totals.unpriced,
    distributionCount: totals.distributionCount,
    byKitchen: new Map((result?.byKitchen || []).map((r) => [String(r._id), r.value]))
  };
};

export const procurementSection = async (ctx) => {
  const { window, from, to } = ctx.params;
  const options = ctx.aggOptions();
  const inWindow = { $gte: window.start, $lt: window.end };
  const scope = ctx.scopeIds ? { godownId: { $in: ctx.scopeIds } } : {};
  const [dist, supplyRows] = await Promise.all([
    ctx.distributions(),
    IndentRequest.aggregate([{ $match: { createdAt: inWindow, ...scope } }, { $group: { _id: "$status", count: { $sum: 1 } } }]).option(options)
  ]);
  const stockReceived = { value: round2(dist.value), unpricedAllocationCount: dist.unpricedAllocationCount, distributionCount: dist.distributionCount };
  const kpis = { stockReceivedValue: { value: stockReceived.value, details: { unpricedAllocationCount: stockReceived.unpricedAllocationCount, distributionCount: stockReceived.distributionCount } } };
  const base = { stockReceived, supplyRequests: orderStatuses(SUPPLY_STATUSES, supplyRows) };
  if (ctx.scopeIds) return { kpis, sections: { procurement: { scope: "kitchen", ...base } } };

  const [indentRows, [spend], [awaiting]] = await Promise.all([
    Indent.aggregate([{ $match: { createdAt: inWindow } }, { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]).option(options),
    PurchaseOrder.aggregate([
      { $match: { receivedAt: inWindow } },
      {
        $facet: {
          total: [{ $group: { _id: null, value: { $sum: { $ifNull: ["$totalAmount", 0] } }, count: { $sum: 1 } } }],
          daily: [{ $group: { _id: { $dateToString: { date: "$receivedAt", format: "%Y-%m-%d", timezone: ctx.tz } }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]
        }
      }
    ]).option(options),
    PurchaseOrder.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $ifNull: ["$totalAmount", 0] } } } }]).option(options)
  ]);

  const dailyMap = new Map((spend?.daily || []).map((d) => [d._id, d.value]));
  const daily = [];
  for (let day = from; day <= to; day = addDays(day, 1)) daily.push({ date: day, value: round2(dailyMap.get(day) || 0) });
  const spendTotal = spend?.total?.[0] || { value: 0, count: 0 };
  const awaitingTotal = { count: awaiting?.count || 0, value: round2(awaiting?.value || 0) };

  kpis.procurementSpend = { value: round2(spendTotal.value), details: { poCount: spendTotal.count } };
  kpis.poAwaitingDistribution = { value: awaitingTotal.count, details: { value: awaitingTotal.value } };
  return {
    kpis,
    sections: {
      procurement: {
        scope: "all", ...base,
        indents: orderStatuses(INDENT_STATUSES, indentRows).map((r) => ({ ...r, value: round2(r.value) })),
        spend: { value: round2(spendTotal.value), poCount: spendTotal.count, daily },
        awaiting: awaitingTotal
      }
    }
  };
};
