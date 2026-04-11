import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../config/env.js";

test("env registration limits are numbers", () => {
  assert.equal(typeof env.adminRegistrationLimit, "number");
  assert.equal(typeof env.userRegistrationLimit, "number");
});
