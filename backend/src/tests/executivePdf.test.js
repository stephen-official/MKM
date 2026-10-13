import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import request from "supertest";
import { startDb, clearDb, stopDb } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import { consumption, distribution, kitchen, seedCatalog, stockRow } from "./helpers/fixtures.js";
import { buildExportReport } from "../executive/exportCommon.js";
import { PDF_LIST_LIMIT, formatInr, pdfBlocks, renderPdf } from "../executive/pdfExport.js";

let app;
let superAdmin;
before(async () => { await startDb(); ({ app } = await import("../app.js")); });
after(stopDb);
beforeEach(async () => {
  await clearDb();
  const { items } = await seedCatalog(["Rice"]);
  const A = await kitchen("Main Kitchen");
  await distribution("2026-10-02T05:00:00Z", [[A, items.Rice, 10, 40]]);
  await stockRow(A, items.Rice, 10, 20);
  await consumption(A, { date: "2026-10-05", createdAt: "2026-10-05T05:00:00Z", lines: [[items.Rice, 1, 40.5]] });
  superAdmin = await createUser({ role: "super_admin" });
});

test("formatInr", () => {
  assert.equal(formatInr(123456.7), "INR 1,23,456.70");
  assert.equal(formatInr(-5), "-INR 5.00");
});

test("PDF blocks carry the same KPI values as the report", async () => {
  const report = await buildExportReport({ from: "2026-10-01", to: "2026-10-10" }, { now: new Date("2026-10-13T06:00:00Z") });
  const blocks = pdfBlocks(report);
  const kpis = blocks.filter((b) => b.type === "kpi");
  for (const k of report.kpis) {
    const block = kpis.find((b) => b.id === k.id);
    assert.equal(block.raw, k.value, k.id);
  }
  assert.ok(blocks.some((b) => b.type === "meta" && b.text.includes("Asia/Kolkata")));
  assert.ok(blocks.some((b) => b.type === "note" && b.text.includes("current")));
});

test("long lists are capped with a note", () => {
  const rows = Array.from({ length: PDF_LIST_LIMIT + 5 }, (_, i) => ({ id: String(i), kitchen: "K", item: `I${i}`, unit: "kg", qty: 0, threshold: 1, state: "out", ratio: null }));
  const report = {
    meta: { kitchen: { id: "all", name: "All kitchens" }, from: "2026-10-01", to: "2026-10-02", timezone: "Asia/Kolkata", currency: "INR", generatedAt: "2026-10-13T06:00:00Z", definitions: [], notes: { historicalStock: "Stock figures are current.", unvaluedConsumption: "n" } },
    kpis: [],
    sections: { stockHealth: { status: "ok", data: { rows, total: rows.length } } }
  };
  const table = pdfBlocks(report).find((b) => b.type === "table" && b.title === "Stock health");
  assert.equal(table.rows.length, PDF_LIST_LIMIT);
  assert.match(table.note, /Showing 200 of 205/);
});

test("renders a real PDF over HTTP", async () => {
  const res = await request(app).get("/api/executive/export.pdf").query({ from: "2026-10-01", to: "2026-10-10" })
    .set("Authorization", `Bearer ${superAdmin.token}`).buffer(true)
    .parse((r, cb) => { const c = []; r.on("data", (d) => c.push(d)); r.on("end", () => cb(null, Buffer.concat(c))); });
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "application/pdf");
  assert.equal(res.body.subarray(0, 5).toString(), "%PDF-");
  assert.match(res.headers["content-disposition"], /\.pdf"/);
  const direct = await renderPdf([{ type: "title", text: "x" }]);
  assert.equal(direct.subarray(0, 5).toString(), "%PDF-");
});
