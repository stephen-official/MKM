import PDFDocument from "pdfkit";
import { formatGeneratedAt } from "../executive/exportCommon.js";
import { CHOICES } from "./productWorkbook.js";

// The Products list as a PDF to read or print (the Excel export is the one to edit and upload back).
// Standard PDF fonts have no ₹ sign, so amounts read "INR" as in the executive report.
const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const inr = (n) => (typeof n === "number" ? `INR ${money.format(n)}` : "Not priced");
const label = (field, code) => CHOICES[field].find(([value]) => value === code)?.[1] || "";
const ALLERGEN_WORDS = { none: "None", unknown: "Not sure", gluten: "Gluten", milk: "Milk", egg: "Egg", fish: "Fish", crustacean: "Crustaceans", peanut: "Peanut", tree_nut: "Tree nuts", soy: "Soy", sulphite: "Sulphites" };

// [heading, share of the page width, one-line description]
export const PDF_COLUMNS = [
  ["ID", 0.06, "Permanent Product ID; matches the Excel file."],
  ["Name", 0.15, "The product name kitchens see."],
  ["Group", 0.11, "The product group it is listed under."],
  ["Unit", 0.05, "The unit kitchens count it in."],
  ["Food facts", 0.15, "Food or non-food, veg mark, packaged or loose, storage."],
  ["Allergens", 0.11, "Allergens it contains, as answered on the product."],
  ["Low stock", 0.06, "Kitchens are warned at or below this amount."],
  ["Price", 0.08, "Price of one unit."],
  ["Packs", 0.15, "Packs it is bought in: name, size and price."],
  ["Status", 0.08, "Archived, or what it still needs before kitchens see it."]
];

const NEEDS = { group: "group", unit: "unit", price: "price", packs: "packs", packDetails: "pack details", packPrice: "pack price" };
const statusText = (p) => {
  if (p.archived) return "Archived";
  const needs = [...(p.missing || []).map((code) => NEEDS[code] || code), ...(p.fssaiMissing ? ["food facts"] : []), ...(p.imageUrl ? [] : ["photo"])];
  return needs.length ? `Needs ${needs.join(", ")}` : "Available";
};

/** One product as the PDF's row of text, in PDF_COLUMNS order. */
export const productPdfRow = (p) => {
  const unit = p.unit?.symbol || "";
  const facts = p.kind === "food"
    ? [label("kind", p.kind), label("vegMark", p.vegMark), label("form", p.form), label("storage", p.storage)].filter(Boolean).join(", ")
    : label("kind", p.kind) || "Not answered";
  const packs = (p.packs || []).map((pack) => `${pack.name} ${pack.size} ${unit}, ${inr(pack.price)}`).join("; ");
  return [
    p.productNo || "", p.name, p.group?.name || "", unit, facts,
    p.kind === "food" ? (p.allergens || []).map((a) => ALLERGEN_WORDS[a] || a).join(", ") || "Not answered" : "",
    p.defaultThreshold ? `${p.defaultThreshold} ${unit}` : "", inr(p.pricePerUnit), packs || "", statusText(p)
  ];
};

export const renderProductsPdf = (products, { generatedAt = new Date().toISOString(), timezone = "Asia/Kolkata" } = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true, info: { Title: "Products" } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  const left = 36;
  const width = doc.page.width - 72;
  const bottom = doc.page.height - 50;
  const widths = PDF_COLUMNS.map(([, share]) => share * width);

  doc.font("Helvetica-Bold").fontSize(18).text("Products", left);
  doc.font("Helvetica").fontSize(9).fillColor("#444")
    .text(`${products.length} products · Generated ${formatGeneratedAt(generatedAt, timezone)} · Amounts in INR`).fillColor("#000").moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(10).text("What each column means", left).moveDown(0.2);
  PDF_COLUMNS.forEach(([heading, , description]) => {
    doc.font("Helvetica-Bold").fontSize(8.5).text(`${heading}: `, left, doc.y, { continued: true }).font("Helvetica").text(description);
  });
  doc.moveDown(0.8);

  const row = (cells, header) => {
    doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    const height = Math.max(...cells.map((text, i) => doc.heightOfString(String(text), { width: widths[i] - 6 }))) + 6;
    if (doc.y + height > bottom) {
      doc.addPage();
      if (!header) row(PDF_COLUMNS.map(([h]) => h), true);
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    }
    const y = doc.y;
    if (header) doc.rect(left, y, width, height).fill("#E4EDF9").fillColor("#000");
    let x = left;
    cells.forEach((text, i) => { doc.text(String(text), x + 3, y + 3, { width: widths[i] - 6 }); x += widths[i]; });
    doc.moveTo(left, y + height).lineTo(left + width, y + height).lineWidth(0.4).strokeColor("#C9D3E2").stroke();
    doc.y = y + height;
  };
  row(PDF_COLUMNS.map(([h]) => h), true);
  products.forEach((p) => row(productPdfRow(p), false));
  if (products.length === 0) doc.font("Helvetica-Oblique").fontSize(9).text("No products yet.", left, doc.y + 6);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#666").text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 30, { width, align: "center", lineBreak: false });
  }
  doc.end();
});
