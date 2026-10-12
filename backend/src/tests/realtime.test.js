import assert from "node:assert/strict";
import test from "node:test";
import { io, roomsFor, setIo } from "../realtime.js";

test("admin-tier users join the admins room only", () => {
  assert.deepEqual(roomsFor({ role: "admin", godownId: null }), ["admins"]);
  assert.deepEqual(roomsFor({ role: "super_admin", godownId: null }), ["admins"]);
  assert.deepEqual(roomsFor({ role: "super_admin", godownId: "abc" }), ["admins"]);
});

test("kitchen users join their kitchen room; a user without a kitchen joins nothing", () => {
  assert.deepEqual(roomsFor({ role: "user", godownId: "g1" }), ["g1"]);
  assert.deepEqual(roomsFor({ role: "user", godownId: null }), []);
  assert.deepEqual(roomsFor(undefined), []);
});

test("emits are no-ops before setIo and delegate after", () => {
  assert.equal(io.to("admins").to("g1").emit("x", {}), false);
  const calls = [];
  const fake = { to: (room) => { calls.push(room); return fake; }, emit: (event) => { calls.push(event); return true; } };
  setIo(fake);
  io.to("admins").emit("ping");
  assert.deepEqual(calls, ["admins", "ping"]);
  setIo(null);
});
