import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_BUSINESS_LISTING_URL,
  GOOGLE_REVIEW_LINK_LABEL,
  GOOGLE_REVIEW_URL,
} from "../google-business";
import { ORGANIZATION_JSONLD } from "../seo";

describe("Google Business Profile links", () => {
  it("keeps the listing URL and write-review URL distinct", () => {
    expect(GOOGLE_BUSINESS_LISTING_URL).toBe(
      "https://g.page/r/CUEUJWP1F6UjEBI",
    );
    expect(GOOGLE_REVIEW_URL).toBe(`${GOOGLE_BUSINESS_LISTING_URL}/review`);
    expect(GOOGLE_REVIEW_URL).not.toBe(GOOGLE_BUSINESS_LISTING_URL);
    expect(GOOGLE_REVIEW_LINK_LABEL).toBe("Leave a Google review");
  });

  it("puts the listing URL in Organization sameAs, not the write-review URL", () => {
    expect(ORGANIZATION_JSONLD.sameAs).toContain(GOOGLE_BUSINESS_LISTING_URL);
    expect(ORGANIZATION_JSONLD.sameAs).not.toContain(GOOGLE_REVIEW_URL);
  });

  it("exposes the write-review URL on the footer Trust column and contact page", () => {
    const footerSrc = readFileSync(
      resolve(__dirname, "../../components/site/SiteFooter.tsx"),
      "utf-8",
    );
    const contactSrc = readFileSync(
      resolve(__dirname, "../../routes/contact.tsx"),
      "utf-8",
    );
    expect(footerSrc).toContain("GOOGLE_REVIEW_URL");
    expect(footerSrc).toContain("GOOGLE_REVIEW_LINK_LABEL");
    expect(contactSrc).toContain("GOOGLE_REVIEW_URL");
    expect(contactSrc).toContain("GOOGLE_REVIEW_LINK_LABEL");
  });
});
