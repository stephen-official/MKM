import assert from "node:assert/strict";
import test from "node:test";
import { AppError, asyncRoute, errorResponse, fail, legacyErrorPolicy, typedErrorPolicy } from "../shared/httpErrors.js";

test("operational errors keep their public status, code and optional details", () => {
  const error = fail(400, "Choose a product", "PRODUCT_REQUIRED", { field: "stockItemId" });
  assert.ok(error instanceof AppError);
  assert.deepEqual(errorResponse(error), {
    status: 400,
    body: { code: "PRODUCT_REQUIRED", message: "Choose a product", details: { field: "stockItemId" } },
  });
});

test("database conflicts are stable and unknown failures do not leak internals", () => {
  assert.deepEqual(errorResponse(Object.assign(new Error("stale"), { name: "VersionError" })), {
    status: 409,
    body: { code: "VERSION_CONFLICT", message: "This record was changed by someone else. Reload and try again." },
  });
  assert.deepEqual(errorResponse(new Error("mongodb://user:password@internal/db")), {
    status: 500,
    body: { code: "SERVER_ERROR", message: "Internal Server Error" },
  });
});

test("route-scoped error messages keep established API wording", () => {
  const versionError = Object.assign(new Error("stale"), { name: "VersionError" });
  assert.equal(errorResponse(versionError, { versionConflictMessage: "Reload this order." }).body.message, "Reload this order.");
  assert.deepEqual(errorResponse(new Error("database failed"), { serverErrorMessage: "Delivery problems are unavailable" }), {
    status: 500,
    body: { code: "SERVER_ERROR", message: "Delivery problems are unavailable" },
  });
});

test("asyncRoute forwards a rejected handler to Express", async () => {
  const expected = new Error("failed");
  let forwarded;
  await asyncRoute(async () => { throw expected; })({}, {}, (error) => { forwarded = error; });
  assert.equal(forwarded, expected);
});

test("legacy policies preserve error-only, fixed-message and text responses", () => {
  const error = new Error("Stock unavailable");
  assert.deepEqual(errorResponse(error, legacyErrorPolicy({ status: 400 })), { status: 400, body: { error: "Stock unavailable" } });
  assert.deepEqual(errorResponse(error, legacyErrorPolicy({ field: "message", message: "Distribution failed", includeError: true })), {
    status: 500, body: { message: "Distribution failed", error: "Stock unavailable" },
  });
  assert.deepEqual(errorResponse(error, legacyErrorPolicy({ text: true, message: "Export failed" })), { status: 500, text: true, body: "Export failed" });
  assert.deepEqual(errorResponse(new Error(""), legacyErrorPolicy()), { status: 500, body: { error: "" } });
});

test("typed policies retain public fields, duplicate mappings and unknown-error masking", () => {
  const policy = typedErrorPolicy({ extraFields: ["fields"], fallbackCode: "INTERNAL_ERROR", fallbackMessage: "Something went wrong.", specials: [{ matches: (error) => error.code === 11000, status: 409, code: "DUPLICATE", message: "Already exists" }] });
  assert.equal(errorResponse({ code: 11000 }, policy).body.code, "DUPLICATE");
  assert.deepEqual(errorResponse(Object.assign(fail(400, "Invalid", "INVALID"), { fields: ["name"] }), policy).body, { code: "INVALID", message: "Invalid", fields: ["name"] });
  assert.equal(errorResponse(new Error("internal password"), policy).body.message, "Something went wrong.");
});

test("idempotency conflicts keep their standard envelope through legacy policies", () => {
  const error = Object.assign(fail(409, "Key reused", "IDEMPOTENCY_CONFLICT"), { stockCommandError: true });
  assert.deepEqual(errorResponse(error, legacyErrorPolicy({ status: 400 })), { status: 409, body: { code: "IDEMPOTENCY_CONFLICT", message: "Key reused" } });
});

test("asyncRoute also forwards synchronous failures with the configured policy", async () => {
  let forwarded;
  const expected = new Error("sync failure");
  const policy = legacyErrorPolicy({ status: 400 });
  await asyncRoute(() => { throw expected; }, policy)({}, {}, (error) => { forwarded = error; });
  assert.equal(forwarded, expected);
  assert.equal(forwarded.httpErrorOverrides, policy);
});

test("forwarding an error-like object retains its public status and code", async () => {
  let forwarded;
  await asyncRoute(async () => { throw { status: 400, code: "INVALID_INPUT", message: "Invalid" }; })({}, {}, (error) => { forwarded = error; });
  assert.ok(forwarded instanceof Error);
  assert.deepEqual(errorResponse(forwarded), { status: 400, body: { code: "INVALID_INPUT", message: "Invalid" } });
});

const mongoServerError = (message, code) => Object.assign(new Error(message), { name: "MongoServerError", code });

test("policies that echo error messages hide runtime and database internals but keep business messages", () => {
  const legacy = legacyErrorPolicy({ status: 400, field: "error", includeError: true });
  assert.deepEqual(legacy.formatError(new Error("Insufficient stock for Rice.")).body, { error: "Insufficient stock for Rice." });
  assert.deepEqual(legacy.formatError(new TypeError("Cannot read properties of undefined (reading 'qty')")), { status: 400, body: { error: "Internal Server Error" } });
  const duplicate = mongoServerError("E11000 duplicate key error collection: mkm.godowns index: name_1 dup key: { name: \"Main\" }", 11000);
  assert.deepEqual(legacy.formatError(duplicate).body, { error: "A record with these details already exists." });
  assert.deepEqual(legacyErrorPolicy({ status: 400, field: "error", fallback: "Failed to update consumption" }).formatError(mongoServerError("connection pool closed")).body,
    { error: "Failed to update consumption" });

  const typed = typedErrorPolicy({ useErrorMessage: true, fallbackCode: "CORRECTION_FAILED" });
  assert.deepEqual(typed.formatError(new Error("Stock record missing")).body, { code: "CORRECTION_FAILED", message: "Stock record missing" });
  assert.deepEqual(typed.formatError(new ReferenceError("row is not defined")).body, { code: "CORRECTION_FAILED", message: "Internal Server Error" });
});
