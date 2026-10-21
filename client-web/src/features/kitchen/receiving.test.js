import test from "node:test";
import assert from "node:assert/strict";
import { EXPIRY_CHIPS, PROBLEM_REASONS, adminExpiryFor, arrivingLines, emptyProblem, groupBySupplier, supplierFor, usableQty, arrivingProducts, emptyReceipt, expiryFromChip, expiryNeeded, receiptKeyOf, receiptPayload, receiptProblems, receiptReady } from "./receiving.js";

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

test("two pack lines of one product keep separate receipt forms", () => {
  const lines = [line(rice, { packId: "bag25" }), line(rice, { packId: "bag50" }), line(salt)];
  assert.deepEqual(arrivingProducts(lines).map(receiptKeyOf), ["rice:bag25", "rice:bag50", "salt"]);
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
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: "2026-10-01" }, today), ["Expiry date has passed — mark it as a problem"]);
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: "2027-01-01", mfgDate: "2026-12-01" }, today), ["Manufacture date is in the future"]);
  assert.deepEqual(receiptProblems(line(rice), { ...emptyReceipt(), photos, expiryDate: today }, today), [], "expiring today is still accepted");
});

test("a problem item needs a reason, a sensible usable quantity and a goods photo; the label and expiry relax", () => {
  const form = { ...emptyReceipt(), photos: { goods: photos.goods, label: "" }, problem: emptyProblem() };
  assert.deepEqual(PROBLEM_REASONS.map((r) => r.key), ["short", "excess", "damaged", "wrong_item", "expired"]);
  assert.deepEqual(receiptProblems(line(rice), form, today), ["What went wrong"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, problem: { ...form.problem, reason: "damaged" } }, today), [], "wholly damaged: nothing else needed");
  assert.deepEqual(receiptProblems(line(rice), { ...form, expiryDate: "2027-01-01", problem: { ...form.problem, reason: "short", receivedQty: "9" } }, today), []);
  assert.deepEqual(receiptProblems(line(rice), { ...form, problem: { ...form.problem, reason: "short", receivedQty: "10" } }, today), ["Less than 10 must have arrived", "Expiry date for the usable part"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, problem: { ...form.problem, reason: "short", receivedQty: "6" } }, today), ["Expiry date for the usable part"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, problem: { ...form.problem, reason: "excess", receivedQty: "8" } }, today), ["More than 10 must have arrived", "Expiry date for the usable part"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, expiryDate: "2027-01-01", problem: { ...form.problem, reason: "wrong_item", receivedQty: "1" } }, today), ["Enter 0 usable — the wrong item cannot be added as this product"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, problem: { ...form.problem, reason: "short", receivedQty: "abc" } }, today), ["How much usable stock arrived"]);
  assert.deepEqual(receiptProblems(line(rice), { ...form, photos: { goods: "", label: "" }, problem: { ...form.problem, reason: "wrong_item" } }, today), ["Photo of the goods"]);
  assert.equal(usableQty({ receivedQty: " " }), 0);
  assert.equal(usableQty({ receivedQty: "-1" }), null);
  const payload = receiptPayload([line(rice)], { rice: { ...form, expiryDate: "2027-01-01", problem: { reason: "short", receivedQty: "6", note: " Only 6 ", voiceNoteUrl: "" } } });
  assert.deepEqual(payload.items[0].problem, { reason: "short", receivedQtyBaseUnit: 6, note: "Only 6", voiceNoteUrl: undefined });
  assert.equal(receiptPayload([line(rice)], { rice: { ...form, problem: null, photos } }).items[0].problem, undefined);
});

test("items are grouped by the supplier they came from, falling back to the order's supplier", () => {
  const sri = { _id: "s1", name: "Sri Lakshmi Traders", fssaiLicence: "12345678901234" };
  const venkat = { _id: "s2", name: "Venkat Oils", fssaiLicence: "22222222222222" };
  const oil = product("oil");
  const order = { supplier: sri, supplierByProduct: [{ stockItemId: "oil", supplierId: venkat }] };
  assert.deepEqual(supplierFor(order, line(rice)), sri);
  assert.deepEqual(supplierFor(order, line(oil)), venkat);
  assert.equal(supplierFor({ supplier: null }, line(rice)), null);
  const groups = groupBySupplier(order, [line(rice), line(oil), line(salt), line(rice, { packId: "bag" })]);
  assert.deepEqual(groups.map((g) => [g.supplier?.name, g.lines.map((l) => l.stockItemId._id)]), [["Sri Lakshmi Traders", ["rice", "salt", "rice"]], ["Venkat Oils", ["oil"]]]);
  assert.deepEqual(groupBySupplier({}, [line(rice)]).map((g) => [g.supplier, g.lines.length]), [[null, 1]]);
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

test("the whole delivery is ready only when every line is, and payload entries identify their packs", () => {
  const lines = [line(rice, { packId: "bag25" }), line(rice, { packId: "bag50" }), line(salt)];
  const riceForm = { ...emptyReceipt(), photos, expiryDate: "2027-01-01", lotNumber: " B-4471 ", storage: "room" };
  const forms = { "rice:bag25": riceForm, "rice:bag50": riceForm };
  assert.equal(receiptReady(lines, forms, today), false);
  forms.salt = { ...emptyReceipt(), photos, storage: "" };
  assert.equal(receiptReady(lines, forms, today), true);
  assert.deepEqual(receiptPayload(lines, forms), { items: [
    { stockItemId: "rice", packId: "bag25", photos, expiryDate: "2027-01-01", mfgDate: undefined, lotNumber: "B-4471", storage: "room" },
    { stockItemId: "rice", packId: "bag50", photos, expiryDate: "2027-01-01", mfgDate: undefined, lotNumber: "B-4471", storage: "room" },
    { stockItemId: "salt", photos, expiryDate: undefined, mfgDate: undefined, lotNumber: undefined, storage: undefined },
  ] });
});
