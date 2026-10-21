import { describe, expect, it } from "vitest";
import {
  emptyProductForm, formFromProduct, missingText, newPack, packSummary, payloadFromForm, unitPriceFromPack, validateProductForm
} from "./productForm.js";

const filled = (extra = {}) => ({ ...emptyProductForm(), name: "Rice", stockGroupId: "g1", unitId: "u1", pricePerUnit: "60", ...extra });

describe("product form", () => {
  it("requires a price only from a super-admin", () => {
    const form = filled({ pricePerUnit: "" });
    expect(validateProductForm(form, { canPrice: true }).pricePerUnit).toBeTruthy();
    expect(validateProductForm(form, { canPrice: false })).toEqual({});
  });

  it("makes the pack fields mandatory once “ordered in packs” is ticked", () => {
    expect(validateProductForm(filled({ soldInPacks: true }), { canPrice: true }).packs).toBeTruthy();
    const packs = [{ ...newPack(), name: "Bag", size: "25", price: "" }, { ...newPack(), name: "bag", size: "0", price: "10" }];
    const errors = validateProductForm(filled({ soldInPacks: true, packs }), { canPrice: true });
    expect(errors.packList[0]).toEqual({ price: "Enter the pack price." });
    expect(errors.packList[1]).toEqual({ name: "Use a different name.", size: "Enter the pack size." });
  });

  it("never sends prices for an admin, and drops packs when the box is unticked", () => {
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

  it("describes packs, missing details and the unit price a pack implies", () => {
    expect(packSummary({ name: "Bag", size: 25, price: 1450 }, "kg")).toBe("Bag (25 kg) · ₹1,450.00");
    expect(packSummary({ name: "Bag", size: 25, price: null }, "kg")).toBe("Bag (25 kg) · Not set");
    expect(missingText(["price", "packPrice"])).toBe("Needs price per unit, pack price");
    expect(unitPriceFromPack({ size: "25", price: "1450" })).toBe(58);
    expect(unitPriceFromPack({ size: "25", price: "" })).toBeNull();
  });
});
