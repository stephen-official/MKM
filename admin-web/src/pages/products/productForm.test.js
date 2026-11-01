import { describe, expect, it } from "vitest";
import {
  emptyProductForm, formFromProduct, hasMoreDetails, missingText, newPack, packSummary, payloadFromForm, unitPriceFromPack, validateProductForm
} from "./productForm.js";
import { foodSafetySummary } from "./foodSafety.js";

const filled = (extra = {}) => ({ ...emptyProductForm(), name: "Rice", stockGroupId: "g1", unitId: "u1", pricePerUnit: "60", kind: "food", vegMark: "veg", storage: "room", ...extra });

describe("product form", () => {
  it("requires a price only from a super-admin", () => {
    const form = filled({ pricePerUnit: "" });
    expect(validateProductForm(form, { canPrice: true }).pricePerUnit).toBeTruthy();
    expect(validateProductForm(form, { canPrice: false })).toEqual({});
  });

  it("asks whether the product is food, and for food wants the veg mark and storage", () => {
    expect(validateProductForm(filled({ kind: "" }), { canPrice: true })).toEqual({ kind: "Say whether this is food or not." });
    expect(validateProductForm(filled({ vegMark: "", storage: "" }), { canPrice: true })).toEqual({ vegMark: "Choose veg, non-veg or egg.", storage: "Say where it is kept." });
    expect(validateProductForm(filled({ kind: "non_food", vegMark: "", storage: "" }), { canPrice: true })).toEqual({});
  });

  it("sends the food-safety facts for food only", () => {
    const food = payloadFromForm(filled({ form: "packaged", allergens: ["milk", "tree_nut"], storage: "fridge" }), { canPrice: true });
    expect(food).toMatchObject({ kind: "food", form: "packaged", vegMark: "veg", allergens: ["milk", "tree_nut"], storage: "fridge" });
    expect(payloadFromForm(filled({ form: "" }), { canPrice: true }).form).toBeNull();
    const soap = payloadFromForm(filled({ kind: "non_food", allergens: ["milk"] }), { canPrice: true });
    expect(soap.kind).toBe("non_food");
    expect("vegMark" in soap).toBe(false);
    expect("allergens" in soap).toBe(false);
  });

  it("reads the facts back from a product, blank when it never had them", () => {
    expect(formFromProduct({ name: "Old" })).toMatchObject({ kind: "", form: "", vegMark: "", allergens: [], storage: "" });
    expect(formFromProduct({ name: "Curd", kind: "food", vegMark: "veg", allergens: ["milk"], storage: "fridge" })).toMatchObject({ kind: "food", vegMark: "veg", allergens: ["milk"], storage: "fridge" });
  });

  it("makes the pack fields mandatory once packs are on, and capitalises a typed pack name", () => {
    expect(validateProductForm(filled({ soldInPacks: true }), { canPrice: true }).packs).toBeTruthy();
    const packs = [{ ...newPack(), name: "Bag", size: "25", price: "" }, { ...newPack(), name: "bag", size: "0", price: "10" }];
    const errors = validateProductForm(filled({ soldInPacks: true, packs }), { canPrice: true });
    expect(errors.packList[0]).toEqual({ price: "Enter the pack price." });
    expect(errors.packList[1]).toEqual({ name: "Use a different name.", size: "Enter the pack size." });
    const sack = payloadFromForm(filled({ soldInPacks: true, packs: [{ ...newPack(), name: "sack", size: "50", price: "900" }] }), { canPrice: true });
    expect(sack.packs[0].name).toBe("Sack");
  });

  it("never sends prices for an admin, and drops packs when the answer is No", () => {
    const form = filled({ soldInPacks: true, packs: [{ ...newPack(), _id: "p1", name: " Bag ", size: "25", price: "1450" }] });
    const admin = payloadFromForm(form, { canPrice: false });
    expect(admin.pricePerUnit).toBeUndefined();
    expect(admin.packs).toEqual([{ _id: "p1", name: "Bag", size: 25 }]);
    const root = payloadFromForm(form, { canPrice: true });
    expect(root.pricePerUnit).toBe(60);
    expect(root.packs[0].price).toBe(1450);
    expect(payloadFromForm({ ...form, soldInPacks: false }, { canPrice: true }).packs).toEqual([]);
  });

  it("treats expiry as required unless the product says otherwise, and sends the choice back", () => {
    expect(emptyProductForm().expiryRequired).toBe(true);
    expect(formFromProduct({ name: "Rice" }).expiryRequired).toBe(true);
    expect(formFromProduct({ name: "Salt", expiryRequired: false }).expiryRequired).toBe(false);
    expect(payloadFromForm(filled({ expiryRequired: false }), { canPrice: false }).expiryRequired).toBe(false);
  });

  it("blanks a legacy unit so it has to be re-chosen, and prefills a request's unit", () => {
    expect(formFromProduct({ name: "Oil", unit: { _id: "old", symbol: "Ltr", preset: false } })).toMatchObject({ unitId: "", legacyUnit: "Ltr" });
    expect(formFromProduct({ name: "Oil", unit: { _id: "u1", symbol: "L", preset: true } }).unitId).toBe("u1");
    expect(formFromProduct({ name: "Milk", unitSymbol: "L" }, { units: [{ _id: "u2", symbol: "L" }] }).unitId).toBe("u2");
  });

  it("opens the More details fold only when something is in it", () => {
    expect(hasMoreDetails(emptyProductForm())).toBe(false);
    expect(hasMoreDetails(filled({ brand: "Tata" }))).toBe(true);
    expect(hasMoreDetails(filled({ itemType: "daily_use" }))).toBe(true);
    expect(hasMoreDetails(filled({ defaultThreshold: "5" }))).toBe(true);
  });

  it("describes packs, missing details, the food-safety facts and the unit price a pack implies", () => {
    expect(packSummary({ name: "Bag", size: 25, price: 1450 }, "kg")).toBe("Bag (25 kg) · ₹1,450.00");
    expect(packSummary({ name: "Bag", size: 25, price: null }, "kg")).toBe("Bag (25 kg) · Not set");
    expect(missingText(["price", "packPrice", "vegMark"])).toBe("Needs price per unit, pack price, veg or non-veg mark");
    expect(foodSafetySummary({ kind: "food", vegMark: "veg", form: "packaged", storage: "fridge", allergens: ["milk", "tree_nut"] })).toBe("Veg · Packaged · Fridge · Allergens: Milk, Tree nuts");
    expect(foodSafetySummary({ kind: "food", vegMark: "non_veg", storage: "freezer" })).toBe("Non-veg · Freezer · No allergens listed");
    expect(foodSafetySummary({ kind: "non_food" })).toBe("Non-food");
    expect(foodSafetySummary({})).toBe("");
    expect(unitPriceFromPack({ size: "25", price: "1450" })).toBe(58);
    expect(unitPriceFromPack({ size: "25", price: "" })).toBeNull();
  });
});
