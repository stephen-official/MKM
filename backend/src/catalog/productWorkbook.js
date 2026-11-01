import ExcelJS from "exceljs";

export const PRODUCT_COLUMNS = [
  ["Product ID", "Use this only when updating an exported product"],
  ["Name", "Required"], ["Product Group", "Required; must already exist"], ["Unit", "Required; kg, g, L, mL, pcs, dozen or packet"],
  ["Type", "stock or daily_use"], ["Kind", "food or non_food"], ["Form", "packaged or loose (food only)"], ["Veg Mark", "veg, non_veg or egg (food only)"],
  ["Allergens", "food only; comma-separated: gluten, milk, egg, fish, crustacean, peanut, tree_nut, soy, sulphite, or none / unknown"], ["Storage", "room, fridge or freezer (food only)"],
  ["Low Stock Threshold", "0 or higher"], ["Brand", "Optional"], ["Product Code", "Optional"],
  ["Image URL", "Optional"], ["Price per Unit", "Leave blank for an incomplete product"], ["Ordered in Packs", "Yes or No"],
  ["Packs", "Optional. Separate packs with ; and use Name|Size|Price, e.g. Bag|25|1450;Carton|50|2800"], ["Archived", "Yes or No"]
];
const headers = PRODUCT_COLUMNS.map(([header]) => header);
const cell = (value) => (value === null || value === undefined ? "" : String(value).trim());
const bool = (value) => ["yes", "true", "1"].includes(cell(value).toLowerCase());
const number = (value) => cell(value) === "" ? "" : Number(value);
// Blank means "keep what the product has" on an update, and "not given" on a new row.
const choice = (value) => (cell(value) === "" ? undefined : cell(value).toLowerCase());
const list = (value) => (cell(value) === "" ? undefined : cell(value).split(",").map((piece) => piece.trim().toLowerCase()).filter(Boolean));

export const packText = (packs = []) => packs.map((pack) => [pack.name || "", pack.size ?? "", pack.price ?? ""].join("|")).join("; ");

export const parsePacks = (value) => {
  const raw = cell(value);
  if (!raw) return [];
  return raw.split(";").map((part) => {
    const [name = "", size = "", price = ""] = part.split("|").map((piece) => piece.trim());
    return { name, size: number(size), price: number(price) };
  });
};

export const rowToProduct = (row) => {
  const values = Object.fromEntries(headers.map((header, index) => [header, row.getCell(index + 1).value]));
  return {
    id: cell(values["Product ID"]), name: cell(values.Name), groupName: cell(values["Product Group"]), unitSymbol: cell(values.Unit),
    itemType: cell(values.Type) || "stock", kind: choice(values.Kind), form: choice(values.Form), vegMark: choice(values["Veg Mark"]),
    allergens: list(values.Allergens), storage: choice(values.Storage),
    defaultThreshold: cell(values["Low Stock Threshold"]) === "" ? undefined : Number(values["Low Stock Threshold"]), // blank = keep, or 0 for a new product brand: cell(values.Brand),
    productCode: cell(values["Product Code"]), imageUrl: cell(values["Image URL"]), pricePerUnit: number(values["Price per Unit"]),
    soldInPacks: bool(values["Ordered in Packs"]), packs: parsePacks(values.Packs), archived: bool(values.Archived)
  };
};

export const createProductWorkbook = async (products = [], { template = false } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MKM Inventory";
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E5B4F" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [18, 28, 22, 12, 14, 12, 12, 12, 30, 12, 20, 18, 18, 34, 18, 18, 48, 14].map((width) => ({ width }));
  // The id goes in as text: an ObjectId object would be stored as a quoted JSON string that the import cannot read back.
  if (!template) products.forEach((p) => sheet.addRow([
    String(p._id), p.name, p.group?.name || "", p.unit?.symbol || "", p.itemType, p.kind || "", p.form || "", p.vegMark || "", (p.allergens || []).join(", "), p.storage || "",
    p.defaultThreshold, p.brand, p.productCode,
    p.imageUrl, p.pricePerUnit ?? "", p.soldInPacks ? "Yes" : "No", packText(p.packs), p.archived ? "Yes" : "No"
  ]));
  const guide = workbook.addWorksheet("How to use");
  guide.columns = [{ width: 22 }, { width: 96 }];
  guide.addRow(["Bulk product import", "Fill the Products sheet and upload it from Products. Required fields are Name, Product Group and Unit. Existing groups are matched by name and units by their exact preset symbol."]);
  guide.addRow(["Updating", "Keep Product ID from an exported sheet to update that item. A row without an ID creates a product. Do not change IDs."]);
  guide.addRow(["Blank values", "Blank optional fields stay blank. A blank price creates or keeps an incomplete product, which is hidden from kitchens until priced."]);
  guide.addRow(["Packs", "Set Ordered in Packs to Yes, then enter packs as Name|Size|Price separated by semicolons. Example: Bag|25|1450; Carton|50|2800."]);
  guide.addRow(["Food safety", "Kind is food or non_food. A food row also needs Veg Mark (veg, non_veg or egg) and Storage (room, fridge or freezer); Form and Allergens are optional. Leave them blank on a non-food row."]);
  guide.addRow(["Archived", "Only super-admins may archive or restore through import. An archived product cannot be archived if a kitchen still holds it."]);
  guide.getRow(1).font = { bold: true };
  return workbook;
};
