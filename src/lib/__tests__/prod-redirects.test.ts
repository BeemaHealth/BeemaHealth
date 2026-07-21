/**
 * Live production redirect matrix for beemahealth.com.
 *
 * Run: `npm run test:seo-live`
 * (Skipped during normal `npm test` — needs network to GitHub Pages.)
 *
 * Asserts:
 * - Canonical HTTPS apex returns 200 with no Location (never a self-redirect)
 * - www / http / bare-path variants redirect in exactly one hop to the
 *   trailing-slash canonical URL
 * - Same rules under Googlebot and Bingbot User-Agents
 */
import { describe, expect, it } from "vitest";
import { SITE_URL, canonicalUrl } from "../seo";

const RUN = process.env.SEO_LIVE_CHECK === "1";

const USER_AGENTS = [
  "Mozilla/5.0 (compatible; BeemaHealth-SEO-LiveCheck/1.0)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
] as const;

type Probe = {
  status: number;
  location: string | null;
};

async function probe(url: string, userAgent: string): Promise<Probe> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "user-agent": userAgent, accept: "text/html" },
  });
  // fetch normalizes Location; prefer header when present
  const location = res.headers.get("location");
  return { status: res.status, location };
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 307 || status === 308;
}

/** One-hop absolute Location resolving relative redirects against the request URL. */
function resolveLocation(requestUrl: string, location: string): string {
  return new URL(location, requestUrl).href;
}

const MARKETING_PATHS = [
  "/",
  "/weight-loss/",
  "/how-it-works/",
  "/about/",
  "/safety/",
  "/faq/",
  "/contact/",
  "/legal/privacy/",
  "/legal/terms/",
  "/legal/telehealth-consent/",
] as const;

describe.runIf(RUN)("production redirects (live)", () => {
  for (const ua of USER_AGENTS) {
    describe(`UA: ${ua.includes("Googlebot") ? "Googlebot" : ua.includes("bingbot") ? "Bingbot" : "browser"}`, () => {
      it("canonical homepage returns 200 with no Location (no self-redirect)", async () => {
        const url = `${SITE_URL}/`;
        const { status, location } = await probe(url, ua);
        expect(status, `${url} status`).toBe(200);
        expect(location, `${url} must not send Location`).toBeNull();
      });

      it("www and http variants redirect in one hop to https apex /", async () => {
        const canonical = `${SITE_URL}/`;
        const variants = [
          "http://beemahealth.com/",
          "http://beemahealth.com",
          "https://www.beemahealth.com/",
          "https://www.beemahealth.com",
          "http://www.beemahealth.com/",
          "http://www.beemahealth.com",
        ];
        for (const url of variants) {
          const { status, location } = await probe(url, ua);
          expect(isRedirect(status), `${url} should redirect`).toBe(true);
          expect(location, `${url} Location`).toBeTruthy();
          const dest = resolveLocation(url, location!);
          expect(dest, `${url} →`).toBe(canonical);
          // Second hop must be a clean 200 (no redirect chain / self-loop)
          const final = await probe(dest, ua);
          expect(final.status, `${dest} after ${url}`).toBe(200);
          expect(final.location, `${dest} must not redirect again`).toBeNull();
        }
      });

      it("bare marketing paths redirect once to trailing-slash canonicals", async () => {
        for (const path of MARKETING_PATHS) {
          if (path === "/") continue; // no bare form distinct from canonical
          const bare = `${SITE_URL}${path.replace(/\/$/, "")}`;
          const canonical = canonicalUrl(path);
          const { status, location } = await probe(bare, ua);
          expect(isRedirect(status), `${bare} should redirect`).toBe(true);
          expect(location).toBeTruthy();
          expect(resolveLocation(bare, location!)).toBe(canonical);

          const final = await probe(canonical, ua);
          expect(final.status, canonical).toBe(200);
          expect(final.location, canonical).toBeNull();
        }
      });

      it("slash-form marketing URLs return 200 with no Location", async () => {
        for (const path of MARKETING_PATHS) {
          const url = canonicalUrl(path);
          const { status, location } = await probe(url, ua);
          expect(status, url).toBe(200);
          expect(location, url).toBeNull();
        }
      });
    });
  }
});
