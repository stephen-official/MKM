// Easy-to-say passwords for kitchen staff: a kitchen word, a dash and four digits, e.g. "Mango-4821" (8+ characters).
const WORDS = ["Rice", "Dal", "Mango", "Tomato", "Onion", "Ginger", "Lemon", "Curry", "Chilli", "Jaggery", "Ragi", "Jowar", "Banana", "Coconut", "Tamarind", "Pepper"];

/** `random` returns a number in [0, 1); crypto-backed in the browser so suggestions are not guessable. */
const cryptoRandom = () => {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 2 ** 32;
};

export const suggestPassword = (random = cryptoRandom) => {
  const word = WORDS[Math.floor(random() * WORDS.length)];
  const digits = String(Math.floor(random() * 10_000)).padStart(4, "0");
  return `${word}-${digits}`;
};
