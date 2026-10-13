import { describe, expect, it } from "vitest";
import { isJwtExpired } from "./jwt.js";

const make = (payload) => `h.${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.s`;

describe("isJwtExpired", () => {
  const now = Date.UTC(2026, 0, 1);
  it("is false before exp and true after it", () => {
    expect(isJwtExpired(make({ exp: now / 1000 + 600 }), now)).toBe(false);
    expect(isJwtExpired(make({ exp: now / 1000 - 1 }), now)).toBe(true);
  });
  it("treats a token about to expire (inside the skew) as expired", () => {
    expect(isJwtExpired(make({ exp: now / 1000 + 2 }), now)).toBe(true);
  });
  it("treats a token without exp as not expired and garbage as expired", () => {
    expect(isJwtExpired(make({ sub: "1" }), now)).toBe(false);
    expect(isJwtExpired("garbage", now)).toBe(true);
    expect(isJwtExpired(undefined, now)).toBe(true);
  });
});
