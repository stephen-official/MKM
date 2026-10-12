import { Godown } from "../models/InventoryModels.js";
import { createContext, memo, UI_LIMITS } from "./context.js";
import { DEFINITIONS, DEFINITION_BY_ID, HISTORICAL_STOCK_NOTE, UNVALUED_CONSUMPTION_NOTE } from "./definitions.js";
import { aggregateConsumption, consumptionSection } from "./sections/consumption.js";
import { loadStockSnapshot, stockSections } from "./sections/stock.js";
import { aggregateDistributions, procurementSection } from "./sections/procurement.js";
import { pendingRequestsByKitchen, requestsTransfersSection } from "./sections/requestsTransfers.js";
import { comparisonSection } from "./sections/comparison.js";

export class KitchenNotFoundError extends Error {
  constructor() {
    super("That kitchen does not exist.");
    this.status = 404;
    this.code = "KITCHEN_NOT_FOUND";
  }
}

export const KPI_ORDER = Object.freeze([
  "stockValue", "lowStock", "outOfStock", "consumptionValue", "dailyUseLines",
  "pendingRequests", "pendingSupplyRequests", "openTransfers",
  "stockReceivedValue", "procurementSpend", "poAwaitingDistribution"
]);
const ALL_ONLY = new Set(["procurementSpend", "poAwaitingDistribution"]);
const KPI_SOURCE = {
  stockValue: "stock", lowStock: "stock", outOfStock: "stock",
  consumptionValue: "consumption", dailyUseLines: "consumption",
  pendingRequests: "flow", pendingSupplyRequests: "flow", openTransfers: "flow",
  stockReceivedValue: "procurement", procurementSpend: "procurement", poAwaitingDistribution: "procurement"
};
const SECTION_SOURCE = {
  consumptionTrend: "consumption", topItems: "consumption", stockHealth: "stock", unpricedStock: "stock",
  procurement: "procurement", requestsTransfers: "flow"
};

export const resolveKitchen = async (godownId) => {
  if (godownId === "all") return { id: "all", name: "All kitchens", active: null };
  const doc = await Godown.findById(godownId).select("name active").lean();
  if (!doc) throw new KitchenNotFoundError();
  return { id: String(doc._id), name: doc.name, active: doc.active !== false };
};

export const attachLoaders = (ctx) => {
  const { params, tz, scopeIds } = ctx;
  ctx.consumption = memo(() => aggregateConsumption({ scopeIds, from: params.from, to: params.to, window: params.window, tz, options: ctx.aggOptions() }));
  ctx.stock = memo(() => loadStockSnapshot(ctx));
  ctx.distributions = memo(() => aggregateDistributions(ctx));
  ctx.pendingRequestsByKitchen = memo(() => pendingRequestsByKitchen(ctx));
  return ctx;
};

const isTimeout = (error) => error?.code === 50 || error?.codeName === "MaxTimeMSExpired";

export const buildExecutiveReport = async (params, { now = new Date(), limits = UI_LIMITS, maxTimeMS } = {}) => {
  const kitchen = await resolveKitchen(params.godownId);
  const godownDocs = await Godown.find().select("name active").lean();
  const ctx = attachLoaders(createContext({ params, kitchen, godownDocs, now, limits, maxTimeMS }));
  const failures = [];

  const run = async (name, fn) => {
    try {
      return { status: "ok", ...(await fn(ctx)) };
    } catch (error) {
      failures.push({ section: name, code: isTimeout(error) ? "TIMEOUT" : "SECTION_FAILED" });
      console.error(`[executive] section ${name} failed:`, error.message);
      return { status: "error" };
    }
  };

  const [consumption, stock, procurement, flow] = await Promise.all([
    run("consumption", consumptionSection),
    run("stock", stockSections),
    run("procurement", procurementSection),
    run("requestsTransfers", requestsTransfersSection)
  ]);
  const comparison = params.godownId === "all" ? await run("comparison", comparisonSection) : null;
  const sources = { consumption, stock, procurement, flow };

  const kpis = KPI_ORDER
    .filter((id) => params.godownId === "all" || !ALL_ONLY.has(id))
    .map((id) => {
      const def = DEFINITION_BY_ID[id];
      const source = sources[KPI_SOURCE[id]];
      const base = { id, label: def.label, kind: def.kind, format: def.format, estimated: id === "stockValue" };
      if (source.status !== "ok") return { ...base, status: "error", value: null, details: null };
      const kpi = source.kpis[id];
      return { ...base, status: "ok", value: kpi.value, details: kpi.details || null };
    });

  const section = (name) => {
    const source = sources[SECTION_SOURCE[name]];
    return source.status === "ok" ? { status: "ok", data: source.sections[name] } : { status: "error", code: "SECTION_FAILED" };
  };

  return {
    meta: {
      kitchen, from: params.from, to: params.to, days: params.days,
      previous: { from: params.previous.from, to: params.previous.to },
      timezone: params.tz, currency: "INR", generatedAt: now.toISOString(),
      definitions: DEFINITIONS,
      notes: { historicalStock: HISTORICAL_STOCK_NOTE, unvaluedConsumption: UNVALUED_CONSUMPTION_NOTE }
    },
    kpis,
    sections: {
      consumptionTrend: section("consumptionTrend"),
      topItems: section("topItems"),
      stockHealth: section("stockHealth"),
      unpricedStock: section("unpricedStock"),
      procurement: section("procurement"),
      requestsTransfers: section("requestsTransfers"),
      kitchenComparison: comparison === null ? null
        : comparison.status === "ok" ? { status: "ok", data: comparison.sections.kitchenComparison } : { status: "error", code: "SECTION_FAILED" }
    },
    failures
  };
};
