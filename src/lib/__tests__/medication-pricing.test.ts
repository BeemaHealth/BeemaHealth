import { describe, expect, it } from "vitest";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
  dualCompoundedFaqPricingParagraph,
  dualCompoundedHeroPricingLine,
  dualCompoundedPromoShortPricingLine,
  dualCompoundedShortPricingLine,
  formatCompoundedPriceLine,
  formatStartingAtPerMonth,
  hasStarterPack,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  PROMO_CODE_MIN_MONTHS,
} from "@/lib/medication-pricing";

describe("medication-pricing", () => {
  it("has a single flat monthly rate per medication, no baked-in discount", () => {
    expect(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd).toBe(199);
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd).toBe(297);
  });

  it("computes the promo-code first-month price as monthlyUsd minus the discount", () => {
    expect(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(
      COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd - PROMO_CODE_DISCOUNT_USD,
    );
    expect(promoFirstMonthUsd(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd - PROMO_CODE_DISCOUNT_USD,
    );
    expect(PROMO_CODE_DISCOUNT_USD).toBe(100);
    expect(PROMO_CODE_MIN_MONTHS).toBe(3);
  });

  it("formats single-med card lines from shared constants", () => {
    expect(formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(
      "$199/mo, or $99 your first month with promo code sema-off100 ($100 off on a 3-month plan)",
    );
    expect(formatCompoundedPriceLine(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      "3-month starter pack $597 for doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg) ($199/mo); standard / maintenance $297/mo, or $197 your first month with promo code Tirz100 ($100 off on a 3-month plan)",
    );
    expect(formatStartingAtPerMonth(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      "$199/mo",
    );
    expect(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(99);
    expect(promoFirstMonthUsd(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(197);
  });

  it("exposes the checkout promo code on each medication pricing object", () => {
    expect(COMPOUNDED_SEMAGLUTIDE_PRICING.promoCode).toBe("sema-off100");
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.promoCode).toBe("Tirz100");
  });

  it("defines tirzepatide starter pack and standard/maintenance pricing", () => {
    expect(hasStarterPack(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(false);
    expect(hasStarterPack(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(true);
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.starterPack).toEqual({
      totalUsd: 597,
      monthlyEquivalentUsd: 199,
      months: 3,
      dosePathLabel: "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)",
    });
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.starterPack.totalUsd).toBe(
      COMPOUNDED_TIRZEPATIDE_PRICING.starterPack.monthlyEquivalentUsd *
        COMPOUNDED_TIRZEPATIDE_PRICING.starterPack.months,
    );
  });

  it("balances both medications in short and hero dual lines", () => {
    expect(dualCompoundedShortPricingLine()).toBe(
      "Semaglutide $199/mo · Tirzepatide from $199/mo",
    );
    expect(dualCompoundedPromoShortPricingLine()).toBe(
      "Semaglutide $99 then $199/mo · Tirzepatide 3-mo starter $597 or $297/mo",
    );
    expect(dualCompoundedHeroPricingLine()).toBe(
      "Semaglutide $99 first month then $199/mo (code sema-off100), Tirzepatide 3-month starter pack $597 for doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg), or standard / maintenance $297/mo (code Tirz100 for $100 off first month on a 3-month plan)",
    );
    expect(dualCompoundedShortPricingLine()).not.toMatch(/[—–]/);
    expect(dualCompoundedPromoShortPricingLine()).not.toMatch(/[—–]/);
    expect(dualCompoundedHeroPricingLine()).not.toMatch(/[—–]/);
  });

  it("states the flat monthly rate and the 3-month-only promo code per medication", () => {
    const sentence = compoundedMonthlyPricingSentence(
      "Compounded semaglutide",
      COMPOUNDED_SEMAGLUTIDE_PRICING,
    );
    expect(sentence).toBe(
      "Compounded semaglutide is $199/month, billed monthly with no long-term contract. Promo code sema-off100 is a one-time $100 discount that brings your first month to $99 when you purchase a 3-month plan; it can't be combined with a 1-month purchase and can only be used once per patient.",
    );
    expect(sentence).not.toMatch(/[—–]/);

    const tirzSentence = compoundedMonthlyPricingSentence(
      "Compounded tirzepatide",
      COMPOUNDED_TIRZEPATIDE_PRICING,
    );
    expect(tirzSentence).not.toMatch(/offer/i);
    expect(tirzSentence).toContain("3-month starter pack");
    expect(tirzSentence).toContain("over 3 months");
    expect(tirzSentence).toContain("Standard or maintenance");
    expect(tirzSentence).toContain("doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)");
    expect(tirzSentence).toContain("$597");
    expect(tirzSentence).toContain("Tirz100");
    expect(tirzSentence).toContain("$197");
    expect(tirzSentence).toContain("can't be used together");
  });

  it("keeps FAQ pricing paragraph dual-med, all-inclusive, and em-dash free", () => {
    const paragraph = dualCompoundedFaqPricingParagraph();
    expect(paragraph).toContain("$199");
    expect(paragraph).toContain("$99");
    expect(paragraph).toContain("$297");
    expect(paragraph).toContain("$197");
    expect(paragraph).toContain("$597");
    expect(paragraph).not.toMatch(/two separate offers/i);
    expect(paragraph).toContain("3-month starter pack");
    expect(paragraph).toContain("doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)");
    expect(paragraph).toContain("sema-off100");
    expect(paragraph).toContain("Tirz100");
    expect(paragraph).toMatch(/3-month plan/);
    expect(paragraph).toMatch(/semaglutide/i);
    expect(paragraph).toMatch(/tirzepatide/i);
    expect(paragraph).toMatch(/all-inclusive/i);
    expect(paragraph).toMatch(/provider care/i);
    expect(paragraph).toMatch(/expedited shipping/i);
    expect(paragraph).not.toMatch(/medication-only/i);
    expect(paragraph).not.toMatch(/Shipping and labs/i);
    expect(paragraph).not.toMatch(/[—–]/);
  });
});
