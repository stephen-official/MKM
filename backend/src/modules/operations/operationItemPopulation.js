/**
 * SHARED UTILITY: Deep Population Config
 * Using explicit 'model' properties to prevent "General" fallback issues
 */
export const deepPopulateItem = {
  path: "items.stockItemId",
  model: "StockItem",
  select: "name imageUrl unitId stockGroupId itemType",
  populate: [
    {
      path: "unitId",
      model: "Unit",
      select: "name symbol"
    },
    {
      path: "stockGroupId",
      model: "StockGroup",
      select: "name"
    }
  ]
};
