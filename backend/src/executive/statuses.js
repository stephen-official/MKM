export const INDENT_STATUSES = Object.freeze(["pending", "purchased", "stock_received"]);
export const SUPPLY_STATUSES = Object.freeze(["pending", "confirmed", "partially_received", "received", "rejected"]);
export const REQUEST_STATUSES = Object.freeze(["pending", "approved", "rejected"]);
export const TRANSFER_STATUSES = Object.freeze(["pending", "accepted", "rejected"]);

/** Fixed status order; counts for statuses outside the list are folded into "other". */
export const orderStatuses = (statuses, rows) => {
  const withValue = rows.some((r) => r.value !== undefined);
  const byId = new Map(rows.map((r) => [r._id, r]));
  const shape = (status, count, value) => (withValue ? { status, count, value } : { status, count });
  const out = statuses.map((s) => shape(s, byId.get(s)?.count || 0, byId.get(s)?.value || 0));
  const others = rows.filter((r) => !statuses.includes(r._id));
  if (others.length) {
    out.push(shape("other", others.reduce((s, r) => s + r.count, 0), others.reduce((s, r) => s + (r.value || 0), 0)));
  }
  return out;
};
