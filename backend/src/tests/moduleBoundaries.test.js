import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint({ cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..") });
const errors = async (source, filePath) => (await eslint.lintText(source, { filePath }))[0].messages.filter((message) => message.severity === 2);

test("feature and infrastructure modules cannot import routes or application startup", async () => {
  for (const filePath of ["src/modules/example/service.js", "src/shared/example.js", "src/models/Example.js", "src/stock/example.js", "src/ordering/example.js"]) {
    for (const specifier of ["../../routes/operationsRoutes.js", "../app.js", "../server.js"]) {
      const messages = await errors(`import { helper } from '${specifier}';`, filePath);
      assert.equal(messages[0]?.ruleId, "no-restricted-imports", `${filePath}: ${specifier}`);
    }
  }
});

test("features call another feature through a service or rules, never its repository", async () => {
  assert.equal((await errors("import { read } from '../other/orderRepository.js';", "src/modules/example/service.js"))[0]?.ruleId, "no-restricted-imports");
  for (const specifier of ["./orderRepository.js", "../other/orderService.js", "../other/orderRules.js", "../../shared/httpErrors.js"]) {
    assert.deepEqual(await errors(`import { helper } from '${specifier}';`, "src/modules/example/service.js"), []);
  }
});
