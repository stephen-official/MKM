import { formatDateKey, localDateFromKey, toLocalDateKey } from "../../utils/date.js";

/** Stock expiring within this many days is flagged "use first". The admin's Expiring view defaults to the same window. */
export const EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 86_400_000;

/** Whole days from todayKey to dateKey (negative once past); null when either date is invalid. */
export const daysUntil = (dateKey, todayKey = toLocalDateKey()) => {
  const date = localDateFromKey(dateKey);
  const today = localDateFromKey(todayKey);
  if (!date || !today) return null;
  return Math.round((date - today) / DAY_MS);
};

const quantity = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** The dated lots a kitchen holds of one item, soonest expiry first: [{ date, qtyBaseUnit, daysLeft }]. */
export const datedLots = (item, todayKey = toLocalDateKey()) =>
  (Array.isArray(item?.expiries) ? item.expiries : [])
    .map((lot) => ({ date: lot?.date, qtyBaseUnit: quantity(lot?.qtyBaseUnit), daysLeft: daysUntil(lot?.date, todayKey) }))
    .filter((lot) => lot.daysLeft !== null && lot.qtyBaseUnit > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

const NONE = Object.freeze({ key: "none", tone: "neutral", daysLeft: null, date: null, qtyBaseUnit: 0, label: "" });

const expiredLabel = (daysLeft) => (daysLeft === -1 ? "Expired yesterday" : `Expired ${-daysLeft} days ago`);
const soonLabel = (daysLeft) => (daysLeft === 0 ? "Expires today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`);

/**
 * How urgently an item should be used, from its soonest-expiring lot:
 * expired (already past, quantity = everything past its date) → soon (within warnDays) → later → none (nothing dated).
 */
export const expiryStatus = (item, todayKey = toLocalDateKey(), warnDays = EXPIRY_WARNING_DAYS) => {
  const lots = datedLots(item, todayKey);
  if (!lots.length) return NONE;
  const [soonest] = lots;
  if (soonest.daysLeft < 0) {
    const expiredQty = lots.filter((lot) => lot.daysLeft < 0).reduce((sum, lot) => sum + lot.qtyBaseUnit, 0);
    return { key: "expired", tone: "critical", daysLeft: soonest.daysLeft, date: soonest.date, qtyBaseUnit: expiredQty, label: expiredLabel(soonest.daysLeft) };
  }
  if (soonest.daysLeft <= warnDays) {
    return { key: "soon", tone: "warning", daysLeft: soonest.daysLeft, date: soonest.date, qtyBaseUnit: soonest.qtyBaseUnit, label: soonLabel(soonest.daysLeft) };
  }
  return { key: "later", tone: "neutral", daysLeft: soonest.daysLeft, date: soonest.date, qtyBaseUnit: soonest.qtyBaseUnit, label: `Expires ${formatDateKey(soonest.date)}` };
};

/** True when the item needs a "use first" banner: something expired or expiring within the window. */
export const needsAttention = (status) => status.key === "expired" || status.key === "soon";

/**
 * Items needing attention first, soonest expiry first; everything else keeps alphabetical order so the
 * list does not reshuffle as far-off dates approach.
 */
export const sortByExpiry = (items = [], todayKey = toLocalDateKey(), warnDays = EXPIRY_WARNING_DAYS) => {
  const name = (item) => String(item?.name || "");
  return items
    .map((item, index) => ({ item, index, status: expiryStatus(item, todayKey, warnDays) }))
    .sort((a, b) => {
      const urgentA = needsAttention(a.status);
      const urgentB = needsAttention(b.status);
      if (urgentA !== urgentB) return urgentA ? -1 : 1;
      if (urgentA) return a.status.daysLeft - b.status.daysLeft || name(a.item).localeCompare(name(b.item));
      return name(a.item).localeCompare(name(b.item)) || a.index - b.index;
    })
    .map(({ item }) => item);
};

/** The items a cook should use first, most urgent first (for the Home screen). */
export const itemsToUseFirst = (items = [], todayKey = toLocalDateKey(), warnDays = EXPIRY_WARNING_DAYS) =>
  sortByExpiry(items, todayKey, warnDays).filter((item) => needsAttention(expiryStatus(item, todayKey, warnDays)));
