import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SOCIAL_PROFILE_URLS } from "../social-profiles";
import {
  BIO_LINK_KEYS,
  BIO_LINK_PATHS,
  BIO_LINK_UTMS,
  bioLinkDestination,
  redirectBioLink,
  type BioLinkKey,
} from "../bio-links";
// @ts-expect-error - plain .mjs CLI, no type declarations
import { buildBioLinks } from "../../../scripts/generate-utm-url.mjs";

const KEYS: readonly BioLinkKey[] = BIO_LINK_KEYS;

describe("bio link constants", () => {
  it.each(KEYS)("%s matches the generate-utm-url script", (key) => {
    const fromScript = buildBioLinks()[key];
    for (const [param, value] of Object.entries(BIO_LINK_UTMS[key])) {
      expect(fromScript[param]).toBe(value);
    }
  });

  it.each(KEYS)("%s destination carries all four utm_* params", (key) => {
    const dest = new URL(bioLinkDestination(key), "https://example.test");
    expect(dest.pathname).toBe("/");
    for (const [param, value] of Object.entries(BIO_LINK_UTMS[key])) {
      expect(dest.searchParams.get(param)).toBe(value);
    }
  });

  it("exposes the short paths", () => {
    expect(BIO_LINK_PATHS.instagram).toEqual(["/instagram"]);
    expect(BIO_LINK_PATHS.facebook).toEqual(["/facebook", "/fb"]);
    expect(BIO_LINK_PATHS.x).toEqual(["/x"]);
  });

  it("has a route file for every short path", () => {
    for (const path of Object.values(BIO_LINK_PATHS).flat()) {
      const file = resolve(__dirname, `../../routes${path}.tsx`);
      expect(existsSync(file), `${file} missing`).toBe(true);
    }
  });

  it("covers every Organization sameAs profile except Trustpilot", () => {
    const hosts = SOCIAL_PROFILE_URLS.map((u) => new URL(u).hostname);
    for (const needle of [
      "facebook",
      "instagram",
      "tiktok",
      "linkedin",
      "x.com",
      "youtube",
      "threads",
      "reddit",
    ]) {
      expect(
        hosts.some((h) => h.includes(needle)),
        needle,
      ).toBe(true);
    }
    expect(BIO_LINK_KEYS).toHaveLength(hosts.length - 1);
  });
});

function hrefOf(r: unknown): string {
  return (r as { options: { href: string } }).options.href;
}

describe("redirectBioLink", () => {
  it("redirects to home with UTMs, replacing history", () => {
    const r = redirectBioLink("instagram");
    expect((r as { options: { replace?: boolean } }).options.replace).toBe(
      true,
    );
    expect(hrefOf(r)).toBe(bioLinkDestination("instagram"));
  });

  it("carries fbclid through without overriding the bio UTMs", () => {
    const href = hrefOf(
      redirectBioLink("facebook", "?fbclid=abc123&utm_source=evil"),
    );
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("fbclid")).toBe("abc123");
    expect(params.get("utm_source")).toBe("facebook");
  });

  it("cannot be steered off-site by the incoming query", () => {
    const href = hrefOf(
      redirectBioLink("facebook", "?next=https://evil.test&//evil.test=1"),
    );
    expect(href.startsWith("/?")).toBe(true);
  });
});
