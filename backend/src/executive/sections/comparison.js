import { round2 } from "../../utils/money.js";
import { collator, compareIds, paginate } from "../paginate.js";

/** All kitchens only. Rows: active kitchens plus any kitchen (incl. inactive/deleted) with period activity. */
export const comparisonSection = async (ctx) => {
  const [consumption, stock, distributions, pending] = await Promise.all([
    ctx.consumption(), ctx.stock(), ctx.distributions(), ctx.pendingRequestsByKitchen()
  ]);
  const consumptionBy = new Map(consumption.byKitchen.map((r) => [String(r._id), r]));
  const ids = new Set([
    ...ctx.activeIds.map(String),
    ...consumptionBy.keys(),
    ...distributions.byKitchen.keys(),
    ...pending.keys()
  ]);
  const rows = [...ids].map((id) => {
    const known = ctx.godowns.get(id);
    const active = known ? known.active : false;
    return {
      godownId: id,
      kitchen: ctx.kitchenName(id),
      active,
      deleted: !known,
      consumptionValue: round2(consumptionBy.get(id)?.value || 0),
      unvaluedLines: consumptionBy.get(id)?.unvaluedLines || 0,
      lowOrOutOfStock: active ? (stock.perKitchen.get(id)?.lowOrOut || 0) : null,
      pendingRequests: pending.get(id) || 0,
      stockReceivedValue: round2(distributions.byKitchen.get(id) || 0)
    };
  }).sort((a, b) => b.consumptionValue - a.consumptionValue || collator.compare(a.kitchen, b.kitchen) || compareIds(a.godownId, b.godownId));
  return { kpis: {}, sections: { kitchenComparison: paginate(rows, ctx.params.pages.comparison, ctx.limits.comparisonPageSize) } };
};
