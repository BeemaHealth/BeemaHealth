import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getArticle,
  getRelatedArticles,
  listAllArticles,
  listArticles,
  listDiscoveredKeys,
  peekArticle,
  resolveLearnArticleCtaId,
} from "@/content/learn/registry";
import { WEIGHT_LOSS_CLUSTERS } from "@/content/learn/hubs";
import { resolveMoneyPageHrefs } from "@/content/learn/money-pages";
import { getLearnSitemapEntries } from "@/content/learn/sitemap";
import {
  LEARN_VERTICALS,
  isLearnVertical,
  learnArticleKey,
  learnPath,
} from "@/content/learn/types";
import { learnArticleJsonLd } from "@/lib/learn-seo";
import { CTA_IDS } from "@/lib/cta-ids";
import { INITIAL_RESEARCH_FAQ } from "@/lib/learn/initial-research";

const DASHES = /[\u2014\u2013]/;
const ROOT = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function walkTsFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("learnPath helpers", () => {
  it("builds trailing-slash hub and article paths", () => {
    expect(learnPath("weight-loss")).toBe("/learn/weight-loss/");
    expect(learnPath("weight-loss", "glp-1-side-effects")).toBe(
      "/learn/weight-loss/glp-1-side-effects/",
    );
    expect(learnPath("trt", "what-is-trt")).toBe("/learn/trt/what-is-trt/");
    expect(learnPath("hrt")).toBe("/learn/hrt/");
  });

  it("narrows known verticals and rejects unknown ones", () => {
    expect(isLearnVertical("weight-loss")).toBe(true);
    expect(isLearnVertical("trt")).toBe(true);
    expect(isLearnVertical("hrt")).toBe(true);
    expect(isLearnVertical("ed")).toBe(true);
    expect(isLearnVertical("hairloss")).toBe(true);
    expect(isLearnVertical("peptides")).toBe(false);
    expect(isLearnVertical("resistance-training")).toBe(false);
  });
});

describe("learn registry glob", () => {
  const registrySrc = read("src/content/learn/registry.ts");

  it("discovers articles with import.meta.glob and no manual import list", () => {
    expect(registrySrc).toContain("import.meta.glob");
    expect(registrySrc).toContain("./articles/**/*.ts");
    expect(registrySrc).not.toMatch(
      /from ["']\.\/articles\/(weight-loss|trt|hrt)\//,
    );
    expect(listDiscoveredKeys()).toContain("weight-loss/_glob-fixture");
    expect(listDiscoveredKeys()).toContain("trt/what-is-trt");
    expect(listDiscoveredKeys()).toContain("hrt/what-is-hrt");
    expect(listDiscoveredKeys()).toContain("ed/tadalafil-dosing");
    expect(listDiscoveredKeys()).toContain(
      "hairloss/finasteride-for-hair-loss",
    );
  });

  it("indexes the unpublished fixture but does not publish it", () => {
    const fixture = peekArticle("weight-loss", "_glob-fixture");
    expect(fixture?.slug).toBe("_glob-fixture");
    expect(getArticle("weight-loss", "_glob-fixture")).toBeUndefined();
    expect(
      listArticles("weight-loss").some((article) =>
        article.slug.startsWith("_"),
      ),
    ).toBe(false);
    expect(
      listAllArticles().some((article) => article.slug.startsWith("_")),
    ).toBe(false);
  });

  it("returns undefined for unknown slugs instead of throwing", () => {
    expect(getArticle("weight-loss", "not-a-real-slug")).toBeUndefined();
    expect(getArticle("peptides", "what-is-trt")).toBeUndefined();
    expect(getArticle("trt", "what-is-hrt")).toBeUndefined();
  });

  it("skips missing relatedSlugs safely", () => {
    const fixture = peekArticle("weight-loss", "_glob-fixture");
    expect(fixture).toBeDefined();
    expect(getRelatedArticles(fixture!, 6)).toEqual([]);

    const trt = getArticle("trt", "what-is-trt");
    expect(trt).toBeDefined();
    expect(getRelatedArticles(trt!, 6)).toEqual([]);
  });

  it("offers money-page links only when those routes exist", () => {
    const fixture = peekArticle("weight-loss", "_glob-fixture");
    expect(resolveMoneyPageHrefs(fixture!.moneyPageHrefs)).toEqual([
      { href: "/weight-loss/", label: "Medical weight-loss program" },
      { href: "/semaglutide/", label: "Compounded semaglutide" },
    ]);
    expect(resolveMoneyPageHrefs(["/pricing/", "/nope"])).toEqual([]);
  });

  it("lists live stub articles by vertical", () => {
    expect(listArticles("trt").map((article) => article.slug)).toEqual([
      "what-is-trt",
    ]);
    expect(listArticles("hrt").map((article) => article.slug)).toEqual([
      "what-is-hrt",
    ]);
    const keys = listAllArticles().map((article) =>
      learnArticleKey(article.vertical, article.slug),
    );
    expect(keys).toContain("hrt/what-is-hrt");
    expect(keys).toContain("trt/what-is-trt");
    expect(keys.some((key) => key.startsWith("weight-loss/_"))).toBe(false);
  });

  it("covers every article file under articles/", () => {
    const articlesRoot = resolve(ROOT, "src/content/learn/articles");
    const files = walkTsFiles(articlesRoot);
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const match = file.match(/articles\/([^/]+)\/([^/]+)\.ts$/);
      expect(match, file).not.toBeNull();
      const vertical = match![1];
      const slug = match![2];
      expect(listDiscoveredKeys()).toContain(`${vertical}/${slug}`);
    }
  });
});

