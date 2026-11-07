import mongoose from "mongoose";
import { packQuantityMatchesBase, packSnapshot } from "../../catalog/packaging.js";
import { fail } from "../../shared/httpErrors.js";

export const lineKey = (line) => `${String(line.stockItemId?._id || line.stockItemId)}:${String(line.packId || "base")}`;
export const productOf = (line) => String(line.stockItemId?._id || line.stockItemId);
export const isRejected = (line) => Boolean(line?.rejectedAt);
export const liveLines = (share) => share.items.filter((line) => !isRejected(line));

export const normalizeCollaborativeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const merged = new Map();
  for (const input of items) {
    const stockItemId = String(input?.stockItemId || "");
    const qtyBaseUnit = Number(input?.qtyBaseUnit ?? input?.quantity);
    if (!mongoose.isValidObjectId(stockItemId) || !Number.isFinite(qtyBaseUnit) || qtyBaseUnit <= 0) return null;
    if (!packQuantityMatchesBase(input, qtyBaseUnit)) return null;
    const snapshot = packSnapshot(input);
    const key = `${stockItemId}:${String(snapshot.packId || "base")}`;
    const current = merged.get(key);
    if (current) {
      current.qtyBaseUnit += qtyBaseUnit;
      if (snapshot.packId) current.packQuantity += Number(snapshot.packQuantity);
    } else merged.set(key, { stockItemId, qtyBaseUnit, ...snapshot });
  }
  return [...merged.values()];
};

const sameAmount = (a, b) => Number(a.qtyBaseUnit) === Number(b.qtyBaseUnit)
  && Number(a.packQuantity || 0) === Number(b.packQuantity || 0);
const DECISION_FIELDS = ["approvedAt", "approvedBy", "adjustedAt", "adjustedBy", "requestedQtyBaseUnit", "requestedPackQuantity"];

/** Keeps final admin decisions when a kitchen replaces the editable part of its contribution. */
export const keepApprovedLines = (currentItems, nextItems) => {
  const rejected = currentItems.filter(isRejected);
  const rejectedByKey = new Map(rejected.map((line) => [lineKey(line), line]));
  const rejectedProducts = new Set(rejected.map(productOf));
  const wanted = nextItems.filter((line) => {
    const was = rejectedByKey.get(lineKey(line));
    return !(was && sameAmount(was, line));
  });
  if (wanted.some((line) => rejectedProducts.has(productOf(line)))) {
    throw fail(409, "Items the central store did not approve cannot be asked for again on this order", "LINE_REJECTED");
  }

  const approved = currentItems.filter((line) => line.approvedAt);
  const approvedProducts = new Set(approved.map(productOf));
  const byKey = new Map(wanted.map((line) => [lineKey(line), line]));
  const locked = () => fail(409, "Approved items cannot be changed or added to", "LINE_APPROVED");
  for (const line of approved) {
    const next = byKey.get(lineKey(line));
    if (!next || !sameAmount(next, line)) throw locked();
    Object.assign(next, Object.fromEntries(DECISION_FIELDS.map((field) => [field, line[field] ?? null])));
  }
  if (wanted.some((line) => approvedProducts.has(productOf(line)) && !line.approvedAt)) throw locked();
  return [...wanted, ...rejected.map((line) => (line.toObject ? line.toObject() : line))];
};
