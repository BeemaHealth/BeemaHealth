import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_MONTH_PROMO_LINE,
  FIRST_MONTH_PROMO_SHORT,
  promoIncentiveLine,
  patientQuestionsGuidance,
} from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";

describe("marketing-copy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a single concrete promo teaser for nav/footer", () => {
    expect(FIRST_MONTH_PROMO_LINE).toBe(
      "Semaglutide from $99 first month on a 3-month plan · Tirzepatide starter from $199/mo · one-time $100 off codes",
    );
    expect(FIRST_MONTH_PROMO_SHORT).toBe(
      "Sema $99 first mo · Tirz starter from $199/mo",
    );
    expect(promoIncentiveLine()).toContain(FIRST_MONTH_PROMO_LINE);
  });

  it("explains questionnaire-only intake and when patients can ask questions", () => {
    const guidance = patientQuestionsGuidance();
    expect(guidance).toMatch(/questionnaire only/i);
    expect(guidance).toMatch(/can't ask questions inside it/i);
    expect(guidance).toMatch(/AI chat/i);
    expect(guidance).toMatch(/After you complete intake and pay/i);
    expect(guidance).toContain(SUPPORT_EMAIL);
  });
});
