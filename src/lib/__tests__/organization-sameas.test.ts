import { describe, expect, it } from "vitest";
import { LEGITSCRIPT_VERIFY_URL } from "../legitscript";
import { ORGANIZATION_JSONLD } from "../seo";
import { SOCIAL_PROFILE_URLS } from "../social-profiles";

describe("Organization sameAs", () => {
  const sameAs: readonly string[] = ORGANIZATION_JSONLD.sameAs;

  it("includes every verified company profile", () => {
    expect(sameAs).toEqual(
      expect.arrayContaining([LEGITSCRIPT_VERIFY_URL, ...SOCIAL_PROFILE_URLS]),
    );
  });

  it("contains only unique https URLs", () => {
    expect(new Set(sameAs).size).toBe(sameAs.length);
    for (const url of sameAs) {
      expect(() => new URL(url)).not.toThrow();
      expect(url.startsWith("https://")).toBe(true);
    }
  });
});
