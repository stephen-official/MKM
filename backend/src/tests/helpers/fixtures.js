import mongoose from "mongoose";
import { Godown, StockGroup, StockItem, Unit } from "../../models/InventoryModels.js";
import {
  Consumption, Distribution, GodownStock, Indent, IndentRequest, PurchaseOrder, Request, Transfer
} from "../../models/FlowModels.js";
import { DailyUsage } from "../../models/DailyUsageModel.js";
import { parseReportParams } from "../../executive/params.js";
import { createContext, UI_LIMITS } from "../../executive/context.js";

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

/** Inserts docs keeping explicit createdAt/updatedAt (Mongoose timestamps would overwrite them on save). */
export const insertRaw = async (Model, docs) => {
  const rows = docs.map((doc) => {
    const casted = new Model(doc).toObject({ depopulate: true });
    casted.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
    casted.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : casted.createdAt;
    return casted;
  });
  if (rows.length) await Model.collection.insertMany(rows);
  return rows;
};

export const seedCatalog = async (names = ["Rice", "Dal", "Oil"]) => {
  seq += 1;
  const group = await StockGroup.create({ name: `Group ${seq}` });
  const unit = await Unit.create({ name: "Kilogram", symbol: "kg", stockGroupId: group._id });
  const items = {};
  // A catalog price makes each product complete, so kitchen routes accept it (catalog/completeness.js).
  for (const name of names) items[name] = await StockItem.create({ name, stockGroupId: group._id, unitId: unit._id, pricePerUnit: 10 });
  return { group, unit, items };
};

export const kitchen = (name, active = true) => Godown.create({ name, active });

export const stockRow = (godown, item, qty, threshold = 0) =>
  GodownStock.create({ godownId: godown._id, stockItemId: item._id, qtyBaseUnit: qty, thresholdBaseUnit: threshold });

/** allocations: [godown, item, qty, unitPrice][] */
export const distribution = async (createdAt, allocations, extra = {}) => (await insertRaw(Distribution, [{
  createdAt,
  allocations: allocations.map(([godown, item, qty, unitPrice]) => ({ godownId: godown._id, stockItemId: item._id, qtyBaseUnit: qty, unitPrice })),
  ...extra
}]))[0];

/** lines: [item, qty, unitPrice][] — totalAmount mirrors procurementRoutes.js */
export const purchaseOrder = async (receivedAt, lines, { status = "pending", createdAt } = {}) => (await insertRaw(PurchaseOrder, [{
  indentId: oid(),
  receivedAt: new Date(receivedAt),
  createdAt: createdAt || receivedAt,
  status,
  items: lines.map(([item, qty, unitPrice]) => ({ stockItemId: item._id, orderedQty: qty, receivedQty: qty, unitPrice, amount: qty * (unitPrice || 0) })),
  totalAmount: lines.reduce((sum, [, qty, unitPrice]) => sum + qty * (unitPrice || 0), 0)
}]))[0];

/** lines: [item, qty, amountAtIssue?][] — omit the amount for an unvalued line */
export const consumption = async (godown, { date, createdAt, lines }) => (await insertRaw(Consumption, [{
  godownId: godown._id, userId: oid(), date, createdAt,
  items: lines.map(([item, qty, amount]) => ({ stockItemId: item._id, qtyBaseUnit: qty, ...(amount === undefined ? {} : { amountAtIssue: amount }) }))
}]))[0];

export const dailyUsage = async (godown, { date, createdAt, lines }) => (await insertRaw(DailyUsage, [{
  godownId: godown._id, userId: oid(), date, createdAt,
  items: lines.map(([item, qty]) => ({ stockItemId: item._id, qtyBaseUnit: qty }))
}]))[0];

export const stockRequest = async (godown, { status = "pending", createdAt, requestType = "stock_request" }) => (await insertRaw(Request, [{
  godownId: godown._id, userId: oid(), requestType, targetDate: "2026-10-01", reason: "fixture", items: [], status, createdAt
}]))[0];

export const transfer = async (from, to, { status = "pending", createdAt }) => (await insertRaw(Transfer, [{
  fromGodownId: from._id, toGodownId: to._id, createdBy: oid(), items: [], status, createdAt
}]))[0];

export const indent = async ({ status = "pending", createdAt, totalAmount = 0 }) => (await insertRaw(Indent, [{
  indentNo: `IND-${++seq}`, createdBy: oid(), items: [], totalAmount, status, createdAt
}]))[0];

export const supplyRequest = async (godown, { status = "pending", createdAt }) => (await insertRaw(IndentRequest, [{
  godownId: godown._id, userId: oid(), items: [], status, createdAt
}]))[0];

/** Context for section tests (Task 22 builds the real one inside buildExecutiveReport). */
export const makeCtx = async (query, { now = new Date("2026-10-13T06:00:00Z"), limits = UI_LIMITS } = {}) => {
  const params = parseReportParams(query, { now });
  const godownDocs = await Godown.find().select("name active").lean();
  return createContext({ params, kitchen: null, godownDocs, now, limits });
};
