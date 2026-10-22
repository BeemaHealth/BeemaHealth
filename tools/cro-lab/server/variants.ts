// Variant file operations. Duplicating never overwrites the parent.
import fs from "node:fs";
import path from "node:path";
import type { LabData, Variant } from "../shared/types.ts";

export const VARIANT_RE = /^v[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "variant";

/** v<next number>-<slug>, unique within the page. */
export function nextVariantId(
  existing: Variant[],
  pageId: string,
  name: string,
): string {
  let max = 0;
  for (const v of existing) {
    if (v.pageId !== pageId) continue;
    const m = v.id.match(/^v(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `v${max + 1}-${slugify(name)}`;
}

/** Rewrites the exported descriptor's id and label in a copied variant file. */
export function rewriteDescriptor(
  source: string,
  id: string,
  label: string,
): string {
  const idx = source.indexOf("export const variant");
  if (idx === -1)
    throw new Error("Source has no `export const variant` descriptor");
  const head = source.slice(0, idx);
  let block = source.slice(idx);
  if (!/\bid:\s*"[^"]*"/.test(block))
    throw new Error("Descriptor has no id field");
  block = block.replace(/\bid:\s*"[^"]*"/, `id: ${JSON.stringify(id)}`);
  block = block.replace(
    /\blabel:\s*"[^"]*"/,
    `label: ${JSON.stringify(label)}`,
  );
  return head + block;
}

export function duplicateVariantFile(opts: {
  root: string;
  pageId: string;
  parent: Variant;
  newId: string;
  label: string;
}): string {
  if (!VARIANT_RE.test(opts.newId))
    throw new Error(`Invalid variant id ${opts.newId}`);
  const dir = path.join(opts.root, "src/landing-variants", opts.pageId);
  const from = path.join(opts.root, opts.parent.componentPath);
  const to = path.join(dir, `${opts.newId}.tsx`);
  if (!fs.existsSync(from))
    throw new Error(`Parent component not found: ${opts.parent.componentPath}`);
  if (path.dirname(from) !== dir)
    throw new Error(
      "Parent is not on the variant system yet (route-file page)",
    );
  if (fs.existsSync(to))
    throw new Error(`${path.relative(opts.root, to)} already exists`);
  fs.writeFileSync(
    to,
    rewriteDescriptor(fs.readFileSync(from, "utf8"), opts.newId, opts.label),
    { flag: "wx" },
  );
  return path.relative(opts.root, to);
}

export function labelFromSource(source: string): string | null {
  const block = source.slice(source.indexOf("export const variant"));
  return block.match(/\blabel:\s*"([^"]+)"/)?.[1] ?? null;
}

/** Variants discovered on disk that the lab data does not know yet. */
export function scanDisk(
  root: string,
  pageId: string,
): { id: string; label: string; file: string }[] {
  const dir = path.join(root, "src/landing-variants", pageId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((f) => {
      const m = f.match(/^(v[a-z0-9-]*)\.tsx$/);
      if (!m || !VARIANT_RE.test(m[1])) return [];
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      return [
        {
          id: m[1],
          label: labelFromSource(src) ?? m[1],
          file: `src/landing-variants/${pageId}/${f}`,
        },
      ];
    });
}

/**
 * Adds disk variants missing from the data (as drafts) and repoints variants
 * whose component path no longer exists (e.g. a page moved off its route file).
 * Returns true if changed.
 */
export function syncWithDisk(
  data: LabData,
  root: string,
  pageIds: string[],
): boolean {
  let changed = false;
  for (const pageId of pageIds) {
    const onDisk = scanDisk(root, pageId);
    for (const f of onDisk) {
      const known = data.variants.find(
        (v) => v.pageId === pageId && v.id === f.id,
      );
      if (known) {
        if (known.componentPath !== f.file) {
          known.componentPath = f.file;
          changed = true;
        }
        continue;
      }
      const hasControl = data.variants.some(
        (v) => v.pageId === pageId && v.id === "v1-control",
      );
      data.variants.push({
        id: f.id,
        pageId,
        name: f.label,
        description:
          f.id === "v1-control"
            ? "Discovered on disk."
            : "Draft copy of Control. Edit it, preview locally, then make it main.",
        componentPath: f.file,
        createdAt: new Date().toISOString(),
        status: "draft",
        parentId: hasControl && f.id !== "v1-control" ? "v1-control" : null,
        hypothesis: "",
        element: "",
        whyTested: "",
        expected: "",
        notes: "",
      });
      changed = true;
    }
  }
  return changed;
}
