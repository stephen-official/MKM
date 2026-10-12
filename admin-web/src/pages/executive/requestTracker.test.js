import { describe, expect, it } from "vitest";
import { createRequestTracker } from "./requestTracker.js";

describe("request tracker (stale responses are ignored)", () => {
  it("only the most recent request is latest; older ones are aborted", () => {
    const tracker = createRequestTracker();
    const first = tracker.start();
    const second = tracker.start();
    expect(first.isLatest()).toBe(false);
    expect(first.signal.aborted).toBe(true);
    expect(second.isLatest()).toBe(true);
    tracker.cancel();
    expect(second.isLatest()).toBe(false);
    expect(second.signal.aborted).toBe(true);
  });
  it("a slow older response arriving last does not win", async () => {
    const tracker = createRequestTracker();
    let shown = null;
    const fetchAfter = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
    const load = async (ms, value) => {
      const req = tracker.start();
      const result = await fetchAfter(ms, value);
      if (req.isLatest()) shown = result;
    };
    await Promise.all([load(30, "old"), load(5, "new")]);
    expect(shown).toBe("new");
  });
});
