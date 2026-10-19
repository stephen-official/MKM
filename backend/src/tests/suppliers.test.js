import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const kitchen = await createGodown("Kitchen A");
  ctx = {
    cook: await createUser({ role: "user", godownId: kitchen._id }),
    admin: await createUser({ role: "admin" }),
  };
});

const as = (actor) => ({
  list: (query = "") => request(app).get(`/api/suppliers${query}`).set("Authorization", `Bearer ${actor.token}`),
  create: (body) => request(app).post("/api/suppliers").set("Authorization", `Bearer ${actor.token}`).send(body),
  update: (id, body) => request(app).put(`/api/suppliers/${id}`).set("Authorization", `Bearer ${actor.token}`).send(body),
});
const good = { name: "Sri Lakshmi Traders", fssaiLicence: "12345678901234", phone: "9876543210" };

test("an admin adds a supplier and reads it back; the licence is stored as 14 digits", async () => {
  const created = await as(ctx.admin).create({ ...good, fssaiLicence: "1234 5678 9012 34" });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.fssaiLicence, "12345678901234");
  assert.equal(created.body.active, true);
  const list = await as(ctx.admin).list();
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((s) => s.name), ["Sri Lakshmi Traders"]);
});

test("a kitchen user cannot add or change suppliers", async () => {
  assert.equal((await as(ctx.cook).create(good)).status, 403);
  const created = await as(ctx.admin).create(good);
  assert.equal((await as(ctx.cook).update(created.body._id, { name: "X" })).status, 403);
});

test("a bad licence number or missing name is refused with a plain message", async () => {
  const badLicence = await as(ctx.admin).create({ ...good, fssaiLicence: "1234" });
  assert.equal(badLicence.status, 400);
  assert.equal(badLicence.body.code, "INVALID_INPUT");
  assert.match(badLicence.body.message, /14 digits/);
  const noName = await as(ctx.admin).create({ ...good, name: "  " });
  assert.equal(noName.status, 400);
  assert.match(noName.body.message, /name/i);
});

test("two suppliers cannot share a name", async () => {
  assert.equal((await as(ctx.admin).create(good)).status, 201);
  const dup = await as(ctx.admin).create({ ...good, name: "sri lakshmi traders" });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, "DUPLICATE_NAME");
});

test("an admin edits a supplier and archives it; archived suppliers are hidden unless asked for", async () => {
  const created = await as(ctx.admin).create(good);
  const edited = await as(ctx.admin).update(created.body._id, { fssaiLicence: "99999999999999", active: false });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.fssaiLicence, "99999999999999");
  assert.equal(edited.body.name, good.name);
  assert.equal(edited.body.active, false);
  assert.deepEqual((await as(ctx.admin).list()).body, []);
  assert.equal((await as(ctx.admin).list("?status=all")).body.length, 1);
  assert.equal((await as(ctx.admin).update("000000000000000000000000", { name: "Z" })).status, 404);
});
