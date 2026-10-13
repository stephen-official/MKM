import ExcelJS from "exceljs";
import { formatGeneratedAt, tiedItemsNote } from "./exportCommon.js";

export const SHEETS = Object.freeze([
  "Summary", "Definitions", "Consumption trend", "Top items", "Stock health", "Unpriced stock",
  "Procurement", "Requests & transfers", "Kitchen comparison"
]);
const MONEY = '"₹"#,##0.00';
const QTY = "#,##0.###";
const fmtCount = (n) => Number(n).toLocaleString("en-IN");

const header = (sheet, cells) => {
  const row = sheet.addRow(cells);
  row.font = { bold: true };
  return row;
};

const truncationNote = (sheet, shown, total) => {
  if (total > shown) sheet.addRow([`Showing ${fmtCount(shown)} of ${fmtCount(total)} rows. Narrow the filters to see the rest.`]);
};

const table = (sheet, section, columns, rowsOf, notesOf = () => []) => {
  if (!section || section.status !== "ok") {
    sheet.addRow(["This section could not be generated."]);
    return;
  }
  const rows = rowsOf(section.data);
  truncationNote(sheet, rows.length, section.data.total ?? rows.length);
  for (const note of notesOf(section.data)) sheet.addRow([note]);
  header(sheet, columns.map((c) => c.label));
  for (const r of rows) sheet.addRow(columns.map((c) => c.value(r)));
  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width || 16;
    if (c.numFmt) sheet.getColumn(i + 1).numFmt = c.numFmt;
  });
};

