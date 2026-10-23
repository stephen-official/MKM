import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { settleChanges } from "./liveChanges.js";

test("a burst on one topic becomes one call after the pause; unknown topics and bad events are ignored", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const calls = [];
    const live = settleChanges(["stock", "orders"], (topic) => calls.push(topic));
    assert.equal(live.handle({ topic: "stock" }), true);
    assert.equal(live.handle({ topic: "stock" }), true);
    assert.equal(live.handle({ topic: "orders" }), true);
    assert.equal(live.handle({ topic: "usage" }), false);
    assert.equal(live.handle(undefined), false);
    assert.deepEqual(calls, []);
    mock.timers.tick(399);
    assert.deepEqual(calls, []);
    mock.timers.tick(1);
    assert.deepEqual(calls, ["stock", "orders"]);
  } finally {
    mock.timers.reset();
  }
});

test("dispose drops a pending re-fetch (the screen went away)", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const calls = [];
    const live = settleChanges(["stock"], (topic) => calls.push(topic));
    live.handle({ topic: "stock" });
    live.dispose();
    mock.timers.tick(1000);
    assert.deepEqual(calls, []);
  } finally {
    mock.timers.reset();
  }
});
