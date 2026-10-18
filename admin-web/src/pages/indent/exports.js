/* Excel exports for the Indent page. Pure functions: they build and download a
   workbook and never touch React state. */
import XLSX from "xlsx-js-style";
import { dateKey, fmtDate, rangeLabel, idOf } from "./helpers.js";

const FILLS = { title: "1E3A8A", date: "16A34A", header: "2563EB" };

/* rows: array of arrays. marks: { rowIndex: "title" | "date" | "header" }. */
const buildSheet = (rows, marks) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const width = Math.max(1, ...rows.map((r) => r.length));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: width - 1 } }];
  Object.entries(marks).forEach(([row, kind]) => {
    for (let c = 0; c < width; c += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: Number(row), c })];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, ...(kind === "title" ? { sz: 16 } : {}) },
        alignment: kind === "date" ? undefined : { horizontal: "center" },
        fill: { patternType: "solid", fgColor: { rgb: FILLS[kind] } }
      };
    }
  });
  return ws;
};

const save = (ws, sheetName, fileName) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};

/* One indent -> product / group / qty / unit / price / subtotal. */
export const exportIndent = (indent, r) => {
  const rows = [["INDENT REPORT"], [`DATE: ${fmtDate(indent.createdAt)}`], [], ["Product", "Group", "Packaging", "Pack quantity", "Base quantity", "Unit", "Price", "Subtotal"]];
  (indent.items || []).forEach((item) => {
    rows.push([
      r.name(item), r.group(item), item.packName || r.unit(item), item.packQuantity || "",
      item.orderedQty, r.unit(item), item.packId ? item.packPrice : item.unitPrice, item.orderedQty * item.unitPrice,
    ]);
  });
  const ws = buildSheet(rows, { 0: "title", 1: "date", 3: "header" });
  ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];
  save(ws, "Indent", `Indent_${indent.indentNo || "Export"}.xlsx`);
};

/* Supply requests -> consolidated received table, then one block per day. */
export const exportRequests = (requests, r, from, to) => {
  const branchOf = (req) => req.godownId?.name || "General";
  const sorted = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rows = [["MONTESSORI DAILY INDENT REQUEST REPORT"], []];
  const marks = { 0: "title" };
  const mark = (kind) => { marks[rows.length - 1] = kind; };

  const branches = [...new Set(sorted.map(branchOf))].sort();
  const consolidated = new Map();
  sorted.forEach((req) => {
    (req.items || []).forEach((it) => {
      const id = idOf(it);
      if (!consolidated.has(id)) consolidated.set(id, { name: r.name(it), group: r.group(it), unit: r.unit(it), total: 0, by: {} });
      const entry = consolidated.get(id);
      const received = Number(it.receivedQty || 0);
      entry.total += received;
      entry.by[branchOf(req)] = (entry.by[branchOf(req)] || 0) + received;
    });
  });
  rows.push(["CONSOLIDATED RECEIVED REPORT"]);
  mark("date");
  rows.push(["S.No", "Stock Item", "Stock Group", "Unit", "Total Received", ...branches]);
  mark("header");
  [...consolidated.values()].forEach((e, i) => rows.push([i + 1, e.name, e.group, e.unit, e.total, ...branches.map((b) => e.by[b] || 0)]));
  rows.push([], []);

  const byDay = new Map();
  sorted.forEach((req) => {
    const key = dateKey(req.createdAt);
    byDay.set(key, [...(byDay.get(key) || []), req]);
  });
  [...byDay.keys()].sort().reverse().forEach((key) => {
    const dayRequests = byDay.get(key);
    const dayBranches = [...new Set(dayRequests.map(branchOf))];
    const items = new Map();
    dayRequests.forEach((req) => {
      (req.items || []).forEach((it) => {
        const id = idOf(it);
        if (!items.has(id)) items.set(id, { name: r.name(it), group: r.group(it), unit: r.unit(it), req: 0, rec: 0, by: {} });
        const entry = items.get(id);
        const b = (entry.by[branchOf(req)] ||= { req: 0, rec: 0 });
        const q = Number(it.qtyBaseUnit || 0);
        const rc = Number(it.receivedQty || 0);
        entry.req += q; entry.rec += rc; b.req += q; b.rec += rc;
      });
    });
    rows.push([`DATE: ${fmtDate(dayRequests[0].createdAt)}`]);
    mark("date");
    rows.push(["S.No", "Stock Item", "Stock Group", "Unit", "Requested (Total)", "Received (Total)", ...dayBranches.flatMap((b) => [`${b} - Requested`, `${b} - Received`])]);
    mark("header");
    [...items.values()].forEach((e, i) =>
      rows.push([i + 1, e.name, e.group, e.unit, e.req, e.rec, ...dayBranches.flatMap((b) => [e.by[b]?.req || 0, e.by[b]?.rec || 0])])
    );
    rows.push([]);
  });

  save(buildSheet(rows, marks), "Indent Report", `Montessori_Indent_${rangeLabel(from, to)}.xlsx`);
};
