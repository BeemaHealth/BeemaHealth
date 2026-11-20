import type { BlogBlock, BlogInline } from "@/content/blog/types";

export const BLOG_FAQ_HEADING = "Frequently asked questions";

export type BlogFaqEntry = { question: string; answer: BlogInline[][] };

export type BlogSegment =
  | { kind: "block"; block: BlogBlock; index: number }
  | { kind: "faq"; heading: string; index: number; entries: BlogFaqEntry[] };

/**
 * Groups the FAQ section (H2 + H3 questions + paragraph answers) into one
 * segment so the view can render it as an accordion. Everything else passes
 * through unchanged.
 */
export function segmentBlogBlocks(blocks: readonly BlogBlock[]): BlogSegment[] {
  const segments: BlogSegment[] = [];
  let faq: Extract<BlogSegment, { kind: "faq" }> | null = null;
  let entry: BlogFaqEntry | null = null;

  blocks.forEach((block, index) => {
    if (block.type === "heading" && block.level === 2) {
      faq = null;
      entry = null;
      if (block.text === BLOG_FAQ_HEADING) {
        faq = { kind: "faq", heading: block.text, index, entries: [] };
        segments.push(faq);
        return;
      }
    } else if (faq) {
      if (block.type === "heading") {
        entry = { question: block.text, answer: [] };
        faq.entries.push(entry);
        return;
      }
      if (block.type === "paragraph" && entry) {
        entry.answer.push(block.inlines);
        return;
      }
    }
    segments.push({ kind: "block", block, index });
  });
  return segments;
}
