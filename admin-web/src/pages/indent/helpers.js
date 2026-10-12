/* Small formatting and lookup helpers shared by the Indent and Requests pages. */

export const errMsg = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

export const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
};

export const fmtTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const fmtDateTime = (value) => `${fmtDate(value)} ${fmtTime(value)}`.trim();

export const inr = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const formatQty = (value) => Number(Number(value || 0).toFixed(3)).toLocaleString("en-IN");

/* yyyy-mm-dd in the viewer's local time, comparable with <input type="date"> values. */
export const dateKey = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
};

export const inDateRange = (value, from, to) => {
  const key = dateKey(value);
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
};

export const rangeLabel = (from, to) => (from || to ? `${from || "start"}_to_${to || "end"}` : "all");

export const idOf = (item) => item?.stockItemId?._id || item?.stockItemId;

/* Resolves names, units and groups for a line item, falling back to the full
   stock-item list when the API returned a bare id. */
export const makeResolvers = (stockItems) => {
  const byId = new Map((stockItems || []).map((s) => [s._id, s]));
  const stockOf = (item) => byId.get(idOf(item));
  return {
    id: idOf,
    name: (item) => item.stockItemId?.name || stockOf(item)?.name || "Unknown product",
    unit: (item) => item.stockItemId?.unitId?.symbol || item.unitId?.symbol || stockOf(item)?.unitId?.symbol || "",
    group: (item) =>
      item.stockItemId?.stockGroupId?.name || item.stockGroupId?.name || stockOf(item)?.stockGroupId?.name || "General"
  };
};
