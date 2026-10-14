import assert from "node:assert/strict";
import test from "node:test";
import { disconnectUser, io, revalidateSockets, roomsFor, setIo } from "../realtime.js";

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
  try {
    disconnectUser("u1");
    assert.deepEqual(calls, [["user:u1", true]]);
  } finally {
    setIo(null);
  }
});

test("emits are no-ops before setIo and delegate after", () => {
  assert.equal(io.to("admins").to("g1").emit("x", {}), false);
  const calls = [];
  const fake = { to: (room) => { calls.push(room); return fake; }, emit: (event) => { calls.push(event); return true; } };
  setIo(fake);
  try {
    io.to("admins").emit("ping");
    assert.deepEqual(calls, ["admins", "ping"]);
  } finally {
    setIo(null);
  }
});

test("revalidateSockets drops sockets whose user changed role, kitchen or active flag on any instance", async () => {
  const dropped = [];
  const sock = (id, role, godownId = null) => ({ data: { user: { id, role, godownId } }, disconnect: () => dropped.push(id) });
  const fake = { fetchSockets: async () => [sock("same", "admin"), sock("demoted", "admin"), sock("moved", "user", "g1"), sock("off", "user", "g1"), sock("gone", "admin")] };
  const current = [
    { _id: "same", role: "admin", godownId: null, active: true },
    { _id: "demoted", role: "user", godownId: "g1", active: true },
    { _id: "moved", role: "user", godownId: "g2", active: true },
    { _id: "off", role: "user", godownId: "g1", active: false }
  ];
  setIo(fake);
  try {
    const result = await revalidateSockets({ findUsers: async (ids) => current.filter((u) => ids.includes(u._id)) });
    assert.deepEqual(dropped.sort(), ["demoted", "gone", "moved", "off"]);
    assert.deepEqual(result, { checked: 5, dropped: 4 });
  } finally {
    setIo(null);
  }
});

test("revalidateSockets is a no-op before setIo", async () => {
  assert.deepEqual(await revalidateSockets({ findUsers: async () => [] }), { checked: 0, dropped: 0 });
});
