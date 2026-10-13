/** True when the JWT's `exp` has passed (or is within `skewMs`). Unreadable tokens count as expired. */
export const isJwtExpired = (token, now = Date.now(), skewMs = 5_000) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload));
    if (typeof exp !== "number") return false;
    return exp * 1000 - skewMs <= now;
  } catch {
    return true;
  }
};

/** The `sub` (user id) claim of a JWT, or null when it cannot be read. */
export const jwtSubject = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { sub } = JSON.parse(atob(payload));
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
};
