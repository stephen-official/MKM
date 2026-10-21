// Pure helpers for Phase 5 (label scan): turn the text read off a product label into receipt-form values.
// Loadable by node:test: only relative imports of other pure modules. No OCR here — callers pass the text in.
import { localDateFromKey, toLocalDateKey } from "../../utils/date.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const SEP = "[\\s./\\-,]*";
const YEAR = "(\\d{4}|\\d{2})";

// Each alternative yields a date; matched left to right so a full date wins over a month-year at the same spot.
const DATE_PATTERNS = [
  { re: `(?<!\\d)(\\d{4})-(\\d{2})-(\\d{2})(?!\\d)`, pick: (m) => ({ y: m[1], mo: m[2], d: m[3] }) },
  { re: `(?<!\\d)(\\d{1,2})[./\\-](\\d{1,2})[./\\-]${YEAR}(?!\\d)`, pick: (m) => ({ d: m[1], mo: m[2], y: m[3] }) },
  { re: `(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?${SEP}${MONTH}${SEP}${YEAR}(?!\\d)`, pick: (m) => ({ d: m[1], mo: m[2], y: m[3] }) },
  { re: `\\b${MONTH}${SEP}${YEAR}(?!\\d)`, pick: (m) => ({ mo: m[1], y: m[2] }) },
  { re: `(?<!\\d)(\\d{1,2})[./\\-]${YEAR}(?!\\d)`, pick: (m) => ({ mo: m[1], y: m[2] }) },
];
const DATE_RE = new RegExp(DATE_PATTERNS.map((p) => `(?:${p.re})`).join("|"), "gi");

const EXPIRY_WORDS = /\b(?:exp(?:iry|ires|ire)?\.?(?:\s*(?:date|dt|on))?|use\s*(?:by|before)|best\s*before(?:\s*end)?|consume\s*before|bbe?(?:\s*date)?)\b/gi;
const MFG_WORDS = /\b(?:mfg\.?|mfd\.?|manufactur(?:ed|ing)|date\s*of\s*(?:manufactur\w*|packaging|packing|mfg\.?)|pkd\.?|packed|packaging|packing|dom)\b/gi;
const BATCH_WORDS = /\b(?:batch|lot|b\.?\s*no\.?|l\.?\s*no\.?)\b/gi;
const SHELF_LIFE = /\b(?:best\s*before|use\s*within|consume\s*within|shelf\s*life)\b[^\d\n]{0,14}?(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty[\s-]*four|thirty[\s-]*six)\s*(days?|months?|mths?|mos?|years?|yrs?)\b/i;
const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, eighteen: 18, twentyfour: 24, thirtysix: 36 };

/** Fixes the usual OCR slips inside numbers (O for 0, I/l for 1) and tidies whitespace and punctuation. */
export const cleanLabelText = (text) => String(text || "")
  .replace(/[–—]/g, "-")
  .replace(/(?<=\d)[Oo](?=[\dOo/.-])|(?<=[/.-])[Oo](?=\d)/g, "0")
  .replace(/(?<=\d)[Il](?=[\d/.-])|(?<=[/.-])[Il](?=\d)/g, "1")
  .replace(/[ \t]+/g, " ")
  .trim();

const monthNumber = (raw) => (/^\d+$/.test(raw) ? Number(raw) : MONTHS.indexOf(raw.slice(0, 3).toLowerCase()) + 1);
const fullYear = (raw) => (raw.length === 4 ? Number(raw) : 2000 + Number(raw));
const lastDay = (y, mo) => new Date(y, mo, 0).getDate();

/** Every date-looking thing in the text, in reading order, with its position and whether only month+year were given. */
export const findDates = (text, todayKey = toLocalDateKey()) => {
  const thisYear = Number(todayKey.slice(0, 4));
  const found = [];
  for (const match of String(text).matchAll(DATE_RE)) {
    const parts = DATE_PATTERNS.map((p) => new RegExp(`^${p.re}$`, "i").exec(match[0])).map((m, i) => m && DATE_PATTERNS[i].pick(m)).find(Boolean);
    if (!parts) continue;
    const y = fullYear(parts.y);
    let mo = monthNumber(parts.mo);
    let d = parts.d === undefined ? null : Number(parts.d);
    if (d !== null && mo > 12 && d <= 12) [d, mo] = [mo, d]; // written month-first (imported goods)
    if (mo < 1 || mo > 12 || y < thisYear - 10 || y > thisYear + 15) continue;
    if (d !== null && (d < 1 || d > lastDay(y, mo))) continue;
    found.push({ text: match[0], index: match.index, end: match.index + match[0].length, y, mo, d, monthOnly: d === null });
  }
  return found;
};

const key = (y, mo, d) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** YYYY-MM-DD; a month-only expiry runs to the end of the month, a month-only "made on" starts at the beginning. */
export const dateKeyOf = (date, kind) => key(date.y, date.mo, date.monthOnly ? (kind === "expiry" ? lastDay(date.y, date.mo) : 1) : date.d);

const GAP_RE = /^[\s:.-]*(?:date|dt|on|by|end|of)?[\s:.-]*$/i;
/** The first date that sits right after any of the keyword matches, e.g. "EXP: 12/2027". */
const dateAfter = (text, words, dates, taken) => {
  for (const word of text.matchAll(words)) {
    const date = dates.find((candidate) => !taken.has(candidate) && candidate.index >= word.index + word[0].length
      && candidate.index - (word.index + word[0].length) <= 14 && GAP_RE.test(text.slice(word.index + word[0].length, candidate.index)));
    if (date) return { date, from: text.slice(word.index, date.end).replace(/\s+/g, " ") };
  }
  return null;
};

