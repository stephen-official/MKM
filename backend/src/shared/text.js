import { fail } from "./httpErrors.js";

/** Trimmed free text from a request (empty when missing); longer than `max` is a 400 naming the field by `label`. */
export const text = (value, max, label) => {
  const result = String(value || "").trim();
  if (result.length > max) throw fail(400, `${label} must be ${max} characters or fewer`);
  return result;
};
