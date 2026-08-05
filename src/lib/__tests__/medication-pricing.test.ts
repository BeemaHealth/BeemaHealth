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
      "$199/mo, or $99 your first month with a one-time $100 promo code on a 3-month plan",
    );
    expect(formatStartingAtPerMonth(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      "$297/mo",
    );
    expect(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(99);
    expect(promoFirstMonthUsd(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(197);
  });

  it("balances both medications in short and hero dual lines", () => {
    expect(dualCompoundedShortPricingLine()).toBe(
      "Semaglutide $199/mo · Tirzepatide $297/mo",
    );
    expect(dualCompoundedPromoShortPricingLine()).toBe(
      "Semaglutide $99 then $199/mo · Tirzepatide $197 then $297/mo",
    );
    expect(dualCompoundedHeroPricingLine()).toBe(
      "Semaglutide $99 first month then $199/mo, Tirzepatide $197 first month then $297/mo, with a one-time $100 promo code on a 3-month plan",
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
      "Compounded semaglutide is $199/month, billed monthly with no long-term contract. A one-time $100 promo code brings your first month to $99 when you purchase a 3-month plan; it can't be combined with a 1-month purchase and can only be used once per patient.",
    );
    expect(sentence).not.toMatch(/[—–]/);
  });

  it("keeps FAQ pricing paragraph dual-med, all-inclusive, and em-dash free", () => {
    const paragraph = dualCompoundedFaqPricingParagraph();
    expect(paragraph).toContain("$199");
    expect(paragraph).toContain("$99");
    expect(paragraph).toContain("$297");
    expect(paragraph).toContain("$197");
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
