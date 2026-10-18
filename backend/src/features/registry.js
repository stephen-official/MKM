// Single source of truth for feature visibility: which feature owns which HTTP route.
// featureGate enforces it, the admin UI renders it, and featureRouteCoverage.test.js
// fails if an Express route is missing here or a rule here matches no route.

export const FEATURES = Object.freeze([
  { key: "products", label: "Products", navPath: "/products", audiences: ["admin", "kitchen"] },
  { key: "inventory", label: "Inventory Setup", navPath: "/inventory-info", audiences: ["admin"] },
  { key: "indent", label: "Purchase Planning", navPath: "/indent", audiences: ["admin", "kitchen"] },
  { key: "purchase-orders", label: "Purchase Orders", navPath: "/purchase-orders", audiences: ["admin", "kitchen"] },
  { key: "stock-distribution", label: "Distribute Purchases", navPath: "/stock-distribution", audiences: ["admin"] },
  { key: "godowns", label: "Stock Levels", navPath: "/godowns", audiences: ["admin"] },
  { key: "transfer-stock", label: "Stock Transfers", navPath: "/transfer-stock", audiences: ["admin", "kitchen"] },
  { key: "requests", label: "Usage Approvals", navPath: "/requests", audiences: ["admin", "kitchen"] },
  { key: "consumption", label: "Usage Records", navPath: "/consumption", audiences: ["admin", "kitchen"] },
  { key: "reports", label: "Exports", navPath: "/reports", audiences: ["admin"] },
  { key: "product-ledger", label: "Product Ledger", navPath: "/product-ledger", audiences: ["admin"] }
]);

export const FEATURE_KEYS = FEATURES.map((feature) => feature.key);
const KEY_SET = new Set(FEATURE_KEYS);
export const isFeatureKey = (key) => typeof key === "string" && KEY_SET.has(key);

const feature = (method, path, features, kind, side = "admin") =>
  ({ method, path, type: "feature", features, kind, side });
const lookup = (method, path) => ({ method, path, type: "lookup" });
const open = (method, path) => ({ method, path, type: "open" });

