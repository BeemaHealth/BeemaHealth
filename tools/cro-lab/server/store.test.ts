import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "./store.ts";
import { seedDemo } from "./demo.ts";
import {
  duplicateVariantFile,
  nextVariantId,
  rewriteDescriptor,
  syncWithDisk,
} from "./variants.ts";
import type { LabData, Variant } from "../shared/types.ts";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "cro-lab-"));

test("data persists across store instances (restart)", () => {
  const file = path.join(tmp(), "lab.json");
  const a = new Store(file, () => seedDemo("2026-10-20"));
  a.update((d) => void (d.tests[0].findings = "kept"));
  const b = new Store(file, () => {
    throw new Error("must not reseed");
  });
  assert.equal(b.data.tests[0].findings, "kept");
});

test("invalid updates are rejected and leave the file untouched", () => {
  const file = path.join(tmp(), "lab.json");
  const s = new Store(file, () => seedDemo("2026-10-20"));
  const before = fs.readFileSync(file, "utf8");
  assert.throws(
    () =>
      s.update((d) => d.deployments.push({ ...d.deployments[0], id: "dup" })),
    /overlaps|Invalid windows/,
  );
  assert.equal(fs.readFileSync(file, "utf8"), before);
  assert.throws(() =>
    s.update((d) => void (d.variants[0].status = "live" as never)),
  );
});

test("no stray temp files after writes", () => {
  const dir = tmp();
  const s = new Store(path.join(dir, "lab.json"), () => seedDemo("2026-10-20"));
  s.update((d) => void (d.tests = []));
  assert.deepEqual(fs.readdirSync(dir), ["lab.json"]);
});

test("demo seed has valid, non-overlapping windows with a repeated variant", () => {
  const d = seedDemo("2026-10-20");
  const tirz = d.deployments.filter(
    (x) => x.pageId === "tirzepatide-houston" && x.variantId === "v1-control",
  );
  assert.equal(tirz.length, 2);
  assert.equal(
    d.variants.filter((v) => v.pageId === "glp-1-houston").length,
    10,
  );
});

test("variant ids are numbered and slugged", () => {
  const vs = [
    { pageId: "p", id: "v1-control" },
    { pageId: "p", id: "v4-x" },
  ] as Variant[];
  assert.equal(nextVariantId(vs, "p", "Video Hero!"), "v5-video-hero");
  assert.equal(nextVariantId(vs, "other", "A"), "v1-a");
});

const SRC = `import x from "y";\nconst C = () => null;\nexport const variant = {\n  id: "v1-control",\n  label: "Control",\n  Component: C,\n};\n`;

test("duplicate writes a new file, rewrites descriptor, never touches parent", () => {
  const root = tmp();
  const dir = path.join(root, "src/landing-variants/pg");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "v1-control.tsx"), SRC);
  const parent = {
    id: "v1-control",
    componentPath: "src/landing-variants/pg/v1-control.tsx",
  } as Variant;
  const rel = duplicateVariantFile({
    root,
    pageId: "pg",
    parent,
    newId: "v2-video",
    label: "Video",
  });
  assert.equal(rel, "src/landing-variants/pg/v2-video.tsx");
  assert.equal(fs.readFileSync(path.join(dir, "v1-control.tsx"), "utf8"), SRC);
  const copy = fs.readFileSync(path.join(root, rel), "utf8");
  assert.match(copy, /id: "v2-video"/);
  assert.match(copy, /label: "Video"/);
  assert.throws(
    () =>
      duplicateVariantFile({
        root,
        pageId: "pg",
        parent,
        newId: "v2-video",
        label: "Video",
      }),
    /already exists/,
  );
  assert.throws(
    () =>
      duplicateVariantFile({
        root,
        pageId: "pg",
        parent,
        newId: "../evil",
        label: "x",
      }),
    /Invalid variant id/,
  );
});

test("route-file pages cannot be duplicated", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, "src/routes"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/routes/a.tsx"), "x");
  assert.throws(
    () =>
      duplicateVariantFile({
        root,
        pageId: "a",
        parent: {
          id: "v1-control",
          componentPath: "src/routes/a.tsx",
        } as Variant,
        newId: "v2-x",
        label: "x",
      }),
    /not on the variant system/,
  );
});

test("rewriteDescriptor only edits the exported descriptor", () => {
  const out = rewriteDescriptor(
    `const a = { id: "keep", label: "keep" };\n${SRC.split("\n").slice(2).join("\n")}`,
    "v9-n",
    "N",
  );
  assert.match(out, /id: "keep"/);
  assert.match(out, /id: "v9-n"/);
});

test("syncWithDisk registers variants created outside the dashboard", () => {
  const root = tmp();
  const dir = path.join(root, "src/landing-variants/pg");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "v3-new.tsx"),
    SRC.replace("v1-control", "v3-new"),
  );
  const data: LabData = {
    schemaVersion: 1,
    variants: [],
    deployments: [],
    tests: [],
    readyToDeploy: {},
  };
  assert.equal(syncWithDisk(data, root, ["pg"]), true);
  assert.equal(data.variants[0].id, "v3-new");
  assert.equal(syncWithDisk(data, root, ["pg"]), false);
});

test("syncWithDisk repoints a stale component path and parents new drafts to control", () => {
  const root = tmp();
  const dir = path.join(root, "src/landing-variants/page-a");
  fs.mkdirSync(dir, { recursive: true });
  for (const id of ["v1-control", "v2-variant-b"])
    fs.writeFileSync(
      path.join(dir, `${id}.tsx`),
      `export const variant = { id: "${id}", label: "${id}" };\n`,
    );
  const control = {
    id: "v1-control",
    pageId: "page-a",
    name: "Control",
    description: "",
    componentPath: "src/routes/page-a.tsx",
    createdAt: new Date().toISOString(),
    status: "draft",
    parentId: null,
    hypothesis: "",
    element: "",
    whyTested: "",
    expected: "",
    notes: "",
  } as Variant;
  const data = { variants: [control] } as unknown as LabData;
  assert.equal(syncWithDisk(data, root, ["page-a"]), true);
  assert.equal(
    control.componentPath,
    "src/landing-variants/page-a/v1-control.tsx",
  );
  const b = data.variants.find((v) => v.id === "v2-variant-b")!;
  assert.equal(b.parentId, "v1-control");
  assert.equal(b.status, "draft");
  assert.equal(syncWithDisk(data, root, ["page-a"]), false);
});
