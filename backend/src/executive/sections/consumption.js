import { Consumption } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { round2, round3 } from "../../utils/money.js";
import { addDays } from "../params.js";
import { compareIds } from "../paginate.js";

export const TOP_LIMIT = 10;
const ISO_DAY = "^\\d{4}-\\d{2}-\\d{2}$";
const collator = new Intl.Collator("en", { sensitivity: "base" });

/** Consumption.date when it is YYYY-MM-DD, else the business date of createdAt. */
export const effectiveDateExpr = (tz) => ({
  $let: {
    vars: { raw: { $convert: { input: "$date", to: "string", onError: "", onNull: "" } } },
    in: {
      $cond: [
        { $regexMatch: { input: "$$raw", regex: ISO_DAY } },
        "$$raw",
        { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: tz } }
      ]
    }
  }
});

/** Index-friendly prefilter: either branch can only over-select; the effective-date match trims it. */
export const consumptionRangeMatch = ({ scopeIds, from, to, window }) => ({
  ...(scopeIds ? { godownId: { $in: scopeIds } } : {}),
  $or: [
    { date: { $gte: from, $lte: to } },
    { createdAt: { $gte: window.start, $lt: window.end } }
  ]
});

// Finite numbers only: NaN sorts below -MAX_VALUE and ±Infinity lies outside it, so all three are unvalued.
const AMOUNT = "$items.amountAtIssue";
const VALUED = { $and: [{ $isNumber: AMOUNT }, { $gte: [AMOUNT, -Number.MAX_VALUE] }, { $lte: [AMOUNT, Number.MAX_VALUE] }] };
const SUMS = {
  value: { $sum: "$amount" },
  unvaluedLines: { $sum: { $cond: ["$valued", 0, 1] } },
  unvaluedQty: { $sum: { $cond: ["$valued", 0, "$qty"] } },
  qty: { $sum: "$qty" },
  lines: { $sum: 1 }
};
const EMPTY_TOTALS = { value: 0, unvaluedLines: 0, unvaluedQty: 0, qty: 0, lines: 0 };

const datedPipeline = (args, tz) => [
  { $match: consumptionRangeMatch(args) },
  { $addFields: { effDate: effectiveDateExpr(tz) } },
  { $match: { effDate: { $gte: args.from, $lte: args.to } } }
];

export const aggregateConsumption = async ({ scopeIds, from, to, window, tz, options = {}, withBreakdowns = true }) => {
  const facet = { totals: [{ $group: { _id: null, ...SUMS } }] };
  if (withBreakdowns) {
    facet.byDate = [{ $group: { _id: "$effDate", ...SUMS } }];
    facet.byItem = [{ $group: { _id: "$stockItemId", ...SUMS } }];
    facet.byKitchen = [{ $group: { _id: "$godownId", ...SUMS } }];
    facet.byKitchenDate = [{ $group: { _id: { godownId: "$godownId", date: "$effDate" }, ...SUMS } }];
  }
  const [result] = await Consumption.aggregate([
    ...datedPipeline({ scopeIds, from, to, window }, tz),
    { $unwind: "$items" },
    {
      $project: {
        godownId: 1, effDate: 1, stockItemId: "$items.stockItemId",
        qty: { $ifNull: ["$items.qtyBaseUnit", 0] },
        valued: VALUED,
        amount: { $cond: [VALUED, "$items.amountAtIssue", 0] }
      }
    },
    { $facet: facet }
  ]).allowDiskUse(true).option(options);
  return {
    totals: result?.totals?.[0] || EMPTY_TOTALS,
    byDate: result?.byDate || [],
    byItem: result?.byItem || [],
    byKitchen: result?.byKitchen || [],
    byKitchenDate: result?.byKitchenDate || []
  };
};

const countDailyUseLines = async ({ scopeIds, from, to, window, tz, options = {} }) => {
  const productIds = await StockItem.find({ itemType: "daily_use" }).distinct("_id");
  if (!productIds.length) return 0;
  const [row] = await Consumption.aggregate([
    ...datedPipeline({ scopeIds, from, to, window }, tz),
    { $unwind: "$items" },
    { $match: { "items.stockItemId": { $in: productIds } } },
    { $group: { _id: null, lines: { $sum: 1 } } }
  ]).option(options);
  return row?.lines || 0;
};

