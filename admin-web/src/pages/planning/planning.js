// Pure helpers for Purchasing › Planning: kitchen orders still being gathered (see docs/COLLABORATIVE_PURCHASE_ORDERS_API.md).

const HOUR = 3_600_000;
// Matches the server's CLOSING_LEAD_MS: a moved closing time stays at least 2 days before needed-by.
export const CLOSING_LEAD_HOURS = 48;
const IST = "Asia/Kolkata";

const time = (value) => (value ? new Date(value).getTime() : Number.NaN);

/** Orders still gathering (open, or closed and not yet approved), the soonest needed first; orders without a date go last. */
export const planningOrders = (orders) => (orders || [])
  .filter((order) => ["open", "closed"].includes(order?.status))
  .sort((a, b) => {
    const [x, y] = [time(a.neededBy), time(b.neededBy)];
    if (Number.isNaN(x) || Number.isNaN(y)) return Number.isNaN(x) - Number.isNaN(y);
    return x - y;
  });

/** An order is named by when it is needed (Anand, 2026-11-03): "Order for Mon 9 Nov"; urgent ones add the time. */
export const orderTitle = (order) => (order?.neededBy ? `Order for ${dayText(order.neededBy, order.emergency)}` : "Order (no date)");

/** The steps an order goes through, as shown on the card's tracker. */
export const ORDER_STEPS = ["Open to join", "Needs approval", "Ordered", "On the way", "Delivered"];
/** Where a Planning order is on the tracker: open → 0, closed (waiting for approval) → 1. */
export const planningStep = (order) => (order?.status === "open" ? 0 : 1);

/** "4 days left", "5 h left", "20 min left" or "Closing now" — the time kitchens still have to join. */
export const timeLeft = (closesAt, now = new Date()) => {
  const minutes = Math.floor((time(closesAt) - now.getTime()) / 60_000);
  if (!(minutes > 0)) return "Closing now";
  if (minutes >= 1440) { const days = Math.floor(minutes / 1440); return `${days} ${days === 1 ? "day" : "days"} left`; }
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h left`;
  return `${minutes} min left`;
};

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/**
 * Every product on the order with its total and each kitchen's part, in base units:
 * [{ id, name, unit, total: "7 kg", parts: ["5", "2"] }] — parts only when more than one kitchen asked for it.
 */
export const allItems = (order) => {
  const byProduct = new Map();
  for (const share of order?.contributions || []) {
    const kitchen = String(share.godownId?._id || share.godownId);
    for (const line of share.items || []) {
      const product = line.stockItemId || {};
      const id = String(product._id || product);
      const entry = byProduct.get(id) || { id, name: product.name || "Product", unit: product.unitId?.symbol || "", total: 0, byKitchen: new Map() };
      const amount = Number(line.qtyBaseUnit) || 0;
      entry.total += amount;
      entry.byKitchen.set(kitchen, (entry.byKitchen.get(kitchen) || 0) + amount);
      byProduct.set(id, entry);
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ byKitchen, ...entry }) => ({
      ...entry,
      total: `${qty(entry.total)} ${entry.unit}`.trim(),
      parts: byKitchen.size > 1 ? [...byKitchen.values()].map(qty) : [],
    }));
};

/** How many kitchens are on the order. */
export const kitchenCount = (order) => (order?.contributions || []).length;

/**
 * The range a super-admin may move the closing time to: from now to 2 days before needed-by.
 * Null when the order is not open or is needed too soon for any change.
 */
export const closingRange = (order, now = new Date()) => {
  if (order?.status !== "open") return null;
  const latest = time(order.neededBy) - CLOSING_LEAD_HOURS * HOUR;
  if (Number.isNaN(latest) || latest <= now.getTime()) return null;
  return { min: now, max: new Date(latest) };
};

// India has no daylight saving, so "+05:30" is always right for business time.
const parts = (value) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
  timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).formatToParts(new Date(value)).map((part) => [part.type, part.value]));

/** A date as the value of <input type="datetime-local">, in India time: "2026-11-06T23:46". */
export const toIstInput = (value) => {
  const p = parts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** The <input type="datetime-local"> value back to an ISO time, read as India time. Null when incomplete. */
export const fromIstInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** "Mon 9 Nov" or, with the time, "Fri 6 Nov, 11:46 pm" — always India time. */
export const dayText = (value, withTime = false) => (value ? new Intl.DateTimeFormat("en-IN", {
  timeZone: IST, weekday: "short", day: "numeric", month: "short", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
}).format(new Date(value)) : "Not set");

const idOf = (ref) => String(ref?._id || ref || "");

/**
 * One kitchen's lines as rows a super-admin can edit. A line ordered in packs is edited as a number of packs
 * (amount), others in the base unit. Approved lines are locked.
 */
export const editableLines = (share) => (share?.items || []).map((line) => ({
  key: `${idOf(line.stockItemId)}:${line.packId || "base"}`,
  stockItemId: idOf(line.stockItemId),
  name: line.stockItemId?.name || "Product",
  unit: line.packId ? line.packName : line.stockItemId?.unitId?.symbol || "",
  packId: line.packId || null,
  packName: line.packName || "",
  packSize: line.packSize || null,
  amount: String(line.packId ? line.packQuantity ?? "" : line.qtyBaseUnit ?? ""),
  approved: Boolean(line.approvedAt),
}));

/** A new row for a product picked from the catalogue, counted in its base unit. */
export const newLine = (product) => ({
  key: `${product._id}:base`, stockItemId: String(product._id), name: product.name, unit: product.unitId?.symbol || "",
  packId: null, packName: "", packSize: null, amount: "", approved: false,
});

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
/** True when every row has an amount above 0 and there is at least one row. */
export const linesReady = (rows) => rows.length > 0 && rows.every((row) => positive(row.amount));

/** The rows as the items list the server takes (PUT /:id/kitchens/:godownId/items). */
export const linesPayload = (rows) => rows.map((row) => (row.packId
  ? { stockItemId: row.stockItemId, packId: row.packId, packName: row.packName, packSize: Number(row.packSize), packQuantity: Number(row.amount), qtyBaseUnit: Number(row.amount) * Number(row.packSize) }
  : { stockItemId: row.stockItemId, qtyBaseUnit: Number(row.amount) }));
