import mongoose from "mongoose";
import { packQuantityMatchesBase, packSnapshot } from "../../catalog/packaging.js";
import { fail } from "../../shared/httpErrors.js";

export const lineKey = (line) => `${String(line.stockItemId?._id || line.stockItemId)}:${String(line.packId || "base")}`;
export const productOf = (line) => String(line.stockItemId?._id || line.stockItemId);
export const isRejected = (line) => Boolean(line?.rejectedAt);
/** A share's lines that are still wanted: rejected lines are never bought, sent or received. */
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
// What an approved line carries over when the kitchen sends its list again: the approval and any change the admin made.
const DECISION_FIELDS = ["approvedAt", "approvedBy", "adjustedAt", "adjustedBy", "requestedQtyBaseUnit", "requestedPackQuantity"];

/**
 * A kitchen's new item list, keeping the lines the admin has decided on. Approved lines must come back unchanged
 * (their approval is carried over) and no other line may name an approved product (LINE_APPROVED). Rejected lines
 * stay on record whether or not they are sent back; asking for a rejected product again fails with LINE_REJECTED.
 */
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

/** The lines of a share named by [{ stockItemId, packId? }] (no packId matches every pack of that product). */
export const pickLines = (share, picks) => share.items.filter((line) => picks.some((pick) => String(pick?.stockItemId) === productOf(line)
  && (!pick.packId || String(pick.packId) === String(line.packId))));
