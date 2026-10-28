import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getArticle, listArticles } from "@/content/blog/articles";
import { article } from "@/content/blog/articles/how-to-choose-the-right-peptide-for-your-goals";
import { chart, defineArticle, h2, img, p } from "@/content/blog/build";
import { parseInlines, plainBlogText } from "@/content/blog/parse";
import { formatBlogDate } from "@/content/blog/paths";
import type { BlogBlock } from "@/content/blog/types";
import {
  blogArticleJsonLd,
  blogDocumentMeta,
  blogFaqItems,
  blogLeadImage,
} from "@/lib/blog-seo";
import { existsSync } from "node:fs";
import { segmentBlogBlocks } from "@/content/blog/faq";
import { SITE_URL } from "@/lib/seo";

const root = resolve(__dirname, "../../..");
const articleSource = readFileSync(
  resolve(
    __dirname,
    "../../content/blog/articles/how-to-choose-the-right-peptide-for-your-goals.ts",
  ),
  "utf8",
);

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

function links(
  blocks: readonly BlogBlock[],
): { label: string; href: string }[] {
  const found: { label: string; href: string }[] = [];
  for (const block of blocks) {
    const groups =
      block.type === "list"
        ? block.items
        : block.type === "paragraph"
          ? [block.inlines]
          : [];
    for (const group of groups) {
      for (const inline of group) {
        if (inline.type === "link") found.push(inline);
      }
    }
  }
  return found;
}

