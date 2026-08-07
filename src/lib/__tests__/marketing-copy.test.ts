import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_MONTH_PROMO_LINE,
  FIRST_MONTH_PROMO_SHORT,
  WAITLIST_CTA_LABEL,
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  promoIncentiveLine,
  getWaitlistDisplayCountSeed,
  patientQuestionsGuidance,
  waitlistIncentiveBody,
  waitlistSocialProofLine,
  waitlistSuccessIncentiveLine,
} from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";

describe("marketing-copy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a single concrete first-month promo amount", () => {
    expect(FIRST_MONTH_PROMO_LINE).toBe(
      "sema-off100 for $100 off semaglutide, or a $599 tirzepatide new-patient starter pack ($199/mo)",
    );
    expect(FIRST_MONTH_PROMO_SHORT).toBe("Tirz starter $199/mo · sema-off100");
    expect(promoIncentiveLine()).toContain(FIRST_MONTH_PROMO_LINE);
    expect(waitlistIncentiveBody()).toContain(FIRST_MONTH_PROMO_LINE);
    expect(waitlistSuccessIncentiveLine()).toContain(FIRST_MONTH_PROMO_LINE);
  });

  it("explains questionnaire-only intake and when patients can ask questions", () => {
    const guidance = patientQuestionsGuidance();
    expect(guidance).toMatch(/questionnaire only/i);
    expect(guidance).toMatch(/can't ask questions inside it/i);
    expect(guidance).toMatch(/After you complete intake and pay/i);
    expect(guidance).toContain(SUPPORT_EMAIL);
  });

  it("exposes one waitlist CTA label for sitewide buttons", () => {
    expect(WAITLIST_CTA_LABEL).toBe("Join waitlist");
  });

  it("formats social proof from an explicit count", () => {
    expect(waitlistSocialProofLine(WAITLIST_DISPLAY_COUNT_FALLBACK)).toBe(
      `${WAITLIST_DISPLAY_COUNT_FALLBACK.toLocaleString("en-US")} people already on the waitlist`,
    );
    expect(waitlistSocialProofLine(240)).toContain("240");
  });

  it("re-exports waitlist seed helpers for callers that import marketing-copy", () => {
    expect(getWaitlistDisplayCountSeed()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
    vi.stubEnv("VITE_WAITLIST_DISPLAY_COUNT", "99");
    expect(getWaitlistDisplayCountSeed()).toBe(99);
  });
});
