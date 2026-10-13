import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { createRequestTracker } from "./requestTracker.js";

/** `enabled=false` holds the first fetch (status stays "loading") until the caller is ready. */
export const useExecutiveReport = (apiQuery, { enabled = true } = {}) => {
  const key = JSON.stringify(apiQuery);
  // useState initialiser (not a ref read during render) keeps the react-hooks v7 rules happy.
  const [tracker] = useState(createRequestTracker);
  const [state, setState] = useState({ status: "loading", report: null, error: null });

  const load = useCallback(async () => {
    const req = tracker.start();
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const { data } = await api.get("/executive/summary", { params: JSON.parse(key), signal: req.signal });
      if (req.isLatest()) setState({ status: "ready", report: data, error: null });
    } catch (error) {
      if (!req.isLatest() || error.code === "ERR_CANCELED") return;
      setState((prev) => ({ ...prev, status: "error", error: error.response?.data || { code: "NETWORK_ERROR", message: "Could not reach the server." } }));
    }
  }, [key, tracker]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    return () => tracker.cancel();
  }, [enabled, load, tracker]);

  return { ...state, reload: load };
};
