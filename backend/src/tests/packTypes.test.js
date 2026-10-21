import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { canonicalPackName, isPresetPackType } from "../catalog/packTypes.js";

let app;
let admin;
let group;
let unit;

before(async () => {
  await startDb();
  ({ app } = await import("../app.js"));
});
after(stopDb);

beforeEach(async () => {
  await clearDb();
  group = await StockGroup.create({ name: "Grains" });
  unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  admin = await createUser({ role: "super_admin" });
});

const api = (method, url) => request(app)[method](url).set("Authorization", `Bearer ${admin.token}`);
const product = (name, packs) => StockItem.create({
  name, stockGroupId: group._id, unitId: unit._id, pricePerUnit: 10, soldInPacks: true,
  packs: packs.map((packName) => ({ name: packName, size: 5, price: 50 }))
});

test("pack names are normalised to the preset spelling and length-limited", async () => {
  assert.equal(canonicalPackName(" bag "), "Bag");
  assert.equal(canonicalPackName("box/carton"), "Box/Carton");
  assert.equal(canonicalPackName("Sack  big"), "Sack big");
  assert.equal(canonicalPackName("sack"), "Sack");
  assert.equal(canonicalPackName("jerry CAN"), "Jerry CAN");
  assert.equal(isPresetPackType("TUB"), true);

  const body = (name) => ({ name: "Rice", stockGroupId: String(group._id), unitId: String(unit._id), pricePerUnit: 10, soldInPacks: true, packs: [{ name, size: 5, price: 50 }] });
  const saved = await api("post", "/api/products").send(body("bag"));
  assert.equal(saved.status, 201);
  assert.equal(saved.body.packs[0].name, "Bag");
  const tooLong = await api("post", "/api/products").send({ ...body("x".repeat(41)), name: "Other" });
  assert.equal(tooLong.status, 400);
  assert.ok(tooLong.body.errors.packList[0].name);
});

test("usage lists products and marks those left without any pack as disabled", async () => {
  await product("Rice", ["Sack"]);
  await product("Flour", ["Sack", "Bag"]);
  await product("Salt", ["Bag"]);
  const res = await api("get", "/api/products/pack-types/usage").query({ name: "sack" });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.products.map((p) => [p.name, p.disabled]), [["Flour", false], ["Rice", true]]);
});

test("removing a custom type pulls its packs; only products left with none become incomplete", async () => {
  await product("Rice", ["Sack"]);
  await product("Flour", ["Sack", "Bag"]);
  const res = await api("post", "/api/products/pack-types/remove").send({ name: "Sack" });
  assert.equal(res.status, 200);
  assert.equal(res.body.updated, 2);
  assert.equal(res.body.disabled, 1);
  const list = await api("get", "/api/products");
  const byName = Object.fromEntries(list.body.items.map((p) => [p.name, p]));
  assert.deepEqual(byName.Rice.packs, []);
  assert.deepEqual(byName.Rice.missing, ["packs"]);
  assert.equal(byName.Rice.available, false);
  assert.deepEqual(byName.Flour.packs.map((p) => p.name), ["Bag"]);
  assert.equal(byName.Flour.available, true);
});

test("built-in pack types cannot be deleted and the request needs a name", async () => {
  await product("Rice", ["Bag"]);
  for (const name of ["Bag", "box/carton", "TUB"]) {
    const res = await api("post", "/api/products/pack-types/remove").send({ name });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "PRESET_PACK_TYPE");
  }
  assert.equal((await api("post", "/api/products/pack-types/remove").send({ name: "  " })).status, 400);
  assert.equal((await StockItem.findOne({ name: "Rice" })).packs.length, 1);
});

test("a custom name with regex characters only matches itself", async () => {
  await product("Rice", ["Sack (big)"]);
  await product("Flour", ["Sack"]);
  const res = await api("post", "/api/products/pack-types/remove").send({ name: "Sack (big)" });
  assert.equal(res.body.updated, 1);
  assert.equal((await StockItem.findOne({ name: "Flour" })).packs.length, 1);
});

test("kitchen users cannot read or remove pack types", async () => {
  const cook = await createUser({ role: "user" });
  const as = (method, url) => request(app)[method](url).set("Authorization", `Bearer ${cook.token}`);
  assert.equal((await as("get", "/api/products/pack-types/usage").query({ name: "Sack" })).status, 403);
  assert.equal((await as("post", "/api/products/pack-types/remove").send({ name: "Sack" })).status, 403);
});