describe("learn JSON-LD helpers", () => {
  it("emits MedicalWebPage plus Article fields and omits FAQPage when faqs are empty", () => {
    const fixture = peekArticle("weight-loss", "_glob-fixture");
    const json = learnArticleJsonLd(fixture!);
    expect(json["@type"]).toEqual(["MedicalWebPage", "Article"]);
    expect(json.headline).toBe(fixture!.title);
    expect(json.datePublished).toBe("2026-08-24");
    expect(json.dateModified).toBe("2026-08-24");
    expect(json.url).toContain("/learn/weight-loss/_glob-fixture/");
  });

  it("keeps TRT articles off the weight-loss CTA switchboard", () => {
    const article = getArticle("trt", "what-is-trt");
    expect(article?.ctaId).toBeUndefined();
    expect(article?.vertical).toBe("trt");
    expect(CTA_IDS.learn_weight_loss).toBe("learn_weight_loss");
  });
});

describe("learn copy has no em or en dashes", () => {
  const learnRoots = [
    resolve(ROOT, "src/content/learn"),
    resolve(ROOT, "src/components/learn"),
    resolve(ROOT, "src/lib/learn-seo.ts"),
    resolve(ROOT, "src/routes/learn.index.tsx"),
    resolve(ROOT, "src/routes/learn"),
  ];

  it("does not use Unicode dashes in new learn files", () => {
    const files = learnRoots.flatMap((root) => {
      try {
        return walkTsFiles(root);
      } catch {
        return [root];
      }
    });
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      expect(source, file).not.toMatch(DASHES);
    }
  });

  it("does not invent a live HRT product, and describes the real TRT offering accurately", () => {
    const trtHub = read("src/content/learn/hubs.ts");
    // TRT went live 2026-08-27 as compounded enclomiphene (see /trt) - a
    // different mechanism than the injectable/gel/patch testosterone this
    // hub describes, so the hub must say so rather than claim the
    // injectable/gel/patch category itself is Beema Health's offering.
    expect(trtHub).toMatch(/compounded enclomiphene/i);
    expect(trtHub).toMatch(
      /does not currently offer menopausal hormone therapy/i,
    );
    expect(trtHub).not.toMatch(/buy GLP-1 online/i);
  });
});

describe("learn verticals", () => {
  it("locks the three vertical slugs", () => {
    expect(LEARN_VERTICALS).toEqual([
      "weight-loss",
      "trt",
      "hrt",
      "ed",
      "hairloss",
    ]);
  });
});

