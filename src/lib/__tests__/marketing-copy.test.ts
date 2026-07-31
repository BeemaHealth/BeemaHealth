import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_MONTH_PROMO_LINE,
  FIRST_MONTH_PROMO_SHORT,
  WAITLIST_CTA_LABEL,
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  promoIncentiveLine,
  getWaitlistDisplayCountSeed,
  waitlistIncentiveBody,
  waitlistSocialProofLine,
  waitlistSuccessIncentiveLine,
} from "@/lib/marketing-copy";

describe("marketing-copy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a single concrete first-month promo amount", () => {
    expect(FIRST_MONTH_PROMO_LINE).toBe(
      "a one-time $100 promo code for your first month on a 3-month plan",
    );
    expect(FIRST_MONTH_PROMO_SHORT).toBe("$100 off with a 3-month promo code");
    expect(promoIncentiveLine()).toContain(FIRST_MONTH_PROMO_LINE);
    expect(waitlistIncentiveBody()).toContain(FIRST_MONTH_PROMO_LINE);
    expect(waitlistSuccessIncentiveLine()).toContain(FIRST_MONTH_PROMO_LINE);
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