// Order matters only where a literal segment and a :param share a position
// (product-ledger/godowns before product-ledger/:productId): first match wins.
export const ROUTE_RULES = Object.freeze([
  // --- open: auth, self-service, notifications, super-admin APIs ---
  open("GET", "/api/health"),
  open("*", "/api/auth/*"),
  open("GET", "/api/my-kitchen-stock"),
  open("GET", "/api/procurement/stock-balance"),
  open("GET", "/api/procurement/my-stock"),
  open("GET", "/api/notifications"),
  open("*", "/api/features/*"),
  open("*", "/api/features"),
  open("*", "/api/executive/*"),
  open("*", "/api/users/*"),
  open("*", "/api/users"),
  open("*", "/api/report-schedules/*"),
  open("*", "/api/report-schedules"),
  open("*", "/api/ordering-settings"),

  // --- shared lookups (other modules depend on them) ---
  lookup("GET", "/api/inventory/:type"),
  lookup("GET", "/api/godown-stocks"),

  // --- products (master catalog) + kitchen product requests ---
  feature("GET", "/api/products/units", ["products"], "read"),
  feature("GET", "/api/products/export/excel", ["products"], "read"),
  feature("GET", "/api/products/import-template", ["products"], "read"),
  feature("POST", "/api/products/import", ["products"], "mutation"),
  feature("POST", "/api/products/upload-image", ["products"], "mutation"),
  feature("GET", "/api/products", ["products"], "read"),
  feature("GET", "/api/products/:id", ["products"], "read"),
  feature("POST", "/api/products", ["products"], "mutation"),
  feature("PUT", "/api/products/:id", ["products"], "mutation"),
  feature("POST", "/api/products/:id/archive", ["products"], "mutation"),
  feature("POST", "/api/products/:id/restore", ["products"], "mutation"),
  feature("GET", "/api/product-requests/me", ["products"], "read", "kitchen"),
  feature("GET", "/api/product-requests", ["products"], "read"),
  feature("POST", "/api/product-requests", ["products"], "mutation", "kitchen"),
  feature("POST", "/api/product-requests/:id/approve", ["products"], "mutation"),
  feature("POST", "/api/product-requests/:id/reject", ["products"], "mutation"),

  // --- inventory ---
  feature("GET", "/api/inventory/:type/export/excel", ["inventory"], "read"),
  feature("POST", "/api/inventory/:type", ["inventory"], "mutation"),
  feature("PUT", "/api/inventory/:type/:id", ["inventory"], "mutation"),
  feature("DELETE", "/api/inventory/:type/:id", ["inventory"], "mutation"),

  // --- indent (admin) + supply requests (kitchen) ---
  feature("GET", "/api/indent-requests/me", ["indent"], "read", "kitchen"),
  feature("GET", "/api/indent-requests", ["indent"], "read"),
  feature("POST", "/api/indent-requests", ["indent"], "mutation", "kitchen"),
  feature("PATCH", "/api/indent-requests/:id/confirm", ["indent"], "mutation"),
  feature("PATCH", "/api/indent-requests/:id/select-item", ["indent"], "mutation"),
  feature("PATCH", "/api/indent-requests/:id/reject", ["indent"], "mutation"),
  feature("POST", "/api/indent-requests/:id/receive", ["indent"], "mutation", "both"),
  feature("PUT", "/api/indent-requests/:id", ["indent"], "mutation", "kitchen"),
  feature("DELETE", "/api/indent-requests/:id", ["indent"], "mutation", "both"),
  feature("GET", "/api/procurement/indents", ["indent"], "read"),
  feature("GET", "/api/procurement/indents/:id/preview", ["indent"], "read"),
  feature("POST", "/api/procurement/indents", ["indent"], "mutation"),
  feature("POST", "/api/procurement/indents/:id/mark-purchased", ["indent"], "mutation"),

  // --- purchase orders (list shared with stock distribution) ---
  feature("GET", "/api/procurement/purchase-orders/purchased-indents", ["purchase-orders"], "read"),
  feature("GET", "/api/procurement/purchase-orders", ["purchase-orders", "stock-distribution"], "read"),
  feature("POST", "/api/procurement/purchase-orders", ["purchase-orders"], "mutation"),
  feature("GET", "/api/procurement/collaborative-purchase-orders", ["purchase-orders"], "read", "both"),
  feature("POST", "/api/procurement/collaborative-purchase-orders", ["purchase-orders"], "mutation", "both"),
  feature("GET", "/api/procurement/collaborative-purchase-orders/:id", ["purchase-orders"], "read", "both"),
  feature("POST", "/api/procurement/collaborative-purchase-orders/:id/contributions", ["purchase-orders"], "mutation", "kitchen"),
  feature("PUT", "/api/procurement/collaborative-purchase-orders/:id/contributions/me", ["purchase-orders"], "mutation", "kitchen"),
  feature("DELETE", "/api/procurement/collaborative-purchase-orders/:id/contributions/me", ["purchase-orders"], "mutation", "kitchen"),
  feature("POST", "/api/procurement/collaborative-purchase-orders/:id/approve", ["purchase-orders"], "mutation"),
  feature("PATCH", "/api/procurement/collaborative-purchase-orders/:id/status", ["purchase-orders"], "mutation"),

  // --- stock distribution ---
  feature("GET", "/api/procurement/distributions/logs", ["stock-distribution"], "read"),
  feature("GET", "/api/procurement/distributions/leftovers", ["stock-distribution"], "read"),
  feature("GET", "/api/procurement/distributions/:id/details", ["stock-distribution"], "read"),
  feature("POST", "/api/procurement/distributions", ["stock-distribution"], "mutation"),

  // --- godowns ---
  feature("GET", "/api/procurement/godown-stocks", ["godowns"], "read"),
  feature("GET", "/api/procurement/godown-stocks/:godownId", ["godowns"], "read"),
  feature("GET", "/api/procurement/stock-batches", ["godowns"], "read"),
  feature("POST", "/api/procurement/opening-balances", ["godowns"], "mutation"),
  feature("POST", "/api/procurement/godown-stocks/:id/threshold", ["godowns"], "mutation"),
  feature("DELETE", "/api/procurement/godown-stocks/:id", ["godowns"], "mutation"),

  // --- transfers ---
  feature("GET", "/api/transfers", ["transfer-stock"], "read", "both"),
  feature("POST", "/api/transfers", ["transfer-stock"], "mutation", "both"),
  feature("GET", "/api/user-transfers/incoming", ["transfer-stock"], "read", "kitchen"),
  feature("GET", "/api/user-transfers/history", ["transfer-stock"], "read", "kitchen"),
  feature("POST", "/api/user-transfers", ["transfer-stock"], "mutation", "kitchen"),
  feature("POST", "/api/user-transfers/:id/accept", ["transfer-stock"], "mutation", "kitchen"),
  feature("POST", "/api/user-transfers/:id/reject", ["transfer-stock"], "mutation", "kitchen"),

  // --- requests ---
  feature("GET", "/api/requests", ["requests"], "read", "both"),
  feature("POST", "/api/requests", ["requests"], "mutation", "kitchen"),
  feature("POST", "/api/requests/:id/approve", ["requests"], "mutation"),
  feature("POST", "/api/requests/:id/reject", ["requests"], "mutation"),

  // --- unified usage log ---
  feature("GET", "/api/consumptions/me", ["consumption"], "read", "kitchen"),
  feature("GET", "/api/consumptions", ["consumption"], "read"),
  feature("POST", "/api/consumptions", ["consumption"], "mutation", "both"),
  feature("POST", "/api/orders", ["consumption"], "mutation", "both"),
  feature("PATCH", "/api/consumptions/:id", ["consumption"], "mutation"),
  feature("DELETE", "/api/consumptions/:id", ["consumption"], "mutation"),

  // --- reports ---
  feature("GET", "/api/reports/:entity/export/excel/:id", ["reports"], "read"),
  feature("GET", "/api/reports/:entity/export/excel", ["reports"], "read"),
  feature("GET", "/api/reports/:entity", ["reports"], "read"),

  // --- product ledger ---
  feature("GET", "/api/product-ledger/godowns", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/products", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/:productId/export/excel", ["product-ledger"], "read"),
  feature("GET", "/api/product-ledger/:productId", ["product-ledger"], "read")
]);

