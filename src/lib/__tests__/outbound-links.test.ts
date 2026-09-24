import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  citationRel,
  isFollowableSource,
  NOFOLLOW_COMMERCIAL_HOSTS,
} from "@/lib/outbound-links";

const ROOT = resolve(__dirname, "../../..");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith(".ts") || e.name.endsWith(".tsx") ? [full] : [];
  });
}

describe("outbound link policy", () => {
  it("keeps primary regulatory and peer-reviewed sources followable", () => {
    for (const href of [
      "https://doi.org/10.1056/NEJMoa2032183",
      "https://www.fda.gov/drugs/drug-alerts-and-statements/x",
      "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc",
      "https://www.niddk.nih.gov/health-information/kidney-disease",
    ]) {
      expect(citationRel(href), href).toBe("noopener noreferrer");
    }
  });

  it("nofollows direct-to-consumer sellers and other commercial hosts", () => {
    for (const href of [
      "https://www.novocare.com/patient/medicines/wegovy.html",
      "https://www.lilly.com/lillydirect/zepbound",
      "https://pi.lilly.com/us/zepbound-uspi.pdf",
      "https://www.novo-pi.com/wegovy.pdf",
      "https://www.goodrx.com/well-being/movement-exercise/average-gym-membership-cost",
      "https://www.consumeraffairs.com/health/how-much-does-a-dietitian-cost.html",
      "https://investor.lilly.com/news-releases/news-release-details/x",
    ]) {
      expect(citationRel(href), href).toContain("nofollow");
    }
  });

  it("never nofollows a Beema Health self-link", () => {
    expect(citationRel("https://beemahealth.com/semaglutide/")).toBe(
      "noopener noreferrer",
    );
    expect(isFollowableSource("https://www.beemahealth.com/tirzepatide/")).toBe(
      true,
    );
  });

  it("nofollows anything unrecognized rather than leaking signal by default", () => {
    expect(
      citationRel("https://some-competitor-telehealth.example/glp1"),
    ).toContain("nofollow");
    expect(citationRel("not a url")).toContain("nofollow");
  });

  it("cites no known telehealth competitor anywhere in the codebase", () => {
    // Direct-to-consumer GLP-1 and general telehealth brands. Citing one hands
    // a competitor a link on the exact queries Beema Health is trying to rank for.
    const COMPETITORS = [
      "hims.com",
      "forhims.com",
      "hers.com",
      "ro.co",
      "getroman.com",
      "noom.com",
      "calibrate.health",
      "joinfound.com",
      "found.com",
      "lifemd.com",
      "sesamecare.com",
      "plushcare.com",
      "teladoc.com",
      "weightwatchers.com",
      "ww.com",
      "everlywell.com",
      "thirtymadison.com",
      "henrymeds.com",
      "joinmochi.com",
      "formhealth.co",
      "zealthy.com",
      "eden.care",
      "ivim.health",
      "henryford.com/glp",
      "sequence.com",
    ];
    const files = [
      ...walk(resolve(ROOT, "src/content")),
      ...walk(resolve(ROOT, "src/lib")),
      ...walk(resolve(ROOT, "src/components")),
      ...walk(resolve(ROOT, "src/routes")),
    ];
    const hits: string[] = [];
    for (const f of files) {
      if (f.endsWith("outbound-links.test.ts")) continue;
      const src = readFileSync(f, "utf-8");
      for (const c of COMPETITORS) {
        if (src.includes(c)) hits.push(`${f.replace(`${ROOT}/`, "")}: ${c}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("keeps the commercial nofollow list explicit and non-empty", () => {
    expect(NOFOLLOW_COMMERCIAL_HOSTS.length).toBeGreaterThan(5);
    for (const host of NOFOLLOW_COMMERCIAL_HOSTS) {
      expect(citationRel(`https://${host}/x`)).toContain("nofollow");
    }
  });
});
