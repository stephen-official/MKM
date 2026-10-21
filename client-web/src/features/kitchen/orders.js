// Pure helpers for collaborative (shared) orders on the kitchen screens. No imports so node:test can load it.

const idOf = (ref) => String(ref?._id || ref || "");

export const STAGES = Object.freeze(["requested", "approved", "ordered", "dispatched", "delivered"]);
const LABELS = Object.freeze({ requested: "Requested", approved: "Approved", ordered: "Ordered", dispatched: "Dispatched", delivered: "Delivered" });

/** This kitchen's share of an order, or null when it has not joined. */
export const myShare = (order, godownId) =>
  (order?.contributions || []).find((share) => idOf(share.godownId) === String(godownId)) || null;

/** One line of a share: not_sent | on_the_way | received. Older shares carry these times on the share itself. */
export const lineState = (line, share) => {
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

/** Where this kitchen's share is: requested | approved | ordered | dispatched | delivered | cancelled. */
export const kitchenStage = (order, godownId) => {
  if (order?.status === "cancelled") return "cancelled";
  const share = myShare(order, godownId);
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
  return Boolean(share) && !share.approvedAt && order.status === "open" && new Date(order.closesAt).getTime() > now.getTime();
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
