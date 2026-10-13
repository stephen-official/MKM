import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { featureForView, hiddenTabs, isFeatureOn, isViewHidden, sameFlags, shouldToastFeature, tabTarget } from "./featureTabs.js";

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

describe("bottom tab targets", () => {
  it("maps the Requests tab to the requests view on the requests sub-tab", () => {
    assert.deepEqual(tabTarget("requests"), { view: "requests", supplyTab: "requests" });
  });

  it("maps the other tabs to their own view and ignores unknown tabs", () => {
    for (const tab of ["home", "stock", "usage", "more"]) assert.deepEqual(tabTarget(tab), { view: tab });
    assert.equal(tabTarget("nope"), null);
  });

  it("targets a view that the indent flag gates", () => {
    assert.equal(isViewHidden({ indent: false }, tabTarget("requests").view), true);
    assert.equal(isViewHidden({ indent: true }, tabTarget("requests").view), false);
  });
});

describe("disabled-feature toast dedupe", () => {
  it("toasts once per feature inside the window, then again after it", () => {
    const seen = new Map();
    assert.equal(shouldToastFeature(seen, "indent", 1_000, 10_000), true);
    assert.equal(shouldToastFeature(seen, "indent", 5_000, 10_000), false);
    assert.equal(shouldToastFeature(seen, "consumption", 5_000, 10_000), true, "other features are independent");
    assert.equal(shouldToastFeature(seen, "indent", 11_000, 10_000), true, "window elapsed");
    assert.equal(shouldToastFeature(seen, "indent", 12_000, 10_000), false);
  });
});
