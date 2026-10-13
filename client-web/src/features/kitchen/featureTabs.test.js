import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hiddenTabs, isFeatureOn } from "./featureTabs.js";

describe("kitchen features", () => {
  it("hides tabs whose feature is off; unknown flags mean on", () => {
    assert.deepEqual([...hiddenTabs({ consumption: false, indent: true })].sort(), ["activity", "usage"]);
    assert.equal(hiddenTabs(null).size, 0);
    assert.equal(isFeatureOn(undefined, "indent"), true);
  });
});
