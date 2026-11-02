import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { formatGeneratedAt } from "../executive/exportCommon.js";
import { CHOICES } from "./productWorkbook.js";

// The Products list as a PDF to read or print (the Excel export is the one to edit and upload back). No prices: they
// change often and live in the app only. It is drawn in the website's glass look (admin-web theme.css / glass.css): Inter,
// the pale blue wash, frosted white cards with a hairline rim, rounded rows and the status pills. A PDF cannot blur what
// is behind it, so the frost is see-through white over the wash. Inter (SIL Open Font License, see assets/fonts) and the
// logo live in src/assets.
const asset = (path) => fileURLToPath(new URL(`../assets/${path}`, import.meta.url));
const FONTS = { regular: asset("fonts/Inter-Regular.ttf"), medium: asset("fonts/Inter-Medium.ttf"), semibold: asset("fonts/Inter-SemiBold.ttf") };
const LOGO = asset("mkmLogo.png");

// Website tokens (admin-web/src/theme.css).
const C = {
  canvas: "#f1f4f8", ink: "#1c2a43", muted: "#55647d", blueDeep: "#234a7e", blueSoft: "#e4edf9", outline: "#aabad2",
  ok: ["#2f6b47", "#eaf5ee"], soon: ["#8a6420", "#fdf5e6"], routine: ["#55647d", "#f0f3f7"]
};

const label = (field, code) => CHOICES[field].find(([value]) => value === code)?.[1] || "";
const ALLERGEN_WORDS = { none: "None", unknown: "Not sure", gluten: "Gluten", milk: "Milk", egg: "Egg", fish: "Fish", crustacean: "Crustaceans", peanut: "Peanut", tree_nut: "Tree nuts", soy: "Soy", sulphite: "Sulphites" };

// [heading, share of the table width, one-line description]. Products are listed under their group's heading.
export const PDF_COLUMNS = [
  ["ID", 0.06, "Permanent Product ID; matches the Excel file."],
  ["Name", 0.19, "The product name kitchens see."],
  ["Unit", 0.05, "The unit kitchens count it in."],
  ["Food facts", 0.22, "Food or non-food, veg mark, packaged or loose, storage."],
  ["Allergens", 0.13, "Allergens it contains, as answered on the product."],
  ["Low stock", 0.08, "Kitchens are warned at or below this amount."],
  ["Packs", 0.14, "Packs the store buys it in: name and size."],
  ["Status", 0.13, "Available, archived, or what it still needs."]
];

const NEEDS = { group: "group", unit: "unit", price: "price", packs: "packs", packDetails: "pack details", packPrice: "pack price" };
const statusText = (p) => {
  if (p.archived) return "Archived";
  const needs = [...(p.missing || []).map((code) => NEEDS[code] || code), ...(p.fssaiMissing ? ["food facts"] : []), ...(p.imageUrl ? [] : ["photo"])];
  return needs.length ? `Needs ${needs.join(", ")}` : "Available";
};
const statusTone = (text) => (text === "Available" ? C.ok : text === "Archived" ? C.routine : C.soon);

/** One product as the PDF's row of text, in PDF_COLUMNS order. */
export const productPdfRow = (p) => {
  const unit = p.unit?.symbol || "";
  const facts = p.kind === "food"
    ? [label("kind", p.kind), label("vegMark", p.vegMark), label("form", p.form), label("storage", p.storage)].filter(Boolean).join(", ")
    : label("kind", p.kind) || "Not answered";
  const packs = (p.packs || []).map((pack) => `${pack.name} of ${pack.size} ${unit}`).join("; ");
  return [
    p.productNo || "", p.name, unit, facts,
    p.kind === "food" ? (p.allergens || []).map((a) => ALLERGEN_WORDS[a] || a).join(", ") || "Not answered" : "",
    p.defaultThreshold ? `${p.defaultThreshold} ${unit}` : "", packs || "", statusText(p)
  ];
};

