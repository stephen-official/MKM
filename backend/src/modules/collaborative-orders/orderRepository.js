import mongoose from "mongoose";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { fail } from "../../shared/httpErrors.js";

/** Applies the complete detail projection used by the current admin and kitchen order screens. */
export const populateOrderDetails = (query) => query
  .populate("createdBy", "name")
  .populate("createdByGodown", "name")
  .populate("statusChangedBy", "name")
  .populate("supplierId", "name fssaiLicence")
  .populate("supplierByProduct.supplierId", "name fssaiLicence")
  .populate("contributions.items.ticketId", "status reason receivedQtyBaseUnit resolution.acceptedQtyBaseUnit resolution.reorderShortfall raisedAt")
  .populate("contributions.userId", "name")
  .populate("contributions.godownId", "name")
  .populate("events.actorId", "name")
  .populate("events.godownId", "name")
  .populate({ path: "events.items.stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol" } })
  .populate({ path: "contributions.adminChange.before.stockItemId", select: "name unitId", populate: { path: "unitId", select: "symbol" } })
  .populate({
    path: "contributions.items.stockItemId",
    select: "name imageUrl unitId stockGroupId brand productCode soldInPacks packs expiryRequired",
    populate: [{ path: "unitId", select: "name symbol" }, { path: "stockGroupId", select: "name" }],
  });

export const requireOrderById = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw fail(404, "Collaborative purchase order not found");
  const order = await populateOrderDetails(CollaborativePurchaseOrder.findById(id));
  if (!order) throw fail(404, "Collaborative purchase order not found");
  return order;
};

export const listOrders = async ({ filter, page, limit }) => {
  const [orders, total] = await Promise.all([
    populateOrderDetails(CollaborativePurchaseOrder.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)),
    CollaborativePurchaseOrder.countDocuments(filter),
  ]);
  return { orders, total };
};
