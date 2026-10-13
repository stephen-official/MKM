import assert from "node:assert/strict";
import test from "node:test";
import { disconnectUser, io, roomsFor, setIo } from "../realtime.js";

test("admin-tier users join the admins room and their personal room", () => {
  assert.deepEqual(roomsFor({ id: "u1", role: "admin", godownId: null }), ["admins", "user:u1"]);
  assert.deepEqual(roomsFor({ id: "u2", role: "super_admin", godownId: null }), ["admins", "user:u2"]);
  assert.deepEqual(roomsFor({ id: "u2", role: "super_admin", godownId: "abc" }), ["admins", "user:u2"]);
});

test("kitchen users join their kitchen room and personal room; without a kitchen only the personal room", () => {
  assert.deepEqual(roomsFor({ id: "u3", role: "user", godownId: "g1" }), ["g1", "user:u3"]);
  assert.deepEqual(roomsFor({ id: "u3", role: "user", godownId: null }), ["user:u3"]);
  assert.deepEqual(roomsFor(undefined), []);
});

test("disconnectUser is a no-op before setIo and drops the user's room afterwards", () => {
  assert.doesNotThrow(() => disconnectUser("u1"));
  const calls = [];
  const fake = { in: (room) => ({ disconnectSockets: (close) => calls.push([room, close]) }) };
  setIo(fake);
  disconnectUser("u1");
  assert.deepEqual(calls, [["user:u1", true]]);
  setIo(null);
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
