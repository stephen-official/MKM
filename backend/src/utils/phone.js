// WhatsApp numbers for kitchen users, stored in one form: "+" and digits, e.g. +919876543210.
// A 10-digit Indian mobile number (with or without 0 / 91 in front) gets +91; anything else must start with + and a country code.
export const normalizePhone = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const digits = text.replace(/[^\d]/g, "");
  if (text.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (/^0?[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(-10)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
};
