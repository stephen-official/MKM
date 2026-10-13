import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, FEATURE_DISABLED_EVENT } from "../api.js";
import { isSuperAdmin } from "../roles.js";
import { createRequestTracker } from "../pages/executive/requestTracker.js";
import { FeatureFlagsContext } from "./FeatureFlagsContext.js";
import { reconcileAudience, shouldRefreshAfterDisabled } from "./featureSync.js";

const REFRESH_MS = 60_000;

/**
 * Loads the caller's effective flags and keeps them fresh (focus, 60 s while visible, after FEATURE_DISABLED).
 * `onRoleChange(role)` / `onSignOut()` let the app follow a role the server reports differently from the session.
 */
export function FeatureFlagsProvider({ role, onRoleChange, onSignOut, children }) {
  const [state, setState] = useState({ flags: null, version: 0, status: "loading", error: null });
  const tracker = useMemo(() => createRequestTracker(), []);
  const lastRefreshAt = useRef(0);
  const sync = useRef({ role, onRoleChange, onSignOut });
  useEffect(() => {
    sync.current = { role, onRoleChange, onSignOut };
  });

  const refresh = useCallback(async () => {
    lastRefreshAt.current = Date.now();
    const request = tracker.start();
    try {
      const { data } = await api.get("/features", { signal: request.signal });
      if (!request.isLatest()) return;
      const action = reconcileAudience(data.audience, sync.current.role);
      if (action.type === "sign-out") return sync.current.onSignOut?.();
      if (action.type === "set-role") return sync.current.onRoleChange?.(action.role);
      setState({ flags: data.flags, version: data.version, status: "ready", error: null });
    } catch (error) {
      if (!request.isLatest()) return;
      // Keep the last good flags; the server still enforces them.
      setState((prev) => ({ ...prev, status: prev.flags ? "ready" : "error", error: error.response?.data?.code || "NETWORK_ERROR" }));
    }
  }, [tracker]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onDisabled = () => {
      if (shouldRefreshAfterDisabled(lastRefreshAt.current)) refresh();
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    return () => {
      tracker.cancel();
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(FEATURE_DISABLED_EVENT, onDisabled);
    };
  }, [refresh, tracker]);

  const value = useMemo(() => ({
    ...state,
    role,
    isSuperAdmin: isSuperAdmin(role),
    isEnabled: (key) => isSuperAdmin(role) || !state.flags || state.flags[key] !== false,
    refresh
  }), [state, role, refresh]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
