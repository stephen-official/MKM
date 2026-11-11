import { Distribution, GodownStock, PurchaseOrder } from "../../models/FlowModels.js";
import { packQuantityMatchesBase, packSnapshot } from "../../catalog/packaging.js";
import { createStockBatch } from "../../stock/batchService.js";
import { fail } from "../../shared/httpErrors.js";

export const validateDistribution = (allocations) => {
  if ((allocations || []).some((item) => !(Number(item.qtyBaseUnit) > 0) || !packQuantityMatchesBase(item, item.qtyBaseUnit))) {
    throw fail(400, "Enter valid base-unit or pack allocation quantities");
  }
};

/** Writes allocations, balances, batches and source status inside the caller's transaction. */
export const createDistribution = async ({ input, actor, session }) => {
  const { purchaseOrderId, leftoverSourceId, allocations, leftovers } = input;
  const cleanPOId = purchaseOrderId && purchaseOrderId !== "" ? purchaseOrderId : null;
  const cleanLeftoverId = leftoverSourceId && leftoverSourceId !== "" ? leftoverSourceId : null;
  const [distribution] = await Distribution.create([{
    purchaseOrderId: cleanPOId, leftoverSourceId: cleanLeftoverId,
    allocations: (allocations || []).map((item) => ({ ...item, ...packSnapshot(item) })),
    leftovers: leftovers || [],
  }], { session });
  const po = cleanPOId ? await PurchaseOrder.findById(cleanPOId).session(session) : null;
  for (const item of (allocations || [])) {
    await GodownStock.findOneAndUpdate(
      { godownId: item.godownId, stockItemId: item.stockItemId },
      { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { thresholdBaseUnit: 0 } },
      { upsert: true, session },
    );
    await createStockBatch({
      godownId: item.godownId, stockItemId: item.stockItemId, quantity: item.qtyBaseUnit,
      unitPrice: item.unitPrice, sourceType: "distribution", sourceId: distribution._id,
      receivedAt: po?.receivedAt || new Date(), createdBy: actor.sub, session,
    });
  }
  if (cleanPOId) {
    await PurchaseOrder.findByIdAndUpdate(cleanPOId, { $set: { status: "distributed" } }, { session });
  }
  if (cleanLeftoverId) {
    await Distribution.findOneAndUpdate({ _id: cleanLeftoverId }, { $set: { "leftovers.$[].qtyBaseUnit": 0 } }, { session });
  }
  return distribution;
};

export const listDistributionLogs = () => Distribution.find()
  .populate({ path: "purchaseOrderId", populate: { path: "indentId", select: "indentNo" } })
  .sort({ createdAt: -1 });

export const getDistributionDetails = async (distributionId) => {
  const distribution = await Distribution.findById(distributionId)
    .populate({ path: "allocations.stockItemId", select: "name" })
    .populate({ path: "allocations.godownId", select: "name" });
  if (!distribution) return null;
  return {
    distributionId: distribution._id,
    logs: distribution.allocations.map((item) => ({
      itemId: item.stockItemId?._id, itemName: item.stockItemId?.name || "Unknown Item",
      destination: item.godownId?.name || "Direct Delivery", quantity: item.qtyBaseUnit,
    })),
  };
};

export const listDistributionLeftovers = async () => {
  const docs = await Distribution.find().sort({ createdAt: -1 });
  const leftovers = docs.flatMap((distribution) => distribution.leftovers.map((line) => ({ ...line.toObject(), distributionId: distribution._id })));
  return leftovers.filter((line) => line.qtyBaseUnit > 0);
};
