import { businessDateOf, isIsoDate, startOfBusinessDay } from "../executive/params.js";

/** Start of the business day for an opening-balance date, or null when it is malformed or after today in business time. */
export const parseOpeningDate = (dateStr, now = new Date()) => {
  if (!isIsoDate(dateStr) || dateStr > businessDateOf(now)) return null;
  return startOfBusinessDay(dateStr);
};
