import mongoose from "mongoose";

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const packSnapshot = (line = {}) => {
  const packSize = Number(line.packSize);
  const packQuantity = Number(line.packQuantity);
  if (!mongoose.isValidObjectId(line.packId) || !String(line.packName || "").trim() || !positive(packSize) || !positive(packQuantity)) {
    return {};
  }
  return {
    packId: line.packId,
    packName: String(line.packName).trim(),
    packSize,
    packQuantity,
    ...(positive(line.packPrice) ? { packPrice: Number(line.packPrice) } : {}),
  };
};

export const packQuantityMatchesBase = (line, baseQuantity) => {
  // A line received as nothing (0 packs, 0 base units) is a valid partial intake.
  if (Number(baseQuantity) === 0 && !Number(line?.packQuantity)) return true;
  const snapshot = packSnapshot(line);
  const attemptedPack = Boolean(line?.packId || line?.packName || line?.packSize || line?.packQuantity);
  if (attemptedPack && !snapshot.packId) return false;
  if (!snapshot.packId) return true;
  return Math.abs(snapshot.packSize * snapshot.packQuantity - Number(baseQuantity)) < 1e-8;
};

