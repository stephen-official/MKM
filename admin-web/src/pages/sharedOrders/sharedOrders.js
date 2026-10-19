// Pure helpers for the Shared orders tab (collaborative purchase orders); see docs/COLLABORATIVE_PURCHASE_ORDERS_API.md.

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** Lines, kitchens or the whole order can be approved until the order is approved, ordered or cancelled. */
export const canApprove = (order) => ["open", "closed"].includes(order?.status);
export const canMarkOrdered = (order) => order?.status === "approved";
/** True when every kitchen's share is approved; "Approve all" then only closes the order to new kitchens. */
export const allSharesApproved = (order) =>
  (order?.contributions || []).length > 0 && order.contributions.every((share) => Boolean(share.approvedAt));
// Lines carry their own dispatch and receipt times; shares sent whole before that carry them on the share.
const isSent = (line, share) => Boolean(line?.dispatchedAt || share?.dispatchedAt);
const isReceived = (line, share) => Boolean(line?.deliveredAt || share?.deliveredAt);

/** Each line, each kitchen and the whole order can be dispatched while anything in them is still unsent. */
export const canDispatchLine = (order, line, share) => order?.status === "ordered" && !isSent(line, share);
export const canDispatch = (order, share) => order?.status === "ordered" && (share?.items || []).some((line) => !isSent(line, share));
export const canDispatchAll = (order) => (order?.contributions || []).some((share) => canDispatch(order, share));

/** "Not sent", "On the way" or "Received" for one line. */
export const lineDelivery = (line, share) => (isReceived(line, share) ? "Received" : isSent(line, share) ? "On the way" : "Not sent");

/** One kitchen's progress in plain words, from Requested to Delivered (with Partly dispatched / Partly received). */
export const shareStage = (order, share) => {
  if (order?.status === "cancelled") return "Cancelled";
  const lines = share?.items || [];
  if (share?.deliveredAt) return "Delivered";
  if (lines.some((line) => isReceived(line, share))) return "Partly received";
  if (lines.length && lines.every((line) => isSent(line, share))) return "Dispatched";
  if (lines.some((line) => isSent(line, share))) return "Partly dispatched";
  if (order?.status === "ordered") return "Ordered";
  if (order?.status === "approved" || share?.approvedAt) return "Approved";
  return "Requested";
};

/** "Closes in 2 days 4 h", "Closes in 5 h 30 min", "Closes in 15 min" or "Ordering closed". */
export const closesInText = (closesAt, now = new Date()) => {
  const minutes = Math.floor((new Date(closesAt).getTime() - now.getTime()) / 60_000);
  if (!(minutes > 0)) return "Ordering closed";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `Closes in ${days} ${days === 1 ? "day" : "days"}${hours ? ` ${hours} h` : ""}`;
  if (hours > 0) return `Closes in ${hours} h${mins ? ` ${mins} min` : ""}`;
  return `Closes in ${mins} min`;
};

/** "12.5 kg", or "2 × 25 kg bag (50 kg)" for a line ordered in packs. */
export const lineLabel = (line) => {
  const unit = line?.stockItemId?.unitId?.symbol || "";
  const base = `${qty(line?.qtyBaseUnit)} ${unit}`.trim();
  return line?.packId ? `${qty(line.packQuantity)} × ${line.packName} (${base})` : base;
};
