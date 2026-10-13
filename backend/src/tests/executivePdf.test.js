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

// Uncompressed render so page objects and drawn text can be read back from the bytes.
const inspectPdf = async (blocks) => {
  const raw = (await renderPdf(blocks, { compress: false })).toString("latin1");
  const pages = (raw.match(/\/Type \/Page\b(?!s)/g) || []).length;
  const texts = [...raw.matchAll(/\[([^\]]*)\] TJ/g)]
    .map((m) => [...m[1].matchAll(/<([0-9a-f]*)>/g)].map((x) => Buffer.from(x[1], "hex").toString("latin1")).join(""));
  return { pages, texts, footers: texts.filter((t) => /^Page \d+ of \d+$/.test(t)) };
};

test("a small report renders exactly one numbered page", async () => {
  const { pages, footers } = await inspectPdf([
    { type: "title", text: "Executive Report" },
    { type: "table", title: "Stock health", columns: ["A", "B"], rows: [["x", "y"]], note: null }
  ]);
  assert.equal(pages, 1);
  assert.deepEqual(footers, ["Page 1 of 1"]);
});

test("a long table spans pages, numbers each, repeats the header and truncates long cells", async () => {
  const rows = Array.from({ length: 130 }, (_, i) => ["Out", `Kitchen ${i}`, `A very long item name that goes on and on and on and on forever ${i}`, "1 kg", "2 kg"]);
  const { pages, footers, texts } = await inspectPdf([
    { type: "title", text: "x" },
    { type: "table", title: "Stock health", columns: ["Status", "Kitchen", "Item", "Qty", "Threshold"], rows, note: null }
  ]);
  assert.ok(pages > 1);
  assert.deepEqual(footers, Array.from({ length: pages }, (_, i) => `Page ${i + 1} of ${pages}`));
  assert.equal(texts.filter((t) => t === "Status").length, pages, "header row repeated on every page");
  assert.ok(!texts.some((t) => t.includes("forever")), "long cells are cut to one line");
});
