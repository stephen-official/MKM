import test from "node:test";
import assert from "node:assert/strict";
import { EXPIRY_CHIPS, adminExpiryFor, arrivingLines, arrivingProducts, emptyReceipt, expiryFromChip, expiryNeeded, receiptPayload, receiptProblems, receiptReady } from "./receiving.js";

const me = "kitchenA";
const product = (id, extra = {}) => ({ _id: id, name: id, unitId: { symbol: "kg" }, ...extra });
const line = (stockItemId, extra = {}) => ({ stockItemId, qtyBaseUnit: 10, dispatchedAt: "2026-10-18T05:00:00.000Z", deliveredAt: null, ...extra });
const share = (godownId, items, extra = {}) => ({ godownId: { _id: godownId }, items, dispatchedAt: null, deliveredAt: null, ...extra });
const rice = product("rice");
const salt = product("salt", { expiryRequired: false });
const photos = { goods: "https://x/g.jpg", label: "https://x/l.jpg" };
const today = "2026-10-19";

test("only this kitchen's lines that are on the way are received", () => {
  const order = { status: "ordered", contributions: [
    share(me, [line(rice), line(salt, { dispatchedAt: null }), line(product("dal"), { deliveredAt: "2026-10-18T09:00:00.000Z" })]),
    share("kitchenB", [line(rice)]),
  ] };
  assert.deepEqual(arrivingLines(order, me).map((l) => l.stockItemId._id), ["rice"]);
  assert.deepEqual(arrivingLines({ ...order, status: "approved" }, me), []);
  assert.deepEqual(arrivingLines(order, "kitchenC"), []);
});

test("two pack lines of one product share a single receipt form", () => {
  const lines = [line(rice, { packId: "bag25" }), line(rice, { packId: "bag50" }), line(salt)];
  assert.deepEqual(arrivingProducts(lines).map((l) => l.stockItemId._id), ["rice", "salt"]);
});

test("expiry chips count from today and keep to the end of short months", () => {
  assert.deepEqual(EXPIRY_CHIPS.map((chip) => chip.label), ["1 week", "1 month", "3 months", "6 months", "1 year"]);
  assert.equal(expiryFromChip("1w", today), "2026-10-26");
  assert.equal(expiryFromChip("1m", today), "2026-11-19");
  assert.equal(expiryFromChip("1m", "2027-01-31"), "2027-02-28");
  assert.equal(expiryFromChip("3m", "2026-11-30"), "2027-02-28");
  assert.equal(expiryFromChip("1y", today), "2027-10-19");
  assert.equal(expiryFromChip("nope", today), "");
});

test("a product is ready once both photos are in and expiry is given where required", () => {
  assert.deepEqual(receiptProblems(line(rice), emptyReceipt(), today), ["Photo of the goods", "Photo of the label", "Expiry date"]);
  assert.deepEqual(receiptProblems(line(salt), { ...emptyReceipt(), photos }, today), []);
  assert.equal(expiryNeeded(line(salt)), false);
  assert.equal(expiryNeeded(line(rice)), true);
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: "2026-10-01" }, today), ["Expiry date has passed — call the central store"]);
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: "2027-01-01", mfgDate: "2026-12-01" }, today), ["Manufacture date is in the future"]);
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: today }, today), [], "expiring today is still accepted");
});

test("the central store's expiry pre-fills the form for that product only, and stays editable", () => {
  const order = { expiryByProduct: [{ stockItemId: "rice", expiryDate: "2027-03-31" }] };
  assert.equal(adminExpiryFor(order, line(rice)), "2027-03-31");
  assert.equal(adminExpiryFor(order, line(salt)), "");
  assert.equal(adminExpiryFor({}, line(rice)), "");
  const form = emptyReceipt(adminExpiryFor(order, line(rice)));
  assert.equal(form.expiryDate, "2027-03-31");
  assert.deepEqual(receiptProblems(line(rice), { ...form, photos }, today), []);
  assert.equal(receiptPayload([line(rice)], { rice: { ...form, photos, expiryDate: "2027-02-28" } }).items[0].expiryDate, "2027-02-28");
});

test("the whole delivery is ready only when every product is, and the payload has one entry per product", () => {
  const lines = [line(rice, { packId: "bag25" }), line(rice, { packId: "bag50" }), line(salt)];
  const forms = { rice: { ...emptyReceipt(), photos, expiryDate: "2027-01-01", lotNumber: " B-4471 ", storage: "room" } };
  assert.equal(receiptReady(lines, forms, today), false);
  forms.salt = { ...emptyReceipt(), photos, storage: "" };
  assert.equal(receiptReady(lines, forms, today), true);
  assert.deepEqual(receiptPayload(lines, forms), { items: [
    { stockItemId: "rice", photos, expiryDate: "2027-01-01", mfgDate: undefined, lotNumber: "B-4471", storage: "room" },
    { stockItemId: "salt", photos, expiryDate: undefined, mfgDate: undefined, lotNumber: undefined, storage: undefined },
  ] });
});
