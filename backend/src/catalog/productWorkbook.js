import ExcelJS from "exceljs";
import { PRESET_PACK_TYPES } from "./packTypes.js";
import { PRESET_SYMBOLS, presetFor } from "./units.js";

// The Products workbook: the Bulk add template and the Excel export are the same file, so an admin can export,
// edit and upload it back. Row 1 = headings, row 2 = a short note per column (skipped on upload), products from row 3.
// Dropdowns read a hidden "Lists" sheet. Product ID (P-0001) is locked: a row without one adds a new product.

const yesNo = ["Yes", "No"];
// Friendly words shown in the dropdowns, mapped to the stored codes. Upload accepts either.
export const CHOICES = {
  itemType: [["stock", "Stock"], ["daily_use", "Daily use"]],
  kind: [["food", "Food"], ["non_food", "Non-food"]],
  form: [["packaged", "Packaged"], ["loose", "Loose or fresh"]],
  vegMark: [["veg", "Veg"], ["non_veg", "Non-veg"], ["egg", "Egg"]],
  storage: [["room", "Room temperature"], ["fridge", "Fridge"], ["freezer", "Freezer"]]
};
// Allergen codes from catalog/foodSafety.js, one Yes column each (a cell holds one dropdown choice).
const ALLERGEN_COLUMNS = [
  ["none", "No allergens", "Yes if it contains none of the allergens listed."],
  ["unknown", "Allergen not sure", "Yes if unsure, or it has one not listed."],
  ["gluten", "Gluten", "Yes if it contains wheat, barley or rye."],
  ["milk", "Milk", "Yes if it contains milk or milk products."],
  ["egg", "Egg (allergen)", "Yes if it contains egg."],
  ["fish", "Fish", "Yes if it contains fish."],
  ["crustacean", "Crustaceans", "Yes if it contains prawn, crab or other shellfish."],
  ["peanut", "Peanut", "Yes if it contains peanuts."],
  ["tree_nut", "Tree nuts", "Yes if it contains cashew, almond, walnut or similar."],
  ["soy", "Soy", "Yes if it contains soya."],
  ["sulphite", "Sulphites", "Yes if it contains sulphite preservatives."]
];
export const PACK_SLOTS = 3;

// list: which Lists column feeds the dropdown; open: a value not in the list is allowed (after a warning).
export const PRODUCT_COLUMNS = [
  { key: "productNo", header: "Product ID", note: "Filled in by the app. Do not change. Blank = new product.", width: 13, locked: true },
  { key: "name", header: "Name *", note: "Required. The product name kitchens see.", width: 28 },
  { key: "group", header: "Product group *", note: "Required. Pick one, or type a new group name.", width: 24, list: "groups", open: true },
  { key: "unit", header: "Unit *", note: "Required. The unit kitchens count it in.", width: 10, list: "units" },
  { key: "itemType", header: "Type", note: "Stock, or Daily use (used up as it comes: milk, bread).", width: 12, list: "itemType" },
  { key: "kind", header: "Food or non-food *", note: "Required. Food needs veg mark and storage too.", width: 14, list: "kind" },
  { key: "form", header: "Packaged or loose", note: "Food only. Packaged has a printed label; loose is weighed.", width: 15, list: "form" },
  { key: "vegMark", header: "Veg / Non-veg / Egg", note: "Food only, required. The green, brown or egg mark.", width: 15, list: "vegMark" },
  { key: "storage", header: "Storage", note: "Food only, required. Where the kitchen keeps it.", width: 17, list: "storage" },
  ...ALLERGEN_COLUMNS.map(([code, header, note]) => ({ key: `allergen:${code}`, header, note: `Food only. ${note}`, width: 12, list: "yesNo" })),
  { key: "defaultThreshold", header: "Low stock alert", note: "Optional. Warn when stock falls to this amount.", width: 12, number: true },
  { key: "brand", header: "Brand", note: "Optional. Brand name, if the kitchen should know it.", width: 16 },
  { key: "imageUrl", header: "Image URL", note: "Optional. Web link to a photo; blank keeps the photo.", width: 30 },
  { key: "pricePerUnit", header: "Price per unit (₹)", note: "Super-admin only. Price of one unit; blank = not priced.", width: 13, number: true },
  { key: "soldInPacks", header: "Ordered in packs", note: "Yes if bought in packs; then fill Pack 1 below.", width: 12, list: "yesNo" },
  ...Array.from({ length: PACK_SLOTS }, (_, i) => [
    { key: `pack${i + 1}:name`, header: `Pack ${i + 1} name`, note: "Pick a pack name, or type a new one.", width: 14, list: "packs", open: true },
    { key: `pack${i + 1}:size`, header: `Pack ${i + 1} size`, note: "How much one pack holds, in the product's unit.", width: 10, number: true },
    { key: `pack${i + 1}:price`, header: `Pack ${i + 1} price (₹)`, note: "Super-admin only. Price of one whole pack.", width: 12, number: true }
  ]).flat(),
  { key: "archived", header: "Archived", note: "Super-admin only. Yes hides it from kitchens.", width: 10, list: "yesNo" }
];
const COLUMN_INDEX = Object.fromEntries(PRODUCT_COLUMNS.map((column, index) => [column.key, index + 1]));
const HEADERS = PRODUCT_COLUMNS.map((column) => column.header);
const FIRST_ROW = 3;
const VALIDATED_ROWS = 2000; // dropdowns reach this far down, so new rows get them too

