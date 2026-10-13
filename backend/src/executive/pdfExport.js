import PDFDocument from "pdfkit";
import { formatGeneratedAt } from "./exportCommon.js";

export const PDF_LIST_LIMIT = 200;
const num = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-IN");

export const formatInr = (n) => (typeof n === "number" ? `${n < 0 ? "-" : ""}INR ${num.format(Math.abs(n))}` : "—");
const kpiText = (k) => (k.status !== "ok" ? "Not available" : k.format === "money" ? formatInr(k.value) : count.format(k.value));

const capped = (title, columns, rows, total) => ({
  type: "table", title, columns,
  rows: rows.slice(0, PDF_LIST_LIMIT),
  note: total > Math.min(rows.length, PDF_LIST_LIMIT)
    ? `Showing ${count.format(Math.min(rows.length, PDF_LIST_LIMIT))} of ${count.format(total)} — use the Excel export for the full list.`
    : null
});

/** Pure description of the document, so content can be tested without parsing PDF bytes. */
export const pdfBlocks = ({ meta, kpis, sections }) => {
  const blocks = [
    { type: "title", text: "Executive Report" },
    { type: "meta", text: `${meta.kitchen.name}${meta.kitchen.active === false ? " (inactive)" : ""} · ${meta.from} to ${meta.to} (inclusive)` },
    { type: "meta", text: `Generated ${formatGeneratedAt(meta.generatedAt, meta.timezone)} · Timezone ${meta.timezone} · Amounts in INR` },
    { type: "note", text: meta.notes.historicalStock },
    { type: "heading", text: "Key figures" },
    ...kpis.map((k) => ({ type: "kpi", id: k.id, label: `${k.label}${k.estimated ? " (estimated)" : ""}`, text: kpiText(k), raw: k.status === "ok" ? k.value : null }))
  ];
  const s = sections;
  if (s.topItems?.status === "ok") {
    blocks.push(capped("Top consumed items", ["#", "Item", "Value", "Quantity"],
      s.topItems.data.items.map((i) => [String(i.rank), i.name, formatInr(i.value), `${i.qty} ${i.unit}`]), s.topItems.data.items.length));
  }
  if (s.stockHealth?.status === "ok") {
    blocks.push(capped("Stock health", ["Status", "Kitchen", "Item", "Qty", "Threshold"],
      s.stockHealth.data.rows.map((r) => [r.state === "out" ? "Out" : "Low", r.kitchen, r.item, `${r.qty} ${r.unit}`, r.threshold ? `${r.threshold} ${r.unit}` : "—"]), s.stockHealth.data.total));
  }
  if (s.unpricedStock?.status === "ok") {
    blocks.push(capped("Items without a price", ["Kitchen", "Item", "Qty"],
      s.unpricedStock.data.rows.map((r) => [r.kitchen, r.item, `${r.qty} ${r.unit}`]), s.unpricedStock.data.total));
  }
  if (s.kitchenComparison?.status === "ok") {
    blocks.push(capped("Kitchen comparison", ["Kitchen", "Consumption", "Unvalued", "Low/out", "Pending", "Received"],
      s.kitchenComparison.data.rows.map((r) => [r.kitchen, formatInr(r.consumptionValue), String(r.unvaluedLines), r.lowOrOutOfStock === null ? "—" : String(r.lowOrOutOfStock), String(r.pendingRequests), formatInr(r.stockReceivedValue)]),
      s.kitchenComparison.data.total));
  }
  blocks.push({ type: "heading", text: "Definitions" });
  for (const d of meta.definitions) blocks.push({ type: "note", text: `${d.label}: ${d.text}` });
  return blocks;
};

export const renderPdf = (blocks) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: "Executive Report" } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  const width = doc.page.width - 96;

  for (const block of blocks) {
    if (block.type === "title") doc.font("Helvetica-Bold").fontSize(20).text(block.text).moveDown(0.3);
    else if (block.type === "meta") doc.font("Helvetica").fontSize(10).fillColor("#444").text(block.text).fillColor("#000");
    else if (block.type === "heading") doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).text(block.text).moveDown(0.3);
    else if (block.type === "note") doc.font("Helvetica-Oblique").fontSize(9).text(block.text, { width }).moveDown(0.2);
    else if (block.type === "kpi") {
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).text(block.label, 48, y, { width: width * 0.6 });
      doc.font("Helvetica-Bold").text(block.text, 48 + width * 0.6, y, { width: width * 0.4, align: "right" });
      doc.moveDown(0.2);
    } else if (block.type === "table") {
      doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).text(block.title, 48);
      if (block.note) doc.font("Helvetica-Oblique").fontSize(9).text(block.note);
      const colW = width / block.columns.length;
      const row = (cells, bold) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const y = doc.y;
        cells.forEach((cell, i) => doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).text(String(cell), 48 + i * colW, y, { width: colW - 4, ellipsis: true, lineBreak: false }));
        doc.y = y + 13;
      };
      row(block.columns, true);
      for (const r of block.rows) row(r, false);
      doc.x = 48;
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#666").text(`Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, { width, align: "center", lineBreak: false });
  }
  doc.end();
});
