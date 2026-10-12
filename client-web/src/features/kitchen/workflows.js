export const outstandingQuantity = (line) => Math.max(
  0,
  Number(line?.qtyBaseUnit || 0) - Number(line?.receivedQty || 0),
);

export const buildTransactionItems = (cart = [], mode = "stock", { allowNegative = false } = {}) => cart
  .map((item) => ({
    stockItemId: item.stockItemId || item._id || item.stockRecordId,
    stockRecordId: item.stockRecordId,
    qtyBaseUnit: Number(mode === "daily" ? item.qtyBaseUnit : item.requestedQty),
  }))
  .filter((item) => Number.isFinite(item.qtyBaseUnit) && (allowNegative ? item.qtyBaseUnit !== 0 : item.qtyBaseUnit > 0));

export const canRecordUsage = (available, requested) => {
  const stock = Number(available);
  const quantity = Number(requested);
  return Number.isFinite(stock) && Number.isFinite(quantity) && quantity >= 0 && quantity <= stock;
};

export const buildReceiptPayload = (indent, values = {}) => Object.entries(values)
  .map(([stockItemId, value]) => {
    const line = (indent?.items || []).find(
      (item) => String(item.stockItemId?._id || item.stockItemId) === String(stockItemId),
    );
    return { stockItemId, receivedQty: Number(value), line };
  })
  .filter(({ receivedQty, line }) =>
    line?.status === "approved" &&
    Number.isFinite(receivedQty) &&
    receivedQty > 0 &&
    receivedQty <= outstandingQuantity(line),
  )
  .map(({ stockItemId, receivedQty }) => ({ stockItemId, receivedQty }));