export const rankTopItems = (rows, limit = TOP_LIMIT) => {
  const ranked = rows
    .map((r) => ({ ...r, stockItemId: r._id == null ? null : String(r._id), shown: round2(r.value) }))
    .sort((a, b) =>
      b.shown - a.shown || round3(b.qty) - round3(a.qty) || collator.compare(a.name, b.name) ||
      compareIds(a.stockItemId ?? "", b.stockItemId ?? ""));
  const top = ranked.slice(0, limit);
  const cutoff = top.length === limit ? top[limit - 1].shown : null;
  return {
    items: top.map((r, index) => ({
      rank: index + 1, stockItemId: r.stockItemId, name: r.name, unit: r.unit,
      value: r.shown, qty: round3(r.qty), unvaluedLines: r.unvaluedLines
    })),
    tiedBeyondLimit: cutoff === null ? 0 : ranked.slice(limit).filter((r) => r.shown === cutoff).length,
    unvaluedItemCount: ranked.filter((r) => r.unvaluedLines > 0).length
  };
};

const joinItemNames = async (byItem, options) => {
  const docs = await StockItem.find({ _id: { $in: byItem.map((r) => r._id).filter((id) => id != null) } })
    .select("name unitId").populate("unitId", "symbol").lean().maxTimeMS(options.maxTimeMS || 0);
  const meta = new Map(docs.map((d) => [String(d._id), { name: d.name, unit: d.unitId?.symbol || "" }]));
  // A line with no stockItemId (all such lines share one group) is unknown, not a deleted item.
  const fallback = (id) => (id == null ? { name: "Unknown item", unit: "" } : { name: "Deleted item", unit: "" });
  return byItem.map((r) => ({ ...r, ...(meta.get(String(r._id)) || fallback(r._id)) }));
};

const kitchenTrends = (ctx, current) => {
  if (ctx.params.godownId !== "all") return undefined;
  const totals = new Map(current.byKitchen.map((row) => [String(row._id), row]));
  const daily = new Map();
  for (const row of current.byKitchenDate) {
    const id = String(row._id.godownId);
    if (!daily.has(id)) daily.set(id, new Map());
    daily.get(id).set(row._id.date, row);
  }
  // Show every active kitchen, plus inactive/deleted kitchens that had consumption in the period.
  const ids = new Set([...ctx.activeIds.map(String), ...totals.keys()]);
  return [...ids].map((id) => {
    const known = ctx.godowns.get(id);
    const byDate = daily.get(id) || new Map();
    const points = [];
    for (let day = ctx.params.from; day <= ctx.params.to; day = addDays(day, 1)) {
      const row = byDate.get(day);
      points.push({ date: day, value: round2(row?.value || 0), unvaluedLines: row?.unvaluedLines || 0 });
    }
    return {
      godownId: id,
      kitchen: ctx.kitchenName(id),
      active: known ? known.active : false,
      deleted: !known,
      total: round2(totals.get(id)?.value || 0),
      unvaluedLines: totals.get(id)?.unvaluedLines || 0,
      points
    };
  }).sort((a, b) => b.total - a.total || collator.compare(a.kitchen, b.kitchen) || compareIds(a.godownId, b.godownId));
};

export const consumptionSection = async (ctx) => {
  const { params, tz, scopeIds } = ctx;
  const options = ctx.aggOptions();
  const [current, previous, dailyLines] = await Promise.all([
    ctx.consumption(),
    aggregateConsumption({ scopeIds, from: params.previous.from, to: params.previous.to, window: params.previous.window, tz, options, withBreakdowns: false }),
    countDailyUseLines({ scopeIds, from: params.from, to: params.to, window: params.window, tz, options })
  ]);

  const byDate = new Map(current.byDate.map((r) => [r._id, r]));
  const points = [];
  for (let day = params.from; day <= params.to; day = addDays(day, 1)) {
    const row = byDate.get(day);
    points.push({ date: day, value: round2(row?.value || 0), unvaluedLines: row?.unvaluedLines || 0 });
  }

  const prevValue = previous.totals.value;
  // Zero at display precision counts as zero: a sub-cent previous total would give an absurd percentage.
  const deltaPct = round2(prevValue) === 0 ? null : round2(((current.totals.value - prevValue) / Math.abs(prevValue)) * 100);
  const total = round2(current.totals.value);
  const topItems = rankTopItems(await joinItemNames(current.byItem, options));
  const kitchens = kitchenTrends(ctx, current);

  return {
    kpis: {
      consumptionValue: {
        value: total,
        details: { unvaluedLineCount: current.totals.unvaluedLines, unvaluedQty: round3(current.totals.unvaluedQty), previousValue: round2(prevValue), deltaPct }
      },
      dailyUseLines: { value: dailyLines }
    },
    sections: {
      consumptionTrend: { points, total, previousTotal: round2(prevValue), deltaPct, ...(kitchens ? { kitchens } : {}) },
      topItems
    }
  };
};
