import { describe, expect, it } from "vitest";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
  dualCompoundedFaqPricingParagraph,
  dualCompoundedHeroPricingLine,
  dualCompoundedHomeHeroTeaser,
  dualCompoundedPromoShortPricingLine,
  dualCompoundedShortPricingLine,
  formatCompoundedPriceLine,
  formatStartingAtPerMonth,
  formatUsd,
  getPlan,
  hasStarterPack,
  isPromoEligibleMonths,
  planMonthlyWithCouponUsd,
  planTotalWithCouponUsd,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  semaglutidePricingDetailsCopy,
  tirzepatidePricingDetailsCopy,
} from "@/lib/medication-pricing";

describe("medication-pricing", () => {
  it("keeps 1-month baseline rates", () => {
    expect(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd).toBe(199);
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd).toBe(297);
  });

  it("defines semaglutide multi-month plans and savings", () => {
    const m3 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 3);
    const m6 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 6);
    const m12 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 12);
    expect(m3.monthlyUsd).toBe(174);
    expect(m3.savingsUsd).toBe(75);
    expect(m6.monthlyUsd).toBe(165.67);
    expect(m6.savingsUsd).toBe(200);
    expect(m12.monthlyUsd).toBe(155.75);
    expect(m12.savingsUsd).toBe(519);
  });

  it("defines tirzepatide multi-month plans and savings", () => {
    const m3 = getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 3);
    const m6 = getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 6);
    const m12 = getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 12);
    expect(m3.totalUsd).toBe(791);
    expect(m3.monthlyUsd).toBe(263.67);
    expect(m3.savingsUsd).toBe(100);
    expect(m6.monthlyUsd).toBe(249.5);
    expect(m6.savingsUsd).toBe(285);
    expect(m12.monthlyUsd).toBe(232.33);
    expect(m12.totalUsd).toBe(2788);
    expect(m12.savingsUsd).toBe(776);
  });

  it("applies the $100 checkout coupon only on 3/6/12-month plans", () => {
    expect(isPromoEligibleMonths(1)).toBe(false);
    expect(isPromoEligibleMonths(3)).toBe(true);
    expect(isPromoEligibleMonths(6)).toBe(true);
    expect(isPromoEligibleMonths(12)).toBe(true);
    expect(PROMO_CODE_DISCOUNT_USD).toBe(100);

    const tirz3 = getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 3);
    expect(planTotalWithCouponUsd(tirz3)).toBe(691);
    expect(planMonthlyWithCouponUsd(tirz3)).toBeCloseTo(230.33, 2);

    const sema1 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 1);
    expect(planTotalWithCouponUsd(sema1)).toBe(199);
    expect(planMonthlyWithCouponUsd(sema1)).toBe(199);
  });

  it("still exposes promoFirstMonthUsd as monthly minus $100 for legacy teasers", () => {
    expect(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(99);
    expect(promoFirstMonthUsd(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(197);
  });

  it("formats money without trailing zeros", () => {
    expect(formatUsd(297)).toBe("$297");
    expect(formatUsd(249.5)).toBe("$249.5");
    expect(formatUsd(263.67)).toBe("$263.67");
  });

  it("formats single-med card lines from shared constants", () => {
    expect(formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)).toContain(
      "$199/mo",
    );
    expect(formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)).toContain(
      "$99 first month",
    );
    expect(formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)).toContain(
      "sema-off100",
    );
    expect(formatCompoundedPriceLine(COMPOUNDED_TIRZEPATIDE_PRICING)).toContain(
      "3-month starter pack $597",
    );
    expect(formatCompoundedPriceLine(COMPOUNDED_TIRZEPATIDE_PRICING)).toContain(
      "$249.5/mo",
    );
    expect(formatStartingAtPerMonth(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      "$199/mo",
    );
    expect(formatStartingAtPerMonth(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(
      "$99/mo",
    );
  });

  it("exposes the checkout promo code on each medication pricing object", () => {
    expect(COMPOUNDED_SEMAGLUTIDE_PRICING.promoCode).toBe("sema-off100");
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.promoCode).toBe("Tirz100");
  });

  it("defines tirzepatide starter pack", () => {
    expect(hasStarterPack(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(false);
    expect(hasStarterPack(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(true);
    expect(COMPOUNDED_TIRZEPATIDE_PRICING.starterPack).toEqual({
      totalUsd: 597,
      monthlyEquivalentUsd: 199,
      months: 3,
      dosePathLabel: "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)",
    });
  });

  it("balances both medications in short and hero dual lines", () => {
    expect(dualCompoundedShortPricingLine()).toContain("Semaglutide from");
    expect(dualCompoundedShortPricingLine()).toContain("Tirzepatide");
    expect(dualCompoundedPromoShortPricingLine()).toContain("$99");
    expect(dualCompoundedPromoShortPricingLine()).toContain("Tirz starter");
    expect(dualCompoundedHomeHeroTeaser()).toContain("starter pack");
    expect(dualCompoundedHomeHeroTeaser()).toContain("$199/mo");
    expect(dualCompoundedHeroPricingLine()).toContain("$99 first month");
    expect(dualCompoundedHeroPricingLine()).toContain("sema-off100");
    expect(dualCompoundedHeroPricingLine()).not.toContain("$155.75");
    expect(dualCompoundedShortPricingLine()).toContain("$99");
    expect(dualCompoundedShortPricingLine()).not.toMatch(/[\u2014\u2013]/);
    expect(dualCompoundedPromoShortPricingLine()).not.toMatch(/[\u2014\u2013]/);
    expect(dualCompoundedHomeHeroTeaser()).not.toMatch(/[\u2014\u2013]/);
    expect(dualCompoundedHeroPricingLine()).not.toMatch(/[\u2014\u2013]/);
  });

  it("states multi-month rates and the checkout coupon per medication", () => {
    const sentence = compoundedMonthlyPricingSentence(
      "Compounded semaglutide",
      COMPOUNDED_SEMAGLUTIDE_PRICING,
    );
    expect(sentence).toContain("$199/month");
    expect(sentence).toContain("$99");
    expect(sentence).toContain("months 2 and 3");
    expect(sentence).toContain("$497");
    expect(sentence).toContain("$165.67/mo");
    expect(sentence).toContain("save $200");
    expect(sentence).toContain("$155.75/mo");
    expect(sentence).toContain("save $519");
    expect(sentence).toContain("sema-off100");
    expect(sentence).toContain("once per patient");
    expect(sentence).not.toMatch(/[\u2014\u2013]/);

    const tirzSentence = compoundedMonthlyPricingSentence(
      "Compounded tirzepatide",
      COMPOUNDED_TIRZEPATIDE_PRICING,
    );
    expect(tirzSentence).toContain("3-month starter pack");
    expect(tirzSentence).toContain("$597");
    expect(tirzSentence).toContain("$297/mo");
    expect(tirzSentence).toContain("$263.67/mo");
    expect(tirzSentence).toContain("$249.5/mo");
    expect(tirzSentence).toContain("save $285");
    expect(tirzSentence).toContain("$232.33/mo");
    expect(tirzSentence).toContain("save $776");
    expect(tirzSentence).toContain("Tirz100");
    expect(tirzSentence).toContain("new to GLP-1");
    expect(tirzSentence).toContain("can't be used together");
  });

  it("exposes accurate tirzepatide and semaglutide details copy", () => {
    const tirz = tirzepatidePricingDetailsCopy();
    expect(tirz.starter).toContain("$199/mo");
    expect(tirz.starter).toContain("$597");
    expect(tirz.starter).toContain("new to GLP-1");
    expect(tirz.plans).toContain("$249.5/mo");
    expect(tirz.plans).toContain("Save $285");
    expect(tirz.plans).toContain("$232.33/mo");
    expect(tirz.plans).toContain("Save $776");
    expect(tirz.coupon).toContain("Tirz100");
    expect(tirz.coupon).toContain("one-time-use");
    expect(tirz.coupon).toContain("once per patient");
    expect(tirz.coupon).not.toMatch(/[\u2014\u2013]/);

    const sema = semaglutidePricingDetailsCopy();
    expect(sema.plans).toContain("$99");
    expect(sema.plans).toContain("months 2 and 3");
    expect(sema.plans).toContain("Save $200");
    expect(sema.coupon).toContain("first month");
    expect(sema.coupon).toContain("once per patient");
    expect(sema.compareTirz).toContain("starter pack");
    expect(sema.compareTirz).toContain("never guaranteed");
    expect(sema.compareTirz).not.toMatch(/better results/i);
    expect(sema.compareTirz).not.toMatch(/versus its monthly/i);
  });

  it("keeps FAQ pricing paragraph dual-med, all-inclusive, and em-dash free", () => {
    const paragraph = dualCompoundedFaqPricingParagraph();
    expect(paragraph).toContain("$199");
    expect(paragraph).toContain("$297");
    expect(paragraph).toContain("$597");
    expect(paragraph).toContain("$249.5");
    expect(paragraph).toContain("3-month starter pack");
    expect(paragraph).toContain("sema-off100");
    expect(paragraph).toContain("Tirz100");
    expect(paragraph).toMatch(/semaglutide/i);
    expect(paragraph).toMatch(/tirzepatide/i);
    expect(paragraph).toMatch(/all-inclusive/i);
    expect(paragraph).toMatch(/provider care/i);
    expect(paragraph).toMatch(/expedited shipping/i);
    expect(paragraph).not.toMatch(/medication-only/i);
    expect(paragraph).not.toMatch(/[\u2014\u2013]/);
  });
});
