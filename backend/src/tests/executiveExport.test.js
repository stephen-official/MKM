import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import ExcelJS from "exceljs";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { buildExcelWorkbook, SHEETS } from "../executive/excelExport.js";
import { GodownStock } from "../models/FlowModels.js";
import { buildExportReport, contentDisposition, exportFilename, exportTimeoutError, tiedItemsNote, withTimeout } from "../executive/exportCommon.js";

let app;
let f;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice", "Dal"]);
  const A = await kitchen("Main Kitchen");
  await distribution("2026-10-02T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await stockRow(A, items.Rice, 10, 20);
  await stockRow(A, items.Dal, 4);
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 40.5], [items.Dal, 2]] });
  f = { A, superAdmin: await createUser({ role: "super_admin" }), admin: await createUser({ role: "admin" }) };
});

const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

const fetchBoth = async (query) => {
  const auth = { Authorization: `Bearer ${f.superAdmin.token}` };
  const summary = await request(app).get("/api/executive/summary").query(query).set(auth);
  const file = await request(app).get("/api/executive/export.xlsx").query(query).set(auth).buffer(true).parse(binary);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.body);
  return { summary: summary.body, file, wb };
};

const kpiRows = (wb) => {
  const sheet = wb.getWorksheet("Summary");
  const out = {};
  sheet.eachRow((row) => { if (row.getCell(5).value) out[row.getCell(5).value] = row.getCell(2).value; });
  return out;
};

