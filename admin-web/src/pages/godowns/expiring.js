// Pure helpers behind the Expiring tab on Stock Levels: which kitchen batches are expired or about to expire.
import { todayInBusinessTz } from "../../businessTime.js";

/** Windows the admin can pick; 7 days matches the kitchen app's "use first" banners (client-web features/kitchen/expiry.js). */
export const EXPIRY_WINDOWS = Object.freeze([7, 14, 30]);
export const DEFAULT_EXPIRY_WINDOW = 7;

const DAY_MS = 86_400_000;
const utcOf = (key) => {
  const [year, month, day] = String(key).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

/** Whole days from todayKey to the batch's expiry (an Indian business date); negative once past. */
export const daysLeft = (expiryIso, todayKey = todayInBusinessTz()) =>
  Math.round((utcOf(todayInBusinessTz(new Date(expiryIso))) - utcOf(todayKey)) / DAY_MS);

export const daysLeftLabel = (days) => {
  if (days < 0) return days === -1 ? "Expired yesterday" : `Expired ${-days} days ago`;
  if (days === 0) return "Expires today";
  return days === 1 ? "1 day left" : `${days} days left`;
};

const nameOf = (ref) => String(ref?.name || "");

/** Batches with stock that are already expired or expire within `days`, most urgent first: [{ batch, daysLeft }]. */
export const expiringBatches = (batches = [], { todayKey = todayInBusinessTz(), days = DEFAULT_EXPIRY_WINDOW } = {}) =>
  batches
    .filter((batch) => batch?.expiryDate && Number(batch.remainingQtyBaseUnit) > 0)
    .map((batch) => ({ batch, daysLeft: daysLeft(batch.expiryDate, todayKey) }))
    .filter((row) => row.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft
      || nameOf(a.batch.godownId).localeCompare(nameOf(b.batch.godownId))
      || nameOf(a.batch.stockItemId).localeCompare(nameOf(b.batch.stockItemId)));
