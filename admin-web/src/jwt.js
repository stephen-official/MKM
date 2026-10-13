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
