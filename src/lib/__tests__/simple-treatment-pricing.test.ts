import { describe, expect, it } from "vitest";
import {
  ED_COMBO_PRICING,
  ED_SILDENAFIL_DOSE_PLANS,
  ED_SILDENAFIL_PER_PILL_USD,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_DOSE_PLANS,
  ED_TADALAFIL_PER_PILL_USD,
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

const roundTo2 = (n: number) => Math.round(n * 100) / 100;

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

  it("prices tadalafil and sildenafil from Matt's ED pricing sheet (2026-10-27)", () => {
    // Lowest-dose ("starting at") 1-month and 3-month prices.
    expect(ED_TADALAFIL_PRICING.monthlyUsd).toBe(89);
    expect(ED_TADALAFIL_PRICING.quarterly?.totalUsd).toBe(149);
    expect(ED_SILDENAFIL_PRICING.monthlyUsd).toBe(89);
    expect(ED_SILDENAFIL_PRICING.quarterly?.totalUsd).toBe(129);
    // Tadalafil is sold in three doses; sildenafil's 50mg and 100mg are one price.
    expect(
      ED_TADALAFIL_PRICING.doses?.map((d) => [
        d.dose,
        d.monthly.usd,
        d.quarterly.usd,
      ]),
    ).toEqual([
      ["5mg", 89, 149],
      ["10mg", 99, 159],
      ["20mg", 149, 249],
    ]);
    expect(ED_SILDENAFIL_PRICING.doses).toBeUndefined();
    expect(ED_SILDENAFIL_PRICING).not.toEqual(ED_TADALAFIL_PRICING);
  });

  it("keeps the per-pill teasers consistent with the 3-month plans", () => {
    const tad = ED_TADALAFIL_DOSE_PLANS[0].quarterly;
    const sil = ED_SILDENAFIL_DOSE_PLANS[0].quarterly;
    expect(ED_TADALAFIL_PER_PILL_USD).toBe(roundTo2(tad.usd / tad.tablets));
    expect(ED_SILDENAFIL_PER_PILL_USD).toBe(roundTo2(sil.usd / sil.tablets));
    expect(ED_TADALAFIL_PER_PILL_USD).toBe(1.66);
    expect(ED_SILDENAFIL_PER_PILL_USD).toBe(2.69);
  });

  it("states every tadalafil dose in its pricing sentence, including 10mg", () => {
    const sentence = simplePricingSentence("Tadalafil", ED_TADALAFIL_PRICING);
    expect(sentence).toContain(
      "$89/month at 5mg, $99/month at 10mg, and $149/month at 20mg",
    );
    expect(sentence).toContain(
      "$149 for 5mg, $159 for 10mg, and $249 for 20mg",
    );
    expect(
      simplePricingSentence("Sildenafil", ED_SILDENAFIL_PRICING),
    ).toContain("Sildenafil is $89/month. A quarterly plan is $129 total");
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
    expect(formatSimpleStartingAt(ED_TADALAFIL_PRICING)).toBe("$89/mo");
    expect(formatSimpleStartingAt(ED_SILDENAFIL_PRICING)).toBe("$89/mo");
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
