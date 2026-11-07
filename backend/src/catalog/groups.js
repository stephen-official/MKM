import { StockGroup } from "../models/InventoryModels.js";

/** The holding-pen group. Always there, listed last, and never renamed or deleted; products that fit nowhere else go in it. */
export const OTHER_GROUP = "Other";
export const isOtherGroup = (name) => String(name ?? "").trim().toLowerCase() === OTHER_GROUP.toLowerCase();

export const ensureOtherGroup = async () => {
  await StockGroup.updateOne({ name: OTHER_GROUP }, { $setOnInsert: { name: OTHER_GROUP } }, { upsert: true });
};

/** Groups A–Z with Other at the end. */
export const sortGroups = (rows) => [...rows].sort((a, b) => Number(isOtherGroup(a.name)) - Number(isOtherGroup(b.name)) || String(a.name).localeCompare(String(b.name)));