export const buildExcelWorkbook = (report, { listLimit = 5000 } = {}) => {
  const { meta, kpis, sections } = report;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MKM Executive Report";
  wb.created = new Date(meta.generatedAt);
  const sheets = Object.fromEntries(SHEETS.map((name) => [name, wb.addWorksheet(name)]));

  // Summary: column 5 holds the KPI id so totals can be checked mechanically.
  const s = sheets.Summary;
  s.addRow(["Executive Report"]).font = { bold: true, size: 14 };
  s.addRow(["Kitchen", meta.kitchen.name + (meta.kitchen.active === false ? " (inactive)" : "")]);
  s.addRow(["Period", `${meta.from} to ${meta.to} (inclusive)`]);
  s.addRow(["Generated at", formatGeneratedAt(meta.generatedAt, meta.timezone)]);
  s.addRow(["Timezone", meta.timezone]);
  s.addRow(["Currency", meta.currency]);
  s.addRow([]);
  header(s, ["KPI", "Value", "Type", "Notes", "KPI id"]);
  for (const k of kpis) {
    const row = s.addRow([
      k.label + (k.estimated ? " (estimated)" : ""),
      k.status === "ok" ? k.value : "Not available",
      k.kind === "snapshot" ? "Current" : "Period",
      k.status === "ok" ? "" : "Could not be calculated",
      k.id
    ]);
    if (k.format === "money" && k.status === "ok") row.getCell(2).numFmt = MONEY;
  }
  const kpi = (id) => kpis.find((k) => k.id === id);
  s.addRow([]);
  header(s, ["Excluded or unvalued", "Count"]);
  s.addRow(["Unpriced stock items", kpi("stockValue")?.details?.unpricedItemCount ?? 0]);
  s.addRow(["Unpriced stock quantity (base units)", kpi("stockValue")?.details?.unpricedQty ?? 0]);
  s.addRow(["Unvalued consumption lines", kpi("consumptionValue")?.details?.unvaluedLineCount ?? 0]);
  s.addRow(["Unpriced allocations", kpi("stockReceivedValue")?.details?.unpricedAllocationCount ?? 0]);
  s.addRow([]);
  s.addRow(["Note", meta.notes.historicalStock]);
  s.addRow(["Note", meta.notes.unvaluedConsumption]);
  s.getColumn(1).width = 42;
  s.getColumn(2).width = 22;
  s.getColumn(4).width = 26;
  s.getColumn(5).hidden = true;

  header(sheets.Definitions, ["KPI", "Type", "Definition"]);
  for (const d of meta.definitions) sheets.Definitions.addRow([d.label, d.kind === "snapshot" ? "Current" : "Period", d.text]);
  sheets.Definitions.getColumn(1).width = 36;
  sheets.Definitions.getColumn(3).width = 120;

  table(sheets["Consumption trend"], sections.consumptionTrend, [
    { label: "Date", value: (r) => r.date, width: 14 },
    { label: "Consumption value", value: (r) => r.value, numFmt: MONEY, width: 20 },
    { label: "Unvalued lines", value: (r) => r.unvaluedLines }
  ], (d) => d.points);

  table(sheets["Top items"], sections.topItems, [
    { label: "Rank", value: (r) => r.rank, width: 8 },
    { label: "Item", value: (r) => r.name, width: 32 },
    { label: "Value", value: (r) => r.value, numFmt: MONEY, width: 18 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 },
    { label: "Unvalued lines", value: (r) => r.unvaluedLines }
  ], (d) => d.items, (d) => (d.tiedBeyondLimit > 0 ? [tiedItemsNote(d.tiedBeyondLimit)] : []));

  table(sheets["Stock health"], sections.stockHealth, [
    { label: "Status", value: (r) => (r.state === "out" ? "Out of stock" : "Low"), width: 14 },
    { label: "Kitchen", value: (r) => r.kitchen, width: 28 },
    { label: "Item", value: (r) => r.item, width: 32 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Threshold", value: (r) => r.threshold, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 }
  ], (d) => d.rows.slice(0, listLimit));

  table(sheets["Unpriced stock"], sections.unpricedStock, [
    { label: "Kitchen", value: (r) => r.kitchen, width: 28 },
    { label: "Item", value: (r) => r.item, width: 32 },
    { label: "Quantity", value: (r) => r.qty, numFmt: QTY },
    { label: "Unit", value: (r) => r.unit, width: 8 }
  ], (d) => d.rows.slice(0, listLimit));

  const p = sheets.Procurement;
  if (sections.procurement?.status === "ok") {
    const d = sections.procurement.data;
    header(p, ["Measure", "Value"]);
    p.addRow(["Stock received value", d.stockReceived.value]).getCell(2).numFmt = MONEY;
    p.addRow(["Unpriced allocations", d.stockReceived.unpricedAllocationCount ?? 0]);
    p.addRow(["Distributions", d.stockReceived.distributionCount ?? 0]);
    if (d.scope === "all") {
      p.addRow(["Procurement spend (received value)", d.spend.value]).getCell(2).numFmt = MONEY;
      p.addRow(["Purchase orders received", d.spend.poCount]);
      p.addRow(["POs awaiting distribution", d.awaiting.count]);
      p.addRow(["Value awaiting distribution", d.awaiting.value]).getCell(2).numFmt = MONEY;
      p.addRow([]);
      header(p, ["Indent status", "Count", "Value"]);
      for (const r of d.indents) p.addRow([r.status, r.count, r.value]).getCell(3).numFmt = MONEY;
    }
    p.addRow([]);
    header(p, ["Supply request status", "Count"]);
    for (const r of d.supplyRequests) p.addRow([r.status, r.count]);
    p.getColumn(1).width = 38;
    p.getColumn(2).width = 18;
  } else {
    p.addRow(["This section could not be generated."]);
  }

  const rt = sheets["Requests & transfers"];
  if (sections.requestsTransfers?.status === "ok") {
    const { requests, transfers } = sections.requestsTransfers.data;
    header(rt, ["Requests created in period", "Count"]);
    for (const r of requests.byStatus) rt.addRow([r.status, r.count]);
    rt.addRow(["Approval rate (%)", requests.approvalRate ?? "—"]);
    rt.addRow([]);
    header(rt, ["Pending requests by age", "Count"]);
    for (const b of requests.pendingAgeing.buckets) rt.addRow([b.label, b.count]);
    rt.addRow([]);
    header(rt, ["Transfers created in period", "Count"]);
    for (const r of transfers.byStatus) rt.addRow([r.status, r.count]);
    rt.addRow([]);
    header(rt, ["Open transfers by age", "Count"]);
    for (const b of transfers.openAgeing.buckets) rt.addRow([b.label, b.count]);
    rt.getColumn(1).width = 34;
  } else {
    rt.addRow(["This section could not be generated."]);
  }

  const kc = sheets["Kitchen comparison"];
  if (sections.kitchenComparison === null) {
    kc.addRow(["Not applicable: a single kitchen is selected."]);
  } else {
    table(kc, sections.kitchenComparison, [
      { label: "Kitchen", value: (r) => r.kitchen + (r.deleted ? "" : r.active ? "" : " (inactive)"), width: 32 },
      { label: "Consumption value", value: (r) => r.consumptionValue, numFmt: MONEY, width: 20 },
      { label: "Unvalued lines", value: (r) => r.unvaluedLines },
      { label: "Low or out of stock (current)", value: (r) => (r.lowOrOutOfStock === null ? "—" : r.lowOrOutOfStock), width: 26 },
      { label: "Pending requests (current)", value: (r) => r.pendingRequests, width: 24 },
      { label: "Stock received value", value: (r) => r.stockReceivedValue, numFmt: MONEY, width: 20 }
    ], (d) => d.rows);
  }
  return wb;
};
