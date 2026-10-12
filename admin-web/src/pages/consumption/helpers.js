export const errorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

const toDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* dd/mm/yyyy */
export const formatDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB") : "-";
};

/* hh:mm */
export const formatTime = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
};

/* The business date of a record (yyyy-mm-dd): its own date, else when it was created. */
export const recordDateKey = (record) => {
  if (record.date) return String(record.date).split("T")[0];
  const d = toDate(record.createdAt);
  return d ? d.toISOString().split("T")[0] : "";
};

export const recordDisplayDate = (record) => formatDate(record.date || record.createdAt);

/* Newest business date first, then newest creation time. */
export const compareRecords = (a, b) =>
  recordDateKey(b).localeCompare(recordDateKey(a)) ||
  new Date(b.createdAt) - new Date(a.createdAt);

/* Stock group name after deep population, else "General". */
export const getGroupName = (item) => {
  const group = item.stockItemId?.stockGroupId;
  if (group?.name) return group.name;
  if (group && typeof group === "string") return `ID: ${group.slice(-4)}`;
  return "General";
};

export const idOf = (ref) => String(ref?._id || ref || "");

export const isValidQty = (value) =>
  value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
