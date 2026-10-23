/** Live updates: the backend emits "kitchen:changed" { topic } (backend/src/realtime.js) whenever something a kitchen
 *  shows has changed. This file is the pure part, so it can be tested without a socket. */
export const KITCHEN_CHANGED = "kitchen:changed";
export const SETTLE_MS = 400;

/**
 * Collects change events and calls onTopic(topic) once per topic after a short pause, so a burst ("dispatch all" sends
 * one event per line) becomes one re-fetch. Topics not in the list are ignored. dispose() drops anything still pending.
 */
export const settleChanges = (topics, onTopic, { delay = SETTLE_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  const wanted = new Set(topics);
  const timers = new Map();
  return {
    handle(event) {
      const topic = event?.topic;
      if (!wanted.has(topic)) return false;
      clearTimer(timers.get(topic));
      timers.set(topic, setTimer(() => { timers.delete(topic); onTopic(topic); }, delay));
      return true;
    },
    dispose() {
      timers.forEach((timer) => clearTimer(timer));
      timers.clear();
    },
  };
};
