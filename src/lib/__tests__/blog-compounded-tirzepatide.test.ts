import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getArticle, listArticles } from "@/content/blog/articles";
import { article } from "@/content/blog/articles/compounded-tirzepatide-vs-brand-name";
import { segmentBlogBlocks } from "@/content/blog/faq";
import { plainBlogText } from "@/content/blog/parse";
import type { BlogBlock } from "@/content/blog/types";
import { blogArticleJsonLd, blogFaqItems } from "@/lib/blog-seo";
import {
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
} from "@/lib/medication-pricing";
import { SITE_URL } from "@/lib/seo";

const root = resolve(__dirname, "../../..");
const source = readFileSync(
  resolve(
    __dirname,
    "../../content/blog/articles/compounded-tirzepatide-vs-brand-name.ts",
  ),
  "utf8",
);
const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
const llms = readFileSync(resolve(root, "public/llms.txt"), "utf8");

function blocksText(blocks: readonly BlogBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "paragraph") return plainBlogText(block.inlines);
      if (block.type === "image") return block.alt;
      if (block.type === "chart") return "";
      return block.items.map((item) => plainBlogText(item)).join("\n");
    })
    .join("\n");
}

function hrefs(): string[] {
  const found: string[] = [];
  for (const block of article.blocks) {
    const groups =
      block.type === "list"
        ? block.items
        : block.type === "paragraph"
          ? [block.inlines]
          : [];
    for (const group of groups)
      for (const inline of group)
        if (inline.type === "link") found.push(inline.href);
  }
  return found;
}

const text = blocksText(article.blocks);

describe("compounded vs brand-name tirzepatide article", () => {
  it("has valid metadata and is registered", () => {
    expect(article.slug).toBe("compounded-tirzepatide-vs-brand-name");
    expect(article.title.length).toBeLessThanOrEqual(60);
    expect(article.metaDescription.length).toBeGreaterThanOrEqual(120);
    expect(article.metaDescription.length).toBeLessThanOrEqual(160);
    expect(listArticles().map((a) => a.slug)).toContain(article.slug);
    expect(getArticle(article.slug)).toEqual(article);
    const slugs = listArticles().map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const titles = listArticles().map((a) => a.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("answers the title question early and says it is not a generic", () => {
    const early = article.blocks
      .slice(0, 3)
      .map((b) => (b.type === "paragraph" ? plainBlogText(b.inlines) : ""))
      .join(" ");
    expect(early).toContain("not an FDA-approved generic");
    expect(early).toContain("may cost less");
  });

  it("contains no dashes, review claims, or banned equivalence language", () => {
    expect(source).not.toMatch(/[—–]/);
    const lower = text.toLowerCase();
    expect(lower).not.toContain("medically reviewed");
    expect(lower).not.toContain("clinically proven");
    expect(lower).not.toMatch(/same active ingredient/);
    expect(lower).not.toMatch(/\bgeneric (zepbound|mounjaro)\b/);
    expect(lower).not.toMatch(/affordable alternative/);
    expect(lower).not.toMatch(/\bTirz100\b/i);
    expect(text).not.toMatch(/\bBeema\b(?! Health)/);
  });

  it("names brand products only in comparison, never as Beema offerings", () => {
    expect(text).toContain("We do not sell or dispense Zepbound or Mounjaro");
    expect(text).toContain("not FDA-approved");
    expect(text).toContain("prescribing is never guaranteed");
    expect(text).not.toMatch(/Beema Health (offers|sells) (Zepbound|Mounjaro)/);
  });

  it("ends with the medical disclaimer", () => {
    const last = article.blocks[article.blocks.length - 1];
    expect(last?.type).toBe("paragraph");
    expect(last?.type === "paragraph" && last.disclaimer).toBe(true);
  });

  it("pulls every price from the pricing source of truth", () => {
    const p = COMPOUNDED_TIRZEPATIDE_PRICING;
    for (const amount of [
      p.starterPack.totalUsd,
      getPlan(p, 1).monthlyUsd,
      getPlan(p, 3).totalUsd,
      getPlan(p, 6).totalUsd,
      getPlan(p, 12).totalUsd,
    ]) {
      expect(text).toContain(formatUsd(amount));
    }
    expect(source).not.toMatch(/\$\d/);
  });

  it("links home, money pages, a Learn guide and primary sources that exist", () => {
    const links = hrefs();
    for (const href of [
      "/",
      "/glp-1/",
      "/tirzepatide/",
      "/safety/",
      "/recipes/",
      "/learn/weight-loss/glp-1-cost/",
      "/learn/weight-loss/exercise-on-glp-1/",
      "/learn/weight-loss/glp-1-diet/",
    ]) {
      expect(links).toContain(href);
      if (href !== "/")
        expect(sitemap).toContain(`<loc>${SITE_URL}${href}</loc>`);
    }
    for (const href of links.filter((h) => h.startsWith("https://"))) {
      expect(href).not.toMatch(/utm_|chatgpt/);
    }
    expect(links.some((h) => h.startsWith("https://www.fda.gov/"))).toBe(true);
    expect(links.some((h) => h.includes("dailymed.nlm.nih.gov"))).toBe(true);
  });

  it("is in the sitemap and llms.txt", () => {
    const url = `${SITE_URL}/blogs/${article.slug}/`;
    expect(sitemap).toContain(`<loc>${url}</loc>`);
    expect(llms).toContain(url);
  });

  it("keeps heading order valid with a single template H1", () => {
    const headings = article.blocks.flatMap((b) =>
      b.type === "heading" ? [b] : [],
    );
    expect(headings[0]?.level).toBe(2);
    let last = 1;
    for (const h of headings) {
      expect(h.level - last).toBeLessThanOrEqual(1);
      last = h.level;
    }
  });

  it("emits FAQPage JSON-LD that matches the visible accordion", () => {
    const faqs = blogFaqItems(article.blocks);
    expect(faqs.length).toBe(7);
    const [posting, faq] = blogArticleJsonLd(
      article,
      `/blogs/${article.slug}/`,
    ) as Record<string, unknown>[];
    expect(posting).toMatchObject({ "@type": "BlogPosting" });
    expect(JSON.stringify(posting)).not.toContain("reviewedBy");
    expect(faq).toMatchObject({ "@type": "FAQPage" });
    const accordion = segmentBlogBlocks(article.blocks).find(
      (s) => s.kind === "faq",
    );
    expect(accordion?.kind === "faq" && accordion.entries.length).toBe(7);
  });

  it("frames the switching story as an anecdote, not evidence", () => {
    expect(text).toContain("That is an anecdote, not data");
    expect(text).toContain("does not have clinical outcome data");
  });
});
