import test from "node:test";
import assert from "node:assert/strict";
import { packQuantityMatchesBase, packSnapshot } from "../catalog/packaging.js";
import mongoose from "mongoose";

test("keeps a valid immutable pack snapshot", () => {
  const packId = new mongoose.Types.ObjectId();
  assert.deepEqual(packSnapshot({ packId, packName: "Bag", packSize: "25", packQuantity: "3", packPrice: "1450" }), {
    packId, packName: "Bag", packSize: 25, packQuantity: 3, packPrice: 1450,
  });
  assert.equal(packQuantityMatchesBase({ packId, packName: "Bag", packSize: 25, packQuantity: 3 }, 75), true);
  assert.equal(packQuantityMatchesBase({ packId, packName: "Bag", packSize: 25, packQuantity: 3 }, 74), false);
});

test("drops incomplete pack metadata and accepts base-unit lines", () => {
  assert.deepEqual(packSnapshot({ packName: "Bag", packSize: 25, packQuantity: 2 }), {});
  assert.equal(packQuantityMatchesBase({}, 12.5), true);
  assert.equal(packQuantityMatchesBase({ packId: "not-an-id", packName: "Bag", packSize: 25, packQuantity: 2 }, 50), false);
});
