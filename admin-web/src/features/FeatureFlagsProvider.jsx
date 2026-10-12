import { useCallback, useEffect, useMemo, useState } from "react";
import { api, FEATURE_DISABLED_EVENT } from "../api.js";
import { isSuperAdmin } from "../roles.js";
import { FeatureFlagsContext } from "./FeatureFlagsContext.js";

const REFRESH_MS = 60_000;

/** Loads the caller's effective flags and keeps them fresh (focus, 60 s while visible, after FEATURE_DISABLED). */
export function FeatureFlagsProvider({ role, children }) {
  const [state, setState] = useState({ flags: null, version: 0, status: "loading", error: null });

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/features");
      setState({ flags: data.flags, version: data.version, status: "ready", error: null });
    } catch (error) {
      // Keep the last good flags; the server still enforces them.
      setState((prev) => ({ ...prev, status: prev.flags ? "ready" : "error", error: error.response?.data?.code || "NETWORK_ERROR" }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onDisabled = () => refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    };
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    role,
    isSuperAdmin: isSuperAdmin(role),
    isEnabled: (key) => isSuperAdmin(role) || !state.flags || state.flags[key] !== false,
    refresh
  }), [state, role, refresh]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
