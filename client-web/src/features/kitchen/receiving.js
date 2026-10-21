// Pure helpers for the kitchen "Receive delivery" screen (Phase 2: photos, expiry, batch, storage per item).
// Loadable by node:test: only relative imports of other pure modules.
import { lineState, myShare } from "./orders.js";
import { localDateFromKey, toLocalDateKey } from "../../utils/date.js";

const idOf = (ref) => String(ref?._id || ref || "");

/** Lines of this kitchen's share that are on the way, i.e. what "All received" takes in. */
export const arrivingLines = (order, godownId) => {
  const share = myShare(order, godownId);
  if (!share || order?.status !== "ordered") return [];
  return share.items.filter((line) => lineState(line, share) === "on_the_way");
};

/** One receipt form per product; two lines of the same product (different packs) share one. */
export const productIdOf = (line) => idOf(line?.stockItemId);
export const arrivingProducts = (lines) => [...new Map(lines.map((line) => [productIdOf(line), line])).values()];

/** Whether the admin asks for an expiry date on this product (on unless turned off). */
export const expiryNeeded = (line) => line?.stockItemId?.expiryRequired !== false;

export const EXPIRY_CHIPS = Object.freeze([
  { key: "1w", label: "1 week", days: 7 },
  { key: "1m", label: "1 month", months: 1 },
  { key: "3m", label: "3 months", months: 3 },
  { key: "6m", label: "6 months", months: 6 },
  { key: "1y", label: "1 year", months: 12 },
]);
export const PROBLEM_REASONS = Object.freeze([
  { key: "short", label: "Less than ordered" },
  { key: "excess", label: "More than ordered" },
  { key: "damaged", label: "Damaged" },
  { key: "wrong_item", label: "Wrong item" },
  { key: "expired", label: "Expired" },
]);
export const STORAGE_OPTIONS = Object.freeze([
  { key: "room", label: "Room" },
  { key: "fridge", label: "Fridge" },
  { key: "freezer", label: "Freezer" },
]);

/** YYYY-MM-DD for a chip counted from `todayKey` (1 month from 31 Jan lands on the last day of February). */
export const expiryFromChip = (key, todayKey) => {
  const chip = EXPIRY_CHIPS.find((candidate) => candidate.key === key);
  const date = localDateFromKey(todayKey);
  if (!chip || !date) return "";
  if (chip.days) date.setDate(date.getDate() + chip.days);
  else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + chip.months);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
  }
  return toLocalDateKey(date);
};

/** The expiry the central store set for this product on the order (bulk buys), as YYYY-MM-DD, or "". */
export const adminExpiryFor = (order, line) =>
  (order?.expiryByProduct || []).find((entry) => idOf(entry.stockItemId) === productIdOf(line))?.expiryDate || "";

/** The supplier this product came from: its own entry on the order, else the order's supplier; null if none. */
export const supplierFor = (order, line) => {
  const entry = (order?.supplierByProduct || []).find((candidate) => idOf(candidate.stockItemId) === productIdOf(line));
  const supplier = entry?.supplierId && typeof entry.supplierId === "object" ? entry.supplierId : order?.supplier;
  return supplier ? { _id: idOf(supplier), name: supplier.name || "", fssaiLicence: supplier.fssaiLicence || "" } : null;
};

/** Products grouped by the supplier they came from, in order of first appearance: [{ supplier, lines }]. */
export const groupBySupplier = (order, lines) => {
  const groups = [];
  for (const line of arrivingProducts(lines)) {
    const supplier = supplierFor(order, line);
    const key = supplier ? supplier._id : "";
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) { group = { key, supplier, lines: [] }; groups.push(group); }
    group.lines.push(line);
  }
  return groups;
};

/** A blank form; pass the central store's expiry to start from it (the cook can still change it). */
export const emptyReceipt = (expiryDate = "") => ({ photos: { goods: "", label: "" }, expiryDate, mfgDate: "", lotNumber: "", storage: "room", problem: null });
/** A blank problem report, shown when the cook taps "Problem with this item". */
export const emptyProblem = () => ({ reason: "", receivedQty: "", note: "", voiceNoteUrl: "" });

/** Usable quantity the cook typed for a problem item, as a number (0 when blank), or null when not a number. */
export const usableQty = (problem) => {
  if (!problem) return null;
  const raw = String(problem.receivedQty ?? "").trim();
  if (raw === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

/** What still stops this product from being received, in the cook's words. Empty when it is ready. */
export const receiptProblems = (line, form = emptyReceipt(), todayKey = toLocalDateKey()) => {
  const problems = [];
  const problem = form.problem;
  if (!form.photos?.goods) problems.push("Photo of the goods");
  if (!problem && !form.photos?.label) problems.push("Photo of the label");
  if (problem) {
    const ordered = Number(line?.qtyBaseUnit) || 0;
    const qty = usableQty(problem);
    if (!problem.reason) problems.push("What went wrong");
    if (qty === null) problems.push("How much usable stock arrived");
    else if (problem.reason === "short" && qty >= ordered) problems.push(`Less than ${ordered} must have arrived`);
    else if (problem.reason === "excess" && qty <= ordered) problems.push(`More than ${ordered} must have arrived`);
    if (qty > 0 && !form.expiryDate && expiryNeeded(line)) problems.push("Expiry date for the usable part");
  } else {
    if (!form.expiryDate && expiryNeeded(line)) problems.push("Expiry date");
    if (form.expiryDate && form.expiryDate < todayKey) problems.push("Expiry date has passed — mark it as a problem");
  }
  if (form.mfgDate && form.mfgDate > todayKey) problems.push("Manufacture date is in the future");
  return problems;
};

export const receiptReady = (lines, forms, todayKey) =>
  arrivingProducts(lines).every((line) => receiptProblems(line, forms[productIdOf(line)], todayKey).length === 0);

/** The body for POST /:id/receive. */
export const receiptPayload = (lines, forms) => ({
  items: arrivingProducts(lines).map((line) => {
    const form = forms[productIdOf(line)] || emptyReceipt();
    return {
      stockItemId: productIdOf(line),
      photos: { goods: form.photos.goods, label: form.photos.label },
      expiryDate: form.expiryDate || undefined,
      mfgDate: form.mfgDate || undefined,
      lotNumber: form.lotNumber?.trim() || undefined,
      storage: form.storage || undefined,
      ...(form.problem ? { problem: {
        reason: form.problem.reason, receivedQtyBaseUnit: usableQty(form.problem) ?? 0,
        note: form.problem.note?.trim() || undefined, voiceNoteUrl: form.problem.voiceNoteUrl || undefined,
      } } : {}),
    };
  }),
});
