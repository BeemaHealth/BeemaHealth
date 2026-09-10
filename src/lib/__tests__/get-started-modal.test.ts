import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET_STARTED_CATEGORIES,
  autoAdvanceCtaId,
} from "@/components/site/GetStartedModal";
import { MINT_OPTIONS } from "@/components/site/EdMintsPicker";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { clearPendingUtms, storePendingUtms } from "@/lib/utm";

/**
 * GetStartedModal itself is a React component (no jsdom/RTL in this repo's
 * Vitest setup - environment: "node" in vitest.config.ts) - these tests
 * cover its data config and CTA wiring instead, the same level every other
 * CTA/UTM test in this suite operates at (cta-bask-handoff.test.ts,
 * utm-attribution.test.ts).
 */
describe("GetStartedModal category/product config", () => {
  it("gates Hair on sex instead of auto-advancing, with 5 live products split across sexes", () => {
    const hair = GET_STARTED_CATEGORIES.find((c) => c.id === "hair")!;
    expect(hair.products).toHaveLength(5);
    expect(hair.sexGate).toBe(true);
    // sexGate takes precedence over directCtaId/single-product auto-advance
    // - Hair needs its own Male/Female step, never a direct resolve from
    // step 1.
    expect(autoAdvanceCtaId(hair)).toBeNull();
  });

  it("every Hair product carries a sex tag, so no product shows to both sexes untagged", () => {
    const hair = GET_STARTED_CATEGORIES.find((c) => c.id === "hair")!;
    for (const product of hair.products) {
      expect(product.sex, product.label).toBeDefined();
    }
  });

  it("filters Hair's products to the selected sex - Oral Minoxidil gets its own male- and female-tagged entry, not one shared entry", () => {
    const hair = GET_STARTED_CATEGORIES.find((c) => c.id === "hair")!;
    const forSex = (sex: "male" | "female") =>
      hair.products.filter((p) => p.sex === sex);

    const male = forSex("male");
    expect(male.map((p) => p.label)).toEqual([
      "Oral Finasteride",
      "Oral Minoxidil",
      "Hair Loss Spray",
    ]);

    const female = forSex("female");
    expect(female.map((p) => p.label)).toEqual([
      "Oral Minoxidil",
      "Hair Loss Spray",
    ]);

    // Each same-labeled pair must resolve to a different product/page.
    const maleMinoxidil = male.find(
      (p) => p.label === "Oral Minoxidil" && p.kind === "cta",
    );
    const femaleMinoxidil = female.find(
      (p) => p.label === "Oral Minoxidil" && p.kind === "cta",
    );
    expect(maleMinoxidil?.kind === "cta" && maleMinoxidil.ctaId).toBe(
      CTA_IDS.oral_minoxidil_men_hero,
    );
    expect(femaleMinoxidil?.kind === "cta" && femaleMinoxidil.ctaId).toBe(
      CTA_IDS.oral_minoxidil_women_hero,
    );

    const maleSpray = male.find(
      (p) => p.label === "Hair Loss Spray" && p.kind === "cta",
    );
    const femaleSpray = female.find(
      (p) => p.label === "Hair Loss Spray" && p.kind === "cta",
    );
    expect(maleSpray?.kind === "cta" && maleSpray.ctaId).toBe(
      CTA_IDS.hairloss_spray_men_hero,
    );
    expect(femaleSpray?.kind === "cta" && femaleSpray.ctaId).toBe(
      CTA_IDS.hairloss_spray_women_hero,
    );
  });

  it("resolves every Hair product to a real Bask questionnaire URL", () => {
    const hair = GET_STARTED_CATEGORIES.find((c) => c.id === "hair")!;
    for (const product of hair.products) {
      if (product.kind !== "cta") continue;
      const cta = resolveCta(product.ctaId);
      expect(cta.to, product.label).toMatch(/^https:\/\/q\.beemahealth\.com\//);
    }
  });

  it("auto-advances Weight Loss via directCtaId even though it lists 2 products", () => {
    const weightLoss = GET_STARTED_CATEGORIES.find(
      (c) => c.id === "weight-loss",
    )!;
    expect(weightLoss.products.length).toBeGreaterThan(1);
    expect(weightLoss.directCtaId).toBe(CTA_IDS.weight_loss_hero);
    expect(autoAdvanceCtaId(weightLoss)).toBe(CTA_IDS.weight_loss_hero);
  });

  it("shows step 2 for Sexual Health (multiple products, no shared destination)", () => {
    const sexualHealth = GET_STARTED_CATEGORIES.find(
      (c) => c.id === "sexual-health",
    )!;
    expect(sexualHealth.products.length).toBeGreaterThan(1);
    expect(sexualHealth.directCtaId).toBeUndefined();
    expect(autoAdvanceCtaId(sexualHealth)).toBeNull();
  });

  it("routes Sexual Health's ED Mints entry through the shared picker, not a direct CtaId", () => {
    const sexualHealth = GET_STARTED_CATEGORIES.find(
      (c) => c.id === "sexual-health",
    )!;
    const edMints = sexualHealth.products.find((p) => p.kind === "ed-mints");
    expect(edMints).toBeDefined();
    // Both MINT_OPTIONS entries (rdt/odt) resolve to their own real Bask URL -
    // guards that the reused EdMintsPickerModal still has somewhere to send
    // this branch once selected.
    for (const option of MINT_OPTIONS) {
      const cta = resolveCta(option.ctaId);
      expect(cta.to).toMatch(/^https:\/\/q\.beemahealth\.com\//);
    }
  });

  it("resolves every direct-CTA product, and every category's directCtaId, to a real Bask questionnaire URL", () => {
    for (const category of GET_STARTED_CATEGORIES) {
      if (category.directCtaId) {
        const cta = resolveCta(category.directCtaId);
        expect(cta.to, `${category.id} -> directCtaId`).toMatch(
          /^https:\/\/q\.beemahealth\.com\//,
        );
      }
      for (const product of category.products) {
        if (product.kind !== "cta") continue;
        const cta = resolveCta(product.ctaId);
        expect(cta.to, `${category.id} -> ${product.label}`).toMatch(
          /^https:\/\/q\.beemahealth\.com\//,
        );
      }
    }
  });
});

describe("GetStartedModal UTM passthrough", () => {
  beforeEach(() => clearPendingUtms());
  afterEach(() => {
    clearPendingUtms();
    vi.unstubAllGlobals();
  });

  it("carries session-captured UTMs onto every product's (and every directCtaId's) resolved Bask URL", () => {
    storePendingUtms({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "hair_launch",
    });

    const assertUtms = (to: string) => {
      const url = new URL(to);
      expect(url.searchParams.get("utm_source")).toBe("google");
      expect(url.searchParams.get("utm_medium")).toBe("cpc");
      expect(url.searchParams.get("utm_campaign")).toBe("hair_launch");
    };

    for (const category of GET_STARTED_CATEGORIES) {
      if (category.directCtaId) {
        assertUtms(resolveCta(category.directCtaId).to);
      }
      for (const product of category.products) {
        if (product.kind !== "cta") continue;
        assertUtms(resolveCta(product.ctaId).to);
      }
    }
  });
});
