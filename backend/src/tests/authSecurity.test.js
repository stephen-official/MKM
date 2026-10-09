import assert from "node:assert/strict";
import test from "node:test";
import { assertProductionSecrets } from "../config/env.js";
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
