const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const productPacks = (item = {}) => item.soldInPacks
  ? (item.packs || []).filter((pack) => numeric(pack.size) > 0)
  : [];

export const formatStockQuantity = (quantity, unit, item = {}) => {
  const total = Math.max(0, numeric(quantity));
  const packs = [...productPacks(item)].sort((a, b) => numeric(b.size) - numeric(a.size));
  if (!packs.length || total < numeric(packs[0].size)) {
    return `${total.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${unit}`;
  }
  const pack = packs[0];
  const count = Math.floor((total + 1e-9) / numeric(pack.size));
  const remainder = Number((total - count * numeric(pack.size)).toFixed(3));
  // "5 × 25 kg bag + 9 kg": the pack name usually carries its own size, so a count with × reads better than a plural.
  return `${count.toLocaleString("en-IN")} × ${pack.name}${remainder > 0 ? ` + ${remainder.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${unit}` : ""}`;
};

export const withPackaging = (item, packId) => {
  const pack = productPacks(item).find((candidate) => String(candidate._id) === String(packId));
  if (!pack) {
    const base = { ...item };
    delete base.packId;
    delete base.packName;
    delete base.packSize;
    delete base.packQuantity;
    return base;
  }
  return { ...item, packId: pack._id, packName: pack.name, packSize: numeric(pack.size) };
};

