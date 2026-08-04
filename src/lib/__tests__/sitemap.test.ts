import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL, canonicalUrl } from "../seo";

const sitemapXml = readFileSync(
  resolve(__dirname, "../../../public/sitemap.xml"),
  "utf-8",
);
const robotsTxt = readFileSync(
  resolve(__dirname, "../../../public/robots.txt"),
  "utf-8",
);

/** Live, indexable marketing pages. Update together with public/sitemap.xml. */
const EXPECTED_PATHS = [
  "/",
  "/tirzepatide/",
  "/semaglutide/",
  "/how-it-works/",
  "/weight-loss/",
  "/about/",
  "/safety/",
  "/faq/",
  "/learn/",
  "/learn/initial-research/",
  "/contact/",
  "/legal/privacy/",
  "/legal/terms/",
  "/legal/refund/",
  "/legal/shipping/",
  "/legal/physician-code-of-conduct/",
  "/legal/hipaa/",
  "/legal/telehealth-consent/",
];

function sitemapLocs(): string[] {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe("public/sitemap.xml", () => {
  it("lists exactly the live marketing pages", () => {
    expect(sitemapLocs()).toEqual(EXPECTED_PATHS.map((p) => `${SITE_URL}${p}`));
  });

  it("uses the canonical trailing-slash URL form GitHub Pages serves", () => {
    for (const loc of sitemapLocs()) {
      expect(loc.endsWith("/")).toBe(true);
      const path = loc.slice(SITE_URL.length);
      expect(loc).toBe(canonicalUrl(path));
    }
  });

  it("stays on the canonical production origin", () => {
    for (const loc of sitemapLocs()) {
      expect(loc.startsWith(`${SITE_URL}/`) || loc === `${SITE_URL}/`).toBe(
        true,
      );
    }
  });

  it("has a lastmod for every URL, in YYYY-MM-DD form", () => {
    const lastmods = [
      ...sitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g),
    ].map((m) => m[1]);
    expect(lastmods).toHaveLength(EXPECTED_PATHS.length);
    for (const lastmod of lastmods) {
      expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never lists funnel, portal, staff, or auth routes", () => {
    const disallowed = [
      "/qualify",
      "/waitlist",
      "/intake",
      "/consent",
      "/submitted",
      "/eligibility",
      "/dashboard",
      "/staff",
      "/admin",
      "/login",
      "/verify-email",
      "/lp/",
    ];
    for (const loc of sitemapLocs()) {
      const path = loc.slice(SITE_URL.length);
      for (const prefix of disallowed) {
        expect(path.startsWith(prefix)).toBe(false);
      }
    }
  });
});

describe("public/robots.txt", () => {
  it("declares the sitemap at the canonical origin", () => {
    expect(robotsTxt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it("explicitly allows major AI search/citation crawlers", () => {
    for (const agent of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "Claude-SearchBot",
      "Claude-User",
      "PerplexityBot",
      "Perplexity-User",
      "Googlebot",
      "Bingbot",
    ]) {
      expect(robotsTxt).toContain(`User-agent: ${agent}`);
    }
  });

  it("blocks funnel, portal, staff, LP, and retired stub paths", () => {
    for (const path of [
      "/qualify",
      "/waitlist",
      "/intake",
      "/consent",
      "/dashboard",
      "/staff",
      "/admin",
      "/login",
      "/lp/",
      "/pricing",
      "/clinicians",
      "/insurance",
      "/switch",
      "/legal/intake-acknowledgments",
    ]) {
      expect(robotsTxt).toContain(`Disallow: ${path}`);
    }
  });

  it("allows the live /learn educational section to be crawled", () => {
    expect(robotsTxt).not.toContain("Disallow: /learn");
  });

  it("does not sitewide-block any bot, including scrapers — everyone can read/cite the site", () => {
    expect(robotsTxt).not.toMatch(/User-agent:\s*Bytespider/);
    expect(robotsTxt).not.toMatch(/User-agent:\s*CCBot/);
    expect(robotsTxt).not.toMatch(/User-agent:\s*Diffbot/);
    expect(robotsTxt).toContain("User-agent: GPTBot");
    expect(robotsTxt).toContain("User-agent: ClaudeBot");
  });

  it("repeats path Disallows in the named AI group (bots may not merge with *)", () => {
    // Slice from the first named agent through the trailing catch-all group
    // so we assert the shared AI group — not only `User-agent: *` itself.
    const namedGroup = robotsTxt.slice(
      robotsTxt.indexOf("User-agent: OAI-SearchBot"),
      robotsTxt.lastIndexOf("User-agent: *"),
    );
    expect(namedGroup.length).toBeGreaterThan(0);
    for (const path of ["/dashboard", "/staff", "/waitlist", "/pricing"]) {
      expect(namedGroup).toContain(`Disallow: ${path}`);
    }
  });
});

describe("canonicalUrl", () => {
  it("appends a trailing slash to bare paths", () => {
    expect(canonicalUrl("/weight-loss")).toBe(`${SITE_URL}/weight-loss/`);
  });

  it("leaves trailing-slash paths and the root untouched", () => {
    expect(canonicalUrl("/weight-loss/")).toBe(`${SITE_URL}/weight-loss/`);
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
  });
});

describe("internal marketing links (trailing slash)", () => {
  // GitHub Pages 301s bare paths → slash form. Router default was `never`,
  // which stripped trailing slashes from <Link> hrefs and caused duplicate
  // indexing. Guard the plumbing that keeps crawlable hrefs on the canonical URL.
  const headerSrc = readFileSync(
    resolve(__dirname, "../../components/site/SiteHeader.tsx"),
    "utf-8",
  );
  const footerSrc = readFileSync(
    resolve(__dirname, "../../components/site/SiteFooter.tsx"),
    "utf-8",
  );
  const routerSrc = readFileSync(
    resolve(__dirname, "../../router.tsx"),
    "utf-8",
  );

  it("configures TanStack Router trailingSlash: preserve", () => {
    expect(routerSrc).toMatch(/trailingSlash:\s*["']preserve["']/);
  });

  it("SiteHeader and SiteFooter use trailing-slash marketing paths", () => {
    const paths = [
      ...headerSrc.matchAll(/to:\s*"(\/[^"]+)"/g),
      ...footerSrc.matchAll(/to:\s*"(\/[^"]+)"/g),
    ].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.endsWith("/"), path).toBe(true);
    }
  });
});

describe("waitlistHref", () => {
  it("puts the trailing slash before the query string", async () => {
    const { waitlistHref, WAITLIST_PATH } = await import("../cta-ids");
    expect(WAITLIST_PATH).toBe("/waitlist/");
    expect(waitlistHref("faq")).toBe("/waitlist/?cta_id=faq");
  });
});

describe("public/llms.txt", () => {
  const llmsTxt = readFileSync(
    resolve(__dirname, "../../../public/llms.txt"),
    "utf-8",
  );

  it("only links pages that are in the sitemap (no dead or redirecting URLs)", () => {
    // AI crawlers follow these links directly; a 404 (like the /pricing
    // link that shipped while the page was unrouted) burns trust.
    const linked = [...llmsTxt.matchAll(/\((https:\/\/[^)]+)\)/g)].map(
      (m) => m[1],
    );
    expect(linked.length).toBeGreaterThan(0);
    const sitemapUrls = new Set(sitemapLocs());
    for (const url of linked) {
      expect(sitemapUrls.has(url), `${url} not in sitemap`).toBe(true);
    }
  });

  it("uses the canonical origin for every absolute URL", () => {
    const absolute = llmsTxt.match(/https?:\/\/[^\s)\]]+/g) ?? [];
    for (const url of absolute) {
      expect(url.startsWith(SITE_URL), `${url} is off-origin`).toBe(true);
    }
  });
});

describe("IndexNow", () => {
  it("deploy script key matches a key file in public/", () => {
    const deployScript = readFileSync(
      resolve(__dirname, "../../../deploy-frontend-prod.sh"),
      "utf-8",
    );
    const match = deployScript.match(/INDEXNOW_KEY="([0-9a-f]{32})"/);
    expect(
      match,
      "INDEXNOW_KEY not found in deploy-frontend-prod.sh",
    ).not.toBeNull();
    const key = match![1];
    const keyFile = readFileSync(
      resolve(__dirname, `../../../public/${key}.txt`),
      "utf-8",
    );
    expect(keyFile.trim()).toBe(key);
  });
});
