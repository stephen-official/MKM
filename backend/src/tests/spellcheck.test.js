import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { clearSpellingCache, spellingHints } from "../catalog/spellcheck.js";

beforeEach(clearSpellingCache);

// Fakes Datamuse: `words` answers /words (sp=), `sug` answers /sug (s=).
const datamuse = ({ words = [], sug = [], ok = true } = {}) => async (url) => ({
  ok,
  json: async () => (String(url).includes("/sug") ? sug : words)
});

test("a real word (high score, exact match) gets no hint", async () => {
  assert.deepEqual(await spellingHints("Sack", datamuse({ words: [{ word: "sack", score: 11053 }] })), []);
  assert.deepEqual(await spellingHints("Tub", datamuse({ words: [{ word: "tub", score: 2055 }] })), []);
});

test("a low-scoring junk entry is treated as misspelled and gets close suggestions", async () => {
  const hints = await spellingHints("Sak", datamuse({
    words: [{ word: "sak", score: 12 }],
    sug: [{ word: "sake", score: 5046 }, { word: "sakhalin", score: 1014 }, { word: "sakura", score: 1009 }]
  }));
  assert.deepEqual(hints, [{ word: "sak", suggestions: ["Sake"] }]);
});

test("a typo is flagged with the nearest real words first", async () => {
  const hints = await spellingHints("Cartn", datamuse({
    words: [{ word: "cart", score: 7055 }, { word: "carte", score: 3027 }, { word: "carton", score: 2040 }, { word: "caron", score: 1008 }]
  }));
  assert.deepEqual(hints, [{ word: "cartn", suggestions: ["Cart", "Carte", "Carton"] }]);
});

test("an unknown word with no near matches is still flagged, without suggestions", async () => {
  assert.deepEqual(await spellingHints("Sakc", datamuse()), [{ word: "sakc", suggestions: [] }]);
});

test("outages, bad replies and timeouts mean no hint rather than an error", async () => {
  assert.deepEqual(await spellingHints("Sak", datamuse({ ok: false })), []);
  assert.deepEqual(await spellingHints("Sak", datamuse({ words: { error: "x" } })), []);
  assert.deepEqual(await spellingHints("Sak", async () => { throw new Error("network down"); }), []);
});

test("short words, symbols and wildcards are never sent to the service", async () => {
  let calls = 0;
  const spy = async () => { calls += 1; return { ok: true, json: async () => [] }; };
  await spellingHints("A3 */?", spy);
  await spellingHints("", spy);
  assert.equal(calls, 0);
});

test("verdicts are cached per word", async () => {
  let calls = 0;
  const spy = async () => { calls += 1; return { ok: true, json: async () => [{ word: "sack", score: 11053 }] }; };
  await spellingHints("Sack", spy);
  await spellingHints("sack", spy);
  assert.equal(calls, 1);
});
