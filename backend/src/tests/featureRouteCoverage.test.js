import assert from "node:assert/strict";
import { before, test } from "node:test";
import { ROUTE_RULES, classifyRoute, normalizePath } from "../features/registry.js";

let routes;
before(async () => {
  const { PROTECTED_MOUNTS, PUBLIC_MOUNTS } = await import("../app.js");
  routes = [];
  for (const [mount, router] of [...PUBLIC_MOUNTS, ...PROTECTED_MOUNTS]) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        if (method === "_all") continue;
        routes.push({ method: method.toUpperCase(), path: `${mount === "/" ? "" : mount}${layer.route.path}` });
      }
    }
  }
  routes.push({ method: "GET", path: "/api/health" });
});

test("every Express route is classified by the feature registry", () => {
  const missing = routes.filter((r) => !classifyRoute(r.method, r.path)).map((r) => `${r.method} ${r.path}`);
  assert.deepEqual([...new Set(missing)], []);
});

test("every registry rule matches at least one real route (no stale rules)", () => {
  const isWildcardOpen = (rule) => rule.type === "open" && (rule.path.endsWith("/*") || rule.method === "*");
  const stale = ROUTE_RULES.filter((rule) => !isWildcardOpen(rule)).filter((rule) =>
    !routes.some((r) => (rule.method === r.method) && classifyRoute(r.method, r.path) === rule)
  ).map((rule) => `${rule.method} ${rule.path}`);
  assert.deepEqual(stale, []);
});

test("routes reachable through /api/operations classify the same as through /api", () => {
  for (const r of routes.filter((x) => x.path.startsWith("/api/operations/"))) {
    assert.equal(classifyRoute(r.method, r.path), classifyRoute(r.method, normalizePath(r.path)));
  }
});
