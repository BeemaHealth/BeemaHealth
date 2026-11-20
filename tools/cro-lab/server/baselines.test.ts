import test from "node:test";
import assert from "node:assert/strict";
import type { LabData, Variant } from "../shared/types.ts";
import { backfillBaselines } from "./variants.ts";

const variant = (pageId: string, id: string): Variant => ({
  id,
  pageId,
  name: id,
  description: "",
  componentPath: `src/landing-variants/${pageId}/${id}.tsx`,
  createdAt: "2026-11-01T00:00:00.000Z",
  status: "draft",
  parentId: null,
  hypothesis: "",
  element: "",
  whyTested: "",
  expected: "",
  notes: "",
});

const data = (): LabData => ({
  schemaVersion: 1,
  variants: [
    variant("nad-plus", "v1-control"),
    variant("nad-plus", "v3-new-layout"),
    variant("sexual-health", "v1-control"),
    variant("sexual-health", "v2-get-started-modal"),
  ],
  deployments: [],
  tests: [],
  readyToDeploy: {},
});

test("a page served by its control gets a variant-0 go-live record", () => {
  const d = data();
  const mains: Record<string, string> = {
    "nad-plus": "v1-control",
    "sexual-health": "v2-get-started-modal",
  };
  const changed = backfillBaselines(
    d,
    ["nad-plus", "sexual-health"],
    (id) => mains[id] ?? null,
    "2026-10-19T06:00:00.000Z",
  );
  assert.equal(changed, true);
  assert.deepEqual(
    d.deployments.map((x) => [x.pageId, x.variantId, x.endUtc, x.confirmed]),
    [["nad-plus", "v1-control", null, true]],
  );
  // Second run changes nothing.
  assert.equal(
    backfillBaselines(d, ["nad-plus"], () => "v1-control", "x"),
    false,
  );
});
