// Pure helpers for the Shared orders tab (collaborative purchase orders); see docs/COLLABORATIVE_PURCHASE_ORDERS_API.md.

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** Lines, kitchens or the whole order can be approved until the order is approved, ordered or cancelled. */
export const canApprove = (order) => ["open", "closed"].includes(order?.status);
export const canMarkOrdered = (order) => order?.status === "approved";
/** Supplier and invoice number can be set once the order is approved, and changed after it is ordered. */
export const canSetPurchaseDetails = (order) => ["approved", "ordered"].includes(order?.status);
/** True when every kitchen's share is approved or rejected; "Approve all" then only closes the order to new kitchens. */
export const allSharesApproved = (order) =>
  (order?.contributions || []).length > 0 && order.contributions.every((share) => Boolean(share.approvedAt || share.rejectedAt));
const isRejected = (line) => Boolean(line?.rejectedAt);
/** A share's lines that are still wanted; rejected lines are never bought, sent or received. */
const liveLines = (share) => (share?.items || []).filter((line) => !isRejected(line));
// Lines carry their own dispatch and receipt times; shares sent whole before that carry them on the share.
const isSent = (line, share) => !isRejected(line) && Boolean(line?.dispatchedAt || share?.dispatchedAt);
const isReceived = (line, share) => !isRejected(line) && Boolean(line?.deliveredAt || share?.deliveredAt);

/** Each line, each kitchen and the whole order can be dispatched while anything in them is still unsent. */
export const canDispatchLine = (order, line, share) => order?.status === "ordered" && !isRejected(line) && !isSent(line, share);
export const canDispatch = (order, share) => order?.status === "ordered" && liveLines(share).some((line) => !isSent(line, share));
/** A line or a kitchen's remaining items can be rejected (with a reason) while the order is being reviewed; decisions are final. */
export const canRejectLine = (order, line) => canApprove(order) && !line?.approvedAt && !isRejected(line);
export const canRejectShare = (order, share) => canApprove(order) && !share?.approvedAt && !share?.rejectedAt
  && (share?.items || []).some((line) => !line.approvedAt && !isRejected(line));
/** The whole order can be cancelled (with a reason) until it is placed with the supplier. */
export const canCancel = (order) => ["open", "closed", "approved"].includes(order?.status);

export const canDispatchAll = (order) => (order?.contributions || []).some((share) => canDispatch(order, share));

/** "Not sent", "On the way", "Problem raised" or "Received" for one line. */
export const lineDelivery = (line, share) => (isRejected(line) ? "Not approved" : isReceived(line, share) ? "Received" : line?.ticketId ? "Problem raised" : isSent(line, share) ? "On the way" : "Not sent");

/** One kitchen's stage as the next thing to do: Needs approval → Place order → Needs to be dispatched → Dispatched → Delivered (plus Incomplete dispatch, Partly received, Problem to settle). */
export const shareStage = (order, share) => {
  if (order?.status === "cancelled") return "Cancelled";
  const lines = liveLines(share);
  if (lines.length === 0 && (share?.items || []).length > 0) return "Not approved";
  if (share?.deliveredAt) return "Delivered";
  if (lines.some((line) => line?.ticketId && !isReceived(line, share))) return "Problem to settle";
  if (lines.some((line) => isReceived(line, share))) return "Partly received";
  if (lines.length && lines.every((line) => isSent(line, share))) return "Dispatched";
  if (lines.some((line) => isSent(line, share))) return "Incomplete dispatch";
  if (order?.status === "ordered") return "Needs to be dispatched";
  if (order?.status === "approved" || share?.approvedAt || share?.rejectedAt) return "Place order";
  return "Needs approval";
};

// Most pressing first: a problem or an admin action outranks waiting on a kitchen, which outranks done.
const STAGE_PRIORITY = ["Problem to settle", "Needs approval", "Place order", "Incomplete dispatch", "Needs to be dispatched", "Partly received", "Dispatched", "Delivered", "Not approved"];

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

/** Who raised the order: the central store on a kitchen's behalf, or the kitchen itself (orders from before this was recorded). */
export const sourceLabel = (order) => (order?.source === "admin" ? "Raised by admin" : "Requested by kitchen");

const packsOf = (product) => (product?.soldInPacks ? (product.packs || []).filter((pack) => Number(pack.size) > 0) : []);

/** The units a product can be ordered in on the "Raise order" form: its base unit, then each of its packs. */
export const unitChoices = (product) => {
  const symbol = product?.unit?.symbol || "";
  return [
    { value: "base", label: symbol || "unit" },
    ...packsOf(product).map((pack) => ({ value: String(pack._id), label: symbol ? `${pack.name} (${Number(pack.size)} ${symbol})` : pack.name })),
  ];
};

/** The form's rows ({ productId, qty, packId }) → API order lines in the base unit, with the pack snapshot when one is chosen. */
export const orderItems = (products, rows) => rows.flatMap((row) => {
  const amount = Number(row.qty);
  const product = products.find((candidate) => String(candidate._id) === String(row.productId));
  if (!product || !(amount > 0)) return [];
  const pack = packsOf(product).find((candidate) => String(candidate._id) === String(row.packId));
  return pack
    ? [{ stockItemId: product._id, qtyBaseUnit: amount * Number(pack.size), packId: pack._id, packName: pack.name, packSize: Number(pack.size), packQuantity: amount }]
    : [{ stockItemId: product._id, qtyBaseUnit: amount }];
});
