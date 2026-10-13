const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

export const formatMoney = (n) => (isNum(n) ? money.format(n) : "—");
export const formatCount = (n) => (isNum(n) ? count.format(n) : "—");
export const formatQty = (n) => (isNum(n) ? qty.format(n) : "—");
export const formatPct = (n) => (isNum(n) ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—");
/** The singular form for exactly one, the plural otherwise (including zero). */
export const plural = (n, one, many) => (n === 1 ? one : many);

export const formatDays = (n) => {
  if (!isNum(n)) return "—";
  if (n < 1) return "under 1 day";
  const days = Math.floor(n);
  return `${days} ${plural(days, "day", "days")}`;
};

export const filenameFromDisposition = (header) => {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { /* fall through */ }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
};