describe("peptide blog article", () => {
  it("opens with the intro and answers the title question early", () => {
    const text = blocksText(article.blocks);
    expect(text.startsWith("If you've searched")).toBe(true);
    const early = article.blocks
      .slice(0, 5)
      .map((block) =>
        block.type === "paragraph" ? plainBlogText(block.inlines) : "",
      )
      .join(" ");
    expect(early).toContain("which peptide is right for you?");
    expect(early).toContain("licensed clinician");
  });

  it("uses the supplied metadata", () => {
    expect(article).toMatchObject({
      title: "How to Choose the Right Peptide for Your Goals",
      slug: "how-to-choose-the-right-peptide-for-your-goals",
      metaDescription:
        "Which peptide is right for you? Compare weight loss, recovery, sermorelin, skin, and healthy aging options by evidence, FDA status, safety, and cost.",
      date: "2026-10-26",
      author: "Matt Aertker",
    });
    expect(article.title.length).toBeLessThanOrEqual(60);
    expect(article.metaDescription.length).toBeGreaterThanOrEqual(120);
    expect(article.metaDescription.length).toBeLessThanOrEqual(160);
    expect(formatBlogDate(article.date)).toBe("October 26, 2026");
    expect(listArticles().map((item) => item.slug)).toEqual([article.slug]);
    expect(getArticle(article.slug)).toEqual(article);
    expect(getArticle("missing")).toBeUndefined();
  });

  it("keeps a single template H1 by omitting H1 from the body", () => {
    const headings = article.blocks.flatMap((block) =>
      block.type === "heading" ? [block] : [],
    );
    expect(headings[0]?.level).toBe(2);
    let last = 1;
    for (const heading of headings) {
      expect(heading.level - last).toBeLessThanOrEqual(1);
      last = heading.level;
    }
    expect(headings.some((block) => block.text === "The bottom line")).toBe(
      true,
    );
    expect(
      headings.some(
        (block) =>
          block.text === "First, what exactly is a peptide?" &&
          block.level === 2,
      ),
    ).toBe(true);
    expect(
      headings
        .filter((block) => block.text.startsWith("What is the best"))
        .map((block) => block.level),
    ).toEqual([3]);
    expect(
      headings
        .filter((block) => block.level === 2 && block.text.startsWith("Step "))
        .map((block) => block.text.slice(0, 6)),
    ).toEqual(["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6"]);
    const step2 = headings
      .filter((block) => block.level === 3)
      .map((block) => block.text);
    for (const topic of [
      "Weight management",
      "Muscle recovery",
      "Growth hormone",
      "Skin and appearance",
      "Healthy aging",
    ]) {
      expect(step2.some((text) => text.startsWith(topic))).toBe(true);
    }
  });

  it("preserves the disclaimer and does not invent a medical review", () => {
    const text = blocksText(article.blocks);
    const disclaimer = article.blocks.find(
      (block) => block.type === "paragraph" && block.disclaimer,
    );
    expect(disclaimer && disclaimer.type === "paragraph").toBe(true);
    expect(text).toContain("A prescription is never guaranteed.");
    expect(text).toContain("Compounded medications are not FDA-approved");
    expect(text.toLowerCase()).not.toContain("medically reviewed");
    expect(articleSource).not.toMatch(/[\u2014\u2013]/);
    expect(text).not.toMatch(/Wegovy|Ozempic|Mounjaro|Zepbound|Rybelsus/);
  });

  it("links home, the GLP-1 page, and the supplied primary sources", () => {
    const found = links(article.blocks);
    expect(found).toContainEqual({
      type: "link",
      label: "Beema Health",
      href: "/",
    });
    expect(found).toContainEqual({
      type: "link",
      label: "GLP-1 care process",
      href: "/glp-1/",
    });
    const external = found
      .filter((link) => link.href.startsWith("https://"))
      .map((link) => link.href);
    expect(new Set(external)).toEqual(
      new Set([
        "https://www.fda.gov/news-events/press-announcements/fda-approves-new-medication-chronic-weight-management",
        "https://www.fda.gov/news-events/press-announcements/fda-approves-first-treatment-reduce-risk-serious-heart-problems-specifically-adults-obesity-or",
        "https://www.federalregister.gov/documents/2013/03/04/2013-04827/determination-that-geref-sermorelin-acetate-injection-05-milligrams-basevial-and-10-milligrams",
        "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=aae667c5-381f-4f92-93df-2ed6158d07b0",
        "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=4e2c9856-1836-49f0-9472-4dbeeb408f39",
        "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=3d783378-b02d-4f19-99dd-0fc91a042224",
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC8089593",
        "https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity",
        "https://pubmed.ncbi.nlm.nih.gov/42885452/",
        "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks",
        "https://www.fda.gov/drugs/human-drug-compounding/compounding-and-fda-questions-and-answers",
        "https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss",
        "https://nctr-crs.fda.gov/fdalabel/services/spl/set-ids/ee06186f-2aa3-4990-a760-757579d8f77b/spl-doc",
        "https://pubmed.ncbi.nlm.nih.gov/35441470/",
        "https://www.fda.gov/drugs/human-drug-compounding/fda-telehealth-companies-what-know-when-promoting-compounded-drugs",
      ]),
    );
    expect(external.every((href) => href.startsWith("https://"))).toBe(true);
  });

  it("requires a valid slug, date, and at least one H2", () => {
    const meta = { ...article, blocks: undefined };
    delete (meta as { blocks?: unknown }).blocks;
    expect(() =>
      defineArticle({ ...meta, slug: "Bad Slug" }, [h2("A")]),
    ).toThrow(/slug/);
    expect(() =>
      defineArticle({ ...meta, date: "10/26/2026" }, [h2("A")]),
    ).toThrow(/YYYY-MM-DD/);
    expect(() => defineArticle(meta, [p("Only a paragraph.")])).toThrow(/H2/);
  });

  it("rejects unsafe links, empty blocks, and unknown charts", () => {
    expect(() => h2(" ")).toThrow(/heading/);
    expect(() => p("")).toThrow(/paragraph/);
    expect(() => chart("missing")).toThrow(/Unknown blog chart/);
    expect(() => p("[x](http://example.com)")).toThrow(/https/);
    expect(() => parseInlines("[x](javascript:alert(1))")).toThrow(/https/);
    expect(() => parseInlines("[x](http://example.com)")).toThrow(/https/);
    expect(() => parseInlines("[x](/../secret)")).toThrow(/Unsafe/);
  });

  it("emits indexable meta with a canonical URL and no review claims", () => {
    const head = blogDocumentMeta({
      title: article.title,
      description: article.metaDescription,
      path: "/blogs/example/",
      ogType: "article",
    });
    expect(
      head.meta.some((tag) => "name" in tag && tag.name === "robots"),
    ).toBe(false);
    expect(head.links[0]?.href).toMatch(/\/blogs\/example\/$/);
  });

  it("does not claim medical review or draft status anywhere in the UI", () => {
    for (const file of [
      "src/components/blog/BlogArticleView.tsx",
      "src/components/blog/BlogIndexView.tsx",
      "src/routes/blogs.index.tsx",
      "src/routes/blogs.$slug.tsx",
      "src/routes/blogs.tsx",
    ]) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source).not.toMatch(/import\.meta\.env\.DEV|[Dd]raft/);
    }
  });

  it("links the homepage, money pages, and Learn guides that exist in the sitemap", () => {
    const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
    const internal = links(article.blocks)
      .map((link) => link.href)
      .filter((href) => href.startsWith("/"));
    for (const href of [
      "/",
      "/glp-1/",
      "/how-it-works/",
      "/safety/",
      "/sermorelin/",
      "/contact/",
      "/learn/weight-loss/glp-1-side-effects/",
      "/learn/weight-loss/rebound-weight-gain-after-glp-1/",
    ]) {
      expect(internal).toContain(href);
      if (href !== "/")
        expect(sitemap).toContain(`<loc>${SITE_URL}${href}</loc>`);
    }
  });

  it("embeds the infographic with alt text, dimensions, and files on disk", () => {
    const image = blogLeadImage(article.blocks);
    expect(image).toMatchObject({
      src: "/images/blog/six-steps-to-decide-on-a-peptide",
      width: 1536,
      height: 1024,
    });
    expect(image?.alt.length).toBeGreaterThan(80);
    for (const suffix of ["", "-480w", "-768w", "-1024w"]) {
      expect(
        existsSync(resolve(root, `public${image?.src}${suffix}.webp`)),
      ).toBe(true);
    }
    expect(() => img("/images/blog/x", "", 10, 10)).toThrow(/alt/);
    expect(() => img("/images/other/x", "alt", 10, 10)).toThrow(/path/);
  });

  it("emits BlogPosting and FAQPage JSON-LD that match the visible page", () => {
    const faqs = blogFaqItems(article.blocks);
    expect(faqs.map((item) => item.q)).toEqual([
      "Which peptide is right for me?",
      "What is the best peptide for weight loss?",
      "Are peptides safe?",
      "Are peptides for muscle recovery or anti-aging proven to work?",
      "What is sermorelin, and is it FDA-approved?",
      "Can a peptide in a skin cream do what an injection does?",
      "What should I know before taking peptides?",
      "How do I know whether a peptide source is legitimate?",
    ]);
    const [posting, faq] = blogArticleJsonLd(
      article,
      "/blogs/how-to-choose-the-right-peptide-for-your-goals/",
    ) as Record<string, unknown>[];
    expect(posting).toMatchObject({
      "@type": "BlogPosting",
      headline: article.title,
      datePublished: "2026-10-26",
    });
    expect(JSON.stringify(posting)).not.toContain("reviewedBy");
    expect(faq).toMatchObject({ "@type": "FAQPage" });
    const head = blogDocumentMeta({
      title: article.title,
      description: article.metaDescription,
      path: "/blogs/x/",
      ogType: "article",
      image: blogLeadImage(article.blocks),
      jsonLd: [posting ?? {}],
    });
    expect(head.scripts).toHaveLength(1);
    expect(
      head.meta.some(
        (tag) => "property" in tag && tag.property === "og:image:alt",
      ),
    ).toBe(true);
  });

  it("groups the FAQ into accordion entries without losing answer links", () => {
    const faq = segmentBlogBlocks(article.blocks).find(
      (segment) => segment.kind === "faq",
    );
    expect(faq?.kind).toBe("faq");
    if (faq?.kind !== "faq") return;
    expect(faq.entries).toHaveLength(8);
    expect(faq.entries.every((entry) => entry.answer.length > 0)).toBe(true);
    expect(
      faq.entries
        .flatMap((entry) => entry.answer.flat())
        .some((inline) => inline.type === "link"),
    ).toBe(true);
    const rest = segmentBlogBlocks(article.blocks).filter(
      (segment) => segment.kind === "block",
    );
    expect(
      rest.some(
        (segment) =>
          segment.kind === "block" &&
          segment.block.type === "heading" &&
          segment.block.text === "The bottom line",
      ),
    ).toBe(true);
  });

  it("frames the weight-loss story as atypical, non-endorsing, and disclosed", () => {
    const text = blocksText(article.blocks);
    expect(text).toContain(
      "Charlie Beebout, who also works at Beema Health, has lost more than 70 pounds over about a year",
    );
    expect(text).not.toMatch(/\bI('ve| have)? lost\b/);
    expect(text).toContain("A loss like Charlie's is not typical");
    expect(text).toContain("14.9% of their body weight");
    expect(text).toContain("compounded drugs are not FDA-approved");
    expect(text).toContain("Charlie and I both work at Beema Health");
    const [posting] = blogArticleJsonLd(article, "/blogs/x/") as Record<
      string,
      unknown
    >[];
    expect(posting?.author).toEqual({
      "@type": "Person",
      name: "Matt Aertker",
    });
    const claimSurfaces = [
      article.title,
      article.excerpt,
      article.metaDescription,
      blogLeadImage(article.blocks)?.alt ?? "",
    ].join(" ");
    expect(claimSurfaces).not.toMatch(/pounds|\b70\b|\b80\b/);
  });

  it("keeps weight management a minority of the article and covers every category", () => {
    const words = (blocks: readonly BlogBlock[]) =>
      blocksText(blocks).split(/\s+/).filter(Boolean).length;
    const sections = new Map<string, BlogBlock[]>();
    let current = "";
    for (const block of article.blocks) {
      if (block.type === "heading" && block.level === 3) {
        current = block.text;
        sections.set(current, []);
      } else if (block.type === "heading") {
        current = "";
      } else if (current) {
        sections.get(current)?.push(block);
      }
    }
    const total = words(article.blocks);
    const byTopic = (prefix: string) => {
      const entry = [...sections].find(([name]) => name.startsWith(prefix));
      return entry ? words(entry[1]) : 0;
    };
    expect(byTopic("Weight management") / total).toBeLessThan(0.15);
    for (const topic of [
      "Muscle recovery",
      "Growth hormone",
      "Skin and appearance",
      "Healthy aging",
    ]) {
      expect(byTopic(topic), topic).toBeGreaterThan(80);
    }
    expect(total).toBeLessThan(3300);
  });

  it("does not offer NAD+ or non-peptides as peptides", () => {
    const text = blocksText(article.blocks);
    expect(text).toContain("NAD+, for example, is a coenzyme");
    expect(text).not.toMatch(/NAD\+ (peptide|is a peptide)/i);
  });
});
