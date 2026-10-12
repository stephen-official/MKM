import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import ExcelJS from "exceljs";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { buildExcelWorkbook, SHEETS } from "../executive/excelExport.js";
import { exportFilename, withTimeout } from "../executive/exportCommon.js";

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

test("timeouts surface as EXPORT_TIMEOUT", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), (e) => e.code === "EXPORT_TIMEOUT" && e.status === 504);
});

test("admins cannot export", async () => {
  const res = await request(app).get("/api/executive/export.xlsx").set("Authorization", `Bearer ${f.admin.token}`);
  assert.equal(res.status, 403);
});
