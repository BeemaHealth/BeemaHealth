import {
  LEARN_VERTICAL_H1_LABELS,
  LEARN_INDEX_PATH,
  learnPath,
  type LearnArticle,
  type LearnFaq,
  type LearnVertical,
} from "@/content/learn/types";
import {
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  medicalWebPageJsonLd,
  type BreadcrumbJsonLdItem,
  type FaqJsonLdItem,
} from "@/lib/seo";
import { stripLearnMarkdownLinks } from "@/lib/learn-rich-text";

export function learnFaqsToJsonLd(faqs: readonly LearnFaq[]): FaqJsonLdItem[] {
  return faqs.map((faq) => ({
    q: faq.question,
    a: stripLearnMarkdownLinks(faq.answer),
  }));
}

export function learnHubBreadcrumbs(
  vertical: LearnVertical,
): BreadcrumbJsonLdItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Learn", path: LEARN_INDEX_PATH },
    { name: LEARN_VERTICAL_H1_LABELS[vertical], path: learnPath(vertical) },
  ];
}

export function learnArticleBreadcrumbs(
  article: LearnArticle,
): BreadcrumbJsonLdItem[] {
  return [
    ...learnHubBreadcrumbs(article.vertical),
    {
      name: article.h1,
      path: learnPath(article.vertical, article.slug),
    },
  ];
}

export function learnIndexBreadcrumbs(): BreadcrumbJsonLdItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Learn", path: LEARN_INDEX_PATH },
  ];
}

export function learnArticleJsonLd(article: LearnArticle) {
  const path = learnPath(article.vertical, article.slug);
  const medical = medicalWebPageJsonLd({
    name: article.h1,
    description: article.description,
    path,
    reviewedByClinicalLead: false,
    dateModified: article.dateModified,
  });

  return {
    ...medical,
    "@type": ["MedicalWebPage", "Article"],
    headline: article.title,
    // No per-article hero art exists yet - the shared OG card is a valid
    // fallback for Article rich-result/link-preview eligibility until one does.
    image: absoluteUrl("/og-card.jpg"),
    datePublished: article.datePublished,
    author: { "@id": `${SITE_URL}/#organization` },
    keywords: article.keywords.join(", "),
    citation: article.sources.map((source) => ({
      "@type": "CreativeWork",
      name: source.label,
      url: source.href,
    })),
  };
}

export function learnHeadScripts(options: {
  breadcrumbs: readonly BreadcrumbJsonLdItem[];
  medicalWebPage:
    | ReturnType<typeof medicalWebPageJsonLd>
    | ReturnType<typeof learnArticleJsonLd>;
  faqs?: readonly LearnFaq[];
}) {
  const scripts = [
    {
      type: "application/ld+json",
      children: JSON.stringify(breadcrumbJsonLd(options.breadcrumbs)),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify(options.medicalWebPage),
    },
  ];
  if (options.faqs && options.faqs.length > 0) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(faqPageJsonLd(learnFaqsToJsonLd(options.faqs))),
    });
  }
  return scripts;
}

export function learnDocumentMeta(options: {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  ogDescription?: string;
}) {
  const canonical = canonicalUrl(options.path);
  const ogType = options.ogType ?? "website";
  const ogDescription = options.ogDescription ?? options.description;
  return {
    meta: [
      { title: options.title },
      { name: "description", content: options.description },
      { property: "og:title", content: options.title },
      { property: "og:description", content: ogDescription },
      { property: "og:type", content: ogType },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: options.title },
      { name: "twitter:description", content: ogDescription },
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}