export const normalizePath = (raw) => {
  // Express routing is case-insensitive, so match case-insensitively (rule paths are lower-case).
  let path = String(raw || "").split("?")[0].toLowerCase();
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/api/operations") return "/api";
  if (path.startsWith("/api/operations/")) return `/api/${path.slice("/api/operations/".length)}`;
  return path;
};

const compile = (pattern) => {
  const wildcard = pattern.endsWith("/*");
  const base = wildcard ? pattern.slice(0, -2) : pattern;
  const body = base
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${body}${wildcard ? "(?:/.*)?" : ""}$`);
};

const COMPILED = ROUTE_RULES.map((rule) => ({ rule, regex: compile(rule.path) }));
const OPTIONS_RULE = Object.freeze({ method: "OPTIONS", path: "*", type: "open" });

export const classifyRoute = (method, path) => {
  const verb = String(method || "").toUpperCase() === "HEAD" ? "GET" : String(method || "").toUpperCase();
  if (verb === "OPTIONS") return OPTIONS_RULE;
  const normalized = normalizePath(path);
  const hit = COMPILED.find(({ rule, regex }) => (rule.method === "*" || rule.method === verb) && regex.test(normalized));
  return hit ? hit.rule : null;
};

export const describeFeature = (key) => {
  const label = (rule) => `${rule.method} ${rule.path}`;
  const own = ROUTE_RULES.filter((rule) => rule.type === "feature" && rule.features.includes(key));
  return {
    reads: own.filter((r) => r.kind === "read" && r.side !== "kitchen").map(label),
    mutations: own.filter((r) => r.kind === "mutation" && r.side !== "kitchen").map(label),
    kitchen: own.filter((r) => r.side === "kitchen" || r.side === "both").map(label),
    sharedWith: own.filter((r) => r.features.length > 1).map((r) => ({ route: label(r), features: [...r.features] }))
  };
};
