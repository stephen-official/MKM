import { isKitchenRole } from "./roles.js";

// Kitchens see quantities only: the central team buys and pays, so no price, rate or value ever reaches them.
export const PRICE_FIELDS = new Set([
  "price", "pricePerUnit", "priceUpdatedAt", "priceUpdatedBy", "unitPrice", "packPrice",
  "amount", "totalAmount", "unitPriceAtIssue", "amountAtIssue",
]);

/** A plain JSON copy of `value` with every price field removed, at any depth. */
export const stripPrices = (value) => {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value), (key, inner) => (PRICE_FIELDS.has(key) ? undefined : inner));
};

/** For kitchen logins, removes price fields from every JSON response. */
export const kitchenPriceFilter = (req, res, next) => {
  if (isKitchenRole(req.user?.role)) {
    const send = res.json.bind(res);
    res.json = (body) => send(stripPrices(body));
  }
  return next();
};
