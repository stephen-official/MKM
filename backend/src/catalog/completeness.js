import { isPresetSymbol } from "./units.js";

// A product is offered to kitchens only when nothing below is missing and it is not archived.
// The same rule applies to every product, old or new; the products page lists the codes.
export const MISSING_LABELS = Object.freeze({
  group: "Product group",
  unit: "A preset unit",
  price: "Price per unit",
  packs: "At least one pack",
  packDetails: "Pack name and size",
  packPrice: "Pack price"
});

export const isValidPrice = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isPositive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

/** `product` has stockGroupId and unit (or a populated unitId); returns the missing codes in a fixed order. */
export const missingFields = (product, unit = product?.unitId) => {
  const missing = [];
  if (!product?.stockGroupId) missing.push("group");
  if (!unit || !isPresetSymbol(unit.symbol)) missing.push("unit");
  if (!isValidPrice(product?.pricePerUnit)) missing.push("price");
  if (product?.soldInPacks) {
    const packs = product.packs || [];
    if (packs.length === 0) missing.push("packs");
    if (packs.some((pack) => !String(pack.name || "").trim() || !isPositive(pack.size))) missing.push("packDetails");
    if (packs.some((pack) => !isValidPrice(pack.price))) missing.push("packPrice");
  }
  return missing;
};

export const isAvailable = (product, unit) => !product?.archived && missingFields(product, unit).length === 0;
