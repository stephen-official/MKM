import { api } from "./api";

export { FEATURE_DISABLED_EVENT, KITCHEN_TAB_FEATURES, featureForView, hiddenTabs, isFeatureOn, isViewHidden, sameFlags, tabTarget } from "./features/kitchen/featureTabs.js";

export const fetchKitchenFlags = async () => {
  const { data } = await api.get("/features");
  return data.flags;
};
