// Pure helpers mapping kitchen feature flags to navigation tabs. No imports so node:test can load it.
export const KITCHEN_TAB_FEATURES = Object.freeze({
  usage: "consumption",
  activity: "consumption",
  requests: "indent",
  "request-builder": "indent",
  "receive-delivery": "indent",
  transfers: "transfer-stock"
});

export const isFeatureOn = (flags, key) => !flags || flags[key] !== false;

export const hiddenTabs = (flags) =>
  new Set(Object.entries(KITCHEN_TAB_FEATURES).filter(([, key]) => !isFeatureOn(flags, key)).map(([tab]) => tab));
