import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { featureForView, hiddenTabs, isFeatureOn, isViewHidden, sameFlags } from "./featureTabs.js";

describe("kitchen features", () => {
  it("hides tabs whose feature is off; unknown flags mean on", () => {
    assert.deepEqual([...hiddenTabs({ consumption: false, indent: true })].sort(), ["activity", "usage"]);
    assert.equal(hiddenTabs(null).size, 0);
    assert.equal(isFeatureOn(undefined, "indent"), true);
  });

  it("picks the feature for a view, using the transaction type for the shared request-builder", () => {
    assert.equal(featureForView("request-builder", "transfer"), "transfer-stock");
    assert.equal(featureForView("request-builder", "indent"), "indent");
    assert.equal(featureForView("request-builder", undefined), "indent");
    assert.equal(featureForView("usage", "transfer"), "consumption");
    assert.equal(featureForView("home", "indent"), null);
  });

  it("keeps the transfer builder reachable when only supply requests are off", () => {
    const flags = { indent: false, "transfer-stock": true };
    assert.equal(isViewHidden(flags, "request-builder", "transfer"), false);
    assert.equal(isViewHidden(flags, "request-builder", "indent"), true);
    assert.equal(isViewHidden(flags, "home", "indent"), false);
    assert.equal(hiddenTabs(flags).has("request-builder"), false);
  });

  it("compares flag objects shallowly", () => {
    assert.equal(sameFlags({ a: true }, { a: true }), true);
    assert.equal(sameFlags({ a: true }, { a: false }), false);
    assert.equal(sameFlags({ a: true }, { a: true, b: true }), false);
    assert.equal(sameFlags(null, null), true);
    assert.equal(sameFlags(null, {}), false);
  });
});
