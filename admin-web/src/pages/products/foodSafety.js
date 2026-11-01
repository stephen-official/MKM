// Food-safety facts a product carries for FSSAI record-keeping. Keep in step with backend/src/catalog/foodSafety.js.
export const PRODUCT_KINDS = [
  { value: "food", label: "Food" },
  { value: "non_food", label: "Non-food" }
];
export const PRODUCT_FORMS = [
  { value: "packaged", label: "Packaged", hint: "Has a label with batch, dates and the FSSAI mark" },
  { value: "loose", label: "Loose or fresh", hint: "Vegetables, milk, grains by weight" }
];
export const VEG_MARKS = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "egg", label: "Egg" }
];
export const STORAGE_OPTIONS = [
  { value: "room", label: "Room" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" }
];
// The allergens the FSS (Labelling and Display) Regulations 2020 require on a label...
export const ALLERGENS = [
  { value: "gluten", label: "Gluten", hint: "Wheat, barley, rye" },
  { value: "milk", label: "Milk" },
  { value: "egg", label: "Egg" },
  { value: "fish", label: "Fish" },
  { value: "crustacean", label: "Crustaceans", hint: "Prawn, crab" },
  { value: "peanut", label: "Peanut" },
  { value: "tree_nut", label: "Tree nuts", hint: "Cashew, almond, walnut…" },
  { value: "soy", label: "Soy" },
  { value: "sulphite", label: "Sulphites" }
];
// ...and two plain answers that stand alone: nothing in it, or not sure / something not in the list.
export const ALLERGEN_ANSWERS = [
  { value: "none", label: "None" },
  { value: "unknown", label: "Not sure / other" }
];
const STANDALONE = new Set(ALLERGEN_ANSWERS.map((a) => a.value));
/** Next allergen list after tapping `value`: None and Not sure stand alone; a specific allergen clears them. */
export const toggleAllergen = (current, value) => {
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (STANDALONE.has(value)) return [value];
  return [...current.filter((v) => !STANDALONE.has(v)), value];
};

const labelOf = (options, value) => options.find((option) => option.value === value)?.label || "";

/** "Veg · Fridge · Milk, Tree nuts" for a card, "Non-food" for the rest, "" when the facts are not filled in. */
export const foodSafetySummary = (product) => {
  if (!product?.kind) return "";
  if (product.kind === "non_food") return "Non-food";
  const codes = product.allergens || [];
  const allergens = codes.map((code) => labelOf(ALLERGENS, code)).filter(Boolean);
  const allergenText = codes.includes("none") ? "No allergens" : codes.includes("unknown") ? "Allergens: not sure" : allergens.length ? `Allergens: ${allergens.join(", ")}` : "Allergens not answered";
  return [labelOf(VEG_MARKS, product.vegMark), labelOf(PRODUCT_FORMS, product.form), labelOf(STORAGE_OPTIONS, product.storage), allergenText].filter(Boolean).join(" · ");
};
