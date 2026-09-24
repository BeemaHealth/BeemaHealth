import { describe, expect, it } from "vitest";
import { listAllArticles, peekArticle } from "@/content/learn/registry";
import { resolveMoneyPageHrefs } from "@/content/learn/money-pages";
import { learnArticleKey } from "@/content/learn/types";
import { listKnownPricingUsdAmounts } from "@/lib/medication-pricing";
import { LEARN_HUBS } from "@/content/learn/hubs";

/**
 * Content-quality gates for the /learn/ library.
 *
 * These lock in the SERP, E-E-A-T, and compliance invariants that a hand-audit
 * caught once. They run against published articles only: the unpublished
 * `_glob-fixture` deliberately carries dangling links and is exercised in
 * learn-registry.test.ts instead.
 */
const articles = listAllArticles();

/** Google truncates around 60 characters. Article titles render with no brand suffix. */
const TITLE_MAX = 60;
/** Google renders roughly 155-160 characters of the description. */
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;

function prose(article: (typeof articles)[number]): string {
  return [
    article.description,
    ...article.sections.flatMap((s) => [...s.body, ...(s.bullets ?? [])]),
    ...article.faqs.map((f) => f.answer),
  ].join("\n");
}

describe("learn SERP fields", () => {
  it("keeps every title inside the SERP limit", () => {
    const tooLong = articles
      .filter((a) => a.title.length > TITLE_MAX)
      .map((a) => `${learnArticleKey(a.vertical, a.slug)} (${a.title.length})`);
    expect(tooLong).toEqual([]);
  });

  it("keeps every meta description inside the rendered window", () => {
    const bad = articles
      .filter(
        (a) =>
          a.description.length < DESCRIPTION_MIN ||
          a.description.length > DESCRIPTION_MAX,
      )
      .map(
        (a) =>
          `${learnArticleKey(a.vertical, a.slug)} (${a.description.length})`,
      );
    expect(bad).toEqual([]);
  });

  it("never ships duplicate titles, descriptions, or h1s", () => {
    for (const field of ["title", "description", "h1"] as const) {
      const seen = new Map<string, string[]>();
      articles.forEach((a) => {
        const key = a[field];
        seen.set(key, [...(seen.get(key) ?? []), a.slug]);
      });
      const dupes = [...seen.entries()].filter(([, v]) => v.length > 1);
      expect(dupes, `duplicate ${field}`).toEqual([]);
    }
  });
});

