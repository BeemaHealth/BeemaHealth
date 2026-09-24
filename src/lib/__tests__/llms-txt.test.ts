import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listAllArticles } from "@/content/learn/registry";
import { learnPath } from "@/content/learn/types";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  PROMO_CODE_DISCOUNT_USD,
} from "@/lib/medication-pricing";
import { listKnownSimpleTreatmentPricingUsdAmounts } from "@/lib/simple-treatment-pricing";

/**
 * llms.txt is what answer engines are pointed at as Beema Health's fact sheet, so a
 * stale number here is quoted back to people as current. An audit found it
 * still advertising a tirzepatide price the site had stopped charging, with
 * nothing in the build to catch the drift. These tests bind the file to the
 * pricing module and the sitemap.
 */
const ROOT = resolve(__dirname, "../../..");
const llms = readFileSync(resolve(ROOT, "public/llms.txt"), "utf-8");
const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");

describe("llms.txt", () => {
  it("quotes the live 1-month rates from the pricing module", () => {
    expect(llms).toContain(
      `$${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd} per month`,
    );
    expect(llms).toContain(
      `$${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd} per month`,
    );
  });

  it("describes the tirzepatide starter pack that the site actually sells", () => {
    const pack = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack;
    expect(llms).toContain(`$${pack.totalUsd} total`);
    expect(llms).toContain(`$${pack.monthlyEquivalentUsd} per month`);
  });

  it("states the promo discount and that it excludes 1-month purchases", () => {
    expect(llms).toContain(`$${PROMO_CODE_DISCOUNT_USD} promo code`);
    expect(llms.toLowerCase()).toContain("never to a 1-month purchase");
  });

  it("carries no price the pricing module does not know about", () => {
    const known = new Set<string>();
    for (const p of [
      COMPOUNDED_SEMAGLUTIDE_PRICING,
      COMPOUNDED_TIRZEPATIDE_PRICING,
    ]) {
      known.add(String(p.monthlyUsd));
      p.plans.forEach((plan) => {
        known.add(String(plan.monthlyUsd));
        known.add(String(plan.totalUsd));
        known.add(String(plan.savingsUsd));
      });
      if ("starterPack" in p) {
        known.add(String(p.starterPack.totalUsd));
        known.add(String(p.starterPack.monthlyEquivalentUsd));
      }
    }
    known.add(String(PROMO_CODE_DISCOUNT_USD));
    for (const n of listKnownSimpleTreatmentPricingUsdAmounts()) {
      known.add(String(n));
    }
    const quoted = [...llms.matchAll(/\$([\d,]+(?:\.\d+)?)/g)].map((m) =>
      m[1]!.replace(/,/g, ""),
    );
    const unknown = [...new Set(quoted)].filter((n) => !known.has(n));
    expect(
      unknown,
      "llms.txt quotes a dollar figure the pricing module does not define",
    ).toEqual([]);
  });

  it("never contradicts the compounded-medication disclaimer", () => {
    expect(llms).toMatch(/not FDA-approved/i);
    expect(llms).toMatch(/does not guarantee a prescription|never guaranteed/i);
  });

  it("only links to URLs that are in the sitemap", () => {
    const linked = [
      ...new Set(
        [...llms.matchAll(/https:\/\/beemahealth\.com(\/[^\s)]*)/g)].map((m) =>
          // trailing sentence punctuation is not part of the URL
          m[1]!.replace(/[.,;]+$/, ""),
        ),
      ),
    ].filter((p) => !p.startsWith("/sitemap.xml"));
    const missing = linked.filter(
      (p) => !sitemap.includes(`<loc>https://beemahealth.com${p}</loc>`),
    );
    expect(missing, "llms.txt links a page that is not in the sitemap").toEqual(
      [],
    );
  });

  it("indexes the pages that answer the paid-search queries", () => {
    for (const path of [
      "/semaglutide/",
      "/tirzepatide/",
      "/glp-1/",
      "/glp-1-houston/",
      "/learn/weight-loss/semaglutide-weight-loss/",
      "/learn/weight-loss/semaglutide-in-texas/",
      "/learn/weight-loss/tirzepatide-online/",
      "/learn/weight-loss/glp-1-doctor/",
      "/learn/weight-loss/online-glp-1/",
      "/learn/weight-loss/best-glp-1-for-weight-loss/",
      "/learn/weight-loss/glp-1-weight-loss-program/",
      "/learn/weight-loss/glp-1-in-houston/",
      "/learn/weight-loss/glp-1-in-texas/",
      "/learn/weight-loss/tirzepatide-in-houston/",
      "/learn/weight-loss/glp-1-near-me/",
    ]) {
      expect(llms, `llms.txt omits ${path}`).toContain(
        `https://beemahealth.com${path}`,
      );
    }
  });

  it("lists every published learn article URL", () => {
    const missing = listAllArticles()
      .map((article) => learnPath(article.vertical, article.slug))
      .filter((path) => !llms.includes(`https://beemahealth.com${path}`));
    expect(missing).toEqual([]);
  });

  it("states the service area without explicitly flagging paused-but-returning verticals as unpurchasable", () => {
    // TRT, NAD+, and sermorelin are paused 2026-08-28 (not selling them for
    // now, expected to return) - llms.txt deliberately does not say so
    // explicitly (2026-09-04, per Matt): an AI-crawled "not purchasable
    // today" claim would still be citable after these lines relaunch.
    // Omission (silently not listing them as live) is the guard, not a
    // negative claim. HRT is different - docs/features/treatment-pages.md
    // says it's permanently not a Beema Health program, so its "not offered" line
    // in /learn/hrt/ stays untouched; this test only covers llms.txt.
    expect(llms).toMatch(/all 50 US states/i);
    expect(llms).toMatch(/United States only/i);
    expect(llms).toMatch(/not an international service/i);
    expect(llms).toMatch(/clinically appropriate/i);
    expect(llms).not.toMatch(/clinically indicated/i);
    expect(llms).not.toMatch(/not purchasable/i);
    expect(llms).not.toMatch(/does not offer TRT/i);
  });

  it("uses no em or en dashes", () => {
    expect(llms).not.toMatch(/[\u2014\u2013]/);
  });
});
