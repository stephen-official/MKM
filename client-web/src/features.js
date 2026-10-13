import { api } from "./api";

export { KITCHEN_TAB_FEATURES, hiddenTabs, isFeatureOn } from "./features/kitchen/featureTabs.js";

export const fetchKitchenFlags = async () => {
  const { data } = await api.get("/features");
  return data.flags;
};
