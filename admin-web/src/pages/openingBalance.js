export const emptyOpeningBalance = (godownId = "") => ({
  godownId, stockItemId: "", quantityBaseUnit: "",
  effectiveDate: new Date().toISOString().slice(0, 10), reason: "Initial stock count",
});

export const openingBalanceErrors = (form) => {
  const errors = {};
  if (!form.godownId) errors.godownId = "Choose a kitchen.";
  if (!form.stockItemId) errors.stockItemId = "Choose a product.";
  if (!(Number(form.quantityBaseUnit) > 0)) errors.quantityBaseUnit = "Enter a quantity greater than zero.";
  if (!form.effectiveDate) errors.effectiveDate = "Choose the date of the stock count.";
  const reason = String(form.reason || "").trim();
  if (reason.length < 3 || reason.length > 500) errors.reason = "Enter a reason between 3 and 500 characters.";
  return errors;
};

export const eligibleOpeningProducts = (products, stocks, batches, godownId) => {
  const used = new Set([
    ...stocks.filter((row) => String(row.godownId?._id || row.godownId) === String(godownId)).map((row) => String(row.stockItemId?._id || row.stockItemId)),
    ...batches.filter((row) => String(row.godownId?._id || row.godownId) === String(godownId)).map((row) => String(row.stockItemId?._id || row.stockItemId)),
  ]);
  return products.filter((product) => !product.archived && Number(product.pricePerUnit) > 0 && !used.has(String(product._id)));
};