describe("learn compliance copy", () => {
  it("pairs every compounded-medication mention with the not-FDA-approved disclaimer", () => {
    const missing = articles
      .filter((a) => /compounded (semaglutide|tirzepatide)/i.test(prose(a)))
      .filter((a) => !/not FDA-approved/i.test(prose(a)))
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(missing).toEqual([]);
  });

  it("puts the legally-available clause in FAQs that offer compounded product", () => {
    const offering =
      /prescrib|offer|cost|price|starter pack|if prescribed|may ship|live offering|cash-pay|sales page|money page/i;
    const missing = articles.flatMap((a) =>
      a.faqs
        .filter((f) => /compounded (semaglutide|tirzepatide)/i.test(f.answer))
        .filter((f) => offering.test(f.answer))
        .filter((f) => !/do not describe compounded/i.test(f.answer))
        .filter(
          (f) =>
            !/not FDA-approved/i.test(f.answer) ||
            !/considered only when legally available and clinically appropriate/i.test(
              f.answer,
            ),
        )
        .map((f) => `${learnArticleKey(a.vertical, a.slug)}: ${f.question}`),
    );
    expect(missing).toEqual([]);
  });

  it("never promises a prescription or a weight-loss outcome", () => {
    // Negated forms ("there is no guaranteed weight loss") are the protective
    // phrasing these pages are supposed to use, so only affirmative claims fail.
    const banned =
      /(?<!\b(?:no|not|never|without)\s)\b(guaranteed results|we will prescribe|you will receive a prescription|guaranteed weight loss|results guaranteed)\b/i;
    const offenders = articles
      .filter((a) => banned.test(prose(a)))
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(offenders).toEqual([]);
  });

  it("never claims a LegitScript endorsement in article copy", () => {
    const banned =
      /legitscript[^\n.]{0,80}(endors|seal of approval|approved by)|endorsed by legit.?script/i;
    const offenders = articles
      .filter((a) => banned.test(prose(a)))
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(offenders).toEqual([]);
  });

  it("answers YES on the buy/get-online campaign pages", () => {
    const slugs = [
      "online-glp-1",
      "tirzepatide-online",
      "glp-1-near-me",
      "glp-1-for-weight-loss",
      "tirzepatide-in-houston",
    ];
    const missing = slugs.filter((slug) => {
      const article = articles.find((a) => a.slug === slug);
      return !article?.faqs.some((f) => /^yes\b/i.test(f.answer.trim()));
    });
    expect(missing).toEqual([]);
  });

  it("states 50-state coverage and USA-only on commercial companions", () => {
    const slugs = [
      "online-glp-1",
      "tirzepatide-online",
      "glp-1-near-me",
      "glp-1-for-weight-loss",
      "glp-1-weight-loss-program",
      "glp-1-doctor",
      "glp-1-in-texas",
      "glp-1-in-houston",
      "semaglutide-weight-loss",
      "semaglutide-in-texas",
      "semaglutide-in-houston",
      "tirzepatide-in-houston",
      "tirzepatide-in-texas",
      "glp-1-near-me",
      "best-glp-1-for-weight-loss",
      "glp-1-cost",
    ];
    const missing = slugs.flatMap((slug) => {
      const article = articles.find((a) => a.slug === slug);
      if (!article) return [`missing article: ${slug}`];
      const text = prose(article);
      const issues: string[] = [];
      if (!/all 50 (US |U\.S\. )?states|50-state/i.test(text)) {
        issues.push(`${slug}: missing 50-state`);
      }
      if (
        !/united states only|usa only|only the united states|only the usa/i.test(
          text,
        )
      ) {
        issues.push(`${slug}: missing USA-only`);
      }
      return issues;
    });
    expect(missing).toEqual([]);
  });
});

describe("learn citations", () => {
  /**
   * Sources are what carry E-E-A-T on YMYL pages. A hand-audit found 14 dead
   * links behind plausible-looking paths, so every host is pinned to a body
   * that actually publishes primary medical or regulatory material.
   */
  const ALLOWED_HOSTS = [
    "doi.org",
    "www.nejm.org",
    "jamanetwork.com",
    "academic.oup.com",
    "dom-pubs.onlinelibrary.wiley.com",
    "pubmed.ncbi.nlm.nih.gov",
    "www.ncbi.nlm.nih.gov",
    "www.fda.gov",
    "www.accessdata.fda.gov",
    "dailymed.nlm.nih.gov",
    "medlineplus.gov",
    "www.niddk.nih.gov",
    "www.nccih.nih.gov",
    "www.nimh.nih.gov",
    "www.niaaa.nih.gov",
    "www.nhlbi.nih.gov",
    "www.cancer.gov",
    "www.cdc.gov",
    "odphp.health.gov",
    "telehealth.hhs.gov",
    "www.womenshealth.gov",
    "nap.nationalacademies.org",
    "www.acog.org",
    "www.aad.org",
    "www.asahq.org",
    "www.thyroid.org",
    "menopause.org",
    "www.healthinaging.org",
    "www.tsa.gov",
    "www.govinfo.gov",
    "www.federalregister.gov",
    "statutes.capitol.texas.gov",
    "texreg.sos.state.tx.us",
    "publichealth.harriscountytx.gov",
    "pi.lilly.com",
    "medical.lilly.com",
    "investor.lilly.com",
    "www.lilly.com",
    "www.novo-pi.com",
    "www.novonordiskmedical.com",
    "www.prnewswire.com",
    "www.nmpa.gov.cn",
    "beemahealth.com",
  ];

  it("cites only https URLs from recognized primary sources", () => {
    const bad: string[] = [];
    articles.forEach((a) =>
      a.sources.forEach((s) => {
        const url = new URL(s.href);
        if (
          url.protocol !== "https:" ||
          !ALLOWED_HOSTS.includes(url.hostname)
        ) {
          bad.push(`${a.slug}: ${s.href}`);
        }
      }),
    );
    expect(bad).toEqual([]);
  });

  it("gives every published article at least two sources with real labels", () => {
    const thin = articles
      .filter(
        (a) =>
          a.sources.length < 2 ||
          a.sources.some((s) => s.label.trim().length < 8),
      )
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(thin).toEqual([]);
  });
});