const cell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text).trim(); // hyperlink cells
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim(); // formula cells
  return String(value).trim();
};
const isYes = (value) => ["yes", "y", "true", "1"].includes(cell(value).toLowerCase());
const number = (value) => (cell(value) === "" ? "" : Number(cell(value)));
const labelOf = (field, code) => CHOICES[field].find(([value]) => value === code)?.[1] || "";
// A dropdown word or the stored code ("Non-food" or "non_food"). Blank = not given. Anything else is passed on, so the
// product check names the field ("Choose food or non-food.").
const codeOf = (field, value) => {
  const text = cell(value).toLowerCase();
  if (!text) return undefined;
  const match = CHOICES[field].find(([code, label]) => code === text || label.toLowerCase() === text);
  return match ? match[0] : text;
};

/** One sheet row read back into the shape the product check takes. Blank cells mean "not given". */
export const rowToProduct = (row) => {
  const get = (key) => row.getCell(COLUMN_INDEX[key]).value;
  const unitText = cell(get("unit"));
  const allergens = ALLERGEN_COLUMNS.filter(([code]) => isYes(get(`allergen:${code}`))).map(([code]) => code);
  const packs = Array.from({ length: PACK_SLOTS }, (_, i) => ({
    name: cell(get(`pack${i + 1}:name`)), size: number(get(`pack${i + 1}:size`)), price: number(get(`pack${i + 1}:price`))
  })).filter((pack) => pack.name || pack.size !== "" || pack.price !== "");
  const threshold = cell(get("defaultThreshold"));
  const image = cell(get("imageUrl"));
  return {
    productNo: cell(get("productNo")).toUpperCase(),
    name: cell(get("name")),
    groupName: cell(get("group")),
    // The exact preset symbol, or a common spelling of it ("Kgs", "Kilogram").
    unitSymbol: PRESET_SYMBOLS.includes(unitText) ? unitText : presetFor({ symbol: unitText })?.symbol || unitText,
    itemType: codeOf("itemType", get("itemType")) || "stock",
    kind: codeOf("kind", get("kind")),
    form: codeOf("form", get("form")),
    vegMark: codeOf("vegMark", get("vegMark")),
    storage: codeOf("storage", get("storage")),
    allergens: allergens.length ? allergens : undefined, // none ticked = keep what the product has
    defaultThreshold: threshold === "" ? undefined : Number(threshold), // blank = keep, or 0 for a new product
    brand: cell(get("brand")),
    imageUrl: image || undefined, // blank keeps the photo
    pricePerUnit: number(get("pricePerUnit")),
    soldInPacks: isYes(get("soldInPacks")),
    packs,
    archived: isYes(get("archived"))
  };
};

/** True when the row has nothing in it (the notes row and empty rows are skipped). */
export const isBlankRow = (row) => PRODUCT_COLUMNS.every((_, index) => cell(row.getCell(index + 1).value) === "");
/** The headings must match exactly: an older layout is refused instead of read into the wrong fields. */
export const headersMatch = (sheet) => HEADERS.every((header, index) => cell(sheet.getRow(1).getCell(index + 1).value) === header);
/** Row 2 is the notes row when it still carries the notes; someone may have deleted it. */
export const isNotesRow = (row) => cell(row.getCell(COLUMN_INDEX.name).value) === PRODUCT_COLUMNS[COLUMN_INDEX.name - 1].note;
export const DATA_FIRST_ROW = FIRST_ROW;

