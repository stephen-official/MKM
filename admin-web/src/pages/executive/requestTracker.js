/** Ensures only the newest in-flight request may update the screen; older ones are aborted. */
export const createRequestTracker = () => {
  let current = 0;
  let controller = null;
  return {
    start() {
      controller?.abort();
      current += 1;
      controller = new AbortController();
      const id = current;
      return { id, signal: controller.signal, isLatest: () => id === current };
    },
    cancel() {
      controller?.abort();
      current += 1;
    }
  };
};
