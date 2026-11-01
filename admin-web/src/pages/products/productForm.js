// Pure helpers behind the product popup. The server repeats every check (routes/productRoutes.js);
// these give instant feedback and decide which fields a role may touch.

export const ITEM_TYPES = [
  { value: "stock", label: "Stock item" },
  { value: "daily_use", label: "Daily use" }
];

/** Built-in pack names, always offered first. Anything else typed in becomes a custom pack type. */
export const PACK_TYPES = [
  { name: "Box/Carton", image: "/pack-types/box-carton.avif" },
  { name: "Bag", image: "/pack-types/bag.avif" },
  { name: "Can", image: "/pack-types/can.avif" },
  { name: "Tub", image: "/pack-types/tub.avif" },
  { name: "Packet", image: "" }
];
export const isPresetPackName = (name) => PACK_TYPES.some((type) => type.name.toLowerCase() === String(name || "").trim().toLowerCase());

/** Custom pack types always start with a capital letter ("sack" -> "Sack"); the server applies the same rule. */
export const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const MISSING_LABELS = {
  group: "product group",
  unit: "preset unit",
  price: "price per unit",
  packs: "a pack",
  packDetails: "pack name and size",
  packPrice: "pack price",
  vegMark: "veg or non-veg mark",
  storage: "where it is stored"
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export const formatPrice = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? money.format(value) : "Not set");
export const formatQty = (value) => qty.format(Number(value) || 0);

/** "Needs price per unit and pack price" for an incomplete product. */
export const missingText = (missing = []) => (missing.length ? `Needs ${missing.map((code) => MISSING_LABELS[code] || code).join(", ")}` : "");

/** "Bag (25 kg) · ₹1,450.00" per pack. */
export const packSummary = (pack, unitSymbol) => `${pack.name} (${formatQty(pack.size)} ${unitSymbol || ""}`.trimEnd() + `) · ${formatPrice(pack.price)}`;

export const newPack = () => ({ key: `new-${Math.random().toString(36).slice(2)}`, _id: null, name: "", size: "", price: "" });

const asText = (value) => (value === null || value === undefined ? "" : String(value));

export const emptyProductForm = () => ({
  name: "", imageUrl: "", itemType: "stock", stockGroupId: "", unitId: "", brand: "", productCode: "",
  pricePerUnit: "", defaultThreshold: "0", expiryRequired: true,
  // Food safety (FSSAI): kind must be chosen; the rest applies to food only.
  kind: "", form: "", vegMark: "", allergens: [], storage: "",
  soldInPacks: false, packs: []
});

/** Form state from a product the API returned (or a kitchen's product request when approving one). */
export const formFromProduct = (product, { units = [] } = {}) => ({
  name: product.name || "",
  imageUrl: product.imageUrl || "",
  itemType: product.itemType || "stock",
  stockGroupId: product.group?._id || "",
  // A legacy unit that is not a preset is left blank so it must be re-chosen.
  unitId: product.unit?.preset ? product.unit._id : (units.find((u) => u.symbol === product.unitSymbol)?._id || ""),
  legacyUnit: product.unit && !product.unit.preset ? product.unit.symbol : "",
  brand: product.brand || "",
  productCode: product.productCode || "",
  pricePerUnit: asText(product.pricePerUnit),
  defaultThreshold: asText(product.defaultThreshold ?? 0),
  expiryRequired: product.expiryRequired !== false,
  kind: product.kind || "",
  form: product.form || "",
  vegMark: product.vegMark || "",
  allergens: Array.isArray(product.allergens) ? product.allergens : [],
  storage: product.storage || "",
  soldInPacks: Boolean(product.soldInPacks),
  packs: (product.packs || []).map((pack) => ({ key: String(pack._id), _id: pack._id, name: pack.name, size: asText(pack.size), price: asText(pack.price) }))
});

/** True when any field behind the "More details" fold has something in it, so the fold opens on edit. */
export const hasMoreDetails = (form) => Boolean(form.imageUrl || form.brand || form.productCode || form.itemType === "daily_use" || Number(form.defaultThreshold) > 0);

const positive = (text) => {
  const value = Number(text);
  return String(text).trim() !== "" && Number.isFinite(value) && value > 0;
};

/** Field errors keyed like the server's (`packList[i].name` etc). `canPrice` = the user is a super-admin. */
export const validateProductForm = (form, { canPrice }) => {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter a product name.";
  if (!form.stockGroupId) errors.stockGroupId = "Choose a product group.";
  if (!form.unitId) errors.unitId = "Choose a unit.";
  const threshold = Number(form.defaultThreshold);
  if (String(form.defaultThreshold).trim() === "" || !Number.isFinite(threshold) || threshold < 0) errors.defaultThreshold = "Enter zero or more.";
  if (canPrice && !positive(form.pricePerUnit)) errors.pricePerUnit = "Enter a price per unit greater than zero.";
  if (!form.kind) errors.kind = "Say whether this is food or not.";
  if (form.kind === "food") {
    if (!form.vegMark) errors.vegMark = "Choose veg, non-veg or egg.";
    if (!form.storage) errors.storage = "Say where it is kept.";
    if (form.allergens.length === 0) errors.allergens = "Tick the allergens, or None, or Not sure.";
  }
  if (form.soldInPacks) {
    if (form.packs.length === 0) errors.packs = "Add at least one pack, or answer No.";
    const seen = new Set();
    const packList = form.packs.map((pack) => {
      const problems = {};
      const name = pack.name.trim().toLowerCase();
      if (!name) problems.name = "Name the pack.";
      else if (seen.has(name)) problems.name = "Use a different name.";
      seen.add(name);
      if (!positive(pack.size)) problems.size = "Enter the pack size.";
      if (canPrice && !positive(pack.price)) problems.price = "Enter the pack price.";
      return problems;
    });
    if (packList.some((problems) => Object.keys(problems).length)) errors.packList = packList;
  }
  return errors;
};

/** The request body. Prices are only sent by a super-admin, so an admin's save never trips the price rule. */
export const payloadFromForm = (form, { canPrice }) => ({
  name: form.name.trim(),
  imageUrl: form.imageUrl,
  itemType: form.itemType,
  stockGroupId: form.stockGroupId,
  unitId: form.unitId,
  brand: form.brand.trim(),
  productCode: form.productCode.trim(),
  defaultThreshold: Number(form.defaultThreshold),
  ...(canPrice ? { pricePerUnit: Number(form.pricePerUnit) } : {}),
  expiryRequired: form.expiryRequired,
  kind: form.kind,
  ...(form.kind === "food" ? { form: form.form || null, vegMark: form.vegMark, allergens: form.allergens, storage: form.storage } : {}),
  soldInPacks: form.soldInPacks,
  packs: form.soldInPacks
    ? form.packs.map((pack) => ({
      ...(pack._id ? { _id: pack._id } : {}),
      name: capitalizeFirst(pack.name.trim()),
      size: Number(pack.size),
      ...(canPrice ? { price: Number(pack.price) } : {})
    }))
    : []
});

/** Price of one unit implied by a pack, for the hint beside each pack price. */
export const unitPriceFromPack = (pack) => (positive(pack.size) && positive(pack.price) ? Number(pack.price) / Number(pack.size) : null);