/** "Best before 6 months from MFG" → { months: 6 } (days become months only via the caller's date maths). */
export const findShelfLife = (text) => {
  const match = SHELF_LIFE.exec(String(text));
  if (!match) return null;
  const raw = match[1].toLowerCase().replace(/[\s-]/g, "");
  const n = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
  const unit = match[2].toLowerCase();
  if (!n) return null;
  const out = { from: match[0].replace(/\s+/g, " ") };
  if (unit.startsWith("d")) out.days = n;
  else if (unit.startsWith("y")) out.months = n * 12;
  else out.months = n;
  return out;
};

const addShelfLife = (mfgKey, life) => {
  const date = localDateFromKey(mfgKey);
  if (!date) return "";
  if (life.days) date.setDate(date.getDate() + life.days);
  else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + life.months);
    date.setDate(Math.min(day, lastDay(date.getFullYear(), date.getMonth() + 1)));
  }
  return toLocalDateKey(date);
};

/** The batch/lot code written after "Batch No", "Lot", "B.No" …; letters, digits, - and / only. */
export const findBatchNumber = (text) => {
  for (const word of String(text).matchAll(BATCH_WORDS)) {
    const rest = text.slice(word.index + word[0].length);
    const match = /^[\s:.-]*(?:no\.?|number|#)?[\s:.-]*([A-Za-z0-9][A-Za-z0-9\-/]{1,24})(?![A-Za-z0-9])/i.exec(rest);
    if (!match) continue;
    const code = match[1].replace(/[-/]+$/, "");
    if (!/\d/.test(code)) continue; // a plain word, e.g. "batch size"
    if (/^\d{1,2}[/-]\d{2,4}$/.test(code)) continue; // that is a date, not a batch
    return { value: code.toUpperCase(), from: text.slice(word.index, word.index + word[0].length + match[0].length).replace(/\s+/g, " ") };
  }
  return null;
};

/**
 * What a label says, as receipt-form values. Each field is { value, from, guessed } or null.
 * `from` is the piece of label text it came from so the cook can check it; `guessed` is true when no label word
 * (EXP, MFD…) sat next to the date and we went by whether the date is in the past or the future.
 */
export const parseLabel = (rawText, todayKey = toLocalDateKey()) => {
  const text = cleanLabelText(rawText);
  const dates = findDates(text, todayKey);
  const taken = new Set();
  const result = { expiryDate: null, mfgDate: null, lotNumber: findBatchNumber(text) };

  const mfg = dateAfter(text, MFG_WORDS, dates, taken);
  if (mfg) taken.add(mfg.date);
  const exp = dateAfter(text, EXPIRY_WORDS, dates, taken);
  if (exp) taken.add(exp.date);
  if (mfg) result.mfgDate = { value: dateKeyOf(mfg.date, "mfg"), from: mfg.from, guessed: false };
  if (exp) result.expiryDate = { value: dateKeyOf(exp.date, "expiry"), from: exp.from, guessed: false };

  // Dates with no word beside them: a past date can only be "made on", a future one can only be an expiry.
  const spare = dates.filter((date) => !taken.has(date));
  if (!result.mfgDate) {
    const past = spare.filter((date) => dateKeyOf(date, "mfg") <= todayKey).sort((a, b) => dateKeyOf(a, "mfg").localeCompare(dateKeyOf(b, "mfg")));
    if (past.length) { result.mfgDate = { value: dateKeyOf(past[0], "mfg"), from: past[0].text, guessed: true }; taken.add(past[0]); }
  }
  if (!result.expiryDate) {
    const future = spare.filter((date) => !taken.has(date) && dateKeyOf(date, "expiry") > todayKey).sort((a, b) => dateKeyOf(b, "expiry").localeCompare(dateKeyOf(a, "expiry")));
    if (future.length) { result.expiryDate = { value: dateKeyOf(future[0], "expiry"), from: future[0].text, guessed: true }; taken.add(future[0]); }
  }

  // "Best before 6 months from manufacture" only helps once we know when it was made.
  if (!result.expiryDate && result.mfgDate) {
    const life = findShelfLife(text);
    const value = life && addShelfLife(result.mfgDate.value, life);
    if (value) result.expiryDate = { value, from: `${life.from} (made ${result.mfgDate.from})`, guessed: result.mfgDate.guessed };
  }

  if (result.mfgDate && result.mfgDate.value > todayKey) result.mfgDate = null; // cannot be made in the future: misread
  if (result.expiryDate && result.mfgDate && result.expiryDate.value < result.mfgDate.value) result.expiryDate = null;
  return result;
};

/** The form fields a scan fills in — only the ones it found, so a failed or partial read changes nothing else. */
export const scanChanges = (parsed) => {
  const changes = {};
  if (parsed?.expiryDate?.value) changes.expiryDate = parsed.expiryDate.value;
  if (parsed?.mfgDate?.value) changes.mfgDate = parsed.mfgDate.value;
  if (parsed?.lotNumber?.value) changes.lotNumber = parsed.lotNumber.value;
  return changes;
};

/** Plain-words summary of a scan for the cook: what was filled in and from which bit of the label. */
export const scanSummary = (parsed) => {
  const lines = [];
  if (parsed?.expiryDate) lines.push({ field: "expiryDate", label: "Expiry", from: parsed.expiryDate.from, guessed: parsed.expiryDate.guessed });
  if (parsed?.mfgDate) lines.push({ field: "mfgDate", label: "Made on", from: parsed.mfgDate.from, guessed: parsed.mfgDate.guessed });
  if (parsed?.lotNumber) lines.push({ field: "lotNumber", label: "Batch no.", from: parsed.lotNumber.from, guessed: false });
  return lines;
};
