export const outstandingQuantity = (line) => Math.max(
  0,
  Number(line?.qtyBaseUnit || 0) - Number(line?.receivedQty || 0),
);

export const outstandingEntryQuantity = (line) => {
  const base = outstandingQuantity(line);
  return line?.packId && Number(line.packSize) > 0 ? base / Number(line.packSize) : base;
};

export const buildTransactionItems = (cart = [], mode = "stock", { allowNegative = false } = {}) => cart
  .map((item) => {
    const entered = Number(mode === "daily" ? item.qtyBaseUnit : item.requestedQty);
    const packSize = item.packId ? Number(item.packSize) : 1;
    return {
      stockItemId: item.stockItemId || item._id || item.stockRecordId,
      stockRecordId: item.stockRecordId,
      qtyBaseUnit: entered * packSize,
      ...(item.packId ? {
        packId: item.packId, packName: item.packName, packSize, packQuantity: entered,
      } : {}),
    };
  })
  .filter((item) => Number.isFinite(item.qtyBaseUnit) && (allowNegative ? item.qtyBaseUnit !== 0 : item.qtyBaseUnit > 0));

export const canRecordUsage = (available, requested) => {
  const stock = Number(available);
  const quantity = Number(requested);
  return Number.isFinite(stock) && Number.isFinite(quantity) && quantity >= 0 && quantity <= stock;
};

export const buildReceiptPayload = (indent, values = {}, details = {}) => Object.entries(values)
  .map(([stockItemId, value]) => {
    const line = (indent?.items || []).find(
      (item) => String(item.stockItemId?._id || item.stockItemId) === String(stockItemId),
    );
    const receivedQty = Number(value) * (line?.packId ? Number(line.packSize) : 1);
    return { stockItemId, receivedQty, line };
  })
  .filter(({ receivedQty, line }) =>
    line?.status === "approved" &&
    Number.isFinite(receivedQty) &&
    receivedQty > 0 &&
    receivedQty <= outstandingQuantity(line),
  )
  .map(({ stockItemId, receivedQty }) => ({
    stockItemId,
    receivedQty,
    condition: "good",
    ...(details[stockItemId] || {}),
  }));
