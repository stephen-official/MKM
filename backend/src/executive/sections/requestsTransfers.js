import { IndentRequest, Request, Transfer } from "../../models/FlowModels.js";
import { round2 } from "../../utils/money.js";
import { AGE_BUCKETS } from "../definitions.js";
import { REQUEST_STATUSES, TRANSFER_STATUSES, orderStatuses } from "../statuses.js";

const DAY_MS = 86_400_000;
const round1 = (n) => Math.round(n * 10) / 10;

const bucketExpr = {
  $switch: {
    branches: [
      { case: { $lt: ["$ageDays", 1] }, then: "lt1d" },
      { case: { $lt: ["$ageDays", 3] }, then: "1to3d" },
      { case: { $lt: ["$ageDays", 7] }, then: "3to7d" }
    ],
    default: "gt7d"
  }
};

const ageing = async (Model, match, now, options) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $project: { ageDays: { $divide: [{ $subtract: [now, "$createdAt"] }, DAY_MS] } } },
    { $group: { _id: bucketExpr, count: { $sum: 1 }, oldest: { $max: "$ageDays" } } }
  ]).option(options);
  const byId = new Map(rows.map((r) => [r._id, r]));
  const oldest = rows.length ? Math.max(...rows.map((r) => r.oldest)) : null;
  return {
    total: rows.reduce((s, r) => s + r.count, 0),
    buckets: AGE_BUCKETS.map((b) => ({ id: b.id, label: b.label, count: byId.get(b.id)?.count || 0 })),
    oldestAgeDays: oldest === null ? null : round1(oldest)
  };
};

export const pendingRequestsByKitchen = async (ctx) => {
  const rows = await Request.aggregate([{ $match: { status: "pending" } }, { $group: { _id: "$godownId", count: { $sum: 1 } } }]).option(ctx.aggOptions());
  return new Map(rows.map((r) => [String(r._id), r.count]));
};

export const requestsTransfersSection = async (ctx) => {
  const { window } = ctx.params;
  const options = ctx.aggOptions();
  const inWindow = { $gte: window.start, $lt: window.end };
  const kitchenScope = ctx.scopeIds ? { godownId: { $in: ctx.scopeIds } } : {};
  const transferScope = ctx.scopeIds ? { $or: [{ fromGodownId: { $in: ctx.scopeIds } }, { toGodownId: { $in: ctx.scopeIds } }] } : {};
  const byStatus = (Model, match) => Model.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]).option(options);

  const [requestRows, transferRows, pendingAgeing, openAgeing, pendingSupply] = await Promise.all([
    byStatus(Request, { createdAt: inWindow, ...kitchenScope }),
    byStatus(Transfer, { createdAt: inWindow, ...transferScope }),
    ageing(Request, { status: "pending", ...kitchenScope }, ctx.now, options),
    ageing(Transfer, { status: "pending", ...transferScope }, ctx.now, options),
    IndentRequest.countDocuments({ status: "pending", ...kitchenScope }).maxTimeMS(ctx.maxTimeMS || 0)
  ]);

  const requests = orderStatuses(REQUEST_STATUSES, requestRows);
  const approved = requests.find((r) => r.status === "approved").count;
  const rejected = requests.find((r) => r.status === "rejected").count;

  return {
    kpis: {
      pendingRequests: { value: pendingAgeing.total, details: { oldestAgeDays: pendingAgeing.oldestAgeDays } },
      pendingSupplyRequests: { value: pendingSupply },
      openTransfers: { value: openAgeing.total, details: { oldestAgeDays: openAgeing.oldestAgeDays } }
    },
    sections: {
      requestsTransfers: {
        requests: { byStatus: requests, approvalRate: approved + rejected === 0 ? null : round2((approved / (approved + rejected)) * 100), pendingAgeing },
        transfers: { byStatus: orderStatuses(TRANSFER_STATUSES, transferRows), openAgeing }
      }
    }
  };
};
