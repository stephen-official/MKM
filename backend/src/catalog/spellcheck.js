// Spelling hints for custom pack type names, from Datamuse (https://www.datamuse.com/api/): free, no key, and
// built for single words. A hint is advice only. Any failure (timeout, outage, odd reply) returns "no hint" so
// saving a product never depends on a third-party service.
const ENDPOINT = "https://api.datamuse.com";
const TIMEOUT_MS = 2000;
const MAX_WORDS = 3;
const MIN_LENGTH = 3;
const CACHE_LIMIT = 500;

// Datamuse lists rare and junk strings ("sak", "bagg") with low scores; real words score above this.
const KNOWN_SCORE = 2000;
const SUGGEST_SCORE = 1000; // a near-miss is scored on closeness to the query, so its floor is lower
const MAX_EDITS = 2;

const cache = new Map();

const remember = (word, verdict) => {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(word, verdict);
  return verdict;
};

const editDistance = (a, b) => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
};

const lookup = async (path, params, fetchImpl) => {
  const response = await fetchImpl(`${ENDPOINT}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Datamuse ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Unexpected Datamuse reply");
  return rows
    .map((row) => ({ word: String(row?.word ?? "").toLowerCase(), score: Number(row?.score) || 0 }))
    .filter((row) => /^[a-z]+$/.test(row.word) && row.score >= SUGGEST_SCORE);
};

/** { suggestions } for a lowercase letters-only word that looks misspelled, { suggestions: null } when it is a real word, or null when the service could not say. */
const verdictFor = async (word, fetchImpl) => {
  if (cache.has(word)) return cache.get(word);
  try {
    const similar = await lookup("/words", { sp: word, max: "8" }, fetchImpl);
    if (similar.some((row) => row.word === word && row.score >= KNOWN_SCORE)) return remember(word, { suggestions: null });
    const completions = await lookup("/sug", { s: word, max: "8" }, fetchImpl);
    const suggestions = [...new Set([...similar, ...completions].map((row) => row.word))]
      .map((candidate) => ({ candidate, edits: editDistance(word, candidate) }))
      .filter(({ edits }) => edits > 0 && edits <= MAX_EDITS)
      .sort((x, y) => x.edits - y.edits)
      .slice(0, 3)
      .map(({ candidate }) => candidate);
    return remember(word, { suggestions });
  } catch {
    return null; // not cached, so a later try can succeed
  }
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * `name` is a pack type as typed. Returns [{ word, suggestions }] for each word that looks misspelled.
 * Only plain alphabetic words of MIN_LENGTH+ letters are looked up; anything else is left alone.
 */
export const spellingHints = async (name, fetchImpl = globalThis.fetch) => {
  const words = [...new Set(String(name ?? "").toLowerCase().match(/[a-z]+/g) || [])].filter((w) => w.length >= MIN_LENGTH).slice(0, MAX_WORDS);
  const hints = [];
  for (const word of words) {
    const verdict = await verdictFor(word, fetchImpl);
    if (verdict?.suggestions) hints.push({ word, suggestions: verdict.suggestions.map(capitalize) });
  }
  return hints;
};

export const clearSpellingCache = () => cache.clear();
