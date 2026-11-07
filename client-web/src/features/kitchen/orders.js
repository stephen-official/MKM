// Pure helpers for collaborative (shared) orders on the kitchen screens. No imports so node:test can load it.

const idOf = (ref) => String(ref?._id || ref || "");

export const STAGES = Object.freeze(["requested", "approved", "ordered", "dispatched", "delivered"]);
const LABELS = Object.freeze({ requested: "Requested", approved: "Approved", ordered: "Ordered", dispatched: "Dispatched", delivered: "Delivered" });

/** This kitchen's share of an order, or null when it has not joined. */
export const myShare = (order, godownId) =>
  (order?.contributions || []).find((share) => idOf(share.godownId) === String(godownId)) || null;

/** One line of a share: rejected | not_sent | on_the_way | problem | received. Older shares carry these times on the
 *  share itself; a line the central store rejected is never sent or received, whatever the share says. */
export const lineState = (line, share) => {
  if (line?.rejectedAt) return "rejected";
  if (line?.deliveredAt || share?.deliveredAt) return "received";
  if (line?.ticketId) return "problem";
  if (line?.dispatchedAt || share?.dispatchedAt) return "on_the_way";
  return "not_sent";
};

/** True when something has been sent to this kitchen and not yet received ("All received" applies to it). */
export const hasArriving = (order, godownId) => {
  const share = myShare(order, godownId);
  return order?.status === "ordered" && Boolean(share) && share.items.some((line) => lineState(line, share) === "on_the_way");
};

const firstSent = (share) => share?.dispatchedAt || (share?.items || []).map((line) => line.dispatchedAt).filter(Boolean).sort()[0] || null;

/** Where this kitchen's share is: requested | approved | ordered | dispatched | delivered | cancelled | rejected
 *  (every item the kitchen asked for was rejected). */
export const kitchenStage = (order, godownId) => {
  if (order?.status === "cancelled") return "cancelled";
  const share = myShare(order, godownId);
  if (share?.items?.length && share.items.every((line) => line.rejectedAt)) return "rejected";
  if (share?.deliveredAt) return "delivered";
  if (firstSent(share)) return "dispatched";
  if (order?.status === "ordered") return "ordered";
  if (order?.status === "approved" || share?.approvedAt) return "approved";
  return "requested";
};

/** The five steps for this kitchen, each with done/current and the time it happened (null if not yet). */
export const orderTimeline = (order, godownId) => {
  const share = myShare(order, godownId);
  const stage = kitchenStage(order, godownId);
  const reached = STAGES.indexOf(stage);
  const ordered = order?.status === "ordered" ? order.statusChangedAt : null;
  const when = {
    requested: share?.addedAt || order?.createdAt || null,
    approved: share?.approvedAt || null,
    ordered,
    dispatched: firstSent(share),
    delivered: share?.deliveredAt || null,
  };
  return STAGES.map((key, index) => ({ key, label: LABELS[key], done: index <= reached, current: index === reached, at: when[key] }));
};

/** True when the kitchen can still add its items: the order is open, taking items, and it is not on it yet. */
export const canJoin = (order, godownId, now = new Date()) =>
  order?.status === "open" && new Date(order.closesAt).getTime() > now.getTime() && !myShare(order, godownId);

export const otherOpenOrders = (orders, godownId, now = new Date()) => orders.filter((order) => canJoin(order, godownId, now));
export const myOrders = (orders, godownId) => orders.filter((order) => myShare(order, godownId));

