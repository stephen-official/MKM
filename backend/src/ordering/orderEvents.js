import { isKitchenRole } from "../utils/roles.js";

/**
 * One entry for a shared order's history (orderEventSchema in CollaborativePurchaseOrderModel). Routes push it onto
 * order.events in the same save as the change it records, so the history never disagrees with the order.
 * `godownId` is the kitchen the event concerns (null = the whole order); kitchens only see their own and order-wide events.
 */
export const orderEvent = (user, action, extra = {}) => ({
  action,
  at: new Date(),
  actorId: user.sub,
  actorRole: isKitchenRole(user.role) ? "kitchen" : "admin",
  godownId: null,
  items: [],
  fromStatus: null,
  toStatus: null,
  note: "",
  ...extra,
});

/** Order lines → the event's item list (product, pack and base-unit quantity). */
export const eventItems = (lines) => lines.map((line) => ({
  stockItemId: line.stockItemId?._id || line.stockItemId,
  packId: line.packId || null,
  qtyBaseUnit: line.qtyBaseUnit ?? null,
}));

/** The events a viewer may see: admins see all; a kitchen sees order-wide events and its own. */
export const visibleEvents = (events, viewer) => {
  const all = events || [];
  if (!isKitchenRole(viewer?.role)) return all;
  return all.filter((event) => !event.godownId || String(event.godownId?._id || event.godownId) === String(viewer.godownId));
};
