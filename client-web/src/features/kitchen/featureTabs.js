// Pure helpers mapping kitchen feature flags to navigation tabs. No imports so node:test can load it.
export const KITCHEN_TAB_FEATURES = Object.freeze({
  usage: "consumption",
  activity: "consumption",
  // "Ask for supplies" is the shared-order screen; the older single-kitchen requests live under "past-requests".
  requests: "purchase-orders",
  "new-order": "purchase-orders",
  "past-requests": "indent",
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

/** False when the feature behind `view` is off, i.e. the navigation guard would bounce the user back to home. */
export const canOpenView = (flags, view, transactionType) => !isViewHidden(flags, view, transactionType);

const DRAFT_FEATURES = Object.freeze({ usage: "consumption", request: "requests", indent: "indent", transfer: "transfer-stock" });

/** The feature a draft of the given transaction type (usage | request | indent | transfer) belongs to. */
export const draftFeature = (transactionType) => DRAFT_FEATURES[transactionType] ?? null;

/** True when the feature a draft belongs to has been switched off, so the draft can no longer be submitted. */
export const isDraftBlocked = (flags, transactionType) => {
  const key = draftFeature(transactionType);
  return key !== null && !isFeatureOn(flags, key);
};

export const sameFlags = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

const BOTTOM_TAB_TARGETS = Object.freeze({
  home: Object.freeze({ view: "home" }),
  stock: Object.freeze({ view: "stock" }),
  requests: Object.freeze({ view: "requests", supplyTab: "requests" })
});

/** The view (and requests sub-tab, if any) a bottom-nav tab opens, or null for an unknown tab. */
export const tabTarget = (tab) => BOTTOM_TAB_TARGETS[tab] ?? null;

// Fired on window by the API layer when the server answers FEATURE_DISABLED, so the store can refetch flags.
export const FEATURE_DISABLED_EVENT = "mkm:feature-disabled";
export const FEATURE_TOAST_WINDOW_MS = 10_000;

/** True (and records `now`) when the disabled-feature toast for `feature` was not shown within `windowMs`. */
export const shouldToastFeature = (lastShown, feature, now = Date.now(), windowMs = FEATURE_TOAST_WINDOW_MS) => {
  const last = lastShown.get(feature);
  if (last !== undefined && now - last < windowMs) return false;
  lastShown.set(feature, now);
  return true;
};
