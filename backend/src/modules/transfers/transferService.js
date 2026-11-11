import { GodownStock, Transfer } from "../../models/FlowModels.js";
import { createStockBatch, deductFefo } from "../../stock/batchService.js";
import { fail } from "../../shared/httpErrors.js";
import { isAdminRole, isKitchenRole } from "../../utils/roles.js";
import { deepPopulateItem } from "../operations/operationItemPopulation.js";

const populatedTransfers = (filter) => Transfer.find(filter)
  .populate("fromGodownId", "name")
  .populate("toGodownId", "name")
  .populate(deepPopulateItem)
  .sort({ createdAt: -1 });

const kitchenFilter = (godownId) => ({ $or: [{ fromGodownId: godownId }, { toGodownId: godownId }] });
export const listTransfers = (actor) => populatedTransfers(isKitchenRole(actor.role) ? kitchenFilter(actor.godownId) : {});
export const incomingTransfers = (actor) => populatedTransfers({ toGodownId: actor.godownId, status: "pending" });
export const transferHistory = (actor) => populatedTransfers(kitchenFilter(actor.godownId));

export const createTransfer = async ({ input, actor }) => {
  const { fromGodownId, toGodownId, items } = input;
  const sourceGodownId = isAdminRole(actor.role) ? fromGodownId : actor.godownId;
  if (!fromGodownId || !toGodownId) throw fail(400, "Source and Destination required");
  if (sourceGodownId.toString() === toGodownId.toString()) throw fail(400, "Cannot transfer to same godown");
  if (!items || items.length === 0) throw fail(400, "No items selected");
  for (const item of items) {
    const stock = await GodownStock.findOne({ godownId: sourceGodownId, stockItemId: item.stockItemId });
    if (!stock) throw fail(400, "Stock not found");
    if (stock.qtyBaseUnit < item.qtyBaseUnit) throw fail(400, "Insufficient stock");
  }
  return Transfer.create({ fromGodownId: sourceGodownId, toGodownId, createdBy: actor.sub, items, status: "pending" });
};

export const createKitchenTransfer = async ({ input, actor }) => {
  if (!input.toGodownId) throw fail(400, "Destination godown is required");
  if (actor.godownId.toString() === input.toGodownId.toString()) throw fail(400, "Cannot transfer to the same godown");
  if (!input.items || input.items.length === 0) throw fail(400, "Transfer cart is empty");
  for (const item of input.items) {
    if (!item.stockItemId) throw fail(400, "Invalid stock item");
    if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) throw fail(400, "Transfer quantity must be greater than zero");
    const stock = await GodownStock.findOne({ godownId: actor.godownId, stockItemId: item.stockItemId });
    if (!stock) throw fail(400, "Stock record not found");
    if (stock.qtyBaseUnit < item.qtyBaseUnit) throw fail(400, "Insufficient stock available for one of the selected items.");
  }
  return Transfer.create({ fromGodownId: actor.godownId, toGodownId: input.toGodownId, createdBy: actor.sub, items: input.items, status: "pending" });
};

/** Moves balances and batch allocations inside the caller's transaction. */
export const acceptTransfer = async ({ transferId, actor, session }) => {
  const transfer = await Transfer.findById(transferId).session(session);
  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status !== "pending") throw new Error("Already processed");
  if (transfer.toGodownId.toString() !== actor.godownId.toString()) throw new Error("Not allowed");
  for (const item of transfer.items) {
    if (!item.qtyBaseUnit || item.qtyBaseUnit <= 0) throw new Error("Invalid transfer quantity");
    const source = await GodownStock.findOne({ godownId: transfer.fromGodownId, stockItemId: item.stockItemId }).session(session);
    if (!source) throw new Error("Source stock missing");
    if (source.qtyBaseUnit < item.qtyBaseUnit) throw new Error("Insufficient stock");
    const batchAllocations = await deductFefo({ godownId: transfer.fromGodownId, stockItemId: item.stockItemId, quantity: item.qtyBaseUnit, stock: source, session });
    source.qtyBaseUnit -= item.qtyBaseUnit;
    await source.save({ session });
    await GodownStock.findOneAndUpdate(
      { godownId: transfer.toGodownId, stockItemId: item.stockItemId },
      { $inc: { qtyBaseUnit: item.qtyBaseUnit }, $setOnInsert: { godownId: transfer.toGodownId, stockItemId: item.stockItemId, thresholdBaseUnit: 0 } },
      { upsert: true, new: true, session },
    );
    for (const allocation of batchAllocations) {
      await createStockBatch({
        godownId: transfer.toGodownId, stockItemId: item.stockItemId, quantity: allocation.qtyBaseUnit,
        unitPrice: allocation.unitPrice, sourceType: "transfer", sourceId: transfer._id, receivedAt: new Date(),
        expiryDate: allocation.expiryDate, lotNumber: allocation.lotNumber, condition: allocation.condition,
        notes: allocation.notes, createdBy: actor.sub, session,
      });
    }
    item.batchAllocations = batchAllocations;
  }
  transfer.status = "accepted";
  transfer.acceptedBy = actor.sub;
  transfer.acceptedAt = new Date();
  await transfer.save({ session });
  return transfer;
};

export const rejectTransfer = async ({ transferId, actor }) => {
  const transfer = await Transfer.findById(transferId);
  if (!transfer) throw fail(404, "Not found");
  if (transfer.toGodownId.toString() !== actor.godownId.toString()) throw fail(403, "Not allowed");
  // Conditional on "pending" so a reject cannot overwrite an accept that already moved the stock.
  const rejected = await Transfer.findOneAndUpdate(
    { _id: transfer._id, status: "pending" },
    { $set: { status: "rejected", rejectedAt: new Date() } },
    { new: true },
  );
  if (!rejected) throw fail(409, "Already processed");
  return rejected;
};
