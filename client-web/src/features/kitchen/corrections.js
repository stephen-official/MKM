// Pure helpers for corrections (a kitchen reporting a mistake that an admin must approve). No imports so node:test can load it.

/** Why a "no usage" day should be reopened. Keep in step with REOPEN_REASONS in backend/src/models/UsageCorrectionModel.js. */
export const REOPEN_REASONS = [["ticked_by_mistake", "Ticked by mistake"], ["stock_was_used", "We did use stock"], ["other", "Other"]];
export const REOPEN_REASON_LABEL = Object.fromEntries(REOPEN_REASONS);

/** Why a day was marked "no usage" (NoUsageDay.reason). */
export const NO_USAGE_REASON_LABEL = { closed: "Closed", holiday: "Holiday", other: "Other" };

/** Status pill wording and tone (waiting = amber, reopened = green, not reopened = rose, like the product-request pills). */
export const CORRECTION_STATUS = {
  pending: { label: "Waiting for the admin", tone: "soon" },
  approved: { label: "Reopened", tone: "routine" },
  rejected: { label: "Not reopened", tone: "expired" },
};

/** The correction that matters for a marked day: the pending one if any, else the newest decided one, else null. */
export const correctionForDay = (corrections = [], date) => {
  const forDay = (corrections || []).filter((row) => row && row.kind === "reopen_day" && row.date === date);
  const pending = forDay.find((row) => row.status === "pending");
  if (pending) return pending;
  return [...forDay].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
};

/**
 * History entries: usage records plus "no usage" marks, newest first by the time they were recorded (what each card shows).
 * A mark becomes { type: "none", date, reason, note, historyTime, items: [] } so the list can render it beside usage cards.
 */
export const historyEntries = (usage = [], marks = []) => {
  const records = (usage || []).map((row) => ({ ...row, type: "consumption", historyTime: row.createdAt }));
  const closed = (marks || []).map((mark) => ({
    _id: `none-${mark.date}`, type: "none", date: mark.date, reason: mark.reason, note: mark.note || "", historyTime: mark.createdAt, items: [],
  }));
  return [...records, ...closed].sort((a, b) => new Date(b.historyTime) - new Date(a.historyTime));
};
