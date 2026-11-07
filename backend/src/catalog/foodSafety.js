// Food-safety facts a product carries for FSSAI (Food Safety and Standards Act) record-keeping in a school kitchen.
// Keep the lists in step with admin-web/src/pages/products/foodSafety.js.
export const PRODUCT_KINDS = ["food", "non_food"];
export const PRODUCT_FORMS = ["packaged", "loose"]; // packaged food must show a compliant label at receipt; loose/fresh is traced by supplier and date
export const VEG_MARKS = ["veg", "non_veg", "egg"];
export const STORAGE_OPTIONS = ["room", "fridge", "freezer"]; // matches StockBatch.storage
// The allergens the FSS (Labelling and Display) Regulations 2020 require on a label, plus two plain answers:
// "none" (the product has no allergen) and "unknown" (not sure, or one not in the list). Those two stand alone.
export const ALLERGENS = ["gluten", "milk", "egg", "fish", "crustacean", "peanut", "tree_nut", "soy", "sulphite", "none", "unknown"];

/**
 * What a product still needs before its food-safety facts are complete.
 * A product saved before these facts existed has no `kind`: it is flagged ("kind") but stays available, so a rollout
 * never hides stock the kitchens already hold. Once it is edited, the form makes the kind a must.
 */
export const foodSafetyMissing = (product) => {
  if (!product?.kind) return ["kind"];
  if (product.kind !== "food") return [];
  const missing = [];
  if (!VEG_MARKS.includes(product.vegMark)) missing.push("vegMark");
  if (!STORAGE_OPTIONS.includes(product.storage)) missing.push("storage");
  return missing;
};
