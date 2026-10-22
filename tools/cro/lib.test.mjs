import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cloneVariantSource,
  isValidPageKey,
  isValidVariantId,
  lastActivation,
  nextExperimentId,
  nextVariantId,
  normalizeConfig,
  parseVariantSource,
  recordDeploy,
  renderGenerated,
  undeployedChanges,
  validatePageConfig,
} from "./lib.mjs";
import {
  compareRates,
  concurrencyShare,
  handoffRate,
  variantWarnings,
  wilson,
} from "./metrics.mjs";

const pages = {
  "tirzepatide-houston": [
    { id: "v1-control", label: "Control" },
    { id: "v2-short", label: "Short" },
    { id: "v3-long", label: "Long" },
  ],
};

test("validators reject traversal and junk", () => {
  assert.equal(isValidPageKey("tirzepatide-houston"), true);
  for (const bad of ["../x", "a/b", "A", "", "a b", 'a";x', null])
    assert.equal(isValidPageKey(bad), false);
  assert.equal(isValidVariantId("v2-short"), true);
  for (const bad of ["x1", "v1/..", "v1.tsx", "../v1", ""])
    assert.equal(isValidVariantId(bad), false);
});

test("normalizeConfig makes unknown variants drafts with no traffic", () => {
  const cfg = normalizeConfig(
    {
      "tirzepatide-houston": {
        experimentId: "t-e1",
        variants: { "v1-control": { status: "live", weight: 100 } },
      },
    },
    pages,
  );
  assert.deepEqual(cfg["tirzepatide-houston"].variants["v2-short"], {
    status: "draft",
    weight: 0,
  });
  assert.equal(cfg["tirzepatide-houston"].experimentId, "t-e1");
});

test("validatePageConfig enforces weights, statuses, and a live variant", () => {
  const ok = {
    experimentId: "t-e1",
    variants: {
      "v1-control": { status: "live", weight: 60 },
      "v2-short": { status: "live", weight: 40 },
      "v3-long": { status: "paused", weight: 0 },
    },
  };
  assert.deepEqual(validatePageConfig(ok), []);
  const bad = (v) => validatePageConfig({ experimentId: "t-e1", variants: v });
  assert.ok(
    bad({
      "v1-control": { status: "live", weight: 60 },
      "v2-short": { status: "live", weight: 30 },
    }).length,
  );
  assert.ok(bad({ "v1-control": { status: "paused", weight: 0 } }).length);
  assert.ok(
    bad({
      "v1-control": { status: "live", weight: 100 },
      "v2-short": { status: "draft", weight: 5 },
    }).length,
  );
  assert.ok(bad({ "v1-control": { status: "live", weight: 100.5 } }).length);
  assert.ok(bad({ "v1-control": { status: "nope", weight: 0 } }).length);
});

test("renderGenerated imports only live variants, heaviest first", () => {
  const cfg = {
    "tirzepatide-houston": {
      experimentId: "t-e1",
      variants: {
        "v1-control": { status: "live", weight: 30 },
        "v2-short": { status: "live", weight: 70 },
        "v3-long": { status: "archived", weight: 0 },
      },
    },
  };
  const text = renderGenerated(cfg);
  assert.match(text, /from "\.\/tirzepatide-houston\/v2-short"/);
  assert.match(text, /from "\.\/tirzepatide-houston\/v1-control"/);
  assert.doesNotMatch(text, /v3-long/);
  assert.ok(text.indexOf("v2-short") < text.indexOf("v1-control"));
  assert.throws(() =>
    renderGenerated({
      p: {
        experimentId: "e",
        variants: { "v1-x": { status: "live", weight: 50 } },
      },
    }),
  );
});

test("parseVariantSource and cloneVariantSource", () => {
  const src =
    'const X = [{ label: "keep" }];\nexport const variant = {\n  id: "v1-control",\n  label: "Control",\n};';
  assert.deepEqual(parseVariantSource(src), {
    id: "v1-control",
    label: "Control",
  });
  const out = cloneVariantSource(src, "v2-a", "New A");
  assert.match(out, /label: "keep"/);
  assert.match(out, /id: "v2-a"/);
  assert.match(out, /label: "New A"/);
});

