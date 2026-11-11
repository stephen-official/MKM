import { Consumption, GodownStock, Notification, Request } from "../../models/FlowModels.js";
import { businessDateOf, normalizeBusinessDate } from "../../executive/params.js";
import { createStockBatch, deductFefo, valuationFromAllocations } from "../../stock/batchService.js";
import { fail } from "../../shared/httpErrors.js";
import { isAdminRole } from "../../utils/roles.js";
import { deepPopulateItem } from "../operations/operationItemPopulation.js";
import { priceLines } from "../consumption/consumptionValuation.js";

export const listStockRequests = async (actor) => {
    const filter = isAdminRole(actor.role) ? {} : { userId: actor.sub };
    const requests = await Request.find(filter)
      .populate("godownId", "name")
      .populate("userId", "name")
      .populate(deepPopulateItem)
      .sort({ createdAt: -1 });
    return requests;
};

export const createStockRequest = async ({ input, actor }) => {
    const created = await Request.create({
      ...input,
      requestType: "usage",
      userId: actor.sub,
      godownId: actor.godownId,
      status: "pending"
    });

    const notification = await Notification.create({
      type: "request_created",
      severity: "info",
      payload: {
        message: `New consumption request created`,
        requestId: created._id,
        godownId: actor.godownId
      }
    });

    return { created, notification };
};

/** Applies stock and consumption changes inside the caller's transaction. */
export const approveStockRequest = async ({ requestId, input, actor, session }) => {
      const request = await Request.findById(requestId).session(session);
      if (!request) throw new Error("Request not found");
      if (request.status !== "pending") throw new Error("Request already processed");

      const batchLines = [];
      for (const item of request.items) {
        const quantity = Number(item.qtyBaseUnit);
        if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Invalid request quantity");
        let stock = await GodownStock.findOne({ godownId: request.godownId, stockItemId: item.stockItemId }).session(session);
        if (!stock && quantity > 0) throw new Error("Insufficient kitchen stock for one or more items");
        if (!stock) stock = new GodownStock({ godownId: request.godownId, stockItemId: item.stockItemId, qtyBaseUnit: 0, thresholdBaseUnit: 0 });
        if (quantity > 0) {
          if (Number(stock.qtyBaseUnit) < quantity) throw new Error("Insufficient kitchen stock for one or more items");
          const batchAllocations = await deductFefo({ godownId: request.godownId, stockItemId: item.stockItemId, quantity, stock, session });
          stock.qtyBaseUnit -= quantity;
          batchLines.push({ stockItemId: item.stockItemId, qtyBaseUnit: quantity, batchAllocations, ...valuationFromAllocations(quantity, batchAllocations) });
        } else {
          const returned = Math.abs(quantity);
          const [pricedReturn] = await priceLines(request.godownId, [{ stockItemId: item.stockItemId, qtyBaseUnit: quantity }]);
          stock.qtyBaseUnit += returned;
          const returnBatch = await createStockBatch({ godownId: request.godownId, stockItemId: item.stockItemId, quantity: returned, unitPrice: pricedReturn.unitPriceAtIssue, sourceType: "return", createdBy: actor.sub, session });
          batchLines.push({ ...pricedReturn, returnBatchId: returnBatch._id, batchAllocations: [] });
        }
        await stock.save({ session });
      }

      // A future target date would fall outside every valid report range; the stock moves today.
      const approvedAt = new Date();
      const today = businessDateOf(approvedAt);
      const target = normalizeBusinessDate(request.targetDate, approvedAt);
      const date = target > today ? today : target;
      const record = {
        godownId: request.godownId,
        userId: request.userId,
        date,
        reason: request.reason,
        sourceType: "request",
        items: batchLines,
      };
      await Consumption.create([record], { session });

      request.status = "approved";
      request.adminDecision = input.note || "Approved";
      return request.save({ session });
};

export const rejectStockRequest = async ({ requestId, input }) => {
    // Conditional on "pending" so a reject cannot overwrite an approval whose stock effects already exist.
    const request = await Request.findOneAndUpdate({ _id: requestId, status: "pending" }, {
      status: "rejected",
      adminDecision: input.note || "Rejected"
    }, { new: true });
    if (request) return request;
    if (await Request.exists({ _id: requestId })) throw fail(409, "Request already processed");
    throw fail(404, "Request not found");
};
