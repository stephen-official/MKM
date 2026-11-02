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

/** Distinct product names across every kitchen on the order. */
export const productNames = (order) =>
  [...new Set((order?.combinedItems || []).map((line) => line.stockItemId?.name).filter(Boolean))];

/** "Rice, Moong Dal, Sugar +2 more" — enough to recognise the order at a glance. */
export const productSummary = (order, shown = 3) => {
  const names = productNames(order);
  if (names.length === 0) return "No items yet";
  const rest = names.length - shown;
  return `${names.slice(0, shown).join(", ")}${rest > 0 ? ` +${rest} more` : ""}`;
};

/** "Main Kitchen, Junior Kitchen" — every kitchen on the order, the one that opened it first. */
export const kitchenNames = (order) => {
  const opener = order?.createdByGodown?.name;
  const names = (order?.contributions || []).map((share) => share.godownId?.name).filter(Boolean);
  return [...new Set([opener, ...names].filter(Boolean))];
};

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
