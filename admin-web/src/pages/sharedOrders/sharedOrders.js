// Pure helpers for the Shared orders tab (collaborative purchase orders); see docs/COLLABORATIVE_PURCHASE_ORDERS_API.md.

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** Lines, kitchens or the whole order can be approved until the order is approved, ordered or cancelled. */
export const canApprove = (order) => ["open", "closed"].includes(order?.status);
export const canMarkOrdered = (order) => order?.status === "approved";
/** Supplier and invoice number can be set once the order is approved, and changed after it is ordered. */
export const canSetPurchaseDetails = (order) => ["approved", "ordered"].includes(order?.status);
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

/** "Not sent", "On the way", "Problem raised" or "Received" for one line. */
export const lineDelivery = (line, share) => (isReceived(line, share) ? "Received" : line?.ticketId ? "Problem raised" : isSent(line, share) ? "On the way" : "Not sent");

/** One kitchen's stage as the next thing to do: Needs approval → Place order → Needs to be dispatched → Dispatched → Delivered (plus Incomplete dispatch, Partly received, Problem to settle). */
export const shareStage = (order, share) => {
  if (order?.status === "cancelled") return "Cancelled";
  const lines = share?.items || [];
  if (share?.deliveredAt) return "Delivered";
  if (lines.some((line) => line?.ticketId && !isReceived(line, share))) return "Problem to settle";
  if (lines.some((line) => isReceived(line, share))) return "Partly received";
  if (lines.length && lines.every((line) => isSent(line, share))) return "Dispatched";
  if (lines.some((line) => isSent(line, share))) return "Incomplete dispatch";
  if (order?.status === "ordered") return "Needs to be dispatched";
  if (order?.status === "approved" || share?.approvedAt) return "Place order";
  return "Needs approval";
};

// Most pressing first: a problem or an admin action outranks waiting on a kitchen, which outranks done.
const STAGE_PRIORITY = ["Problem to settle", "Needs approval", "Place order", "Incomplete dispatch", "Needs to be dispatched", "Partly received", "Dispatched", "Delivered"];

/** The whole order's next step, from its kitchens' stages: the most pressing kitchen sets the badge. */
export const orderStage = (order) => {
  if (order?.status === "cancelled") return "Cancelled";
  const stages = new Set((order?.contributions || []).map((share) => shareStage(order, share)));
  return STAGE_PRIORITY.find((stage) => stages.has(stage)) || "Needs approval";
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
