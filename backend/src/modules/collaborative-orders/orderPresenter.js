import { visibleEvents } from "../../ordering/orderEvents.js";
import { isKitchenRole } from "../../utils/roles.js";
import { isRejected } from "./orderContributionRules.js";

const idOf = (ref) => String(ref?._id || ref);

/** A kitchen sees which products other kitchens asked for, but not quantities, packs or notes. */
const hideOtherKitchenDetails = (value, viewer) => ({
  ...value,
  contributions: (value.contributions || []).map((contribution) => (idOf(contribution.godownId) === String(viewer.godownId)
    ? contribution
    : { ...contribution, note: undefined, rejectionReason: undefined, adminChange: undefined, items: contribution.items.map((item) => ({ stockItemId: item.stockItemId })) })),
  combinedItems: value.combinedItems.map((line) => ({ stockItemId: line.stockItemId })),
});

/** Builds the public order representation for an admin or kitchen viewer. */
export const presentOrder = (order, viewer) => {
  const value = order.toObject ? order.toObject() : order;
  const totals = new Map();
  for (const contribution of value.contributions || []) {
    for (const item of contribution.items || []) {
      if (isRejected(item)) continue;
      const product = item.stockItemId;
      const id = idOf(product);
      const current = totals.get(id) || { stockItemId: product, qtyBaseUnit: 0 };
      current.qtyBaseUnit += Number(item.qtyBaseUnit) || 0;
      totals.set(id, current);
    }
  }

  const supplier = value.supplierId && typeof value.supplierId === "object" ? value.supplierId : null;
  const full = {
    ...value,
    supplierId: supplier ? supplier._id : value.supplierId,
    supplier,
    kitchenCount: value.contributions?.length || 0,
    combinedItems: [...totals.values()],
    events: visibleEvents(value.events, viewer),
  };
  return isKitchenRole(viewer?.role) ? hideOtherKitchenDetails({ ...full, supplierId: undefined }, viewer) : full;
};
