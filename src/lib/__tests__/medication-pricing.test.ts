import { describe, expect, it } from "vitest";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
  dualCompoundedFaqPricingParagraph,
  dualCompoundedHeroPricingLine,
  dualCompoundedShortPricingLine,
  formatCompoundedPriceLine,
  formatStartingAtPerMonth,
} from "@/lib/medication-pricing";

describe("medication-pricing", () => {
  it("formats single-med card lines from shared constants", () => {
    expect(formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)).toBe(
      "$99 first month, then $199/mo for months 2 and 3",
    );
    expect(formatStartingAtPerMonth(COMPOUNDED_TIRZEPATIDE_PRICING)).toBe(
      "Starting at $197/mo",
    );
  });

  it("balances both medications in short and hero dual lines", () => {
    expect(dualCompoundedShortPricingLine()).toBe(
      "Semaglutide from $99/mo · Tirzepatide from $197/mo",
    );
    expect(dualCompoundedHeroPricingLine()).toBe(
      "Semaglutide from $99/mo first month, then $199/mo for months 2 and 3; Tirzepatide from $197/mo first month, then $297/mo for months 2 and 3",
    );
    expect(dualCompoundedShortPricingLine()).not.toMatch(/[—–]/);
    expect(dualCompoundedHeroPricingLine()).not.toMatch(/[—–]/);
  });

  it("states the first-month, months-2-3, then-ongoing structure per medication", () => {
    const sentence = compoundedMonthlyPricingSentence(
      "Compounded semaglutide",
      COMPOUNDED_SEMAGLUTIDE_PRICING,
    );
    expect(sentence).toBe(
      "Compounded semaglutide is $99 for the first month, then $199/month for months 2 and 3, continuing at $199/month if you keep refilling after that.",
    );
    expect(sentence).not.toMatch(/[—–]/);
  });

  it("keeps FAQ pricing paragraph dual-med and em-dash free", () => {
    const paragraph = dualCompoundedFaqPricingParagraph();
    expect(paragraph).toContain("$99");
    expect(paragraph).toContain("$199");
    expect(paragraph).toContain("$197");
    expect(paragraph).toContain("$297");
    expect(paragraph).toMatch(/months 2 and 3/);
    expect(paragraph).toMatch(/semaglutide/i);
    expect(paragraph).toMatch(/tirzepatide/i);
    expect(paragraph).not.toMatch(/[—–]/);
  });
});
