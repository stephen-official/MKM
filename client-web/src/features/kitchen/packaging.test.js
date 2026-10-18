import test from "node:test";
import assert from "node:assert/strict";
import { formatStockQuantity, withPackaging } from "./packaging.js";

const rice = { soldInPacks: true, packs: [{ _id: "bag", name: "Bag", size: 25 }] };

test("shows kitchen stock as packs plus base units", () => {
  assert.equal(formatStockQuantity(79, "kg", rice), "3 Bags + 4 kg");
  assert.equal(formatStockQuantity(20, "kg", rice), "20 kg");
});

test("captures the selected catalog pack", () => {
  assert.deepEqual(withPackaging({ ...rice, requestedQty: 2 }, "bag"), { ...rice, requestedQty: 2, packId: "bag", packName: "Bag", packSize: 25 });
});

