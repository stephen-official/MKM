import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";

let app;
before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
beforeEach(clearDb);
after(stopDb);

test("app is importable without starting the HTTP server", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("protected routes require a token", async () => {
  const res = await request(app).get("/api/requests");
  assert.equal(res.status, 401);
});

test("a route that emits socket events works before io is attached", async () => {
  const godown = await createGodown("Smoke Kitchen");
  const { token } = await createUser({ role: "user", godownId: godown._id });
  const res = await request(app)
    .post("/api/requests")
    .set("Authorization", `Bearer ${token}`)
    .send({ targetDate: "2026-10-12", reason: "smoke", items: [] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
});
