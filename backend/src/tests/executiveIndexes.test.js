import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { startDb, stopDb, syncAllIndexes } from "./helpers/db.js";
import { Consumption, Distribution, Indent, IndentRequest, PurchaseOrder, Request, Transfer } from "../models/FlowModels.js";
import { consumptionRangeMatch } from "../executive/sections/consumption.js";
import { parseReportParams } from "../executive/params.js";

before(async () => { await startDb(); await syncAllIndexes(); });
after(stopDb);

const keys = async (Model) => (await Model.collection.indexes()).map((i) => JSON.stringify(i.key));

test("report indexes exist", async () => {
  const expect = {
    Consumption: [{ godownId: 1, date: 1 }, { date: 1 }, { godownId: 1, createdAt: 1 }, { createdAt: 1 }],
    Distribution: [{ "allocations.godownId": 1, "allocations.stockItemId": 1, createdAt: -1 }, { createdAt: 1 }],
    PurchaseOrder: [{ status: 1 }, { receivedAt: 1 }, { "items.stockItemId": 1, receivedAt: -1 }],
    Request: [{ status: 1, godownId: 1, createdAt: 1 }, { godownId: 1, createdAt: 1 }, { createdAt: 1 }],
    Transfer: [{ status: 1, createdAt: 1 }, { fromGodownId: 1, status: 1 }, { toGodownId: 1, status: 1 }, { createdAt: 1 }],
    IndentRequest: [{ status: 1, godownId: 1, createdAt: 1 }, { godownId: 1, createdAt: 1 }],
    Indent: [{ createdAt: 1 }, { status: 1 }]
  };
  const models = { Consumption, Distribution, PurchaseOrder, Request, Transfer, IndentRequest, Indent };
  for (const [name, wanted] of Object.entries(expect)) {
    const have = await keys(models[name]);
    for (const k of wanted) assert.ok(have.includes(JSON.stringify(k)), `${name} missing ${JSON.stringify(k)}`);
  }
});

const noCollScan = (plan, label) => assert.equal(JSON.stringify(plan).includes("COLLSCAN"), false, `${label} uses a collection scan`);

test("report filters use indexes, not collection scans", async () => {
  const p = parseReportParams({ from: "2026-10-01", to: "2026-10-10" }, { now: new Date("2026-10-13T06:00:00Z") });
  const scopeIds = [new mongoose.Types.ObjectId()];
  const w = { $gte: p.window.start, $lt: p.window.end };
  noCollScan(await Consumption.find(consumptionRangeMatch({ scopeIds: null, ...p })).explain("queryPlanner"), "consumption all");
  noCollScan(await Consumption.find(consumptionRangeMatch({ scopeIds, ...p })).explain("queryPlanner"), "consumption kitchen");
  noCollScan(await Indent.find({ createdAt: w }).explain("queryPlanner"), "indents in range");
  noCollScan(await Indent.find({ status: "pending" }).explain("queryPlanner"), "indents by status");
  noCollScan(await Distribution.find({ createdAt: w }).explain("queryPlanner"), "distributions");
  noCollScan(await PurchaseOrder.find({ receivedAt: w }).explain("queryPlanner"), "po spend");
  noCollScan(await PurchaseOrder.find({ status: "pending" }).explain("queryPlanner"), "po awaiting");
  noCollScan(await Request.find({ status: "pending", godownId: { $in: scopeIds } }).explain("queryPlanner"), "pending requests");
  noCollScan(await Request.find({ createdAt: w }).explain("queryPlanner"), "requests in range");
  noCollScan(await Transfer.find({ status: "pending", $or: [{ fromGodownId: { $in: scopeIds } }, { toGodownId: { $in: scopeIds } }] }).explain("queryPlanner"), "open transfers");
  noCollScan(await IndentRequest.find({ createdAt: w, godownId: { $in: scopeIds } }).explain("queryPlanner"), "supply requests");
});
