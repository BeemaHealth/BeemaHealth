import { afterEach, describe, expect, it } from "vitest";
import {
  EXCLUDE_KEY,
  applyExcludeParam,
  assignVariant,
  pickWeighted,
  readPreviewParam,
} from "@/landing-variants/assignment";
import {
  experimentEventParams,
  setExperimentContext,
  setExperimentTrackingSuppressed,
  shouldSendExperimentEvents,
} from "@/lib/experiment-context";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const entries = [
  { id: "v1-control", weight: 70 },
  { id: "v2-short", weight: 30 },
];

describe("pickWeighted", () => {
  it("maps random values onto weights", () => {
    expect(pickWeighted(entries, 0)).toBe("v1-control");
    expect(pickWeighted(entries, 0.699)).toBe("v1-control");
    expect(pickWeighted(entries, 0.7)).toBe("v2-short");
    expect(pickWeighted(entries, 0.9999999)).toBe("v2-short");
  });

  it("ignores zero-weight entries and rejects empty traffic", () => {
    expect(
      pickWeighted(
        [
          { id: "a", weight: 0 },
          { id: "b", weight: 5 },
        ],
        0,
      ),
    ).toBe("b");
    expect(() => pickWeighted([{ id: "a", weight: 0 }], 0.5)).toThrow();
  });

  it("approximates the configured split", () => {
    const counts = { "v1-control": 0, "v2-short": 0 } as Record<string, number>;
    for (let i = 0; i < 10000; i++) counts[pickWeighted(entries, i / 10000)]++;
    expect(counts["v1-control"]).toBe(7000);
  });
});

describe("assignVariant", () => {
  it("stores the first assignment and reuses it", () => {
    const store = memoryStore();
    const first = assignVariant({
      experimentId: "e1",
      entries,
      store,
      random: () => 0.9,
    });
    expect(first).toEqual({ variantId: "v2-short", fromStorage: false });
    const second = assignVariant({
      experimentId: "e1",
      entries,
      store,
      random: () => 0.1,
    });
    expect(second).toEqual({ variantId: "v2-short", fromStorage: true });
  });

  it("reassigns when the stored variant no longer has traffic", () => {
    const store = memoryStore({ "beema_exp:e1": "v9-gone" });
    const r = assignVariant({
      experimentId: "e1",
      entries,
      store,
      random: () => 0,
    });
    expect(r.variantId).toBe("v1-control");
    expect(r.fromStorage).toBe(false);
    expect(store.data["beema_exp:e1"]).toBe("v1-control");
  });

  it("a new experiment id gets a fresh assignment", () => {
    const store = memoryStore({ "beema_exp:e1": "v2-short" });
    const r = assignVariant({
      experimentId: "e2",
      entries,
      store,
      random: () => 0,
    });
    expect(r.variantId).toBe("v1-control");
  });

  it("still assigns when storage throws", () => {
    const store = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(
      assignVariant({ experimentId: "e1", entries, store, random: () => 0.9 })
        .variantId,
    ).toBe("v2-short");
  });
});

describe("preview and exclusion params", () => {
  it("accepts only well-formed variant ids", () => {
    expect(readPreviewParam("?preview_variant=v2-short")).toBe("v2-short");
    for (const bad of [
      "?preview_variant=../x",
      "?preview_variant=<script>",
      "?preview_variant=",
      "",
    ]) {
      expect(readPreviewParam(bad)).toBeNull();
    }
  });

  it("exclude flag persists until cleared", () => {
    const store = memoryStore();
    expect(applyExcludeParam("", store)).toBe(false);
    expect(applyExcludeParam("?exp_exclude=1", store)).toBe(true);
    expect(applyExcludeParam("", store)).toBe(true);
    expect(store.data[EXCLUDE_KEY]).toBe("1");
    expect(applyExcludeParam("?exp_exclude=0", store)).toBe(false);
  });
});

describe("experiment event gating", () => {
  afterEach(() => {
    setExperimentContext(null);
    setExperimentTrackingSuppressed(false);
  });

  it("sends only from production or with ga_debug", () => {
    expect(
      shouldSendExperimentEvents({ hostname: "beemahealth.com", search: "" }),
    ).toBe(true);
    expect(
      shouldSendExperimentEvents({ hostname: "localhost", search: "" }),
    ).toBe(false);
    expect(
      shouldSendExperimentEvents({
        hostname: "localhost",
        search: "?ga_debug=1",
      }),
    ).toBe(true);
  });

  it("suppresses events and attribution during preview", () => {
    const ctx = {
      experimentId: "e1",
      variantId: "v1-control",
      landingPageId: "p",
    };
    setExperimentContext(ctx);
    expect(experimentEventParams()).toEqual({
      experiment_id: "e1",
      variant_id: "v1-control",
      landing_page_id: "p",
    });
    setExperimentTrackingSuppressed(true);
    expect(experimentEventParams()).toBeUndefined();
    expect(
      shouldSendExperimentEvents({ hostname: "beemahealth.com", search: "" }),
    ).toBe(false);
  });

  it("carries only non-personal ids", () => {
    const ctx = {
      experimentId: "e1",
      variantId: "v1-control",
      landingPageId: "p",
    };
    expect(Object.keys(experimentEventParams(ctx)!).sort()).toEqual([
      "experiment_id",
      "landing_page_id",
      "variant_id",
    ]);
  });
});
