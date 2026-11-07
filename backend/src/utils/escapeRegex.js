/** Escapes text so it matches literally inside a MongoDB `$regex` or `new RegExp`. */
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
