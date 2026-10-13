import mongoose from "mongoose";

export const BUSINESS_TZ = process.env.BUSINESS_TZ || "Asia/Kolkata";
export const MAX_SPAN_DAYS = 366;
export const DEFAULT_SPAN_DAYS = 30;
export const MIN_DATE = "2000-01-01";
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HEX_ID = /^[a-f0-9]{24}$/i;
const MAX_PAGE = 10_000;

export class ReportParamError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isIsoDate = (value) => {
  const match = DATE_RE.exec(typeof value === "string" ? value : "");
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const daysInclusive = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

export const businessDateOf = (instant, tz = BUSINESS_TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(instant));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** Minutes the zone is ahead of UTC at a given instant. */
const offsetMinutes = (instantMs, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(new Date(instantMs));
  const v = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60_000);
};

/** UTC instant of wall-clock dateStr + "HH:mm" in tz (second pass corrects across DST changes). */
export const zonedInstant = (dateStr, time, tz = BUSINESS_TZ) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const guess = naive - offsetMinutes(naive, tz) * 60_000;
  return new Date(naive - offsetMinutes(guess, tz) * 60_000);
};

/** UTC instant of 00:00 on dateStr in tz. */
export const startOfBusinessDay = (dateStr, tz = BUSINESS_TZ) => zonedInstant(dateStr, "00:00", tz);

export const windowFor = (from, to, tz = BUSINESS_TZ) => ({
  start: startOfBusinessDay(from, tz),
  end: startOfBusinessDay(addDays(to, 1), tz)
});

export const normalizeBusinessDate = (value, fallbackInstant, tz = BUSINESS_TZ) => {
  const prefix = typeof value === "string" ? value.slice(0, 10) : "";
  return isIsoDate(prefix) ? prefix : businessDateOf(fallbackInstant, tz);
};

const pageParam = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE ? n : 1;
};

const fail = (code, message) => { throw new ReportParamError(400, code, message); };

export const parseReportParams = (query = {}, { now = new Date(), tz = BUSINESS_TZ } = {}) => {
  const rawKitchen = query.godownId ?? "all";
  let godownId = null;
  if (rawKitchen === "all") godownId = "all";
  else if (typeof rawKitchen === "string" && HEX_ID.test(rawKitchen) && mongoose.isValidObjectId(rawKitchen)) godownId = rawKitchen.toLowerCase();
  else fail("INVALID_KITCHEN", 'godownId must be "all" or a kitchen id.');

  for (const name of ["from", "to"]) {
    const value = query[name];
    if (value !== undefined && value !== "" && !isIsoDate(value)) fail("INVALID_DATE", `${name} must be a real date in YYYY-MM-DD format.`);
  }
  const today = businessDateOf(now, tz);
  const to = query.to || today;
  const from = query.from || addDays(to, -(DEFAULT_SPAN_DAYS - 1));
  if (from < MIN_DATE || to < MIN_DATE) fail("INVALID_DATE", `Dates must be on or after ${MIN_DATE}.`);
  if (to > today) fail("FUTURE_DATE", "The range cannot end after today.");
  if (from > to) fail("INVALID_RANGE", "The start date must be on or before the end date.");
  const days = daysInclusive(from, to);
  if (days > MAX_SPAN_DAYS) fail("RANGE_TOO_LONG", `The range cannot be longer than ${MAX_SPAN_DAYS} days.`);

  const previousTo = addDays(from, -1);
  const previousFrom = addDays(from, -days);
  return {
    godownId, from, to, days, today, tz,
    window: windowFor(from, to, tz),
    previous: { from: previousFrom, to: previousTo, window: windowFor(previousFrom, previousTo, tz) },
    pages: { health: pageParam(query.healthPage), unpriced: pageParam(query.unpricedPage), comparison: pageParam(query.comparisonPage) }
  };
};
