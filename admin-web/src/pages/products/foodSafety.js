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
// The allergens the FSS (Labelling and Display) Regulations 2020 require on a label.
export const ALLERGENS = [
  { value: "gluten", label: "Gluten (wheat, barley, rye)" },
  { value: "milk", label: "Milk" },
  { value: "egg", label: "Egg" },
  { value: "fish", label: "Fish" },
  { value: "crustacean", label: "Crustaceans (prawn, crab)" },
  { value: "peanut", label: "Peanut" },
  { value: "tree_nut", label: "Tree nuts (cashew, almond…)" },
  { value: "soy", label: "Soy" },
  { value: "sulphite", label: "Sulphites" }
];

const labelOf = (options, value) => options.find((option) => option.value === value)?.label || "";

/** "Veg · Fridge · Milk, Tree nuts" for a card, "Non-food" for the rest, "" when the facts are not filled in. */
export const foodSafetySummary = (product) => {
  if (!product?.kind) return "";
  if (product.kind === "non_food") return "Non-food";
  const allergens = (product.allergens || []).map((code) => labelOf(ALLERGENS, code).split(" (")[0]).filter(Boolean);
  return [labelOf(VEG_MARKS, product.vegMark), labelOf(PRODUCT_FORMS, product.form), labelOf(STORAGE_OPTIONS, product.storage),
    allergens.length ? `Allergens: ${allergens.join(", ")}` : product.kind === "food" ? "No allergens listed" : ""].filter(Boolean).join(" · ");
};
