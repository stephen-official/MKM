import { getDeliveryStatus, getSupplyRequestStatus } from "./status.js";

const finiteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const entityId = (value) => value?._id || value?.id || value || null;

const itemName = (item) =>
  item?.stockItemId?.name || item?.name || item?.stockItem?.name || "Unknown item";

const itemUnit = (item) =>
  item?.stockItemId?.unitId?.symbol ||
  item?.stockItemId?.unit ||
  item?.unitDisplay ||
  item?.unit ||
  "Units";

const normalizeLine = (item = {}) => {
  const requestedQuantity = finiteNumber(
    item.qtyBaseUnit ?? item.requestedQty ?? item.quantity ?? item.orderedQty,
  );
  const approvedQuantity =
    item.status === "rejected"
      ? 0
      : finiteNumber(item.approvedQty ?? item.approvedQuantity, requestedQuantity);
  const receivedQuantity = finiteNumber(item.receivedQty ?? item.receivedQuantity);

  return {
    id: entityId(item.stockItemId) || item._id || item.id || null,
    stockItemId: entityId(item.stockItemId),
    name: itemName(item),
    unit: itemUnit(item),
    requestedQuantity,
    approvedQuantity,
    receivedQuantity,
    remainingQuantity: Math.max(0, approvedQuantity - receivedQuantity),
    decision: item.status || null,
  };
};

const sum = (items, field) => items.reduce((total, item) => total + item[field], 0);

/**
 * Adapts a legacy Request document to the kitchen-facing Supply Request model.
 * Daily-usage requests are intentionally flagged so consumers can exclude them.
 */
export const normalizeRequestRecord = (record = {}) => {
  const items = (record.items || []).map(normalizeLine);
  const status = getSupplyRequestStatus(record.status);

  return {
    id: record._id || record.id || null,
    kind: "supply-request",
    source: "request",
    isSupplyRequest: (record.requestType || "stock_request") === "stock_request",
    reference: record.reference || record.requestNo || record._id || "Pending reference",
    status,
    items,
    itemCount: items.length,
    requestedQuantity: sum(items, "requestedQuantity"),
    neededBy: record.targetDate || null,
    note: record.reason || record.note || "",
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
};

/** Adapts the current IndentRequest document to a kitchen-facing Supply Request. */
export const normalizeIndentRequestRecord = (record = {}) => {
  const items = (record.items || []).map(normalizeLine);
  const decisions = new Set(items.map((item) => item.decision).filter(Boolean));
  const displayStatus =
    record.status === "confirmed" && decisions.has("approved") && decisions.has("rejected")
      ? "partially_approved"
      : record.status;
  const status = getSupplyRequestStatus(displayStatus);

  return {
    id: record._id || record.id || null,
    kind: "supply-request",
    source: "indent-request",
    isSupplyRequest: true,
    reference: record.reference || record.indentNo || record._id || "Pending reference",
    status,
    items,
    itemCount: items.length,
    requestedQuantity: sum(items, "requestedQuantity"),
    approvedQuantity: sum(items, "approvedQuantity"),
    receivedQuantity: sum(items, "receivedQuantity"),
    neededBy: record.targetDate || null,
    note: record.note || record.reason || "",
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
};

const inferDeliveryStatus = (request, items) => {
  if (["rejected", "cancelled"].includes(request.status)) return request.status;
  const approved = sum(items, "approvedQuantity");
  const received = sum(items, "receivedQuantity");
  if (approved > 0 && received >= approved) return "received";
  if (received > 0) return "partially_received";
  if (request.status === "confirmed") return "dispatched";
  return "awaiting_approval";
};

/**
 * Projects an IndentRequest into a Delivery. Returns null until it represents
 * something useful in the delivery workflow unless includePending is true.
 */
export const normalizeDeliveryRecord = (record = {}, { includePending = false } = {}) => {
  const items = (record.items || []).map(normalizeLine).filter((item) => item.approvedQuantity > 0);
  const deliveryKey = inferDeliveryStatus(record, items);
  if (!includePending && deliveryKey === "awaiting_approval") return null;

  return {
    id: record._id || record.id || null,
    kind: "delivery",
    source: "indent-request",
    reference: record.reference || record.indentNo || record._id || "Pending reference",
    status: getDeliveryStatus(deliveryKey),
    items,
    itemCount: items.length,
    expectedQuantity: sum(items, "approvedQuantity"),
    receivedQuantity: sum(items, "receivedQuantity"),
    remainingQuantity: sum(items, "remainingQuantity"),
    canReceive: ["dispatched", "partially_received"].includes(deliveryKey),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
};

/** Combines both legacy request sources into one newest-first collection. */
export const normalizeSupplyRequests = ({ requests = [], indentRequests = [] } = {}) =>
  [
    ...requests.map(normalizeRequestRecord).filter((request) => request.isSupplyRequest),
    ...indentRequests.map(normalizeIndentRequestRecord),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

export const normalizeDeliveries = (indentRequests = [], options) =>
  indentRequests
    .map((request) => normalizeDeliveryRecord(request, options))
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
