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

/** "+919876543210" → "+91 98765 43210"; other countries are shown as stored. */
export const formatPhone = (phone) => {
  const match = /^\+91(\d{5})(\d{5})$/.exec(String(phone || ""));
  return match ? `+91 ${match[1]} ${match[2]}` : String(phone || "");
};

// The WhatsApp box takes digits only: a 10-digit Indian mobile number (the server stores it as +91…).
/** Whatever was typed or pasted, as at most 10 digits; a pasted 91 or 0 in front of a mobile number is dropped. */
export const phoneInput = (text) => {
  const digits = String(text || "").replace(/\D/g, "");
  if (/^91\d{10}$/.test(digits) || /^0\d{10}$/.test(digits)) return digits.slice(-10);
  return digits.slice(0, 10);
};
/** A stored "+919876543210" as the 10 digits the box shows. */
export const phoneDigits = (stored) => String(stored || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
/** True for a full Indian mobile number: 10 digits starting 6–9. */
export const isMobile = (digits) => /^[6-9]\d{9}$/.test(digits);
