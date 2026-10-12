export const BUSINESS_TZ = "Asia/Kolkata";

const dateParts = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const todayInBusinessTz = (now = new Date()) => dateParts(now);

export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
};

export const formatDateTime = (iso) => {
  if (!iso) return "—";
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));
  return `${text} IST`;
};
