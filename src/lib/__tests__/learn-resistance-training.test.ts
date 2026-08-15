import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CTA_IDS } from "../cta-ids";
import {
  RESISTANCE_TRAINING_DATE_MODIFIED,
  RESISTANCE_TRAINING_DESCRIPTION,
  RESISTANCE_TRAINING_FAQ,
  RESISTANCE_TRAINING_PATH,
  RESISTANCE_TRAINING_REFERENCES,
  RESISTANCE_TRAINING_TITLE,
  RESISTANCE_TRAINING_TOC,
} from "../learn/resistance-training";

const DASHES = /[\u2014\u2013]/;
const ROOT = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function collapsed(source: string): string {
  return source.replace(/\s+/g, " ");
}

describe("learn resistance-training article", () => {
  const data = read("src/lib/learn/resistance-training.ts");
  const route = read("src/routes/learn.resistance-training.tsx");
  const hub = read("src/routes/learn.index.tsx");

  it("exports stable metadata for the hub, sitemap, and JSON-LD", () => {
    expect(RESISTANCE_TRAINING_PATH).toBe("/learn/resistance-training/");
    expect(RESISTANCE_TRAINING_DATE_MODIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RESISTANCE_TRAINING_TITLE.length).toBeGreaterThan(20);
    expect(RESISTANCE_TRAINING_DESCRIPTION.length).toBeGreaterThan(80);
    expect(RESISTANCE_TRAINING_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(RESISTANCE_TRAINING_TOC.length).toBe(8);
    expect(RESISTANCE_TRAINING_FAQ.length).toBe(6);
    expect(RESISTANCE_TRAINING_REFERENCES.length).toBeGreaterThanOrEqual(15);
  });

  it("restores the original study's key clinical numbers and program templates", () => {
    const routeText = collapsed(route);
    expect(routeText).toContain("137 systematic reviews");
    expect(routeText).toContain("2,058");
    expect(routeText).toContain(
      "1.62 grams per kilogram of body weight per day",
    );
    expect(routeText).toContain("one-third or one-ninth");
    expect(routeText).toContain("50-70%");
    expect(routeText).toContain("fractional");
    expect(routeText).toContain("2-4 minutes");
    expect(routeText).toContain("Hack squat or leg press 3");
    expect(routeText).toContain("Push hypertrophy");
    expect(routeText).toContain("400 milligrams per day");
    expect(routeText).toContain("Quick-reference checklist");
    expect(route).toContain('id="checklist"');
  });

  it("keeps visible FAQ copy in the shared array used by faqPageJsonLd", () => {
    expect(route).toContain("faqPageJsonLd(RESISTANCE_TRAINING_FAQ)");
    expect(route).toContain("{RESISTANCE_TRAINING_FAQ.map");
    for (const item of RESISTANCE_TRAINING_FAQ) {
      expect(item.q.trim().length).toBeGreaterThan(10);
      expect(item.a.trim().length).toBeGreaterThan(40);
    }
  });

  it("cites primary sources over placeholder research-tool tokens", () => {
    for (const ref of RESISTANCE_TRAINING_REFERENCES) {
      expect(ref.href.startsWith("https://")).toBe(true);
      expect(ref.label).not.toMatch(/turn\d+/i);
    }
    expect(data).not.toMatch(/turn\d+view|turn\d+search/);
    expect(route).not.toMatch(/turn\d+view|turn\d+search/);
  });

  it("lists the article on the Learn hub", () => {
    expect(hub).toContain("RESISTANCE_TRAINING_PATH");
    expect(hub).toContain("RESISTANCE_TRAINING_TITLE");
  });

  it("sends the page CTA through the switchboard", () => {
    expect(CTA_IDS.learn_resistance_training).toBe("learn_resistance_training");
    expect(route).toContain("CTA_IDS.learn_resistance_training");
    expect(route).toContain("resolveCta(");
    expect(route).toContain("onClick={cta.onClick}");
    expect(route).toContain(
      "Completing intake does not guarantee a prescription",
    );
  });
});

describe("learn resistance-training LegitScript and medical-copy guardrails", () => {
  const data = read("src/lib/learn/resistance-training.ts");
  const route = read("src/routes/learn.resistance-training.tsx");
  const copySurfaces = [data, route];
  const combined = copySurfaces.join("\n");
  const routeText = collapsed(route);

  it("does not use em or en dashes in article copy", () => {
    for (const source of copySurfaces) {
      expect(source).not.toMatch(DASHES);
    }
  });

  it("spells out training, supplement, and agency abbreviations in reader-facing copy", () => {
    const readerCopy = [
      RESISTANCE_TRAINING_TITLE,
      RESISTANCE_TRAINING_DESCRIPTION,
      ...RESISTANCE_TRAINING_TOC.map((item) => item.title),
      ...RESISTANCE_TRAINING_FAQ.flatMap((item) => [item.q, item.a]),
      route.replace(/https:\/\/[^\s"']+/g, ""),
    ].join("\n");
    expect(readerCopy).not.toMatch(
      /\b(ACSM|RIR|RPE|1RM|NIH|FDA|HMB|EAAs?|BCAAs?|ATP|GLP-1)\b/,
    );
    expect(readerCopy).not.toMatch(
      /\bg\/kg(?:\/day)?\b|\bmg\/(?:kg|day)\b|\bg\/day\b/,
    );
  });

  it("frames the page as education, not a prescription or Beema supplement shop", () => {
    expect(route).toContain("Educational disclaimer");
    expect(routeText).toContain("not medical advice");
    expect(routeText).toContain("does not sell dietary supplements");
    expect(combined).toMatch(/Beema Health does not sell/i);
    expect(combined).not.toMatch(/buy creatine|shop supplements|our creatine/i);
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
    const glpFaq = RESISTANCE_TRAINING_FAQ.find((item) =>
      item.q.toLowerCase().includes("glucagon-like peptide-1"),
    );
    expect(glpFaq).toBeDefined();
    expect(glpFaq?.a).toMatch(/do not apply to compounded products/i);
    expect(glpFaq?.a).toMatch(
      /not a claim that any medication preserves muscle/i,
    );
    expect(routeText).toMatch(/apply to\s*compounded products/);
  });

  it("does not promise training or supplement outcomes", () => {
    expect(combined).not.toMatch(
      /guarantee(?:s|d)? (?:muscle|hypertrophy|fat loss|results)/i,
    );
    expect(routeText).toContain("a guarantee of muscle gain or fat loss");
  });

  it("keeps supplement safety caveats for medical conditions", () => {
    expect(combined).toMatch(/kidney disease/i);
    expect(combined).toMatch(/licensed clinician/i);
    expect(combined).toMatch(
      /not individually approved by the United States Food and Drug Administration/i,
    );
  });
});