test("export totals equal the summary API totals", async () => {
  const { summary, file, wb } = await fetchBoth({ from: "2026-10-01", to: "2026-10-10" });
  assert.equal(file.status, 200);
  assert.equal(file.headers["content-type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const exported = kpiRows(wb);
  for (const kpi of summary.kpis) assert.equal(exported[kpi.id], kpi.value, kpi.id);
  assert.deepEqual(wb.worksheets.map((s) => s.name), SHEETS);
});

test("summary sheet records kitchen, range, generation time, timezone, currency and exclusions", async () => {
  const { wb } = await fetchBoth({ godownId: String(f.A._id), from: "2026-10-01", to: "2026-10-10" });
  const text = [];
  wb.getWorksheet("Summary").eachRow((row) => text.push(row.values.filter(Boolean).join(" | ")));
  const joined = text.join("\n");
  for (const needle of ["Main Kitchen", "2026-10-01 to 2026-10-10", "Asia/Kolkata", "INR", "Unpriced stock items", "Unvalued consumption lines", "Unpriced allocations", "Stock figures are current"]) {
    assert.ok(joined.includes(needle), `missing ${needle}`);
  }
  assert.equal(wb.getWorksheet("Kitchen comparison").rowCount <= 2, true, "single kitchen: comparison sheet only says not applicable");
});

test("filename and disposition follow the convention", async () => {
  const { file } = await fetchBoth({ godownId: String(f.A._id), from: "2026-10-01", to: "2026-10-10" });
  assert.match(file.headers["content-disposition"], /^attachment; filename="MKM-Executive-Report_Main-Kitchen_2026-10-01_to_2026-10-10_generated-\d{8}-\d{4}-IST\.xlsx"; filename\*=UTF-8''/);
  assert.equal(
    exportFilename({ kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-10", generatedAt: "2026-10-13T08:35:00Z", tz: "Asia/Kolkata", ext: "xlsx" }),
    "MKM-Executive-Report_All-Kitchens_2026-10-01_to_2026-10-10_generated-20261013-1405-IST.xlsx"
  );
  assert.equal(
    exportFilename({ kitchen: { id: "x", name: "Café / Annex #2" }, from: "2026-10-01", to: "2026-10-02", generatedAt: "2026-10-13T08:35:00Z", tz: "Europe/London", ext: "pdf" }),
    "MKM-Executive-Report_Cafe-Annex-2_2026-10-01_to_2026-10-02_generated-20261013-0935-Europe-London.pdf"
  );
});

test("contentDisposition is safe for hostile filenames", () => {
  const header = contentDisposition('a"b\\c\r\nSet-Cookie: x=1\u00e9\u20b9\u{1F600}\'()*.pdf');
  assert.doesNotMatch(header, /[^\x20-\x7E]/);
  const ascii = header.match(/filename="([^;]*)";/)?.[1];
  assert.ok(ascii, "quoted ASCII fallback present");
  assert.doesNotMatch(ascii, /["\\\r\n]/);
  assert.match(ascii, /^[\x20-\x7E]+$/);
  const encoded = header.split("filename*=UTF-8''")[1];
  assert.doesNotMatch(encoded, /['()*]/);
  assert.equal(decodeURIComponent(encoded), 'a"b\\c\r\nSet-Cookie: x=1\u00e9\u20b9\u{1F600}\'()*.pdf');
});

test("long lists are truncated with a visible note", async () => {
  const report = {
    meta: { kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-10", timezone: "Asia/Kolkata", currency: "INR", generatedAt: "2026-10-13T06:00:00Z", definitions: [], notes: { historicalStock: "n", unvaluedConsumption: "n" } },
    kpis: [],
    sections: {
      consumptionTrend: { status: "ok", data: { points: [] } },
      topItems: { status: "ok", data: { items: [], tiedBeyondLimit: 0 } },
      stockHealth: { status: "ok", data: { rows: [{ kitchen: "K", item: "I", unit: "kg", qty: 0, threshold: 1, state: "out", ratio: null }], total: 7001 } },
      unpricedStock: { status: "ok", data: { rows: [], total: 0 } },
      procurement: { status: "ok", data: { scope: "kitchen", stockReceived: { value: 0 }, supplyRequests: [] } },
      requestsTransfers: { status: "ok", data: { requests: { byStatus: [], pendingAgeing: { buckets: [] } }, transfers: { byStatus: [], openAgeing: { buckets: [] } } } },
      kitchenComparison: null
    }
  };
  const wb = buildExcelWorkbook(report, { listLimit: 5000 });
  assert.equal(wb.getWorksheet("Stock health").getRow(1).getCell(1).value, "Showing 1 of 7,001 rows. Narrow the filters to see the rest.");
});

const miniReport = (sections) => ({
  meta: { kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-10", timezone: "Asia/Kolkata", currency: "INR", generatedAt: "2026-10-13T06:00:00Z", definitions: [], notes: { historicalStock: "n", unvaluedConsumption: "n" } },
  kpis: [],
  sections: {
    consumptionTrend: { status: "ok", data: { points: [] } },
    topItems: { status: "ok", data: { items: [], tiedBeyondLimit: 0 } },
    stockHealth: { status: "ok", data: { rows: [], total: 0 } },
    unpricedStock: { status: "ok", data: { rows: [], total: 0 } },
    procurement: { status: "ok", data: { scope: "kitchen", stockReceived: { value: 0 }, supplyRequests: [] } },
    requestsTransfers: { status: "ok", data: { requests: { byStatus: [], pendingAgeing: { buckets: [] } }, transfers: { byStatus: [], openAgeing: { buckets: [] } } } },
    kitchenComparison: null,
    ...sections
  }
});
const cells = (sheet) => { const out = []; sheet.eachRow((row) => out.push(row.values.slice(1))); return out; };

test("listLimit slices the Excel lists and says how many rows were left out", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ kitchen: "K", item: `Item ${i}`, unit: "kg", qty: i, threshold: 9, state: "low", ratio: 0.5 }));
  const wb = buildExcelWorkbook(miniReport({
    stockHealth: { status: "ok", data: { rows, total: 5 } },
    unpricedStock: { status: "ok", data: { rows: rows.map(({ kitchen, item, unit, qty }) => ({ kitchen, item, unit, qty })), total: 5 } }
  }), { listLimit: 2 });
  const health = cells(wb.getWorksheet("Stock health"));
  assert.equal(health[0][0], "Showing 2 of 5 rows. Narrow the filters to see the rest.");
  assert.equal(health.length, 1 + 1 + 2, "note, header and the two allowed rows");
  assert.deepEqual(health.slice(2).map((r) => r[2]), ["Item 0", "Item 1"]);
  const unpriced = cells(wb.getWorksheet("Unpriced stock"));
  assert.equal(unpriced.length, 4);
  const full = buildExcelWorkbook(miniReport({ stockHealth: { status: "ok", data: { rows, total: 5 } } }));
  assert.equal(cells(full.getWorksheet("Stock health")).length, 1 + 5, "no note when nothing is cut");
});

test("an errored section renders its message instead of a table", () => {
  const wb = buildExcelWorkbook(miniReport({
    topItems: { status: "error", code: "SECTION_FAILED" },
    procurement: { status: "error", code: "SECTION_FAILED" },
    requestsTransfers: { status: "error", code: "SECTION_FAILED" }
  }));
  for (const name of ["Top items", "Procurement", "Requests & transfers"]) {
    assert.deepEqual(cells(wb.getWorksheet(name)), [["This section could not be generated."]], name);
  }
});

test("the Top items sheet notes items tied beyond the limit", () => {
  const items = [{ rank: 1, name: "Rice", value: 10, qty: 1, unit: "kg", unvaluedLines: 0 }];
  const tied = cells(buildExcelWorkbook(miniReport({ topItems: { status: "ok", data: { items, tiedBeyondLimit: 3 } } })).getWorksheet("Top items"));
  assert.equal(tied[0][0], tiedItemsNote(3));
  assert.match(tied[0][0], /^3 more items tie with the last item shown and are not listed\.$/);
  const one = tiedItemsNote(1);
  assert.match(one, /^1 more item ties .* is not listed\.$/);
  const plain = cells(buildExcelWorkbook(miniReport({ topItems: { status: "ok", data: { items, tiedBeyondLimit: 0 } } })).getWorksheet("Top items"));
  assert.equal(plain[0][0], "Rank", "no note when nothing is tied");
});

test("timeouts surface as EXPORT_TIMEOUT", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), (e) => e.code === "EXPORT_TIMEOUT" && e.status === 504);
  const error = exportTimeoutError();
  assert.deepEqual([error.status, error.code], [504, "EXPORT_TIMEOUT"]);
});

test("buildExportReport maps a section timeout to 504 and any other section failure to 500 EXPORT_INCOMPLETE", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const find = t.mock.method(GodownStock, "find", () => { throw Object.assign(new Error("operation exceeded time limit"), { code: 50, codeName: "MaxTimeMSExpired" }); });
  await assert.rejects(buildExportReport({ from: "2026-10-01", to: "2026-10-10" }), (e) => e.status === 504 && e.code === "EXPORT_TIMEOUT");

  find.mock.mockImplementation(() => { throw new Error("boom"); });
  await assert.rejects(buildExportReport({ from: "2026-10-01", to: "2026-10-10" }),
    (e) => e.status === 500 && e.code === "EXPORT_INCOMPLETE" && /nothing was exported/.test(e.message));
  assert.ok(errors.mock.callCount() >= 2, "each failed section is logged");

  // Over HTTP the same failure is a JSON error, not a partial file.
  const res = await request(app).get("/api/executive/export.xlsx").query({ from: "2026-10-01", to: "2026-10-10" }).set("Authorization", `Bearer ${f.superAdmin.token}`);
  assert.equal(res.status, 500);
  assert.equal(res.body.code, "EXPORT_INCOMPLETE");
});

test("admins cannot export", async () => {
  const res = await request(app).get("/api/executive/export.xlsx").set("Authorization", `Bearer ${f.admin.token}`);
  assert.equal(res.status, 403);
});
