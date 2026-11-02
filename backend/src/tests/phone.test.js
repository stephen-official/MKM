import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePhone } from "../utils/phone.js";

test("WhatsApp numbers are stored as + and digits; a 10-digit Indian mobile gets +91", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("098765-43210"), "+919876543210");
  assert.equal(normalizePhone("91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("5876543210"), null, "Indian mobiles start with 6–9");
});
