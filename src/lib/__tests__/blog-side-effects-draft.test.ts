import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getArticle, listArticles } from "@/content/blog/articles";
import { article } from "@/content/blog/articles/peptide-side-effects-bpc-157-tb-500-ghk-cu-mots-c-sermorelin";
import { segmentBlogBlocks } from "@/content/blog/faq";
import { plainBlogText } from "@/content/blog/parse";
import type { BlogBlock, BlogInline } from "@/content/blog/types";
import { blogArticleJsonLd, blogFaqItems } from "@/lib/blog-seo";

const root = resolve(__dirname, "../../..");
const sourcePath = resolve(
  root,
  "src/content/blog/articles/peptide-side-effects-bpc-157-tb-500-ghk-cu-mots-c-sermorelin.ts",
);
const source = readFileSync(sourcePath, "utf8");
const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
const llms = readFileSync(resolve(root, "public/llms.txt"), "utf8");

function inlinesOf(block: BlogBlock): BlogInline[][] {
  if (block.type === "list") return block.items;
  if (block.type === "paragraph") return [block.inlines];
  return [];
}

function bodyText(): string {
  return article.blocks
    .map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "image") return block.alt;
      return inlinesOf(block)
        .map((group) => plainBlogText(group))
        .join("\n");
    })
    .join("\n");
}

function allLinks(): string[] {
  return article.blocks.flatMap((block) =>
    inlinesOf(block).flatMap((group) =>
      group.flatMap((inline) => (inline.type === "link" ? [inline.href] : [])),
    ),
  );
}

describe("peptide side effects article", () => {
  it("has the supplied metadata", () => {
    expect(article).toMatchObject({
      slug: "peptide-side-effects-bpc-157-tb-500-ghk-cu-mots-c-sermorelin",
      seoTitle: "Peptide Side Effects: BPC-157, TB-500 & More | Beema Health",
      date: "2026-11-14",
      author: "Matt Aertker",
    });
    expect(article.seoTitle!.length).toBeLessThanOrEqual(60);
    expect(article.metaDescription.length).toBeGreaterThanOrEqual(120);
    expect(article.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it("is registered, resolvable, and listed in the sitemap and llms.txt", () => {
    expect(listArticles().map((item) => item.slug)).toContain(article.slug);
    expect(getArticle(article.slug)).toEqual(article);
    expect(sitemap).toContain(
      `<loc>https://beemahealth.com/blogs/${article.slug}/</loc>`,
    );
    expect(llms).toContain(`https://beemahealth.com/blogs/${article.slug}/`);
  });

  it("has no H1, only H2/H3, and no skipped levels", () => {
    const headings = article.blocks.flatMap((block) =>
      block.type === "heading" ? [block] : [],
    );
    expect(headings[0]?.level).toBe(2);
    let last = 1;
    for (const heading of headings) {
      expect(heading.level - last).toBeLessThanOrEqual(1);
      last = heading.level;
    }
  });

  it("uses no em dashes, en dashes, or bare 'Beema'", () => {
    expect(source).not.toMatch(/[–—]/);
    const text = `${bodyText()}\n${article.title}\n${article.seoTitle}\n${article.metaDescription}\n${article.excerpt}`;
    expect(text).not.toMatch(/\bBeema\b(?!\s+Health)/);
  });

  it("makes no review, guarantee, or benefit claims", () => {
    const text = bodyText().toLowerCase();
    expect(source).not.toMatch(/reviewedBy/);
    expect(text).not.toMatch(/medically reviewed|reviewed by/);
    expect(text).not.toMatch(/\b(miracle|cures?|guaranteed)\b/);
    expect(text).not.toMatch(
      /\b(\d+\s?(mg|mcg|iu)|units? of|reconstitut|cycle|stack)\b/,
    );
  });

  it("routes the patient-portal wording to the care team, not a named button", () => {
    const text = bodyText();
    expect(text).not.toContain("Message Doctor");
    expect(text).toContain("message your care team through the patient portal");
  });

  it("links only to routes that exist and never to a nonexistent TB-500 page", () => {
    const hrefs = allLinks();
    for (const href of hrefs.filter((h) => h.startsWith("/"))) {
      const loc = `https://beemahealth.com${href}`;
      expect(sitemap, href).toContain(`<loc>${loc}</loc>`);
    }
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/",
        "/bpc-157/",
        "/bpc-157-capsules/",
        "/bpc-157-tb-500-ghk-cu/",
        "/ghk-cu/",
        "/mots-c/",
        "/sermorelin/",
        "/learn/weight-loss/sermorelin/",
        "/how-it-works/",
        "/safety/",
        "/blogs/how-to-choose-the-right-peptide-for-your-goals/",
      ]),
    );
    expect(hrefs).not.toContain("/tb-500/");
  });

  it("only uses https external links, including the primary sources", () => {
    const external = allLinks().filter((h) => !h.startsWith("/"));
    for (const href of external) expect(href).toMatch(/^https:\/\//);
    expect(external).toEqual(
      expect.arrayContaining([
        "https://pubmed.ncbi.nlm.nih.gov/42885452/",
        "https://journals.sagepub.com/doi/10.1177/03635465261464420",
        "https://www.federalregister.gov/d/2026-22192",
        "https://www.hhs.gov/sites/default/files/hhs-503a-peptide-enforcement-discretion-policy.pdf",
      ]),
    );
  });

  it("ends with the medical disclaimer and states compounded drugs are not FDA-approved", () => {
    const last = article.blocks[article.blocks.length - 1];
    expect(last?.type).toBe("paragraph");
    expect(last?.type === "paragraph" && last.disclaimer).toBe(true);
    expect(bodyText()).toContain("Compounded drugs are not FDA-approved");
  });

  it("does not promote the combination product", () => {
    const text = bodyText().toLowerCase();
    expect(text).not.toMatch(
      /bpc-157[^.]*tb-500[^.]*ghk-cu[^.]*(offer|available|buy)/,
    );
    expect(text).toContain("not a blanket permission");
  });

  it("emits FAQPage JSON-LD that matches the visible accordion", () => {
    const segments = segmentBlogBlocks(article.blocks);
    const faq = segments.find((segment) => segment.kind === "faq");
    expect(faq).toBeDefined();
    const items = blogFaqItems(article.blocks);
    expect(items.length).toBe(5);
    const ld = blogArticleJsonLd(
      article,
      `/blogs/${article.slug}/`,
    ) as unknown as { "@graph"?: unknown[] } | unknown[];
    const serialized = JSON.stringify(ld);
    expect(serialized).toContain("BlogPosting");
    expect(serialized).toContain("FAQPage");
    for (const item of items) expect(serialized).toContain(item.q);
    expect(serialized).not.toContain("reviewedBy");
  });

  it("references no images that are missing on disk", () => {
    for (const block of article.blocks) {
      if (block.type === "image") {
        expect(existsSync(resolve(root, `public${block.src}.webp`))).toBe(true);
      }
    }
  });
});