describe("published learn inventory", () => {
  it("publishes the landed article counts by vertical", () => {
    expect(listArticles("weight-loss")).toHaveLength(81);
    expect(listArticles("trt")).toHaveLength(1);
    expect(listArticles("hrt")).toHaveLength(1);
    expect(listArticles("ed")).toHaveLength(4);
    expect(listArticles("hairloss")).toHaveLength(1);
    expect(listAllArticles()).toHaveLength(88);
  });

  it("keeps slugs unique within and across verticals", () => {
    const published = listAllArticles();
    const keys = published.map((article) =>
      learnArticleKey(article.vertical, article.slug),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(published.map((article) => article.slug)).size).toBe(
      published.length,
    );
  });

  it("lists every published weight-loss article in a hub cluster", () => {
    const clusterSlugs = WEIGHT_LOSS_CLUSTERS.flatMap((cluster) => [
      ...cluster.slugs,
    ]);
    expect(new Set(clusterSlugs).size).toBe(clusterSlugs.length);

    for (const cluster of WEIGHT_LOSS_CLUSTERS) {
      const live = cluster.slugs.filter((slug) =>
        getArticle("weight-loss", slug),
      );
      expect(live, cluster.id).toEqual([...cluster.slugs]);
    }

    const publishedSlugs = listArticles("weight-loss").map(
      (article) => article.slug,
    );
    expect(publishedSlugs.sort()).toEqual([...clusterSlugs].sort());
  });

  it("resolves related links for a representative article", () => {
    const article = getArticle("weight-loss", "glp-1-side-effects");
    expect(article).toBeDefined();
    const related = getRelatedArticles(article!, 6);
    expect(related.length).toBeGreaterThan(0);
    expect(
      related.every((item) => item.vertical === "weight-loss" && item.slug),
    ).toBe(true);
  });

  it("never attaches a weight-loss CTA to TRT, HRT, ED, or hairloss articles", () => {
    const trt = getArticle("trt", "what-is-trt");
    const hrt = getArticle("hrt", "what-is-hrt");
    const ed = getArticle("ed", "tadalafil-dosing");
    const hairloss = getArticle("hairloss", "finasteride-for-hair-loss");
    expect(trt?.ctaId).toBeUndefined();
    expect(hrt?.ctaId).toBeUndefined();
    expect(ed?.ctaId).toBeUndefined();
    expect(hairloss?.ctaId).toBeUndefined();
    expect(resolveLearnArticleCtaId(trt!)).toBeUndefined();
    expect(resolveLearnArticleCtaId(hrt!)).toBeUndefined();
    expect(resolveLearnArticleCtaId(ed!)).toBeUndefined();
    expect(resolveLearnArticleCtaId(hairloss!)).toBeUndefined();
    expect(
      resolveLearnArticleCtaId(getArticle("weight-loss", "travel-with-glp-1")!),
    ).toBe(CTA_IDS.learn_weight_loss);
  });

  it("feeds every published article into the sitemap generator", () => {
    const paths = new Set(getLearnSitemapEntries().map((entry) => entry.path));
    expect(paths.has("/learn/")).toBe(true);
    expect(paths.has("/learn/weight-loss/")).toBe(true);
    expect(paths.has("/learn/trt/")).toBe(true);
    expect(paths.has("/learn/hrt/")).toBe(true);
    expect(paths.has("/learn/ed/")).toBe(true);
    expect(paths.has("/learn/hairloss/")).toBe(true);
    for (const article of listAllArticles()) {
      expect(paths.has(learnPath(article.vertical, article.slug))).toBe(true);
    }
    expect([...paths].some((path) => path.includes("_glob-fixture"))).toBe(
      false,
    );
    expect(getLearnSitemapEntries()).toHaveLength(98);
  });
});

describe("learn compliance copy", () => {
  const BANNED =
    /same active ingredient|compounded alternative|generic of (?:Ozempic|Wegovy|Mounjaro|Zepbound)/i;

  it("does not use banned compounded-versus-brand comparisons in new articles", () => {
    const articlesRoot = resolve(ROOT, "src/content/learn/articles");
    for (const file of walkTsFiles(articlesRoot)) {
      expect(readFileSync(file, "utf-8"), file).not.toMatch(BANNED);
    }
  });

  it("does not claim compounded products use the same active ingredient on live initial-research", () => {
    const combined = INITIAL_RESEARCH_FAQ.map((item) => item.a).join("\n");
    expect(combined).not.toMatch(/same active ingredient/i);
    expect(combined).toMatch(/not FDA-approved/i);
    expect(combined).toMatch(/not therapeutically equivalent/i);
  });
});
