// Pure helpers behind the Problems tab (delivery tickets kitchens raise while receiving shared orders).

export const REASON_LABELS = Object.freeze({
  short: "Less than ordered", excess: "More than ordered", damaged: "Damaged", wrong_item: "Wrong item", expired: "Expired"
});
export const reasonLabel = (reason) => REASON_LABELS[reason] || reason || "Problem";

const qty = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const unitOf = (ticket) => ticket?.stockItemId?.unitId?.symbol || "";
export const qtyText = (value, ticket) => `${qty(value)} ${unitOf(ticket)}`.trim();

/** Ordered minus accepted, never below zero: what a follow-up order would ask for. */
export const shortfallFor = (ticket, accepted) => Math.max(0, Number(ticket?.orderedQtyBaseUnit || 0) - (Number(accepted) || 0));

/** Starting values for the settle popup: accept everything usable, and reorder whatever is still missing. */
export const settleDefaults = (ticket) => {
  const accepted = String(ticket?.receivedQtyBaseUnit ?? 0);
  return { acceptedQty: accepted, reorder: shortfallFor(ticket, accepted) > 0, note: "" };
};

export const validateSettle = (form, ticket) => {
  const errors = {};
  const value = Number(String(form.acceptedQty).trim());
  if (String(form.acceptedQty).trim() === "" || !Number.isFinite(value) || value < 0) errors.acceptedQty = "Enter the quantity to accept, 0 or more.";
  else if (value > Number(ticket?.receivedQtyBaseUnit || 0)) errors.acceptedQty = `Only ${qtyText(ticket?.receivedQtyBaseUnit, ticket)} usable arrived.`;
  if (form.note.length > 500) errors.note = "Keep the note under 500 characters.";
  return errors;
};

export const settlePayload = (form) => ({ acceptedQtyBaseUnit: Number(String(form.acceptedQty).trim()), reorderShortfall: Boolean(form.reorder), note: form.note.trim() });
