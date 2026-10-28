import {
  SITE_URL,
  breadcrumbJsonLd,
  canonicalUrl,
  type BreadcrumbJsonLdItem,
} from "@/lib/seo";

/** Plain WebPage JSON-LD: no ratings, reviews, or reviewer claims. */
export function toolsWebPageJsonLd(options: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: options.name,
    description: options.description,
    url: canonicalUrl(options.path),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function toolsDocumentMeta(options: {
  title: string;
  description: string;
  path: string;
  breadcrumbs: readonly BreadcrumbJsonLdItem[];
}) {
  const canonical = canonicalUrl(options.path);
  return {
    meta: [
      { title: options.title },
      { name: "description", content: options.description },
      { property: "og:title", content: options.title },
      { property: "og:description", content: options.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: options.title },
      { name: "twitter:description", content: options.description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      breadcrumbJsonLd(options.breadcrumbs),
      toolsWebPageJsonLd({
        name: options.title,
        description: options.description,
        path: options.path,
      }),
    ].map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}
