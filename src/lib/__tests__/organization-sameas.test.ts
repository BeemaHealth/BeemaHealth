import { describe, expect, it } from "vitest";
import { LEGITSCRIPT_VERIFY_URL } from "../legitscript";
import { ORGANIZATION_JSONLD } from "../seo";

describe("Organization sameAs", () => {
  const sameAs: readonly string[] = ORGANIZATION_JSONLD.sameAs;

  it("includes every verified company profile", () => {
    expect(sameAs).toEqual(
      expect.arrayContaining([
        LEGITSCRIPT_VERIFY_URL,
        "https://www.facebook.com/profile.php?id=61591847661626",
        "https://www.instagram.com/beemahealth",
        "https://www.tiktok.com/@beema.health",
        "https://www.linkedin.com/company/beemahealth/",
        "https://x.com/beemahealth",
        "https://www.youtube.com/@Beema.Health",
        "https://www.threads.com/@beemahealth",
        "https://www.reddit.com/r/beemahealth/",
        "https://www.trustpilot.com/review/beemahealth.com",
      ]),
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
