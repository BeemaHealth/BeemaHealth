import { getBlogChart } from "@/content/blog/charts";
import { parseInlines, plainBlogText } from "@/content/blog/parse";
import type { BlogArticle, BlogBlock } from "@/content/blog/types";

/**
 * Builders for blog articles written in code. Paragraph and list text takes
 * inline `**bold**` and `[label](href)` (site path or https only). The page
 * template renders the single H1 from the article title, so there is no h1().
 */

const IMAGE_SRC = /^\/images\/blog\/[a-z0-9-]+$/;
const MEDICAL_DISCLAIMER_PREFIX = "Medical disclaimer:";

function requireText(value: string, what: string): string {
  const text = value.trim();
  if (!text) throw new Error(`Empty blog ${what}`);
  return text;
}

export function h2(text: string): BlogBlock {
  return { type: "heading", level: 2, text: requireText(text, "heading") };
}

export function h3(text: string): BlogBlock {
  return { type: "heading", level: 3, text: requireText(text, "heading") };
}

export function p(text: string): BlogBlock {
  const inlines = parseInlines(requireText(text, "paragraph"));
  return {
    type: "paragraph",
    inlines,
    disclaimer: plainBlogText(inlines).startsWith(MEDICAL_DISCLAIMER_PREFIX),
  };
}

export function ul(...items: string[]): BlogBlock {
  if (items.length === 0) throw new Error("Empty blog list");
  return {
    type: "list",
    items: items.map((item) => parseInlines(requireText(item, "list item"))),
  };
}

/** `src` is the base path without size suffix or extension. Dimensions prevent layout shift. */
export function img(
  src: string,
  alt: string,
  width: number,
  height: number,
): BlogBlock {
  if (!IMAGE_SRC.test(src)) throw new Error(`Invalid blog image path: ${src}`);
  return {
    type: "image",
    src,
    alt: requireText(alt, "image alt text"),
    width,
    height,
  };
}

/** Embeds a dataset from charts.ts. */
export function chart(id: string): BlogBlock {
  if (!getBlogChart(id)) throw new Error(`Unknown blog chart: ${id}`);
  return { type: "chart", id };
}

export function defineArticle(
  meta: Omit<BlogArticle, "blocks">,
  blocks: BlogBlock[],
): BlogArticle {
  for (const key of [
    "title",
    "metaDescription",
    "excerpt",
    "author",
  ] as const) {
    requireText(meta[key], key);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) {
    throw new Error(`Invalid blog slug: ${meta.slug}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
    throw new Error(`Blog date must be YYYY-MM-DD: ${meta.date}`);
  }
  if (!blocks.some((block) => block.type === "heading" && block.level === 2)) {
    throw new Error("Blog body needs at least one H2");
  }
  return { ...meta, blocks };
}
