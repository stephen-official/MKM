import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import jwt from "jsonwebtoken";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { User } from "../models/User.js";

let app;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
beforeEach(clearDb);
after(stopDb);

const register = (body) => request(app).post("/api/auth/register").send({ name: "N", email: "n@x.io", password: "Passw0rd!", ...body });

test("public registration rejects privileged roles", async () => {
  const godown = await createGodown("K");
  assert.equal((await register({ role: "super_admin", godownId: godown._id })).status, 403);
  assert.equal((await register({ role: "admin", godownId: godown._id })).status, 403);
  assert.equal((await register({ role: "manager", godownId: godown._id })).status, 400);
  assert.equal(await User.countDocuments({}), 0);
});

test("super_admin can log in, refresh and keeps its role in new tokens", async () => {
  const { user, password } = await createUser({ role: "super_admin", email: "boss@x.io" });
  const login = await request(app).post("/api/auth/login").send({ email: "boss@x.io", password });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, "super_admin");
  assert.equal(jwt.decode(login.body.accessToken).role, "super_admin");

  const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
  assert.equal(refresh.status, 200);
  assert.equal(jwt.decode(refresh.body.accessToken).role, "super_admin");

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${refresh.body.accessToken}`);
  assert.equal(me.body.role, "super_admin");
  assert.equal(String(me.body._id), String(user._id));
});

test("inactive super_admin cannot log in, refresh or call APIs", async () => {
  const { user, token, refreshToken, password } = await createUser({ role: "super_admin", email: "off@x.io" });
  await User.updateOne({ _id: user._id }, { active: false });
  assert.equal((await request(app).post("/api/auth/login").send({ email: "off@x.io", password })).status, 401);
  assert.equal((await request(app).post("/api/auth/refresh").send({ refreshToken })).status, 401);
  assert.equal((await request(app).get("/api/consumptions").set("Authorization", `Bearer ${token}`)).status, 401);
});

test("logout revokes the refresh token for any role", async () => {
  for (const role of ["super_admin", "admin"]) {
    const { token, refreshToken } = await createUser({ role });
    const out = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    assert.equal(out.status, 204);
    assert.equal((await request(app).post("/api/auth/refresh").send({ refreshToken })).status, 401);
  }
  assert.equal((await request(app).post("/api/auth/logout")).status, 401);
});
