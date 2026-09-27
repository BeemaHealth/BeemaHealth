import { getArticle } from "@/content/learn/registry";
import { learnPath, type LearnVertical } from "@/content/learn/types";

/**
 * Guides surfaced from each program page.
 *
 * The /learn/ library only received authority through the hub, so the pages
 * written to answer paid-search queries sat three hops from the homepage with
 * nothing linking to them from the pages that actually rank. This map wires
 * each program page to the guides that answer its own ad keywords, which both
 * gives a visitor the obvious next question and passes internal authority to
 * the page targeting that query.
 *
 * Every entry lists the live Google Ads keywords it serves so the mapping can
 * be re-checked when the account changes. Weight-loss and ED money pages
 * (added 2026-09-03: /tadalafil/, /sildenafil/, /ed-mints/) have guide sets;
 * TRT, HRT, hair-loss, and peptide verticals remain education-only until
 * those programs launch their own dedicated money pages. The 3 Boston ED
 * landing pages (added 2026-09-27: /tadalafil-boston/, /sildenafil-boston/,
 * /ed-mints-boston/) reuse their nationwide sibling's article set with
 * Boston-specific adKeywords for the same reason - see
 * docs/features/treatment-pages.md "City ED pages".
 */
export type MoneyPageGuideSet = {
  /** Program page path, trailing slash, matching the canonical. */
  path: string;
  /** Heading rendered above the guide list. */
  heading: string;
  /** Ad keywords this set is meant to support. Documentation, not behaviour. */
  adKeywords: readonly string[];
  /** Article keys, most relevant first. */
  articles: readonly { vertical: LearnVertical; slug: string }[];
};

const wl = (slug: string) => ({ vertical: "weight-loss" as const, slug });
const ed = (slug: string) => ({ vertical: "ed" as const, slug });

