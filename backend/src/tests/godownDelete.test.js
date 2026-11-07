import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { clearDb, startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { createGodown, createUser } from "./helpers/auth.js";
import { seedCatalog, stockRow } from "./helpers/fixtures.js";
import { Godown } from "../models/InventoryModels.js";
import { GodownStock, Transfer } from "../models/FlowModels.js";
import { User } from "../models/User.js";

let app;
let ctx;
before(async () => { await startDb(); ({ app } = await import("../app.js")); await syncAllIndexes(); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  ctx = { admin: await createUser({ role: "admin" }) };
});
const remove = (godown) => request(app).delete(`/api/inventory/godowns/${godown._id}`).set("Authorization", `Bearer ${ctx.admin.token}`);

test("a godown nothing points at can be deleted; one with users, stock or transfers cannot, and the reply names what is in the way", async () => {
  const empty = await createGodown("Empty");
  assert.equal((await remove(empty)).status, 200);
  assert.equal(await Godown.countDocuments({ _id: empty._id }), 0);

  const kitchen = await createGodown("Kitchen A");
  const other = await createGodown("Kitchen B");
  const cook = await createUser({ role: "user", godownId: kitchen._id });
  const { items } = await seedCatalog(["Rice"]);
  const row = await stockRow(kitchen, items.Rice, 0);
  await Transfer.create({ fromGodownId: other._id, toGodownId: kitchen._id, items: [{ stockItemId: items.Rice._id, qtyBaseUnit: 1 }], createdBy: cook.user._id });

  const refused = await remove(kitchen);
  assert.equal(refused.status, 409, JSON.stringify(refused.body));
  assert.equal(refused.body.code, "GODOWN_IN_USE");
  assert.deepEqual(refused.body.uses, ["users", "stock", "transfers"]);
  assert.match(refused.body.message, /users, stock, transfers/);
  assert.equal(await Godown.countDocuments({ _id: kitchen._id }), 1);

  // The other kitchen is only the sender of a transfer, and that alone is enough.
  assert.deepEqual((await remove(other)).body.uses, ["transfers"]);

  // Once everything pointing at it is gone (even a zero-quantity stock row counts), it can go.
  await User.deleteOne({ _id: cook.user._id });
  await GodownStock.deleteOne({ _id: row._id });
  await Transfer.deleteMany({});
  assert.equal((await remove(kitchen)).status, 200);
});
