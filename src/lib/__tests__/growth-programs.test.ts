import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATOR_EARNINGS_DISCLAIMER,
  GROWTH_PROGRAMS_INDEXABLE,
  PROGRAM_RESTRICTED_STATES,
  REFERRAL_SHARE_NOTICE,
  STORY_COMPENSATION_DISCLOSURE,
  STORY_PAGE_FOOTER_DISCLOSURE,
  STORY_VIDEO_LENGTH,
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

  it("indexes only the creator program; story and referral stay noindex", () => {
    expect(GROWTH_PROGRAMS_INDEXABLE).toEqual({
      story: false,
      referral: false,
      creator: true,
    });
  });

  it("discloses compensation and uses no em dashes or bare brand name", () => {
    const strings = [
      CREATOR_EARNINGS_DISCLAIMER,
      REFERRAL_SHARE_NOTICE,
      STORY_COMPENSATION_DISCLOSURE,
      STORY_PAGE_FOOTER_DISCLOSURE,
    ];
    expect(STORY_COMPENSATION_DISCLOSURE).toMatch(/Compensated/);
    expect(STORY_VIDEO_LENGTH).toBe("15 to 45 seconds");
    expect(STORY_PAGE_FOOTER_DISCLOSURE).toMatch(/\$100 credit/);
    for (const s of strings) {
      expect(s).not.toContain("—");
      expect(s).not.toMatch(/\bBeema\b(?! Health)/);
    }
  });

  it("does not name the intake vendor on program pages", () => {
    const files = [
      "../../lib/growth-programs.ts",
      "../../routes/creators.tsx",
      "../../routes/refer.tsx",
      "../../routes/share-your-story.tsx",
      "../../routes/legal.creator-program-terms.tsx",
      "../../routes/legal.referral-terms.tsx",
      "../../routes/legal.story-program-terms.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(resolve(__dirname, file), "utf8");
      expect(source, file).not.toMatch(/Bask/);
    }
  });
});
