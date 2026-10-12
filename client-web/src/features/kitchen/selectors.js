import { toLocalDateKey } from "../../utils/date.js";

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Categorizes a stock row as out, low, or healthy using its configured threshold. */
export const getStockHealth = (stock = {}) => {
  const quantity = number(stock.currentQty ?? stock.qtyBaseUnit ?? stock.quantity);
  const threshold = Math.max(
    0,
    number(stock.thresholdBaseUnit ?? stock.lowStockThreshold ?? stock.stockItemId?.thresholdBaseUnit),
  );
  const key = quantity <= 0 ? "out" : threshold > 0 && quantity <= threshold ? "low" : "healthy";
  const meta = {
    out: { label: "Out of stock", tone: "critical", priority: 0 },
    low: { label: "Low stock", tone: "warning", priority: 1 },
    healthy: { label: "In stock", tone: "positive", priority: 2 },
  }[key];

  return { key, quantity, threshold, ...meta };
};

export const selectStockByHealth = (stock = [], health) =>
  stock.filter((item) => getStockHealth(item).key === health);

/** Produces the small set of action-oriented counts needed by the kitchen home screen. */
export const deriveDashboardMetrics = ({
  stock = [],
  supplyRequests = [],
  deliveries = [],
  usageEntries = [],
  today = new Date(),
} = {}) => {
  const stockHealth = stock.map(getStockHealth);
  const dateKey = toLocalDateKey(today);
  const usageRecordedToday = usageEntries.some((entry) => {
    const value = entry.date || entry.createdAt;
    return value && String(value).slice(0, 10) === dateKey;
  });

  return {
    totalStockItems: stock.length,
    lowStockItems: stockHealth.filter(({ key }) => key === "low").length,
    outOfStockItems: stockHealth.filter(({ key }) => key === "out").length,
    requestsAwaitingReview: supplyRequests.filter(({ status }) =>
      ["submitted", "pending"].includes(status?.key),
    ).length,
    deliveriesToReceive: deliveries.filter(({ status }) =>
      ["dispatched", "partially_received"].includes(status?.key),
    ).length,
    usageRecordedToday,
    attentionCount:
      stockHealth.filter(({ key }) => key !== "healthy").length +
      deliveries.filter(({ status }) => ["dispatched", "partially_received"].includes(status?.key)).length,
  };
};

