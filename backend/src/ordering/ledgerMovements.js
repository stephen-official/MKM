import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

/** Product-ledger RECEIVED rows for one kitchen and product: its delivered shares of collaborative orders. */
export const collaborativeReceiptMovements = async (godownId, productId) => {
  const orders = await CollaborativePurchaseOrder.find({
    contributions: { $elemMatch: { godownId, deliveredAt: { $ne: null }, "items.stockItemId": productId } },
  }).select("orderNo contributions").lean();
  const movements = [];
  for (const order of orders) {
    for (const share of order.contributions) {
      if (String(share.godownId) !== String(godownId) || !share.deliveredAt) continue;
      for (const line of share.items) {
        if (String(line.stockItemId) !== String(productId) || !(Number(line.qtyBaseUnit) > 0)) continue;
        movements.push({
          date: share.deliveredAt, type: "RECEIVED", reference: order.orderNo,
          qtyIn: Number(line.qtyBaseUnit), qtyOut: 0, source: "collaborative_order", sourceId: order._id,
        });
      }
    }
  }
  return movements;
};
