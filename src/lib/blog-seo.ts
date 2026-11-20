import { blogImageFile } from "@/content/blog/paths";
import { BLOG_FAQ_HEADING } from "@/content/blog/faq";
import { plainBlogText } from "@/content/blog/parse";
import type { BlogArticle, BlogBlock } from "@/content/blog/types";
import {
  absoluteUrl,
  canonicalUrl,
  faqPageJsonLd,
  SITE_URL,
  type FaqJsonLdItem,
} from "@/lib/seo";

/** First inline image, used for og:image and the BlogPosting image. */
export function blogLeadImage(
  blocks: readonly BlogBlock[],
): { src: string; alt: string; width: number; height: number } | undefined {
  for (const block of blocks) {
    if (block.type === "image") return block;
  }
  return undefined;
}

/** Q&A pairs from the visible FAQ section: H3 question, paragraph answer(s). */
export function blogFaqItems(blocks: readonly BlogBlock[]): FaqJsonLdItem[] {
  const items: FaqJsonLdItem[] = [];
  let inFaq = false;
  let question: string | null = null;
  let answer: string[] = [];
  const flush = () => {
    if (question && answer.length > 0) {
      items.push({ q: question, a: answer.join(" ") });
    }
    question = null;
    answer = [];
  };
  for (const block of blocks) {
    if (block.type === "heading" && block.level === 2) {
      flush();
      inFaq = block.text === BLOG_FAQ_HEADING;
      continue;
    }
    if (!inFaq) continue;
    if (block.type === "heading") {
      flush();
      question = block.text;
    } else if (block.type === "paragraph" && question) {
      answer.push(plainBlogText(block.inlines));
    }
  }
  flush();
  return items;
}

/**
 * BlogPosting + FAQPage JSON-LD. No `reviewedBy`: posts are not clinically
 * reviewed, and the author is a named non-clinician, so no credentials are claimed.
 */
export function blogArticleJsonLd(article: BlogArticle, path: string) {
  const image = blogLeadImage(article.blocks);
  const posting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.date,
    dateModified: article.date,
    mainEntityOfPage: canonicalUrl(path),
    url: canonicalUrl(path),
    ...(image ? { image: [absoluteUrl(blogImageFile(image.src))] } : {}),
    author: { "@type": "Person", name: article.author },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  const faqs = blogFaqItems(article.blocks);
  return faqs.length > 0 ? [posting, faqPageJsonLd(faqs)] : [posting];
}

export function blogDocumentMeta(options: {
  title: string;
  description: string;
  path: string;
  ogType: "website" | "article";
  image?: { src: string; alt: string; width: number; height: number };
  jsonLd?: readonly object[];
}) {
  const canonical = canonicalUrl(options.path);
  return {
    meta: [
      { title: options.title },
      { name: "description", content: options.description },
      { property: "og:title", content: options.title },
      { property: "og:description", content: options.description },
      { property: "og:type", content: options.ogType },
      { property: "og:url", content: canonical },
      ...(options.image
        ? [
            {
              property: "og:image",
              content: absoluteUrl(blogImageFile(options.image.src)),
            },
            {
              property: "og:image:width",
              content: String(options.image.width),
            },
            {
              property: "og:image:height",
              content: String(options.image.height),
            },
            { property: "og:image:alt", content: options.image.alt },
            {
              name: "twitter:image",
              content: absoluteUrl(blogImageFile(options.image.src)),
            },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: options.title },
      { name: "twitter:description", content: options.description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: (options.jsonLd ?? []).map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}
