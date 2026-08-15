import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CTA_IDS } from "../cta-ids";
import {
  REST_INTERVALS_DATE_MODIFIED,
  REST_INTERVALS_DESCRIPTION,
  REST_INTERVALS_FAQ,
  REST_INTERVALS_PATH,
  REST_INTERVALS_REFERENCES,
  REST_INTERVALS_TITLE,
  REST_INTERVALS_TOC,
} from "../learn/rest-intervals";

const DASHES = /[\u2014\u2013]/;
const ROOT = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function collapsed(source: string): string {
  return source.replace(/\s+/g, " ");
}

describe("learn rest-intervals article", () => {
  const data = read("src/lib/learn/rest-intervals.ts");
  const route = read("src/routes/learn.rest-intervals.tsx");
  const hub = read("src/routes/learn.index.tsx");
  const companion = read("src/routes/learn.resistance-training.tsx");

  it("exports stable metadata for the hub, sitemap, and JSON-LD", () => {
    expect(REST_INTERVALS_PATH).toBe("/learn/rest-intervals/");
    expect(REST_INTERVALS_DATE_MODIFIED).toBe("2026-08-13");
    expect(REST_INTERVALS_TITLE.length).toBeGreaterThan(20);
    expect(REST_INTERVALS_DESCRIPTION.length).toBeGreaterThan(80);
    expect(REST_INTERVALS_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(REST_INTERVALS_TOC.length).toBe(7);
    expect(REST_INTERVALS_FAQ.length).toBe(6);
    expect(REST_INTERVALS_REFERENCES.length).toBeGreaterThanOrEqual(15);
  });

  it("restores key clinical numbers and practical defaults", () => {
    const routeText = collapsed(route);
    expect(routeText).toContain("0.13");
    expect(routeText).toContain("0.17");
    expect(routeText).toContain("9.8");
    expect(routeText).toContain("16.1");
    expect(routeText).toContain("90 seconds");
    expect(routeText).toContain("2 minutes between sets");
    expect(routeText).toContain("137 systematic reviews");
    expect(routeText).toContain("one-third or one-ninth");
    expect(routeText).toContain("Rest interval was not manipulated");
    expect(routeText).toContain("Most defensible conditional conclusion");
    expect(route).toContain('id="programming"');
    expect(combinedHasNoFakeConfidence(route)).toBe(true);
  });

  it("keeps visible FAQ copy in the shared array used by faqPageJsonLd", () => {
    expect(route).toContain("faqPageJsonLd(REST_INTERVALS_FAQ)");
    expect(route).toContain("{REST_INTERVALS_FAQ.map");
    for (const item of REST_INTERVALS_FAQ) {
      expect(item.q.trim().length).toBeGreaterThan(10);
      expect(item.a.trim().length).toBeGreaterThan(40);
    }
  });

  it("cites primary sources over placeholder research-tool tokens", () => {
    for (const ref of REST_INTERVALS_REFERENCES) {
      expect(ref.href.startsWith("https://")).toBe(true);
      expect(ref.label).not.toMatch(/turn\d+/i);
    }
    expect(data).not.toMatch(/turn\d+view|turn\d+search/);
    expect(route).not.toMatch(/turn\d+view|turn\d+search/);
    expect(data).not.toMatch(/turn\d+/);
    expect(route).not.toMatch(/turn\d+/);
  });

  it("lists the article on the Learn hub", () => {
    expect(hub).toContain("REST_INTERVALS_PATH");
    expect(hub).toContain("REST_INTERVALS_TITLE");
  });

  it("cross-links with the resistance-training companion article", () => {
    expect(route).toContain("RESISTANCE_TRAINING_PATH");
    expect(companion).toContain("REST_INTERVALS_PATH");
  });

  it("sends the page CTA through the switchboard", () => {
    expect(CTA_IDS.learn_rest_intervals).toBe("learn_rest_intervals");
    expect(route).toContain("CTA_IDS.learn_rest_intervals");
    expect(route).toContain("resolveCta(");
    expect(route).toContain("onClick={cta.onClick}");
    expect(route).toContain(
      "Completing intake does not guarantee a prescription",
    );
  });
});

function combinedHasNoFakeConfidence(source: string): boolean {
  return !/91%\s*confidence/i.test(source);
}

describe("learn rest-intervals LegitScript and medical-copy guardrails", () => {
  const data = read("src/lib/learn/rest-intervals.ts");
  const route = read("src/routes/learn.rest-intervals.tsx");
  const copySurfaces = [data, route];
  const combined = copySurfaces.join("\n");
  const routeText = collapsed(route);

  it("does not use em or en dashes in article copy", () => {
    for (const source of copySurfaces) {
      expect(source).not.toMatch(DASHES);
    }
  });

  it("spells out training, agency, and statistics abbreviations in reader-facing copy", () => {
    const readerCopy = [
      REST_INTERVALS_TITLE,
      REST_INTERVALS_DESCRIPTION,
      ...REST_INTERVALS_TOC.map((item) => item.title),
      ...REST_INTERVALS_FAQ.flatMap((item) => [item.q, item.a]),
      route
        .replace(/https:\/\/[^\s"']+/g, "")
        .replace(/className="[^"]*"/g, ""),
    ].join("\n");
    expect(readerCopy).not.toMatch(
      /\b(ACSM|NSCA|RIR|RPE|1RM|SMD|ES|CSA|QCSA|MPS|CK|RCT|PRISMA|PMC|MEDLINE|MRI|GLP-1|NIH|FDA)\b/,
    );
    expect(readerCopy).not.toMatch(/\bRT\b/);
    expect(readerCopy).not.toMatch(/\bvs\.?\b/i);
    expect(readerCopy).not.toMatch(/\be\.g\./i);
    expect(readerCopy).not.toMatch(/\bi\.e\./i);
    expect(readerCopy).not.toMatch(
      /\bg\/kg(?:\/day)?\b|\bmg\/(?:kg|day)\b|\bg\/day\b/,
    );
    expect(readerCopy).not.toMatch(/\b\d+\s*s\b/);
    expect(readerCopy).not.toMatch(/\b\d+\s*min\b/);
    expect(readerCopy).not.toMatch(/\bd\/wk\b|\bwk\b/);
  });

  it("frames the page as education, not a prescription or Beema supplement shop", () => {
    expect(route).toContain("Educational disclaimer");
    expect(routeText).toContain("not medical advice");
    expect(routeText).toContain("does not sell dietary supplements");
    expect(combined).toMatch(/Beema Health does not sell/i);
    expect(combined).not.toMatch(/buy creatine|shop supplements|our creatine/i);
    expect(routeText).toContain(
      "does not sell dietary supplements or training",
    );
  });

  it("does not claim compounded products are proven, generic, or the same as branded drugs", () => {
    expect(combined).not.toMatch(/clinically proven/i);
    expect(combined).not.toMatch(/same active ingredient/i);
    expect(combined).not.toMatch(
      /generic version|the same as|identical to|interchangeable with/i,
    );
    expect(combined).not.toMatch(
      /Beema (?:sells|offers|provides).*(Wegovy|Zepbound|Ozempic|Mounjaro)/i,
    );
  });

  it("walls branded glucagon-like peptide-1 trial findings off from compounded products", () => {
    const glpFaq = REST_INTERVALS_FAQ.find((item) =>
      item.q.toLowerCase().includes("glucagon-like peptide-1"),
    );
    expect(glpFaq).toBeDefined();
    expect(glpFaq?.a).toMatch(/do not apply to compounded products/i);
    expect(glpFaq?.a).toMatch(
      /not a claim that any medication preserves muscle/i,
    );
    expect(routeText).toMatch(/apply to\s*compounded products/);
  });

  it("does not promise training outcomes or use fake-precision confidence scores", () => {
    expect(combined).not.toMatch(
      /guarantee(?:s|d)? (?:muscle|hypertrophy|fat loss|results)/i,
    );
    expect(routeText).toContain("a guarantee of muscle gain, strength, or");
    expect(combined).not.toMatch(/91%\s*confidence/i);
    expect(combined).not.toMatch(/I would choose|My evidence-weighted/i);
  });
});
