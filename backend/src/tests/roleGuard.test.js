import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SCANNED = ["backend/src", "admin-web/src", "client-web/src"];
const ALLOWED = new Set(["backend/src/utils/roles.js", "admin-web/src/roles.js"]);
const DIRECT = /\brole\s*[!=]==?\s*["'](admin|super_admin|user)["']|["'](admin|super_admin|user)["']\s*[!=]==?\s*[\w.]*role\b/;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return ["node_modules", "tests", "dist"].includes(entry.name) ? [] : walk(full);
  return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
});

test("no code compares a role to admin/super_admin/user directly", () => {
  const offenders = [];
  for (const base of SCANNED) {
    for (const file of walk(path.join(root, base))) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (ALLOWED.has(rel)) continue;
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (DIRECT.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(offenders, [], `Use isAdminRole/isSuperAdmin/isKitchenRole or ROLES instead:\n${offenders.join("\n")}`);
});
