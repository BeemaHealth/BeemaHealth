import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EARLY_ADOPTER_DISCOUNT,
  EARLY_ADOPTER_DISCOUNT_SHORT,
  WAITLIST_CTA_LABEL,
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  earlyAdopterIncentiveLine,
  getWaitlistDisplayCountSeed,
  waitlistIncentiveBody,
  waitlistSocialProofLine,
  waitlistSuccessIncentiveLine,
} from "@/lib/marketing-copy";

describe("marketing-copy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a single concrete early-adopter amount", () => {
    expect(EARLY_ADOPTER_DISCOUNT).toBe("$100 off first month");
    expect(EARLY_ADOPTER_DISCOUNT_SHORT).toBe("$100 off");
    expect(earlyAdopterIncentiveLine()).toContain(EARLY_ADOPTER_DISCOUNT);
    expect(waitlistIncentiveBody()).toContain(EARLY_ADOPTER_DISCOUNT);
    expect(waitlistSuccessIncentiveLine()).toContain(EARLY_ADOPTER_DISCOUNT);
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
