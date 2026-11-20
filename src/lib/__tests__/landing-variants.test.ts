import { describe, expect, it } from "vitest";
import { EXPERIMENTS } from "@/landing-variants/experiments.generated";
import type { LandingVariant } from "@/landing-variants/types";
import experimentsJson from "@/landing-variants/experiments.json";

const modules = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v*.tsx",
  { eager: true },
);

const byPage = new Map<string, Map<string, LandingVariant>>();
for (const [path, mod] of Object.entries(modules)) {
  const match = path.match(/landing-variants\/([^/]+)\/(v[^/]+)\.tsx$/);
  if (!match) continue;
  const [, page, file] = match;
  if (!byPage.has(page)) byPage.set(page, new Map());
  byPage.get(page)!.set(file, mod.variant);
}

describe("landing variants", () => {
  it("registers at least one page", () => {
    expect(byPage.size).toBeGreaterThan(0);
  });

  it.each([...byPage.keys()])("%s has a v1-control variant", (page) => {
    expect(byPage.get(page)!.has("v1-control")).toBe(true);
  });

  it.each([...byPage.entries()])(
    "%s variant ids match file names",
    (_page, variants) => {
      for (const [file, v] of variants) {
        expect(v.id).toBe(file);
        expect(v.label.length).toBeGreaterThan(0);
      }
    },
  );

  it("every page with variants has a generated experiment", () => {
    for (const page of byPage.keys()) {
      expect(Object.keys(EXPERIMENTS)).toContain(page);
    }
  });

  it("generated experiments only ship live variants whose weights total 100", () => {
    const json = experimentsJson as Record<
      string,
      {
        experimentId: string;
        variants: Record<string, { status: string; weight: number }>;
      }
    >;
    for (const [page, exp] of Object.entries(EXPERIMENTS)) {
      expect(exp.variants.length).toBeGreaterThan(0);
      expect(exp.variants.reduce((n, e) => n + e.weight, 0)).toBe(100);
      expect(exp.experimentId).toBe(json[page].experimentId);
      for (const entry of exp.variants) {
        expect(byPage.get(page)!.get(entry.variant.id)).toBe(entry.variant);
        expect(json[page].variants[entry.variant.id]).toEqual({
          status: "live",
          weight: entry.weight,
        });
      }
    }
  });
});
