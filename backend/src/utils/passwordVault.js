import crypto from "node:crypto";

// Kitchen passwords a super-admin sets stay viewable to super-admins (Anand, 2026-11-02: shared kitchen phones, staff
// without email). Only kitchen accounts, only passwords a super-admin set; a user who changes their own password clears it.
// The copy is sealed with AES-256-GCM under PASSWORD_VIEW_KEY (32 bytes, base64), kept in the server's environment and
// never in the database, so a copy of the database alone reveals nothing. Without the key nothing is stored.
// Make a key with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
const keyOf = () => {
  const raw = process.env.PASSWORD_VIEW_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
};

export const passwordViewEnabled = () => Boolean(keyOf());

/** The sealed copy ("iv.tag.data", base64 parts), or null when no key is set. */
export const sealPassword = (plain) => {
  const key = keyOf();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
};

/** The password, or null when there is no key or the copy was sealed with another key. */
export const openPassword = (sealed) => {
  const key = keyOf();
  if (!key || !sealed) return null;
  try {
    const [iv, tag, data] = String(sealed).split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};
