import { GodownStock } from "../../models/FlowModels.js";
import { StockItem } from "../../models/InventoryModels.js";
import { round2, round3 } from "../../utils/money.js";
import { kitchenDistributionPrices, purchaseOrderPrices, resolvePrice } from "../valuation.js";
import { collator, compareIds, paginate } from "../paginate.js";

/** Current stock for the scope: "all" = active kitchens only (README Decision 4). */
export const loadStockSnapshot = async (ctx) => {
  const godownIds = ctx.scopeIds || ctx.activeIds;
  const options = ctx.aggOptions();
  const [docs, kitchenMap, poMap] = await Promise.all([
    GodownStock.find({ godownId: { $in: godownIds } })
      .select("godownId stockItemId qtyBaseUnit thresholdBaseUnit").lean().maxTimeMS(ctx.maxTimeMS || 0),
    kitchenDistributionPrices({ godownIds, options }),
    purchaseOrderPrices({ options })
  ]);
  let value = 0;
  const unpriced = [];
  const low = [];
  const out = [];
  const perKitchen = new Map();
  for (const doc of docs) {
    const row = {
      _id: String(doc._id), godownId: String(doc.godownId), stockItemId: String(doc.stockItemId),
      qty: Number(doc.qtyBaseUnit) || 0, threshold: Number(doc.thresholdBaseUnit) || 0
    };
    const counts = perKitchen.get(row.godownId) || { lowOrOut: 0 };
    if (row.qty <= 0) {
      out.push(row);
      counts.lowOrOut += 1;
    } else {
      if (row.threshold > 0 && row.qty <= row.threshold) {
        low.push(row);
        counts.lowOrOut += 1;
      }
      const { price } = resolvePrice(kitchenMap, poMap, row.godownId, row.stockItemId);
      if (price === null) unpriced.push(row);
      else value += row.qty * price;
    }
    perKitchen.set(row.godownId, counts);
  }
  return { value, unpriced, low, out, perKitchen };
};

const itemMeta = async (rows, ctx) => {
  const ids = [...new Set(rows.map((r) => r.stockItemId))];
  const docs = await StockItem.find({ _id: { $in: ids } }).select("name unitId").populate("unitId", "symbol").lean().maxTimeMS(ctx.maxTimeMS || 0);
  return new Map(docs.map((d) => [String(d._id), { item: d.name, unit: d.unitId?.symbol || "" }]));
};

export const stockSections = async (ctx) => {
  const snap = await ctx.stock();
  const meta = await itemMeta([...snap.out, ...snap.low, ...snap.unpriced], ctx);
  const describe = (row) => ({
    id: row._id, godownId: row.godownId, kitchen: ctx.kitchenName(row.godownId),
    stockItemId: row.stockItemId, ...(meta.get(row.stockItemId) || { item: "Deleted item", unit: "" }),
    qty: round3(row.qty)
  });
  const byNames = (a, b) => collator.compare(a.item, b.item) || collator.compare(a.kitchen, b.kitchen) || compareIds(a.id, b.id);

  const outRows = snap.out.map((r) => ({ ...describe(r), threshold: round3(r.threshold), state: "out", ratio: null })).sort(byNames);
  const lowRows = snap.low.map((r) => ({ ...describe(r), threshold: round3(r.threshold), state: "low", ratio: round3(r.qty / r.threshold) }))
    .sort((a, b) => a.ratio - b.ratio || byNames(a, b));
  const unpricedRows = snap.unpriced.map(describe)
    .sort((a, b) => collator.compare(a.kitchen, b.kitchen) || collator.compare(a.item, b.item) || compareIds(a.id, b.id));
  const unpricedQty = round3(snap.unpriced.reduce((sum, r) => sum + r.qty, 0));
  const size = ctx.limits.listPageSize;

  return {
    kpis: {
      stockValue: { value: round2(snap.value), details: { unpricedItemCount: snap.unpriced.length, unpricedQty } },
      lowStock: { value: snap.low.length },
      outOfStock: { value: snap.out.length }
    },
    sections: {
      stockHealth: { ...paginate([...outRows, ...lowRows], ctx.params.pages.health, size), outCount: outRows.length, lowCount: lowRows.length },
      unpricedStock: { ...paginate(unpricedRows, ctx.params.pages.unpriced, size), unpricedQty }
    }
  };
};
