import { toast } from "react-hot-toast";
import { shouldToastFeature } from "./features/kitchen/featureTabs.js";

export const FEATURE_DISABLED_MESSAGE = "This feature is currently disabled for your kitchen.";

const shownAt = new Map();

// The one place a disabled-feature toast is raised: both the local navigation guard and the API layer's
// FEATURE_DISABLED handler call it, so a single action never shows two toasts for the same feature (10 s dedupe).
export const toastFeatureDisabled = (feature) => {
  if (shouldToastFeature(shownAt, feature ?? "unknown")) toast.error(FEATURE_DISABLED_MESSAGE);
};
