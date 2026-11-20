import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  mainVariantId,
  readExperiments,
  renderGenerated,
  withMain,
  writeExperiments,
} from "./experiments.ts";

function repo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cro-exp-"));
  for (const id of ["v1-control", "v2-variant-b"]) {
    const dir = path.join(root, "src/landing-variants/page-a");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${id}.tsx`),
      `export const variant = { id: "${id}", label: "${id}" };\n`,
    );
  }
  return root;
}

test("withMain makes exactly one variant live at 100% and lists disk variants", () => {
  const root = repo();
  const a = withMain({}, root, "page-a", "v1-control");
  assert.equal(mainVariantId(a, "page-a"), "v1-control");
  assert.deepEqual(a["page-a"].variants["v2-variant-b"], {
    status: "draft",
    weight: 0,
  });
  const b = withMain(a, root, "page-a", "v2-variant-b");
  assert.equal(mainVariantId(b, "page-a"), "v2-variant-b");
  assert.equal(b["page-a"].variants["v1-control"].weight, 0);
  assert.equal(b["page-a"].experimentId, "page-a-e1");
});

test("withMain rejects a variant with no file and does not mutate its input", () => {
  const root = repo();
  const a = withMain({}, root, "page-a", "v1-control");
  const snapshot = JSON.stringify(a);
  assert.throws(
    () => withMain(a, root, "page-a", "v9-missing"),
    /No variant file/,
  );
  assert.equal(JSON.stringify(a), snapshot);
});

test("renderGenerated imports only the live variant of each page", () => {
  const root = repo();
  const out = renderGenerated(withMain({}, root, "page-a", "v2-variant-b"));
  assert.match(out, /from "\.\/page-a\/v2-variant-b"/);
  assert.doesNotMatch(out, /v1-control/);
  assert.throws(
    () => renderGenerated({ x: { experimentId: "x-e1", variants: {} } }),
    /exactly one live/,
  );
});

test("writeExperiments round-trips through disk", async () => {
  const root = repo();
  await writeExperiments(root, withMain({}, root, "page-a", "v1-control"));
  assert.equal(mainVariantId(readExperiments(root), "page-a"), "v1-control");
  const gen = fs.readFileSync(
    path.join(root, "src/landing-variants/experiments.generated.ts"),
    "utf8",
  );
  assert.match(gen, /pageAV0/);
});
