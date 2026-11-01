// Pure helpers for corrections (a kitchen asking the admin to change what it recorded). No imports so node:test can load it.

/** Why a day was marked "no usage" (NoUsageDay.reason). */
export const NO_USAGE_REASON_LABEL = { closed: "Closed", holiday: "Holiday", other: "Other" };

/** Status pill wording and tone (waiting = amber, approved = green, not approved = rose, like the product-request pills). */
export const CORRECTION_STATUS = {
  pending: { label: "Waiting for the admin", tone: "soon" },
  approved: { label: "Approved", tone: "routine" },
  rejected: { label: "Not approved", tone: "expired" },
};

/** The correction that matters among `rows`: the pending one if any, else the newest decided one, else null. */
const relevant = (rows) => {
  const pending = rows.find((row) => row.status === "pending");
  if (pending) return pending;
  return [...rows].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
};

/** The correction that matters for a marked day (kind reopen_day). An approved one removed an earlier mark, so it never applies to the current one. */
export const correctionForDay = (corrections = [], date) =>
  relevant((corrections || []).filter((row) => row && row.kind === "reopen_day" && row.date === date && row.status !== "approved"));

/** The correction that matters for a usage record (kind edit_usage). */
export const correctionForRecord = (corrections = [], consumptionId) =>
  relevant((corrections || []).filter((row) => row && row.kind === "edit_usage" && String(row.consumptionId) === String(consumptionId)));

const lineProductId = (line) => String(line?.stockItemId?._id || line?.stockItemId || "");

/**
 * The Record screen's cart pre-filled from a usage record, so the cook edits the lines as they were entered.
 * `products` is the kitchen stock list (ClientStore.items). A line whose product is no longer in the kitchen's stock is
 * left out (it cannot be counted), and `missing` names them so the screen can say so.
 * A line counted in a pack the product still has keeps that pack; otherwise it is counted in the base unit.
 */
export const cartFromRecord = (lines = [], products = []) => {
  const cart = [];
  const missing = [];
  for (const line of lines || []) {
    const product = (products || []).find((candidate) => String(candidate?._id) === lineProductId(line));
    const qty = Number(line?.qtyBaseUnit);
    if (!product || !Number.isFinite(qty) || qty <= 0) { missing.push(line?.stockItemId?.name || line?.name || "an item"); continue; }
    const pack = line.packId ? (product.packs || []).find((candidate) => String(candidate._id) === String(line.packId)) : null;
    const packSize = pack ? Number(pack.size) : 0;
    if (pack && packSize > 0) {
      cart.push({ ...product, packId: pack._id, packName: pack.name, packSize, requestedQty: Number((qty / packSize).toFixed(3)) });
    } else {
      cart.push({ ...product, requestedQty: qty });
    }
  }
  return { cart, missing };
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