describe("learn internal linking", () => {
  const keys = new Set(
    articles.map((a) => learnArticleKey(a.vertical, a.slug)),
  );

  it("resolves every relatedSlug on a published article", () => {
    const dangling: string[] = [];
    articles.forEach((a) =>
      a.relatedSlugs.forEach((slug) => {
        if (!keys.has(learnArticleKey(a.vertical, slug))) {
          dangling.push(`${a.slug} -> ${slug}`);
        }
      }),
    );
    expect(dangling).toEqual([]);
  });

  it("never lets an article link to itself", () => {
    const selfLinks = articles
      .filter((a) => a.relatedSlugs.includes(a.slug))
      .map((a) => a.slug);
    expect(selfLinks).toEqual([]);
  });

  it("resolves every declared money-page href", () => {
    const broken = articles
      .filter(
        (a) =>
          resolveMoneyPageHrefs(a.moneyPageHrefs).length !==
          a.moneyPageHrefs.length,
      )
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(broken).toEqual([]);
  });

  it("leaves no orphaned weight-loss article", () => {
    const weightLoss = articles.filter((a) => a.vertical === "weight-loss");
    const inbound = new Map(weightLoss.map((a) => [a.slug, 0]));
    weightLoss.forEach((a) =>
      a.relatedSlugs.forEach((slug) => {
        if (inbound.has(slug)) inbound.set(slug, (inbound.get(slug) ?? 0) + 1);
      }),
    );
    const orphans = [...inbound.entries()]
      .filter(([, n]) => n === 0)
      .map(([slug]) => slug);
    expect(orphans).toEqual([]);
  });

  it("keeps placeholder slugs out of published content", () => {
    const placeholder =
      /not-landed-yet|also-missing-sibling|does-not-exist|not-yet-published|lorem|tbd|todo/i;
    const offenders = articles
      .filter(
        (a) =>
          a.relatedSlugs.some((s) => placeholder.test(s)) ||
          a.moneyPageHrefs.some((h) => placeholder.test(h)),
      )
      .map((a) => learnArticleKey(a.vertical, a.slug));
    expect(offenders).toEqual([]);
    // the unpublished fixture is where dangling-link behaviour is exercised
    expect(
      peekArticle("weight-loss", "_glob-fixture")?.relatedSlugs,
    ).not.toEqual([]);
  });
});

describe("learn pricing and hub status", () => {
  it("only quotes dollar amounts the pricing module can explain", () => {
    const known = new Set(
      listKnownPricingUsdAmounts().map((n) => n.toFixed(2)),
    );
    const unknown: string[] = [];
    for (const article of articles) {
      const quoted = prose(article).matchAll(/\$([\d,]+(?:\.\d+)?)/g);
      for (const match of quoted) {
        const n = Number(match[1]!.replace(/,/g, ""));
        if (!Number.isFinite(n)) continue;
        if (!known.has(n.toFixed(2))) {
          unknown.push(`${article.slug}: $${match[1]}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("does not imply HRT is a coming-soon product", () => {
    expect(LEARN_HUBS.hrt.meta.eyebrow).not.toMatch(/coming-soon/i);
    expect(LEARN_HUBS.hrt.meta.eyebrow).toMatch(/educational only/i);
  });

  it("does not imply the paused TRT vertical is a live offering", () => {
    // TRT briefly launched 2026-08-27 as compounded enclomiphene but paused
    // again 2026-08-28 - the hub must read as educational-only, same as HRT,
    // until it relaunches.
    expect(LEARN_HUBS.trt.meta.eyebrow).toMatch(/educational only/i);
    expect(LEARN_HUBS.trt.meta.description).toMatch(
      /does not currently offer/i,
    );
  });
});
