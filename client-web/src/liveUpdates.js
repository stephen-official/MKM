import { useEffect, useRef } from "react";
import { socket } from "./socket";
import { KITCHEN_CHANGED, settleChanges } from "./features/kitchen/liveChanges.js";

/** Calls onTopic(topic) whenever the server says one of `topics` changed for this kitchen (backend/src/realtime.js). */
export const useKitchenChanges = (topics, onTopic) => {
  const latest = useRef(onTopic);
  useEffect(() => { latest.current = onTopic; });
  const key = topics.join("|");
  useEffect(() => {
    const live = settleChanges(key.split("|"), (topic) => latest.current(topic));
    socket.on(KITCHEN_CHANGED, live.handle);
    return () => { socket.off(KITCHEN_CHANGED, live.handle); live.dispose(); };
  }, [key]);
};

/** Runs refetch() after the socket reconnects or the app comes back to the foreground, so nothing missed meanwhile stays stale. */
export const useRefetchOnReturn = (refetch) => {
  const latest = useRef(refetch);
  useEffect(() => { latest.current = refetch; });
  useEffect(() => {
    const run = () => latest.current();
    const onVisibility = () => { if (document.visibilityState === "visible") run(); };
    socket.io.on("reconnect", run);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { socket.io.off("reconnect", run); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
};
