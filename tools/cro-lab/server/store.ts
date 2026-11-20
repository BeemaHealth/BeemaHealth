// JSON persistence with schema validation and atomic writes.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { LabData } from "../shared/types.ts";
import { validateWindows } from "../shared/metrics.ts";

const variant = z.object({
  id: z.string().regex(/^v[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pageId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string(),
  componentPath: z.string(),
  createdAt: z.string(),
  status: z.enum(["draft", "ready", "paused", "archived"]),
  parentId: z.string().nullable(),
  hypothesis: z.string(),
  element: z.string(),
  whyTested: z.string(),
  expected: z.string(),
  notes: z.string(),
});

const deployment = z.object({
  id: z.string(),
  pageId: z.string(),
  variantId: z.string(),
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime().nullable(),
  confirmed: z.boolean(),
  commitSha: z.string().optional(),
  notes: z.string().optional(),
});

const test = z.object({
  id: z.string(),
  pageId: z.string(),
  hypothesis: z.string(),
  element: z.string(),
  priority: z.enum(["High", "Medium", "Low"]),
  status: z.enum(["Idea", "Planned", "Building", "Live", "Completed"]),
  expected: z.string(),
  findings: z.string(),
  followUp: z.string(),
  variantId: z.string().optional(),
});

export const labSchema = z.object({
  schemaVersion: z.literal(1),
  variants: z.array(variant),
  deployments: z.array(deployment),
  tests: z.array(test),
  readyToDeploy: z.record(z.string()),
});

/** Throws a readable error if data is structurally or logically invalid. */
export function validateLab(raw: unknown): LabData {
  const data = labSchema.parse(raw) as LabData;
  const ids = new Set<string>();
  for (const v of data.variants) {
    const key = `${v.pageId}/${v.id}`;
    if (ids.has(key)) throw new Error(`Duplicate variant ${key}`);
    ids.add(key);
  }
  for (const d of data.deployments) {
    if (!ids.has(`${d.pageId}/${d.variantId}`))
      throw new Error(
        `Deployment ${d.id} references unknown variant ${d.variantId}`,
      );
  }
  for (const pageId of new Set(data.deployments.map((d) => d.pageId))) {
    const problems = validateWindows(
      data.deployments.filter((d) => d.pageId === pageId),
    );
    if (problems.length)
      throw new Error(`Invalid windows for ${pageId}: ${problems.join("; ")}`);
  }
  return data;
}

export class Store {
  data: LabData;
  file: string;
  constructor(file: string, seed: () => LabData) {
    this.file = file;
    if (fs.existsSync(file)) {
      this.data = validateLab(JSON.parse(fs.readFileSync(file, "utf8")));
    } else {
      this.data = validateLab(seed());
      this.write(this.data);
    }
  }

  /** Validate, then write via temp file + rename so a crash never truncates. */
  write(next: LabData) {
    const valid = validateLab(next);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(valid, null, 2) + "\n");
    fs.renameSync(tmp, this.file);
    this.data = valid;
  }

  /** Apply a mutation to a deep copy; commit only if the result validates. */
  update(fn: (draft: LabData) => void): LabData {
    const draft = structuredClone(this.data);
    fn(draft);
    this.write(draft);
    return this.data;
  }
}
