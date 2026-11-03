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
/** At least one item remains to buy; an all-rejected order must be cancelled, not approved empty. */
export const hasLiveItems = (order) => (order?.contributions || []).some((share) => liveLines(share).length > 0);
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

/** Every visible form row must name a real product and carry a positive quantity. */
export const orderRowsReady = (products, rows) => Array.isArray(rows) && rows.length > 0 && rows.every((row) => {
  const product = products.find((candidate) => String(candidate._id) === String(row.productId));
  if (!product || !(Number(row.qty) > 0)) return false;
  return row.packId === "base" || packsOf(product).some((pack) => String(pack._id) === String(row.packId));
});

/** While the order is being reviewed, the admin can change the quantity of any line that is not rejected (which approves it). */
export const canAdjustLine = (order, line) => canApprove(order) && !isRejected(line);

/** The amount the admin edits, in the line's own unit: packs for a pack line, else the base unit. */
export const editableQuantity = (line) => (line?.packId
  ? { value: Number(line.packQuantity), unit: line.packName }
  : { value: Number(line?.qtyBaseUnit), unit: line?.stockItemId?.unitId?.symbol || "" });

/** "10 kg" or "4 × 25 kg bag": what the kitchen first asked for, once the admin changed the quantity; else null. */
export const requestedLabel = (line) => {
  if (line?.requestedQtyBaseUnit == null) return null;
  if (line.packId && line.requestedPackQuantity != null) return `${qty(line.requestedPackQuantity)} × ${line.packName}`;
  return `${qty(line.requestedQtyBaseUnit)} ${line?.stockItemId?.unitId?.symbol || ""}`.trim();
};

// ---- Order history (events, oldest first; see the API doc) ----

const names = (items) => [...new Set((items || []).map((item) => item?.stockItemId?.name || "an item"))].join(", ");
const amountOf = (value, item) => `${qty(value)} ${item?.stockItemId?.unitId?.symbol || ""}`.trim();
const withNote = (text, note) => (note ? `${text}: ${note}` : text);
const STATUS_TEXT = { closed: "Closed the order to new items", approved: "Approved the whole order", ordered: "Marked as ordered", cancelled: "Cancelled the order" };

/** One history entry in plain words, e.g. "Rejected Dal for Gandhi Nagar School: Dal in stock". */
export const eventText = (event) => {
  const kitchen = event?.godownId?.name || "a kitchen";
  const items = names(event?.items);
  switch (event?.action) {
    case "raised": return `Raised the order for ${kitchen}${items ? `: ${items}` : ""}`;
    case "joined": return `${kitchen} joined${items ? `: ${items}` : ""}`;
    case "edited": return `${kitchen} changed its items${items ? `: ${items}` : ""}`;
    case "left": return `${kitchen} left the order`;
    case "approved": return event.godownId ? `Approved ${items || "the items"} for ${kitchen}` : "Approved the whole order";
    case "rejected": return withNote(`Rejected ${items || "the items"} for ${kitchen}`, event.note);
    case "quantity_changed": {
      const item = event.items?.[0];
      return `Changed ${names([item])} for ${kitchen} from ${amountOf(item?.fromQtyBaseUnit, item)} to ${amountOf(item?.qtyBaseUnit, item)}`;
    }
    case "purchase_updated": return withNote("Purchase details", event.note);
    case "status_changed":
      if (event.actorRole === "system" && event.toStatus === "closed") return "Ordering closed";
      return withNote(STATUS_TEXT[event.toStatus] || `Moved from ${event.fromStatus} to ${event.toStatus}`, event.note);
    case "dispatched": return `Dispatched ${items} to ${kitchen}`;
    case "received": return `${kitchen} received ${items}`;
    case "problem_raised": return withNote(`${kitchen} reported a problem with ${items}`, event.note);
    case "problem_settled": return withNote(`Settled the problem with ${items} for ${kitchen}`, event.note);
    default: return event?.action || "";
  }
};

/** Who did it: the person's name, "System" when the ordering window closed the order, else their role. */
export const eventActor = (event) => {
  if (event?.actorRole === "system") return "System";
  return event?.actorId?.name || (event?.actorRole === "kitchen" ? "Kitchen" : "Admin");
};
