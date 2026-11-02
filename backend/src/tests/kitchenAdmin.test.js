import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";

// Master data › Kitchens: a kitchen's logo, and (super-admin) the kitchen's users and their passwords.
let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    kitchen,
    root: await createUser({ role: "super_admin" }),
    admin: await createUser({ role: "admin" }),
    cook: await createUser({ role: "user", godownId: kitchen._id })
  };
});
const as = (who, method, url) => request(app)[method](url).set("Authorization", `Bearer ${ctx[who].token}`);
// A 1×1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("a kitchen's logo: an admin sets it, the kitchen app gets it from /me, and it can be removed; a cook cannot set it", async () => {
  assert.equal((await as("cook", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", PNG, "logo.png")).status, 403);
  const set = await as("admin", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", PNG, "logo.png");
  assert.equal(set.status, 200, JSON.stringify(set.body));
  assert.match(set.body.logoUrl, /\/uploads\/kitchen-logos\/.+\.png$/);
  assert.equal((await as("cook", "get", "/api/auth/me")).body.godown.logoUrl, set.body.logoUrl);
  assert.equal((await as("admin", "post", `/api/inventory/godowns/${ctx.kitchen._id}/logo`).attach("logo", Buffer.from("not an image"), "x.txt")).status, 400);
  assert.equal((await as("admin", "delete", `/api/inventory/godowns/${ctx.kitchen._id}/logo`)).body.logoUrl, "");
});
