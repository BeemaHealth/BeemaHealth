import { describe, expect, it } from "vitest";
import {
  ED_COMBO_PRICING,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PRICING,
  HAIRLOSS_FINASTERIDE_PRICING,
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  HAIRLOSS_TOPICAL_MEN_PRICING,
  HAIRLOSS_TOPICAL_WOMEN_PRICING,
  HAIRLOSS_WOMENS_COMPOUND_PRICING,
  NAD_PRICING,
  SERMORELIN_PRICING,
  TRT_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
  simplePricingSentence,
} from "../simple-treatment-pricing";

const ALL_PRICINGS = [
  ["TRT (paused)", TRT_PRICING],
  ["Hairloss oral minoxidil", HAIRLOSS_ORAL_MINOXIDIL_PRICING],
  ["Hairloss finasteride", HAIRLOSS_FINASTERIDE_PRICING],
  ["Hairloss women's compound", HAIRLOSS_WOMENS_COMPOUND_PRICING],
  ["Hairloss topical (men)", HAIRLOSS_TOPICAL_MEN_PRICING],
  ["Hairloss topical (women)", HAIRLOSS_TOPICAL_WOMEN_PRICING],
  ["ED tadalafil", ED_TADALAFIL_PRICING],
  ["ED sildenafil", ED_SILDENAFIL_PRICING],
  ["ED combo", ED_COMBO_PRICING],
  ["NAD+", NAD_PRICING],
  ["Sermorelin", SERMORELIN_PRICING],
] as const;

describe("simple-treatment-pricing", () => {
  it("has a positive monthly rate for every product", () => {
    for (const [label, pricing] of ALL_PRICINGS) {
      expect(pricing.monthlyUsd, label).toBeGreaterThan(0);
    }
  });

  it("computes quarterly monthlyEquivalentUsd and savingsUsd correctly", () => {
    for (const [label, pricing] of ALL_PRICINGS) {
      if (!pricing.quarterly) continue;
      const q = pricing.quarterly;
      expect(q.monthlyEquivalentUsd, label).toBeCloseTo(q.totalUsd / 3, 2);
      expect(q.savingsUsd, label).toBeCloseTo(
        pricing.monthlyUsd * 3 - q.totalUsd,
        2,
      );
      // Quarterly should always beat paying monthly for 3 months - that's
      // the entire incentive to prepay.
      expect(q.savingsUsd, label).toBeGreaterThan(0);
    }
  });

  it("TRT and single-SKU products have no quarterly plan - not in the cost sheet", () => {
    expect(TRT_PRICING.quarterly).toBeUndefined();
    expect(HAIRLOSS_FINASTERIDE_PRICING.quarterly).toBeUndefined();
    expect(HAIRLOSS_WOMENS_COMPOUND_PRICING.quarterly).toBeUndefined();
    expect(HAIRLOSS_ORAL_MINOXIDIL_PRICING.quarterly).toBeUndefined();
  });

  it("prices tadalafil and sildenafil independently", () => {
    // Repriced 2026-09-03 (per Matt): $49.67/mo and $43/mo respectively - no
    // longer sharing a single landed-cost-derived price.
    expect(ED_TADALAFIL_PRICING.monthlyUsd).toBe(49.67);
    expect(ED_SILDENAFIL_PRICING.monthlyUsd).toBe(43);
    expect(ED_SILDENAFIL_PRICING).not.toEqual(ED_TADALAFIL_PRICING);
  });

  it("formatSimpleStartingAt renders the current monthly rates", () => {
    expect(formatSimpleStartingAt(TRT_PRICING)).toBe("$169/mo");
    expect(formatSimpleStartingAt(NAD_PRICING)).toBe("$199/mo");
    expect(formatSimpleStartingAt(SERMORELIN_PRICING)).toBe("$249/mo");
    expect(formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)).toBe(
      "$29.67/mo",
    );
    expect(formatSimpleStartingAt(HAIRLOSS_ORAL_MINOXIDIL_PRICING)).toBe(
      "$29.67/mo",
    );
    expect(formatSimpleStartingAt(ED_TADALAFIL_PRICING)).toBe("$49.67/mo");
    expect(formatSimpleStartingAt(ED_SILDENAFIL_PRICING)).toBe("$43/mo");
  });

  it("simplePerDaySentence only fires when the monthly rate clears $1/day", () => {
    expect(simplePerDaySentence(HAIRLOSS_FINASTERIDE_PRICING)).toBe(
      "Less than $1 a day.",
    );
    expect(simplePerDaySentence(HAIRLOSS_ORAL_MINOXIDIL_PRICING)).toBe(
      "Less than $1 a day.",
    );
    expect(simplePerDaySentence(ED_TADALAFIL_PRICING)).toBeUndefined();
    expect(simplePerDaySentence(ED_SILDENAFIL_PRICING)).toBeUndefined();
    expect(simplePerDaySentence(TRT_PRICING)).toBeUndefined();
  });

  it("simplePricingSentence never mentions a promo code or starter pack", () => {
    for (const [label, pricing] of ALL_PRICINGS) {
      const sentence = simplePricingSentence(label, pricing);
      expect(sentence, label).not.toMatch(/promo code/i);
      expect(sentence, label).not.toMatch(/starter pack/i);
    }
  });

  it("simplePricingSentence never says billed monthly - that cadence isn't confirmed", () => {
    for (const [label, pricing] of ALL_PRICINGS) {
      const sentence = simplePricingSentence(label, pricing);
      expect(sentence, label).not.toContain("billed monthly");
    }
  });

  it("simplePricingSentence mentions the quarterly plan only when one exists", () => {
    expect(simplePricingSentence("TRT", TRT_PRICING)).not.toMatch(/quarterly/i);
    expect(
      simplePricingSentence("Hairloss", HAIRLOSS_ORAL_MINOXIDIL_PRICING),
    ).not.toMatch(/quarterly/i);
    expect(simplePricingSentence("ED tadalafil", ED_TADALAFIL_PRICING)).toMatch(
      /quarterly/i,
    );
  });
});
