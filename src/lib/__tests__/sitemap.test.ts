import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL, canonicalUrl } from "../seo";
import { RECIPES, recipePath } from "../recipes";

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
  "/glp-1/",
  "/glp-1-houston/",
  "/how-it-works/",
  "/weight-loss/",
  "/recipes/",
  "/recipes/pear-chia-oatmeal-cinnamon-cottage-cream/",
  "/recipes/smoky-red-lentil-carrot-soup/",
  "/recipes/turkey-black-bean-stuffed-sweet-potatoes/",
  "/recipes/apple-blackberry-oat-bran-breakfast-bake/",
  "/recipes/roasted-pepper-egg-feta-mini-frittatas/",
  "/recipes/lemon-herb-chicken-hummus-cucumber-boats/",
  "/recipes/miso-ginger-turkey-rice-cup/",
  "/recipes/vanilla-lemon-ricotta-berry-bowl/",
  "/recipes/herbed-turkey-cottage-cheese-breakfast-scramble/",
  "/recipes/charred-lemon-chicken-quinoa-bowl/",
  "/recipes/mustard-rosemary-pork-tenderloin-white-bean-mash/",
  "/recipes/smoky-turkey-taco-stuffed-peppers/",
  "/recipes/chicken-and-beef-fajitas/",
  "/about/",
  "/safety/",
  "/faq/",
  "/learn/",
  "/learn/initial-research/",
  "/learn/resistance-training/",
  "/learn/rest-intervals/",
  "/learn/semaglutide-vs-tirzepatide/",
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

  it("lists exactly the recipe hub plus all recipe details below treatment priority", () => {
    const recipeLocs = sitemapLocs().filter((loc) =>
      loc.startsWith(`${SITE_URL}/recipes/`),
    );
    expect(recipeLocs).toHaveLength(RECIPES.length + 1);

    const entries = [
      ...sitemapXml.matchAll(
        /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<priority>([^<]+)<\/priority>\s*<\/url>/g,
      ),
    ].map((match) => ({ loc: match[1], priority: Number(match[2]) }));
    const treatmentPriorities = entries
      .filter(({ loc }) =>
        [`${SITE_URL}/tirzepatide/`, `${SITE_URL}/semaglutide/`].includes(loc),
      )
      .map(({ priority }) => priority);
    const recipePriorities = entries
      .filter(({ loc }) => loc.startsWith(`${SITE_URL}/recipes/`))
      .map(({ priority }) => priority);

    expect(treatmentPriorities).toHaveLength(2);
    expect(recipePriorities).toHaveLength(RECIPES.length + 1);
    expect(Math.max(...recipePriorities)).toBeLessThan(
      Math.min(...treatmentPriorities),
    );
    for (const recipe of RECIPES) {
      expect(EXPECTED_PATHS).toContain(recipePath(recipe));
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
      "/the-comb",
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
      "/the-comb",
      "/legal/intake-acknowledgments",
    ]) {
      expect(robotsTxt).toContain(`Disallow: ${path}`);
    }
  });

  it("allows the live /learn educational section to be crawled", () => {
    expect(robotsTxt).not.toContain("Disallow: /learn");
  });

  it("allows both GLP-1 landers to be crawled", () => {
    expect(robotsTxt).not.toContain("Disallow: /glp-1");
    expect(robotsTxt).not.toContain("Disallow: /glp-1-houston");
  });

  it("allows the public recipe collection to be crawled", () => {
    expect(robotsTxt).not.toContain("Disallow: /recipes");
    expect(robotsTxt).toContain("Allow: /");
  });

  it("does not sitewide-block any bot, including scrapers - everyone can read/cite the site", () => {
    expect(robotsTxt).not.toMatch(/User-agent:\s*Bytespider/);
    expect(robotsTxt).not.toMatch(/User-agent:\s*CCBot/);
    expect(robotsTxt).not.toMatch(/User-agent:\s*Diffbot/);
    expect(robotsTxt).toContain("User-agent: GPTBot");
    expect(robotsTxt).toContain("User-agent: ClaudeBot");
  });

  it("repeats path Disallows in the named AI group (bots may not merge with *)", () => {
    // Slice from the first named agent through the trailing catch-all group
    // so we assert the shared AI group - not only `User-agent: *` itself.
    const namedGroup = robotsTxt.slice(
      robotsTxt.indexOf("User-agent: OAI-SearchBot"),
      robotsTxt.lastIndexOf("User-agent: *"),
    );
    expect(namedGroup.length).toBeGreaterThan(0);
    for (const path of [
      "/dashboard",
      "/staff",
      "/waitlist",
      "/pricing",
      "/the-comb",
    ]) {
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

  it("keeps program and GLP-1 hub pages in the footer, not the header dropdown", () => {
    expect(headerSrc).not.toContain('to: "/weight-loss/"');
    expect(headerSrc).not.toContain('to: "/glp-1/"');
    expect(headerSrc).not.toContain('to: "/glp-1-houston/"');
    expect(footerSrc).toContain('to: "/weight-loss/"');
    expect(footerSrc).toContain('to: "/glp-1/"');
    expect(footerSrc).not.toContain('to: "/glp-1-houston/"');
  });

  it("lists how-it-works in the Resources header and footer, not Care", () => {
    expect(headerSrc).toContain('to: "/how-it-works/"');
    expect(headerSrc).toContain('description: "Intake, review, and delivery"');
    const careBlock = footerSrc.slice(
      footerSrc.indexOf('title: "Care"'),
      footerSrc.indexOf('title: "Resources"'),
    );
    const resourcesBlock = footerSrc.slice(
      footerSrc.indexOf('title: "Resources"'),
      footerSrc.indexOf('title: "Trust"'),
    );
    expect(careBlock).not.toContain('to: "/how-it-works/"');
    expect(resourcesBlock).toContain('to: "/how-it-works/"');
  });
});

describe("treatment page how-it-works CTAs", () => {
  const routes = {
    tirzepatide: readFileSync(
      resolve(__dirname, "../../routes/tirzepatide.tsx"),
      "utf-8",
    ),
    semaglutide: readFileSync(
      resolve(__dirname, "../../routes/semaglutide.tsx"),
      "utf-8",
    ),
    glp1: readFileSync(
      resolve(__dirname, "../../components/site/Glp1LandingPage.tsx"),
      "utf-8",
    ),
  };
  const steps = readFileSync(
    resolve(__dirname, "../../components/site/HowItWorksSteps.tsx"),
    "utf-8",
  );

  it("jumps to on-page steps instead of leaving for /how-it-works/", () => {
    expect(steps).toContain('id = "how-it-works"');
    expect(steps).toContain("scroll-mt-20");
    for (const [name, source] of Object.entries(routes)) {
      expect(source, name).toContain('hash="how-it-works"');
      expect(source, name).not.toContain('to="/how-it-works/"');
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

  it("describes recipes without stale branded-offering or eligibility-flow claims", () => {
    expect(llmsTxt).toContain(
      "13 practical recipes organized around gradually adding fiber, smaller portions, and protein-rich eating",
    );
    expect(llmsTxt).not.toMatch(
      /Zepbound|Wegovy|Ozempic|Mounjaro|online eligibility check/i,
    );
    expect(llmsTxt).toContain("online intake");
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
