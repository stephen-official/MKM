import { addDays } from "../executive/params.js";

/** How far back Home looks for days without usage. */
export const LOOKBACK_DAYS = 30;
export const NO_USAGE_REASONS = ["closed", "holiday", "other"];

/**
 * One row per day, newest first, for the kitchen's Home card. Pure.
 * status: "recorded" (usage entries exist), "none" (marked no usage), "missed" (neither).
 * The range runs from the later of (today - lookback + 1) and the kitchen's first usage date, so a kitchen that has
 * never recorded anything sees only today.
 * @param {{ today: string, firstUsageDate?: string|null, entriesByDate?: Map<string, number>, noUsageByDate?: Map<string, string>, lookback?: number }} input
 */
export const usageDayStatuses = ({ today, firstUsageDate = null, entriesByDate = new Map(), noUsageByDate = new Map(), lookback = LOOKBACK_DAYS }) => {
  const earliest = addDays(today, -(lookback - 1));
  const from = firstUsageDate ? (firstUsageDate > earliest ? firstUsageDate : earliest) : today;
  const days = [];
  for (let date = today; date >= from; date = addDays(date, -1)) {
    const entries = entriesByDate.get(date) || 0;
    const reason = noUsageByDate.get(date);
    days.push({ date, status: entries > 0 ? "recorded" : reason ? "none" : "missed", entries, reason: entries > 0 ? null : reason || null });
  }
  return days;
};
