import assert from "node:assert/strict";
import test from "node:test";
import { AppError, asyncRoute, errorResponse, fail } from "../shared/httpErrors.js";

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
