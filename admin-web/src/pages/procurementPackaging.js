const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const packOptions = (product = {}) => [
  { key: "base", label: product.unitId?.symbol || "unit", size: 1, price: number(product.pricePerUnit) },
  ...(product.soldInPacks ? (product.packs || []).filter((pack) => number(pack.size) > 0).map((pack) => ({
    key: String(pack._id), id: pack._id, label: pack.name, size: number(pack.size), price: number(pack.price),
  })) : []),
];

export const selectedPackage = (product, key = "base") =>
  packOptions(product).find((option) => option.key === String(key)) || packOptions(product)[0];

export const packagingLine = (product, key, quantity, price) => {
  const option = selectedPackage(product, key);
  const count = number(quantity);
  const enteredPrice = number(price);
  const baseQuantity = count * option.size;
  if (!option.id) return { qtyBaseUnit: baseQuantity, unitPrice: enteredPrice, amount: count * enteredPrice };
  return {
    qtyBaseUnit: baseQuantity,
    unitPrice: option.size ? enteredPrice / option.size : 0,
    amount: count * enteredPrice,
    packId: option.id,
    packName: option.label,
    packSize: option.size,
    packQuantity: count,
    packPrice: enteredPrice,
  };
};

export const packagingLineFromSnapshot = (line, quantity, price) => {
  const count = number(quantity);
  const enteredPrice = number(price);
  const size = line?.packId ? number(line.packSize) : 1;
  const base = { qtyBaseUnit: count * size, unitPrice: size ? enteredPrice / size : 0, amount: count * enteredPrice };
  if (!line?.packId) return base;
  return {
    ...base, packId: line.packId, packName: line.packName, packSize: size,
    packQuantity: count, packPrice: enteredPrice,
  };
};

const lineBaseQuantity = (line = {}) => {
  const candidates = [line.qtyBaseUnit, line.receivedQty, line.orderedQty];
  const positive = candidates.find((value) => number(value) > 0);
  return positive === undefined ? number(candidates.find((value) => value !== undefined)) : number(positive);
};

export const lineQuantityLabel = (line, baseUnit = "units") => line?.packId
  ? `${number(line.packQuantity).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${line.packName} (${lineBaseQuantity(line).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${baseUnit})`
  : `${lineBaseQuantity(line).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${baseUnit}`;

export const stockQuantityLabel = (quantity, product, baseUnit = "units") => {
  const total = Math.max(0, number(quantity));
  const pack = [...packOptions(product)].filter((option) => option.id).sort((a, b) => b.size - a.size)[0];
  if (!pack || total < pack.size) return `${total.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${baseUnit}`;
  const count = Math.floor((total + 1e-9) / pack.size);
  const remainder = Number((total - count * pack.size).toFixed(3));
  return `${count} ${count === 1 ? pack.label : `${pack.label}s`}${remainder ? ` + ${remainder.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${baseUnit}` : ""}`;
};

