import { CollaborativePurchaseOrder } from "../models/CollaborativePurchaseOrderModel.js";

/** Product-ledger RECEIVED rows for one kitchen and product: each received line of its collaborative-order shares. */
export const collaborativeReceiptMovements = async (godownId, productId) => {
  const orders = await CollaborativePurchaseOrder.find({
    contributions: { $elemMatch: { godownId, "items.stockItemId": productId } },
  }).select("orderNo contributions").lean();
  const movements = [];
  for (const order of orders) {
    for (const share of order.contributions) {
      if (String(share.godownId) !== String(godownId)) continue;
      for (const line of share.items) {
        // Lines carry their own receipt time; shares received before that was tracked carry it on the share.
        const receivedAt = line.deliveredAt || share.deliveredAt;
        // What entered stock: the accepted quantity after a delivery problem, else the ordered quantity.
        const qtyIn = Number(line.receivedQtyBaseUnit ?? line.qtyBaseUnit);
        if (!receivedAt || String(line.stockItemId) !== String(productId) || !(qtyIn > 0)) continue;
        movements.push({
          date: receivedAt, type: "RECEIVED", reference: order.orderNo,
          qtyIn, qtyOut: 0, source: "collaborative_order", sourceId: order._id,
        });
      }
    }
  }
  return movements;
};
