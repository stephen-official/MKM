import { buildExecutiveReport } from "./buildReport.js";
import { EXPORT_LIMITS } from "./context.js";
import { parseReportParams } from "./params.js";

export const EXPORT_TIMEOUT_MS = 30_000;
export const EXPORT_MAX_TIME_MS = 25_000;

const tzLabel = (tz) => (tz === "Asia/Kolkata" ? "IST" : tz.replace(/\//g, "-"));

const localParts = (iso, tz) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type).value;
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
};

export const formatGeneratedAt = (iso, tz) => {
  const p = localParts(iso, tz);
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.min} ${tzLabel(tz)}`;
};

const slug = (name) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Kitchen";

export const exportFilename = ({ kitchen, from, to, generatedAt, tz, ext }) => {
  const p = localParts(generatedAt, tz);
  const who = kitchen.id === "all" ? "All-Kitchens" : slug(kitchen.name);
  return `MKM-Executive-Report_${who}_${from}_to_${to}_generated-${p.y}${p.m}${p.d}-${p.h}${p.min}-${tzLabel(tz)}.${ext}`;
};

const encodeRfc5987 = (value) => encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Safe for any name: the quoted fallback is printable ASCII without quotes/backslashes, the UTF-8 form is fully percent-encoded. */
export const contentDisposition = (filename) =>
  `attachment; filename="${filename.replace(/[^\x20-\x7E]|["\\]/g, "_")}"; filename*=UTF-8''${encodeRfc5987(filename)}`;

export const exportTimeoutError = () =>
  Object.assign(new Error("The export took too long. Try a shorter range or a single kitchen."), { status: 504, code: "EXPORT_TIMEOUT" });

/** Shown under the top-items list in every export when more items tie with the last one shown. */
export const tiedItemsNote = (count) =>
  `${count} more ${count === 1 ? "item ties" : "items tie"} with the last item shown and ${count === 1 ? "is" : "are"} not listed.`;

export const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(exportTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/** Same calculation as /summary, with export page sizes; fails rather than export partial data. */
export const buildExportReport = async (query, { now = new Date() } = {}) => {
  const params = parseReportParams(query, { now });
  params.pages = { health: 1, unpriced: 1, comparison: 1 };
  const report = await withTimeout(buildExecutiveReport(params, { now, limits: EXPORT_LIMITS, maxTimeMS: EXPORT_MAX_TIME_MS }), EXPORT_TIMEOUT_MS);
  if (report.failures.some((f) => f.code === "TIMEOUT")) {
    throw exportTimeoutError();
  }
  if (report.failures.length) {
    throw Object.assign(new Error("Part of the report could not be generated, so nothing was exported."), { status: 500, code: "EXPORT_INCOMPLETE" });
  }
  return report;
};
