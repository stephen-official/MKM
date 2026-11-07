import mongoose from "mongoose";
import { businessDateOf, isIsoDate } from "../../executive/params.js";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { Supplier } from "../../models/SupplierModel.js";
import { orderEvent } from "../../ordering/orderEvents.js";
import { fail } from "../../shared/httpErrors.js";
import { text } from "../../shared/text.js";

const purchaseSnapshot = (order) => ({
  supplierId: order.supplierId ? String(order.supplierId) : "",
  invoiceNo: order.invoiceNo || "",
  overrides: JSON.stringify(order.supplierByProduct.map((entry) => [String(entry.stockItemId), String(entry.supplierId)]).sort()),
  expiry: JSON.stringify(order.expiryByProduct.map((entry) => [String(entry.stockItemId), entry.expiryDate]).sort()),
});

/** Applies only purchase-detail keys present in input and returns how many fields were supplied. */
export const applyPurchaseDetails = async (order, input) => {
  let changed = 0;
  if (input.supplierId !== undefined) {
    if (input.supplierId === null || input.supplierId === "") {
      if (order.status === "ordered") throw fail(400, "An ordered order must keep a supplier", "SUPPLIER_REQUIRED");
      order.supplierId = null;
    } else {
      const supplier = mongoose.isValidObjectId(input.supplierId) ? await Supplier.findById(input.supplierId).select("active") : null;
      if (!supplier || !supplier.active) throw fail(400, "Choose an active supplier");
      order.supplierId = supplier._id;
    }
    changed += 1;
  }
  if (input.invoiceNo !== undefined) {
    order.invoiceNo = text(input.invoiceNo, 60, "Invoice number");
    changed += 1;
  }
  if (input.supplierOverrides !== undefined) {
    if (!Array.isArray(input.supplierOverrides)) throw fail(400, "supplierOverrides must be a list of { stockItemId, supplierId }");
    const onOrder = new Set(order.contributions.flatMap((share) => share.items.map((line) => String(line.stockItemId))));
    const kept = new Map(order.supplierByProduct.map((entry) => [String(entry.stockItemId), entry.supplierId]));
    for (const entry of input.supplierOverrides) {
      const productId = String(entry?.stockItemId || "");
      if (!onOrder.has(productId)) throw fail(400, "A supplier can only be set for products on this order");
      if (entry.supplierId === null || entry.supplierId === "") { kept.delete(productId); continue; }
      const supplier = mongoose.isValidObjectId(entry.supplierId) ? await Supplier.findById(entry.supplierId).select("active") : null;
      if (!supplier || !supplier.active) throw fail(400, "Choose an active supplier for each item");
      kept.set(productId, supplier._id);
    }
    order.supplierByProduct = [...kept].map(([stockItemId, supplierId]) => ({ stockItemId, supplierId }));
    changed += 1;
  }
  if (input.expiryDates !== undefined) {
    if (!Array.isArray(input.expiryDates)) throw fail(400, "expiryDates must be a list of { stockItemId, expiryDate }");
    const onOrder = new Set(order.contributions.flatMap((share) => share.items.map((line) => String(line.stockItemId))));
    const today = businessDateOf(new Date());
    const kept = new Map(order.expiryByProduct.map((entry) => [String(entry.stockItemId), entry.expiryDate]));
    for (const entry of input.expiryDates) {
      const productId = String(entry?.stockItemId || "");
      if (!onOrder.has(productId)) throw fail(400, "Expiry dates can only be set for products on this order");
      if (entry.expiryDate === null || entry.expiryDate === "") { kept.delete(productId); continue; }
      if (!isIsoDate(String(entry.expiryDate))) throw fail(400, "Expiry date must be a date like 2026-12-31");
      if (String(entry.expiryDate) < today) throw fail(400, "The expiry date has already passed", "EXPIRED_GOODS");
      kept.set(productId, String(entry.expiryDate));
    }
    order.expiryByProduct = [...kept].map(([stockItemId, expiryDate]) => ({ stockItemId, expiryDate }));
    changed += 1;
  }
  return changed;
};

/** Describes purchase-detail changes for order history. */
export const purchaseChanges = async (before, order) => {
  const after = purchaseSnapshot(order);
  const parts = [];
  if (after.supplierId !== before.supplierId) {
    const supplier = after.supplierId ? await Supplier.findById(after.supplierId).select("name").lean() : null;
    parts.push(supplier ? `Supplier ${supplier.name}` : "Supplier removed");
  }
  if (after.invoiceNo !== before.invoiceNo) parts.push(after.invoiceNo ? `Invoice ${after.invoiceNo}` : "Invoice removed");
  if (after.overrides !== before.overrides) parts.push("Per-item suppliers updated");
  if (after.expiry !== before.expiry) parts.push("Bulk expiry dates updated");
  return parts.join("; ");
};

export const updateOrderPurchaseDetails = async ({ orderId, input, actor }) => {
  const order = await CollaborativePurchaseOrder.findById(orderId);
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (!["approved", "ordered"].includes(order.status)) throw fail(409, "Approve the order before adding supplier or invoice details", "NOT_APPROVED");
  const before = purchaseSnapshot(order);
  if ((await applyPurchaseDetails(order, input || {})) === 0) throw fail(400, "Send a supplierId, an invoiceNo, supplierOverrides or expiryDates");
  const summary = await purchaseChanges(before, order);
  if (summary) order.events.push(orderEvent(actor, "purchase_updated", { note: summary }));
  await order.save();
  return order;
};

export { purchaseSnapshot };