export const MONEY_PAGE_GUIDES: readonly MoneyPageGuideSet[] = [
  {
    path: "/semaglutide/",
    heading: "Semaglutide questions people ask before starting",
    adKeywords: [
      "semaglutide weight loss",
      "semaglutide weight loss program",
      "semaglutide texas",
      "semaglutide houston",
      "semaglutide doctor houston",
      "semaglutide weight loss houston",
      "semaglutide online houston",
    ],
    articles: [
      wl("semaglutide-weight-loss"),
      wl("semaglutide-in-houston"),
      wl("semaglutide-in-texas"),
      wl("glp-1-weight-loss-program"),
      wl("glp-1-doctor"),
      wl("glp-1-cost"),
    ],
  },
  {
    path: "/tirzepatide/",
    heading: "Tirzepatide questions people ask before starting",
    adKeywords: [
      "tirzepatide online",
      "tirzepatide texas",
      "tirzepatide houston",
      "tirzepatide doctor houston",
    ],
    articles: [
      wl("tirzepatide-online"),
      wl("tirzepatide-in-houston"),
      wl("tirzepatide-in-texas"),
      wl("glp-1-doctor"),
      wl("foods-to-avoid-on-tirzepatide"),
      wl("stopping-tirzepatide"),
    ],
  },
  {
    path: "/glp-1/",
    heading: "GLP-1 questions people ask before starting",
    adKeywords: [
      "glp 1 weight loss",
      "glp 1 treatment",
      "glp 1 online",
      "glp1 online",
      "online glp1",
      "buy glp 1 online",
      "get glp 1 online",
      "glp 1 doctor",
      "glp 1 near me",
      "best glp 1 for weight loss",
      "glp 1 drugs for weight loss",
      "glp 1 peptide for weight loss",
      "glp 1 weight loss program",
    ],
    articles: [
      wl("glp-1-for-weight-loss"),
      wl("glp-1-weight-loss-program"),
      wl("best-glp-1-for-weight-loss"),
      wl("online-glp-1"),
      wl("glp-1-near-me"),
      wl("glp-1-doctor"),
      wl("glp-1-cost"),
      wl("glp-1-side-effects"),
    ],
  },
  {
    path: "/semaglutide-houston/",
    heading: "Semaglutide questions from Houston patients",
    adKeywords: [
      "semaglutide houston",
      "semaglutide online houston",
      "semaglutide weight loss houston",
      "semaglutide weight loss",
      "semaglutide online",
    ],
    articles: [
      wl("semaglutide-in-houston"),
      wl("tirzepatide-in-houston"),
      wl("semaglutide-in-texas"),
      wl("semaglutide-weight-loss"),
      wl("glp-1-doctor"),
      wl("glp-1-cost"),
    ],
  },
  {
    path: "/tirzepatide-houston/",
    heading: "Tirzepatide questions from Houston patients",
    adKeywords: [
      "tirzepatide houston",
      "tirzepatide online houston",
      "tirzepatide doctor houston",
      "tirzepatide weight loss houston",
      "tirzepatide online",
    ],
    articles: [
      wl("tirzepatide-in-houston"),
      wl("semaglutide-in-houston"),
      wl("tirzepatide-in-texas"),
      wl("tirzepatide-online"),
      wl("glp-1-doctor"),
      wl("stopping-tirzepatide"),
    ],
  },
  {
    path: "/glp-1-houston/",
    heading: "GLP-1 questions from Houston and Texas patients",
    adKeywords: [
      "glp 1 houston",
      "glp 1 weight loss houston",
      "glp 1 doctor houston",
      "semaglutide houston",
      "tirzepatide houston",
    ],
    articles: [
      wl("glp-1-in-houston"),
      wl("tirzepatide-in-houston"),
      wl("semaglutide-in-houston"),
      wl("tirzepatide-in-texas"),
      wl("glp-1-doctor"),
      wl("online-glp-1"),
      wl("glp-1-cost"),
    ],
  },
  {
    path: "/weight-loss/",
    heading: "Weight-loss questions people ask before starting",
    adKeywords: ["weight loss", "glp 1 drugs for weight loss"],
    articles: [
      wl("glp-1-for-weight-loss"),
      wl("glp-1-weight-loss-program"),
      wl("online-glp-1"),
      wl("semaglutide-weight-loss"),
      wl("best-glp-1-for-weight-loss"),
      wl("glp-1-cost"),
      wl("glp-1-side-effects"),
      wl("rebound-weight-gain-after-glp-1"),
    ],
  },
  {
    path: "/tadalafil/",
    heading: "Tadalafil questions people ask before starting",
    adKeywords: ["tadalafil dosage", "tadalafil online", "cialis dosage"],
    articles: [
      ed("tadalafil-dosing"),
      ed("sildenafil-dosing"),
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
    ],
  },
  {
    path: "/sildenafil/",
    heading: "Sildenafil questions people ask before starting",
    adKeywords: ["sildenafil dosage", "sildenafil online", "viagra dosage"],
    articles: [
      ed("sildenafil-dosing"),
      ed("tadalafil-dosing"),
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
    ],
  },
  {
    path: "/ed-mints/",
    heading: "ED Mints questions people ask before starting",
    adKeywords: [
      "ed mints",
      "dissolvable ed medication",
      "tadalafil sildenafil combo",
    ],
    articles: [
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
      ed("tadalafil-dosing"),
      ed("sildenafil-dosing"),
    ],
  },
  {
    path: "/tadalafil-boston/",
    heading: "Tadalafil questions Boston patients ask before starting",
    adKeywords: [
      "tadalafil boston",
      "tadalafil online boston",
      "tadalafil prescription boston",
      "tadalafil cost boston",
      "cialis boston",
      "cialis online boston",
    ],
    articles: [
      ed("tadalafil-dosing"),
      ed("sildenafil-dosing"),
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
    ],
  },
  {
    path: "/sildenafil-boston/",
    heading: "Sildenafil questions Boston patients ask before starting",
    adKeywords: [
      "sildenafil boston",
      "sildenafil online boston",
      "sildenafil prescription boston",
      "sildenafil cost boston",
      "viagra online boston",
    ],
    articles: [
      ed("sildenafil-dosing"),
      ed("tadalafil-dosing"),
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
    ],
  },
  {
    path: "/ed-mints-boston/",
    heading: "ED Mints questions Boston patients ask before starting",
    adKeywords: [
      "ed treatment boston",
      "ed meds online boston",
      "ed medication boston",
      "online ed treatment massachusetts",
      "ed pills boston",
    ],
    articles: [
      ed("tadalafil-sildenafil-combo"),
      ed("sildenafil-tadalafil-oxytocin"),
      ed("tadalafil-dosing"),
      ed("sildenafil-dosing"),
    ],
  },
];

export type ResolvedGuide = {
  href: string;
  title: string;
  description: string;
};

/** Published guides for a program page. Unknown slugs are skipped, never thrown. */
export function guidesForMoneyPage(path: string): ResolvedGuide[] {
  const set = MONEY_PAGE_GUIDES.find((entry) => entry.path === path);
  if (!set) return [];
  return set.articles.flatMap((ref) => {
    const article = getArticle(ref.vertical, ref.slug);
    if (!article) return [];
    return [
      {
        href: learnPath(article.vertical, article.slug),
        title: article.title,
        description: article.description,
      },
    ];
  });
}

/** Heading for a program page's guide block, empty when it has none. */
export function guideHeadingForMoneyPage(path: string): string {
  return MONEY_PAGE_GUIDES.find((entry) => entry.path === path)?.heading ?? "";
}
