import { describe, expect, it } from "vitest";
import {
  getFrontendBaseUrl,
  landingPageDisplayUrl,
  landingPageUrl,
} from "@/lib/site-url";

describe("site-url", () => {
  it("builds landing page paths from configured base", () => {
    const base = getFrontendBaseUrl();
    expect(landingPageUrl("fb-sema-jan")).toBe(`${base}/lp/fb-sema-jan`);
    expect(landingPageDisplayUrl("fb-sema-jan")).toBe(
      landingPageUrl("fb-sema-jan").replace(/^https?:\/\//, ""),
    );
  });
});