test("ids", () => {
  assert.equal(
    nextVariantId(["v1-control", "v3-x"], "short-hero"),
    "v4-short-hero",
  );
  assert.throws(() => nextVariantId(["v1-control"], "../x"));
  assert.equal(nextExperimentId("p-e1"), "p-e2");
  assert.equal(nextExperimentId("p-e9"), "p-e10");
});

test("deploy log: pending changes and activation dates", () => {
  const cfg = (w) => ({
    experimentId: "t-e1",
    variants: {
      "v1-control": { status: "live", weight: w },
      "v2-short": { status: w === 100 ? "draft" : "live", weight: 100 - w },
    },
  });
  assert.equal(undeployedChanges([], "p", cfg(100)), true);
  let d = recordDeploy([], "p", cfg(100), "2026-10-01T00:00:00.000Z");
  assert.equal(undeployedChanges(d, "p", cfg(100)), false);
  assert.equal(undeployedChanges(d, "p", cfg(50)), true);
  d = recordDeploy(d, "p", cfg(50), "2026-10-05T00:00:00.000Z");
  assert.equal(
    lastActivation(d, "p", "v1-control"),
    "2026-10-01T00:00:00.000Z",
  );
  assert.equal(lastActivation(d, "p", "v2-short"), "2026-10-05T00:00:00.000Z");
  d = recordDeploy(d, "p", cfg(100), "2026-10-09T00:00:00.000Z");
  assert.equal(lastActivation(d, "p", "v2-short"), null);
});

test("rates never turn missing data into 0%", () => {
  assert.equal(handoffRate(0, 0), null);
  assert.equal(handoffRate(200, 20), 0.1);
  const w = (t, c) => variantWarnings(t, c);
  assert.ok(
    w(
      { visitors: 500, clickers: 0 },
      { dimensionsRegistered: false, trackingVerified: true },
    ).includes("custom-dimensions-missing"),
  );
  assert.ok(
    w(
      { visitors: 500, clickers: 0 },
      { dimensionsRegistered: true, trackingVerified: false },
    ).includes("handoff-unverified"),
  );
  assert.ok(
    w(
      { visitors: 0, clickers: 0 },
      { dimensionsRegistered: true, trackingVerified: true },
    ).includes("no-exposures"),
  );
  assert.ok(
    w(
      { visitors: 20, clickers: 1 },
      { dimensionsRegistered: true, trackingVerified: true },
    ).includes("low-traffic"),
  );
  assert.ok(
    w(
      { visitors: 200, clickers: 300 },
      { dimensionsRegistered: true, trackingVerified: true },
    ).includes("clickers-exceed-visitors"),
  );
  assert.deepEqual(
    w(
      { visitors: 200, clickers: 20 },
      { dimensionsRegistered: true, trackingVerified: true },
    ),
    [],
  );
});

test("wilson interval and two-proportion test", () => {
  const ci = wilson(50, 500);
  assert.ok(ci.low < 0.1 && ci.high > 0.1);
  assert.ok(
    Math.abs(ci.low - 0.0769) < 0.002 && Math.abs(ci.high - 0.1295) < 0.002,
  );
  assert.equal(wilson(0, 0), null);
  const same = compareRates(50, 500, 50, 500);
  assert.equal(same.diff, 0);
  assert.ok(same.p > 0.99);
  const clear = compareRates(50, 500, 100, 500);
  assert.ok(clear.p < 0.001 && clear.diff > 0.09);
});

test("concurrencyShare", () => {
  assert.equal(concurrencyShare(["1", "2", "3"], ["2", "3", "4"]), 2 / 3);
  assert.equal(concurrencyShare(["1", "2"], ["8", "9"]), 0);
  assert.equal(concurrencyShare([], ["1"]), 0);
});
