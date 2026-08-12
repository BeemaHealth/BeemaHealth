import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  medicalWebPageJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  INITIAL_RESEARCH_DATE_MODIFIED,
  INITIAL_RESEARCH_DESCRIPTION,
  INITIAL_RESEARCH_PATH,
  INITIAL_RESEARCH_TITLE,
} from "@/lib/learn/initial-research";

const LEARN_ARTICLES = [
  {
    to: INITIAL_RESEARCH_PATH,
    title: INITIAL_RESEARCH_TITLE,
    excerpt: INITIAL_RESEARCH_DESCRIPTION,
    category: "Evidence guide",
    readMins: 18,
  },
] as const;

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learn | Beema Health" },
      {
        name: "description",
        content:
          "Evidence-based educational guides on weight management, GLP-1 medications, and lifestyle approaches. For general information only, not medical advice.",
      },
      { property: "og:title", content: "Learn | Beema Health" },
      {
        property: "og:description",
        content:
          "Clear, cited education on traditional and GLP-1-assisted weight loss.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/learn") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: "Learn",
            description:
              "Evidence-based educational guides on weight management and GLP-1 medications.",
            path: "/learn",
            dateModified: INITIAL_RESEARCH_DATE_MODIFIED,
          }),
        ),
      },
    ],
  }),
  component: LearnIndexPage,
});

function LearnIndexPage() {
  useEffect(() => {
    trackPageViewed("learn");
  }, []);

  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          as="h1"
          eyebrow="Learn"
          title="Clear, judgment-free education"
          description="Cited guides to help you understand lifestyle and medication approaches to weight management. Free to browse whether or not you're a Beema patient - no intake is required. Educational only, not medical advice."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          {LEARN_ARTICLES.map((article) => (
            <Link
              key={article.to}
              to={article.to}
              className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SurfaceCard className="flex h-full flex-col transition-shadow group-hover:shadow-soft">
                <span className="inline-flex w-fit rounded-full bg-primary-soft/60 px-3 py-1 text-xs font-semibold text-primary">
                  {article.category}
                </span>
                <h2 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  {article.readMins} min read
                  <ArrowRight
                    className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </p>
              </SurfaceCard>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Educational content is for general information only and is not medical
          advice. Talk to a licensed clinician about your specific situation.
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Also free:{" "}
          <Link
            to="/recipes/"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            our recipe collection
          </Link>
          .
        </p>
      </Section>
    </MarketingLayout>
  );
}
