// Pure helpers mapping kitchen feature flags to navigation tabs. No imports so node:test can load it.
export const KITCHEN_TAB_FEATURES = Object.freeze({
  usage: "consumption",
  activity: "consumption",
  requests: "indent",
  "receive-delivery": "indent",
  transfers: "transfer-stock"
});

// "request-builder" is shared by supply requests (indent) and stock transfers, so its feature depends on the transaction type.
export const featureForView = (view, transactionType) =>
  view === "request-builder" ? (transactionType === "transfer" ? "transfer-stock" : "indent") : KITCHEN_TAB_FEATURES[view] ?? null;

export const isFeatureOn = (flags, key) => !flags || flags[key] !== false;

export const hiddenTabs = (flags) =>
  new Set(Object.entries(KITCHEN_TAB_FEATURES).filter(([, key]) => !isFeatureOn(flags, key)).map(([tab]) => tab));

export const isViewHidden = (flags, view, transactionType) => {
  const key = featureForView(view, transactionType);
  return key !== null && !isFeatureOn(flags, key);
};

export const sameFlags = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};
