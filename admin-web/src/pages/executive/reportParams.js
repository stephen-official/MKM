import { addDays } from "../../businessTime.js";

export const PRESETS = Object.freeze({ "7d": 7, "30d": 30, "90d": 90 });
export const DEFAULT_PRESET = "30d";
export const MAX_SPAN_DAYS = 366;
const HEX_ID = /^[a-f0-9]{24}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isIsoDate = (value) => {
  const m = DATE_RE.exec(value || "");
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
};
const span = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
const page = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};
const presetRange = (preset, today) => ({ from: addDays(today, -(PRESETS[preset] - 1)), to: today });

export const sanitizeReportParams = (search, { today, kitchenIds } = {}) => {
  let changed = false;
  let kitchenReset = false;

  let godownId = search.get("godownId") || "all";
  if (godownId !== "all" && (!HEX_ID.test(godownId) || (kitchenIds && !kitchenIds.has(godownId.toLowerCase())))) {
    godownId = "all";
    kitchenReset = true;
    changed = true;
  }
  // A canonical URL has a lower-case id and omits "all".
  if (search.has("godownId") && !kitchenReset && (godownId !== godownId.toLowerCase() || godownId === "all")) changed = true;
  godownId = godownId.toLowerCase();

  const rawPreset = search.get("range");
  const from = search.get("from");
  const to = search.get("to");
  let preset = rawPreset;
  let range;
  let rangeReset = false;
  const customValid = isIsoDate(from) && isIsoDate(to) && from <= to && to <= today && span(from, to) <= MAX_SPAN_DAYS;

  if (preset && Object.hasOwn(PRESETS, preset)) {
    range = presetRange(preset, today);
    // The default preset is implied by an absent `range`, so an explicit one is not canonical.
    if (from || to || preset === DEFAULT_PRESET) changed = true;
  } else if ((preset === "custom" || (!preset && (from || to))) && customValid) {
    if (!preset) changed = true;
    preset = "custom";
    range = { from, to };
  } else {
    if (preset || from || to) changed = true;
    // A custom range was asked for but is invalid (reversed, too long or in the future).
    rangeReset = preset === "custom" || (!preset && Boolean(from || to));
    preset = DEFAULT_PRESET;
    range = presetRange(preset, today);
  }

  const pages = { health: page(search.get("healthPage")), unpriced: page(search.get("unpricedPage")), comparison: page(search.get("comparisonPage")) };
  for (const [key, value] of [["healthPage", pages.health], ["unpricedPage", pages.unpriced], ["comparisonPage", pages.comparison]]) {
    if (search.has(key) && String(value) !== search.get(key)) changed = true;
  }
  return { godownId, preset, ...range, pages, kitchenReset, rangeReset, changed };
};

export const toSearchParams = (state) => {
  const out = new URLSearchParams();
  if (state.godownId !== "all") out.set("godownId", state.godownId);
  if (state.preset !== DEFAULT_PRESET) out.set("range", state.preset);
  if (state.preset === "custom") {
    out.set("from", state.from);
    out.set("to", state.to);
  }
  if (state.pages.health > 1) out.set("healthPage", String(state.pages.health));
  if (state.pages.unpriced > 1) out.set("unpricedPage", String(state.pages.unpriced));
  if (state.pages.comparison > 1) out.set("comparisonPage", String(state.pages.comparison));
  return out;
};

export const toApiQuery = (state) => ({
  godownId: state.godownId, from: state.from, to: state.to,
  healthPage: state.pages.health, unpricedPage: state.pages.unpriced, comparisonPage: state.pages.comparison
});

export const isDefault = (state) => toSearchParams(state).toString() === "";

/** Pickable dates for a custom range so an invalid (over-long or future) span cannot be chosen. */
export const customRangeBounds = ({ from, to, today }) => {
  const furthest = addDays(from, MAX_SPAN_DAYS - 1);
  return {
    fromMin: addDays(to, -(MAX_SPAN_DAYS - 1)),
    fromMax: to,
    toMin: from,
    toMax: furthest < today ? furthest : today
  };
};

/** With a kitchen selected, the first fetch waits until the kitchen list has loaded (or failed) so a stale id is caught first. */
export const canFetchReport = ({ godownId, kitchensSettled }) => godownId === "all" || kitchensSettled;

/**
 * The reset notice rides along in location state across the redirect. A POP navigation
 * (browser reload or back/forward) re-delivers the old state, so it must not re-show the notice.
 */
export const shouldShowKitchenReset = ({ resetNow, locationState, navigationType, key = "kitchenReset" }) =>
  resetNow || (navigationType !== "POP" && locationState?.[key] === true);
