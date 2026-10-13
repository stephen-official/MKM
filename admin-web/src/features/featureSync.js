import { ROLES } from "../roles.js";

/** A FEATURE_DISABLED event right after a refresh adds nothing; skip it. */
export const DISABLED_REFRESH_DEBOUNCE_MS = 2_000;

export const shouldRefreshAfterDisabled = (lastRefreshAt, now = Date.now()) =>
  !lastRefreshAt || now - lastRefreshAt >= DISABLED_REFRESH_DEBOUNCE_MS;

// `/api/features` reports the caller's audience; admin-tier audiences map to a console role.
const AUDIENCE_ROLE = { super_admin: ROLES.SUPER_ADMIN, admin: ROLES.ADMIN };

/**
 * Compares the server's view of the caller (`audience`) with the session role.
 * - same role: nothing to do
 * - different admin-tier role: update the stored session role
 * - anything else (kitchen audience): this console is not for that account, sign out
 */
export const reconcileAudience = (audience, sessionRole) => {
  const expected = AUDIENCE_ROLE[audience];
  if (!expected) return { type: "sign-out" };
  return expected === sessionRole ? { type: "none" } : { type: "set-role", role: expected };
};