export const renderProductsPdf = (products, { generatedAt = new Date().toISOString(), timezone = "Asia/Kolkata" } = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", autoFirstPage: false, bufferPages: true, margins: { top: 0, left: 0, right: 0, bottom: 0 }, info: { Title: "Products · Montessori Kitchen Management" } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  doc.registerFont("Inter", FONTS.regular).registerFont("Inter-Medium", FONTS.medium).registerFont("Inter-SemiBold", FONTS.semibold);

  const W = 841.89;
  const H = 595.28;
  const M = 28; // page gutter
  const left = M + 6;
  const width = W - 2 * left;
  const bottom = H - 40;
  const widths = PDF_COLUMNS.map(([, share]) => share * width);
  const generated = formatGeneratedAt(generatedAt, timezone);

  // A frosted card: see-through white, a white rim, a hairline outline and a soft shadow (theme.css --glass-*).
  const glass = (x, y, w, h, r, { fill = "#ffffff", opacity = 0.72, shadow = true } = {}) => {
    doc.save();
    if (shadow) doc.fillColor("#1e345c").fillOpacity(0.05).roundedRect(x, y + 4, w, h, r).fill();
    doc.fillColor(fill).fillOpacity(opacity).roundedRect(x, y, w, h, r).fill();
    doc.fillOpacity(1).lineWidth(0.6).strokeColor(C.outline).strokeOpacity(0.42).roundedRect(x - 0.3, y - 0.3, w + 0.6, h + 0.6, r).stroke();
    doc.strokeColor("#ffffff").strokeOpacity(0.95).lineWidth(0.8).roundedRect(x + 0.4, y + 0.4, w - 0.8, h - 0.8, r).stroke();
    doc.restore();
  };
  const pill = (text, x, y, [fg, bg], { size = 7, font = "Inter-Medium" } = {}) => {
    doc.font(font).fontSize(size);
    const w = doc.widthOfString(text) + 12;
    doc.save().fillColor(bg).roundedRect(x, y, w, size + 7, (size + 7) / 2).fill().restore();
    doc.fillColor(fg).text(text, x + 6, y + 3.2, { lineBreak: false });
    return w;
  };

  // Every page: the wash, then the glass header (logo orb, organisation, app name, what this is and when it was made).
  const newPage = () => {
    doc.addPage({ size: "A4", layout: "landscape", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
    doc.rect(0, 0, W, H).fill(C.canvas);
    [[0.12 * W, -0.06 * H, 0.34 * W, "#bad0f0", 0.55], [0.96 * W, 0.28 * H, 0.3 * W, "#ccdcf4", 0.6], [0.42 * W, 1.12 * H, 0.32 * W, "#dee6f2", 0.8]].forEach(([x, y, r, color, alpha]) => {
      const g = doc.radialGradient(x, y, 0, x, y, r);
      g.stop(0, color, alpha).stop(1, color, 0);
      doc.circle(x, y, r).fill(g);
    });
    glass(M, 16, W - 2 * M, 52, 20);
    const cx = M + 32;
    const cy = 42;
    doc.save().fillColor("#ffffff").fillOpacity(0.8).circle(cx, cy, 17).fill().restore();
    doc.save().lineWidth(0.7).strokeColor("#a6b6ce").strokeOpacity(0.55).circle(cx, cy, 17).stroke().restore();
    doc.image(LOGO, cx - 11, cy - 12.5, { fit: [22, 25], align: "center", valign: "center" });
    doc.font("Inter-Medium").fontSize(7).fillColor(C.muted).text("MONTESSORI GROUP OF SCHOOLS", cx + 26, 30, { characterSpacing: 1.1, lineBreak: false });
    doc.font("Inter-SemiBold").fontSize(15).fillColor(C.ink).text("Montessori Kitchen Management", cx + 26, 40, { lineBreak: false });
    doc.font("Inter").fontSize(8).fillColor(C.muted);
    const stamp = `Generated ${generated}`;
    doc.text(stamp, W - M - 20 - doc.widthOfString(stamp), 46, { lineBreak: false });
    pill("Products", W - M - 20 - 60, 28, [C.blueDeep, C.blueSoft], { size: 8 });
    doc.y = 84;
  };

  const tableHeader = () => {
    const y = doc.y;
    doc.save().fillColor(C.blueSoft).fillOpacity(0.9).roundedRect(left, y, width, 20, 10).fill().restore();
    let x = left;
    doc.font("Inter-SemiBold").fontSize(7).fillColor(C.blueDeep);
    PDF_COLUMNS.forEach(([heading], i) => { doc.text(heading.toUpperCase(), x + 8, y + 6.5, { width: widths[i] - 12, characterSpacing: 0.6, lineBreak: false }); x += widths[i]; });
    doc.y = y + 26;
  };
  const ensureRoom = (height, { repeatHeader = true } = {}) => {
    if (doc.y + height <= bottom) return false;
    newPage();
    if (repeatHeader) tableHeader();
    return true;
  };

  newPage();
  // Title and the column guide (first page only).
  const groups = new Map();
  products.forEach((p) => { const name = p.group?.name || "No group"; groups.set(name, [...(groups.get(name) || []), p]); });
  doc.font("Inter-SemiBold").fontSize(22).fillColor(C.ink).text("Products", left, doc.y, { lineBreak: false });
  doc.font("Inter").fontSize(9).fillColor(C.muted)
    .text(`${products.length} products in ${groups.size} ${groups.size === 1 ? "group" : "groups"} · prices are kept in the app only`, left, doc.y + 28, { lineBreak: false });
  doc.y += 18;
  const guideTop = doc.y;
  const half = Math.ceil(PDF_COLUMNS.length / 2);
  const guideH = 38 + half * 13;
  glass(left, guideTop, width, guideH, 18);
  doc.font("Inter-SemiBold").fontSize(9).fillColor(C.ink).text("What each column means", left + 16, guideTop + 10, { lineBreak: false });
  PDF_COLUMNS.forEach(([heading, , description], i) => {
    const x = left + 16 + (i < half ? 0 : width / 2);
    const y = guideTop + 28 + (i % half) * 13;
    doc.font("Inter-Medium").fontSize(8).fillColor(C.ink).text(`${heading}: `, x, y, { continued: true, lineBreak: false })
      .font("Inter").fillColor(C.muted).text(description, { lineBreak: false });
  });
  doc.y = guideTop + guideH + 16;
  tableHeader();

  // Products under their group headings, each a rounded glass row with a status pill.
  [...groups].forEach(([groupName, rows]) => {
    ensureRoom(46);
    doc.save().fillColor(C.blueDeep).circle(left + 5, doc.y + 6, 2.6).fill().restore();
    doc.font("Inter-SemiBold").fontSize(10).fillColor(C.ink).text(groupName, left + 14, doc.y, { continued: true, lineBreak: false })
      .font("Inter").fillColor(C.muted).text(`  ·  ${rows.length}`, { lineBreak: false });
    doc.y += 18;
    rows.forEach((p) => {
      const cells = productPdfRow(p);
      const status = cells.at(-1);
      doc.font("Inter").fontSize(8);
      const heights = cells.map((text, i) => doc.heightOfString(String(text) || " ", { width: widths[i] - 12 }));
      const height = Math.max(24, Math.max(...heights.slice(0, -1)) + 12);
      if (ensureRoom(height + 4)) {
        doc.font("Inter-Medium").fontSize(8).fillColor(C.muted).text(`${groupName} (continued)`, left + 14, doc.y, { lineBreak: false });
        doc.y += 14;
      }
      const y = doc.y;
      glass(left, y, width, height, 9, { opacity: 0.66, shadow: false });
      let x = left;
      cells.forEach((text, i) => {
        if (i === cells.length - 1) {
          doc.font("Inter-Medium").fontSize(7);
          const fits = doc.widthOfString(status) + 12 <= widths[i] - 8;
          if (fits) pill(status, x + 8, y + (height - 14) / 2, statusTone(status));
          else doc.fillColor(statusTone(status)[0]).text(status, x + 8, y + (height - doc.heightOfString(status, { width: widths[i] - 12 })) / 2, { width: widths[i] - 12 });
        } else {
          // Each cell sits in the middle of the row, like the website's rows.
          doc.font(i === 1 ? "Inter-Medium" : "Inter").fontSize(8).fillColor(i === 0 ? C.muted : C.ink)
            .text(String(text), x + 8, y + (height - heights[i]) / 2, { width: widths[i] - 12 });
        }
        x += widths[i];
      });
      doc.y = y + height + 4;
    });
    doc.y += 8;
  });
  if (products.length === 0) {
    glass(left, doc.y, width, 40, 14);
    doc.font("Inter").fontSize(9).fillColor(C.muted).text("No products yet.", left + 16, doc.y + 14, { lineBreak: false });
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font("Inter").fontSize(7.5).fillColor(C.muted);
    doc.text("Montessori Kitchen Management · Products", left, H - 26, { lineBreak: false });
    const page = `Page ${i + 1} of ${range.count}`;
    doc.text(page, left + width - doc.widthOfString(page), H - 26, { lineBreak: false });
  }
  doc.end();
});
