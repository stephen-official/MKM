/* Small formatting and date-range helpers shared by the usage Approvals and Corrections screens. */

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
