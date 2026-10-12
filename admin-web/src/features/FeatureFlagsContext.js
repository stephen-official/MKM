import { createContext, useContext } from "react";

export const FeatureFlagsContext = createContext(null);

export const useFeatureFlags = () => {
  const value = useContext(FeatureFlagsContext);
  if (!value) throw new Error("useFeatureFlags must be used inside FeatureFlagsProvider");
  return value;
};
