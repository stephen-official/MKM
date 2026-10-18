import assert from "node:assert/strict";
import test from "node:test";
import { FEATURE_KEYS, ROUTE_RULES, classifyRoute, describeFeature, isFeatureKey, normalizePath } from "../features/registry.js";

test("feature keys are exactly the admin modules", () => {
  assert.deepEqual(FEATURE_KEYS, [
    "products", "inventory", "indent", "purchase-orders", "stock-distribution", "godowns",
    "transfer-stock", "requests", "consumption", "reports", "product-ledger"
  ]);
  assert.equal(isFeatureKey("executive-report"), false);
  assert.equal(isFeatureKey("__proto__"), false);
});

test("every feature rule references known keys", () => {
  for (const rule of ROUTE_RULES.filter((r) => r.type === "feature")) {
    assert.ok(rule.features.length > 0, `${rule.method} ${rule.path}`);
    for (const key of rule.features) assert.ok(isFeatureKey(key), `${rule.method} ${rule.path}: ${key}`);
    assert.ok(["read", "mutation"].includes(rule.kind));
  }
});

test("normalizePath folds the operations alias, query strings and trailing slashes", () => {
  assert.equal(normalizePath("/api/operations/requests/"), "/api/requests");
  assert.equal(normalizePath("/api/operations"), "/api");
  assert.equal(normalizePath("/api/requests?x=1"), "/api/requests");
});

test("matching is case-insensitive like Express routing", () => {
  assert.equal(normalizePath("/API/Operations/Requests/"), "/api/requests");
  for (const path of ["/API/Requests/x/approve", "/api/Operations/requests/x/approve"]) {
    const rule = classifyRoute("POST", path);
    assert.ok(rule, `${path} is unclassified`);
    assert.equal(rule.type, "feature");
    assert.deepEqual(rule.features, ["requests"]);
  }
});

const cases = [
  ["GET", "/api/inventory/stock-items", "lookup"],
  ["GET", "/api/inventory/godowns", "lookup"],
  ["POST", "/api/inventory/stock-items", "inventory"],
  ["PUT", "/api/inventory/units/abc", "inventory"],
  ["DELETE", "/api/inventory/units/abc", "inventory"],
  ["GET", "/api/inventory/units/export/excel", "inventory"],
  ["POST", "/api/products/upload-image", "products"],
  ["PUT", "/api/products/123", "products"],
  ["POST", "/api/product-requests/123/approve", "products"],
  ["GET", "/api/procurement/purchase-orders", "purchase-orders|stock-distribution"],
  ["POST", "/api/procurement/purchase-orders", "purchase-orders"],
  ["GET", "/api/procurement/distributions/leftovers", "stock-distribution"],
  ["GET", "/api/procurement/distributions/abc/details", "stock-distribution"],
  ["GET", "/api/godown-stocks", "lookup"],
  ["GET", "/api/operations/godown-stocks", "lookup"],
  ["POST", "/api/procurement/godown-stocks/abc/threshold", "godowns"],
  ["GET", "/api/requests", "requests"],
  ["GET", "/api/operations/requests", "requests"],
  ["POST", "/api/requests/abc/approve", "requests"],
  ["PATCH", "/api/daily-usage/abc", "consumption"],
  ["POST", "/api/daily-usage", "consumption"],
  ["GET", "/api/product-ledger/godowns", "product-ledger"],
  ["GET", "/api/product-ledger/abc", "product-ledger"],
  ["GET", "/api/reports/indents/export/excel", "reports"],
  ["HEAD", "/api/reports/indents", "reports"],
  ["GET", "/api/notifications", "open"],
  ["POST", "/api/auth/login", "open"],
  ["GET", "/api/features", "open"],
  ["PUT", "/api/features", "open"],
  ["GET", "/api/executive/summary", "open"],
  ["OPTIONS", "/api/requests", "open"]
];

test("classifyRoute", () => {
  for (const [method, path, expected] of cases) {
    const rule = classifyRoute(method, path);
    assert.ok(rule, `${method} ${path} is unclassified`);
    const actual = rule.type === "feature" ? rule.features.join("|") : rule.type;
    assert.equal(actual, expected, `${method} ${path}`);
  }
  assert.equal(classifyRoute("GET", "/api/definitely-not-a-route"), null);
});

test("describeFeature lists reads, mutations, kitchen routes and shared rules", () => {
  const po = describeFeature("purchase-orders");
  assert.ok(po.mutations.includes("POST /api/procurement/purchase-orders"));
  assert.deepEqual(po.sharedWith, [{ route: "GET /api/procurement/purchase-orders", features: ["purchase-orders", "stock-distribution"] }]);
  const transfers = describeFeature("transfer-stock");
  assert.ok(transfers.kitchen.includes("POST /api/user-transfers/:id/accept"));
});
