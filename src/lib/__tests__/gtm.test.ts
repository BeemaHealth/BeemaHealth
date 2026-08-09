import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_HEAD_SCRIPT,
  GOOGLE_ADS_ID,
  GTM_CONTAINER_ID,
  GTM_HEAD_SCRIPT,
  GTM_PRODUCTION_HOSTNAME,
  isBaskIntakeUrl,
  isGtmProductionHost,
  trackIntakeHandoff,
} from "@/lib/gtm";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";

describe("gtm", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the public container ID as a plain constant", () => {
    expect(GTM_CONTAINER_ID).toBe("GTM-MHHJ44GF");
  });

  it("exposes the Google Ads account tag as a plain constant", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-18301765593");
  });

  it("gates the head snippet to the production hostname only", () => {
    expect(GTM_HEAD_SCRIPT).toContain(
      `window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}'`,
    );
    expect(GTM_HEAD_SCRIPT).toContain(GTM_CONTAINER_ID);
    // Google's standard IIFE body (unmodified) must still be present.
    expect(GTM_HEAD_SCRIPT).toContain("gtm.start");
    expect(GTM_HEAD_SCRIPT).toContain(
      "https://www.googletagmanager.com/gtm.js?id=",
    );
  });

  it("gates the Google Ads gtag install to production and configs the AW id", () => {
    expect(GOOGLE_ADS_HEAD_SCRIPT).toContain(
      `window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}'`,
    );
    expect(GOOGLE_ADS_HEAD_SCRIPT).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`,
    );
    expect(GOOGLE_ADS_HEAD_SCRIPT).toContain(
      `gtag('config', '${GOOGLE_ADS_ID}')`,
    );
  });

  it("recognizes production vs non-production hosts", () => {
    expect(isGtmProductionHost("beemahealth.com")).toBe(true);
    expect(isGtmProductionHost("localhost")).toBe(false);
    expect(isGtmProductionHost("mattaertker.github.io")).toBe(false);
    expect(isGtmProductionHost("www.beemahealth.com")).toBe(false);
  });

  it("detects Bask intake URLs only", () => {
    expect(
      isBaskIntakeUrl(
        "https://q.beemahealth.com/start-online-visit/weightloss",
      ),
    ).toBe(true);
    expect(isBaskIntakeUrl("https://hive.beemahealth.com")).toBe(false);
    expect(isBaskIntakeUrl("/waitlist/")).toBe(false);
  });

  it("pushes intake_handoff with only event + cta_location", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    trackIntakeHandoff("home_hero");

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual({
      event: "intake_handoff",
      cta_location: "home_hero",
    });
    expect(JSON.stringify(dataLayer[0])).not.toMatch(/@|email|phone|name/i);
  });

  it("resolveCta onClick fires handoff for Bask destinations", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/" },
    });

    const cta = resolveCta(CTA_IDS.home_hero);
    expect(cta.to.startsWith("https://q.beemahealth.com/")).toBe(true);
    expect(new URL(cta.to).searchParams.get("cta_id")).toBe("home_hero");
    cta.onClick();

    expect(dataLayer[0]).toEqual({
      event: "intake_handoff",
      cta_location: "home_hero",
    });
  });

  it.each([
    [CTA_IDS.recipes_hub, "recipes_hub"],
    [CTA_IDS.recipe_detail, "recipe_detail"],
  ] as const)(
    "keeps recipe CTA attribution generic for %s",
    (ctaId, expectedLocation) => {
      const dataLayer: unknown[] = [];
      vi.stubGlobal("window", {
        dataLayer,
        location: { search: "", pathname: "/recipes/" },
      });

      const cta = resolveCta(ctaId);
      const target = new URL(cta.to);
      expect(target.hostname).toBe("q.beemahealth.com");
      expect(target.searchParams.get("cta_id")).toBe(expectedLocation);

      cta.onClick();

      expect(dataLayer).toEqual([
        {
          event: "intake_handoff",
          cta_location: expectedLocation,
        },
      ]);
      expect(JSON.stringify(dataLayer)).not.toMatch(
        /servings|multiplier|category|symptom|nutrition|protein|fiber/i,
      );
    },
  );
});