const productCells = (p) => {
  const packs = p.packs || [];
  const values = {
    productNo: p.productNo || "", name: p.name, group: p.group?.name || "", unit: p.unit?.symbol || "",
    itemType: labelOf("itemType", p.itemType || "stock"), kind: labelOf("kind", p.kind), form: labelOf("form", p.form),
    vegMark: labelOf("vegMark", p.vegMark), storage: labelOf("storage", p.storage),
    defaultThreshold: p.defaultThreshold ?? "", brand: p.brand || "", imageUrl: p.imageUrl || "", pricePerUnit: p.pricePerUnit ?? "",
    soldInPacks: p.soldInPacks ? "Yes" : "No", archived: p.archived ? "Yes" : "No"
  };
  ALLERGEN_COLUMNS.forEach(([code]) => { values[`allergen:${code}`] = (p.allergens || []).includes(code) ? "Yes" : ""; });
  for (let i = 0; i < PACK_SLOTS; i += 1) {
    values[`pack${i + 1}:name`] = packs[i]?.name || "";
    values[`pack${i + 1}:size`] = packs[i]?.size ?? "";
    values[`pack${i + 1}:price`] = packs[i]?.price ?? "";
  }
  return PRODUCT_COLUMNS.map((column) => values[column.key]);
};

/**
 * The workbook for the export (products given) or the empty template. `groups` are the group names and `packNames`
 * the custom pack names in use, both read at download time, so a group or pack added since shows in the dropdown.
 */
export const createProductWorkbook = async (products = [], { groups = [], packNames = [] } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MKM Inventory";
  const sheet = workbook.addWorksheet("Products", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  sheet.columns = PRODUCT_COLUMNS.map((column) => ({
    width: column.width,
    style: column.locked ? { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECF2" } } } : { protection: { locked: false } }
  }));

  sheet.addRow(HEADERS);
  sheet.addRow(PRODUCT_COLUMNS.map((column) => column.note));
  const head = sheet.getRow(1);
  head.height = 30;
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6FD6" } };
    c.alignment = { vertical: "middle", wrapText: true };
    c.protection = { locked: true };
  });
  const notes = sheet.getRow(2);
  notes.height = 42;
  notes.eachCell((c) => {
    c.font = { italic: true, size: 9, color: { argb: "FF5B6475" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
    c.alignment = { vertical: "top", wrapText: true };
    c.protection = { locked: true };
  });
  products.forEach((p) => {
    const row = sheet.addRow(productCells(p));
    PRODUCT_COLUMNS.forEach((column, index) => { if (!column.locked) row.getCell(index + 1).protection = { locked: false }; });
  });

  // Dropdown sources. Groups and pack names come from the database; the rest are fixed.
  const lists = {
    groups, units: [...PRESET_SYMBOLS], yesNo,
    packs: [...PRESET_PACK_TYPES, ...packNames.filter((n) => !PRESET_PACK_TYPES.some((p) => p.toLowerCase() === String(n).toLowerCase()))],
    ...Object.fromEntries(Object.entries(CHOICES).map(([field, pairs]) => [field, pairs.map(([, label]) => label)]))
  };
  const listSheet = workbook.addWorksheet("Lists", { state: "hidden" });
  const listRef = {};
  Object.entries(lists).forEach(([name, values], index) => {
    const col = listSheet.getColumn(index + 1);
    col.values = [name, ...(values.length ? values : [""])];
    const letter = col.letter;
    listRef[name] = `Lists!$${letter}$2:$${letter}$${Math.max(values.length, 1) + 1}`;
  });

  const lastRow = Math.max(VALIDATED_ROWS, FIRST_ROW + products.length + 500);
  PRODUCT_COLUMNS.forEach((column, index) => {
    const letter = sheet.getColumn(index + 1).letter;
    const range = `${letter}${FIRST_ROW}:${letter}${lastRow}`;
    const prompt = { showInputMessage: true, promptTitle: column.header.replace(" *", ""), prompt: column.note };
    if (column.list) {
      sheet.dataValidations.add(range, {
        type: "list", allowBlank: true, formulae: [listRef[column.list]], ...prompt,
        showErrorMessage: true,
        ...(column.open
          ? { errorStyle: "warning", errorTitle: "Not in the list", error: "This name is new. Choose Yes to add it when you upload." }
          : { errorStyle: "stop", errorTitle: "Pick from the list", error: "Choose one of the values in the dropdown." })
      });
    } else if (column.number) {
      sheet.dataValidations.add(range, {
        type: "decimal", operator: "greaterThanOrEqual", allowBlank: true, formulae: [0], ...prompt,
        showErrorMessage: true, errorStyle: "stop", errorTitle: "Numbers only", error: "Enter a number of zero or more."
      });
    }
  });

  // Locks the Product ID column and the two heading rows. No password: Review > Unprotect Sheet lifts it if needed.
  await sheet.protect("", { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true, insertRows: true, deleteRows: true, autoFilter: true });
  return workbook;
};
