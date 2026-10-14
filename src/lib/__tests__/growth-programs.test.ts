import { describe, expect, it } from "vitest";
import {
  CREATOR_EARNINGS_DISCLAIMER,
  GROWTH_PROGRAMS_INDEXABLE,
  PROGRAM_RESTRICTED_STATES,
  REFERRAL_SHARE_NOTICE,
  STORY_COMPENSATION_DISCLOSURE,
  STORY_PAGE_FOOTER_DISCLOSURE,
  isProgramRestrictedInState,
} from "../growth-programs";

describe("growth programs config", () => {
  it("restricts creators in seeded states, case and whitespace insensitive", () => {
    expect(isProgramRestrictedInState("creator", " fl ")).toBe(true);
    expect(isProgramRestrictedInState("creator", "CO")).toBe(false);
    expect(isProgramRestrictedInState("story", "FL")).toBe(false);
  });

  it("keeps restricted states as two-letter uppercase codes", () => {
    for (const codes of Object.values(PROGRAM_RESTRICTED_STATES)) {
      for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("stays noindex until the launch gate is cleared", () => {
    expect(GROWTH_PROGRAMS_INDEXABLE).toBe(false);
  });

  it("discloses compensation and uses no em dashes or bare brand name", () => {
    const strings = [
      CREATOR_EARNINGS_DISCLAIMER,
      REFERRAL_SHARE_NOTICE,
      STORY_COMPENSATION_DISCLOSURE,
      STORY_PAGE_FOOTER_DISCLOSURE,
    ];
    expect(STORY_COMPENSATION_DISCLOSURE).toMatch(/Compensated/);
    expect(STORY_PAGE_FOOTER_DISCLOSURE).toMatch(/\$100 credit/);
    for (const s of strings) {
      expect(s).not.toContain("—");
      expect(s).not.toMatch(/\bBeema\b(?! Health)/);
    }
  });
});