/** True while this kitchen may still change the items it has not had approved. */
export const canEditShare = (order, godownId, now = new Date()) => {
  const share = myShare(order, godownId);
  return Boolean(share) && !share.approvedAt && !share.rejectedAt && order.status === "open" && new Date(order.closesAt).getTime() > now.getTime();
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

/** "Sun, 25 Oct" in India time; with { withTime } adds "11:00 am" (used for emergencies). */
export const deliveryDateText = (value, { withTime = false } = {}) => {
  const options = { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" };
  if (withTime) Object.assign(options, { hour: "numeric", minute: "2-digit", hour12: true });
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(value));
};

/** Order-draft entries ({ qty, packId, needsQty? }) keyed by product id. Items added from Home arrive with needsQty and no
 *  amount: the ticket lists them as "Enter quantity" and the order cannot be placed until each has one. */
export const needsQuantity = (entry) => Boolean(entry?.needsQty) && !(Number(entry?.qty) > 0);
export const draftCounts = (draft) => {
  const entries = Object.values(draft || {});
  return { items: entries.filter((entry) => entry?.needsQty || Number(entry?.qty) > 0).length, missing: entries.filter(needsQuantity).length };
};

/** "Sent by central store" on an order the central store raised for the kitchen; null for the kitchen's own requests. */
export const orderSourceLabel = (order) => (order?.source === "admin" ? "Sent by central store" : null);

/** The products a kitchen can pick from while editing its items: the stock it holds, plus the order's own products it
 *  holds none of yet (an order the central store raised may name those), built from the order's lines. Rejected
 *  products are left out; they cannot be asked for again on this order. */
export const withOrderProducts = (products, share) => {
  if (!share) return products;
  const known = new Set(products.map((product) => idOf(product._id)));
  const extra = [];
  for (const line of share.items || []) {
    const product = line.stockItemId;
    const id = idOf(product);
    if (line.rejectedAt || !product?.name || known.has(id)) continue;
    known.add(id);
    extra.push({
      _id: product._id, name: product.name, unit: product.unitId?.symbol || product.unitId?.name || "Units", image: product.imageUrl || "",
      soldInPacks: Boolean(product.soldInPacks), packs: product.packs || [], currentQty: 0, thresholdBaseUnit: 0, available: true,
    });
  }
  return extra.length ? [...products, ...extra] : products;
};

/** "You asked for 10 kg" / "You asked for 4 × 25 kg bag" on a line whose quantity the central store changed; else null. */
export const requestedAmountText = (line) => {
  if (line?.requestedQtyBaseUnit == null) return null;
  const amount = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
  const asked = line.packId && line.requestedPackQuantity != null
    ? `${amount(line.requestedPackQuantity)} × ${line.packName}`
    : `${amount(line.requestedQtyBaseUnit)} ${line.stockItemId?.unitId?.symbol || ""}`.trim();
  return `You asked for ${asked}`;
};

// ---- Order history, as the kitchen sees it (the API sends only order-wide events and this kitchen's own) ----

const itemNames = (items) => [...new Set((items || []).map((item) => item?.stockItemId?.name || "an item"))].join(", ");
const amountWithUnit = (value, item) => `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${item?.stockItemId?.unitId?.symbol || ""}`.trim();
const noted = (text, note) => (note ? `${text}: ${note}` : text);
const STORE = "Central store";

/** One history entry in the kitchen's words, e.g. "Central store did not approve Rice: In stock". */
export const kitchenEventText = (event) => {
  const who = event?.actorRole === "kitchen" ? event?.actorId?.name || "Your kitchen" : STORE;
  const items = itemNames(event?.items);
  switch (event?.action) {
    case "raised": return event.actorRole === "kitchen" ? `${who} asked for ${items}` : `${STORE} raised this order for your kitchen${items ? `: ${items}` : ""}`;
    case "joined": return `${who} added your items${items ? `: ${items}` : ""}`;
    case "edited": return `${who} changed your items${items ? `: ${items}` : ""}`;
    case "left": return `${who} took your items off this order`;
    case "approved": return event.godownId ? `${STORE} approved ${items || "your items"}` : `${STORE} approved the order`;
    case "rejected": return noted(`${STORE} did not approve ${items || "your items"}`, event.note);
    case "quantity_changed": {
      const item = event.items?.[0];
      return `${STORE} changed ${itemNames([item])} from ${amountWithUnit(item?.fromQtyBaseUnit, item)} to ${amountWithUnit(item?.qtyBaseUnit, item)}`;
    }
    case "purchase_updated": return noted(`${STORE} updated the purchase details`, event.note);
    case "status_changed":
      if (event.actorRole === "system") return "Ordering closed";
      if (event.toStatus === "closed") return `${STORE} closed the order to new items`;
      if (event.toStatus === "ordered") return noted(`${STORE} placed the order`, event.note);
      if (event.toStatus === "cancelled") return noted(`${STORE} cancelled the order`, event.note);
      return `${STORE} moved the order to ${event.toStatus}`;
    case "dispatched": return `${STORE} sent ${items}`;
    case "received": return `${who} received ${items}`;
    case "problem_raised": return noted(`${who} reported a problem with ${items}`, event.note);
    case "problem_settled": return noted(`${STORE} settled the problem with ${items}`, event.note);
    default: return "";
  }
};

/** The order's history for the kitchen card, newest first. */
export const kitchenHistory = (order) => [...(order?.events || [])].reverse();

/**
 * What the central team changed in this kitchen's items (share.adminChange.before → share.items), one row per product:
 * { id, name, unit, before, after, kind } with kind "up" | "down" | "added" | "removed" (unchanged products left out).
 * Amounts are in the base unit. Same idea as the admin's usage-correction ticket
 * (admin-web/src/pages/consumption/correctionSummary.js correctionChanges) — keep the two in step.
 */
export const adminChanges = (share) => {
  if (!share?.adminChange) return [];
  const totals = (lines) => {
    const map = new Map();
    for (const line of lines || []) {
      const product = line.stockItemId || {};
      const id = idOf(product);
      const entry = map.get(id) || { id, name: product.name || "Item", unit: product.unitId?.symbol || "", qty: 0 };
      entry.qty += Number(line.qtyBaseUnit) || 0;
      map.set(id, entry);
    }
    return map;
  };
  const before = totals(share.adminChange.before);
  const after = totals(share.items);
  const rows = [];
  for (const [id, was] of before) {
    const now = after.get(id);
    if (!now) rows.push({ id, name: was.name, unit: was.unit, before: was.qty, after: null, kind: "removed" });
    else if (now.qty !== was.qty) rows.push({ id, name: was.name, unit: was.unit || now.unit, before: was.qty, after: now.qty, kind: now.qty > was.qty ? "up" : "down" });
  }
  for (const [id, now] of after) {
    if (!before.has(id)) rows.push({ id, name: now.name, unit: now.unit, before: null, after: now.qty, kind: "added" });
  }
  return rows;
};
