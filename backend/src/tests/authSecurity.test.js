import assert from "node:assert/strict";
import test from "node:test";
import { assertProductionSecrets, parseTrustProxy } from "../config/env.js";
import { isValidPassword } from "../routes/authRoutes.js";
import { createResetToken, hashResetToken } from "../utils/tokens.js";

test("production requires both JWT secrets", () => {
  assert.throws(
    () => assertProductionSecrets({ nodeEnv: "production", jwtSecret: "", jwtRefreshSecret: "refresh" }),
    /JWT_SECRET/,
  );
  assert.throws(
    () => assertProductionSecrets({ nodeEnv: "production", jwtSecret: "access", jwtRefreshSecret: "" }),
    /JWT_REFRESH_SECRET/,
  );
  assert.doesNotThrow(() =>
    assertProductionSecrets({ nodeEnv: "production", jwtSecret: "access", jwtRefreshSecret: "refresh" }),
  );
  assert.doesNotThrow(() => assertProductionSecrets({ nodeEnv: "development" }));
});

test("production refuses process-wide TLS verification bypass", () => {
  assert.throws(
    () => assertProductionSecrets({
      nodeEnv: "production",
      jwtSecret: "access",
      jwtRefreshSecret: "refresh",
      tlsRejectUnauthorized: "0",
    }),
    /TLS certificate verification/,
  );
  assert.doesNotThrow(() => assertProductionSecrets({
    nodeEnv: "production",
    jwtSecret: "access",
    jwtRefreshSecret: "refresh",
    tlsRejectUnauthorized: "1",
  }));
});

test("TRUST_PROXY sets how many proxies sit in front of the app; unset keeps one hop", () => {
  assert.equal(parseTrustProxy(undefined), 1);
  assert.equal(parseTrustProxy(""), 1);
  assert.equal(parseTrustProxy("2"), 2);
  assert.equal(parseTrustProxy("0"), 0);
  assert.equal(parseTrustProxy("loopback, 10.0.0.0/8"), "loopback, 10.0.0.0/8");
  assert.equal(parseTrustProxy("10.0.0.1"), "10.0.0.1");
  for (const unsafe of ["true", "-1", "1.5"]) assert.throws(() => parseTrustProxy(unsafe), /TRUST_PROXY/, unsafe);
});

test("password validation enforces the minimum length", () => {
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("12345678"), true);
  assert.equal(isValidPassword(null), false);
});

test("reset tokens are random and stored as stable hashes", () => {
  const first = createResetToken();
  const second = createResetToken();

  assert.notEqual(first, second);
  assert.equal(first.length, 48);
  assert.equal(hashResetToken(first), hashResetToken(first));
  assert.notEqual(hashResetToken(first), first);
  assert.notEqual(hashResetToken(first), hashResetToken(second));
});
