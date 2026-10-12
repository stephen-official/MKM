export const formatQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
