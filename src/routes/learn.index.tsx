import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { LearnBreadcrumb } from "@/components/learn/LearnBreadcrumb";
import { LearnDisclaimer } from "@/components/learn/LearnDisclaimer";
import {
  LEARN_INDEX_DATE_MODIFIED,
  LEARN_INDEX_INTRO,
  LEARN_INDEX_META,
} from "@/content/learn/hubs";
import { LEGACY_LEARN_GUIDES } from "@/content/learn/legacy-guides";
import { listArticles } from "@/content/learn/registry";
import {
  LEARN_INDEX_PATH,
  LEARN_VERTICALS,
  LEARN_VERTICAL_LABELS,
  learnPath,
  type LearnVertical,
} from "@/content/learn/types";
import {
  learnDocumentMeta,
  learnHeadScripts,
  learnIndexBreadcrumbs,
} from "@/lib/learn-seo";
import { medicalWebPageJsonLd } from "@/lib/seo";
import {
  INITIAL_RESEARCH_DESCRIPTION,
  INITIAL_RESEARCH_PATH,
  INITIAL_RESEARCH_TITLE,
} from "@/lib/learn/initial-research";
import {
  RESISTANCE_TRAINING_DESCRIPTION,
  RESISTANCE_TRAINING_PATH,
  RESISTANCE_TRAINING_TITLE,
} from "@/lib/learn/resistance-training";
import {
  REST_INTERVALS_DESCRIPTION,
  REST_INTERVALS_PATH,
  REST_INTERVALS_TITLE,
} from "@/lib/learn/rest-intervals";
import {
  SEMA_VS_TIRZ_DESCRIPTION,
  SEMA_VS_TIRZ_PATH,
  SEMA_VS_TIRZ_TITLE,
} from "@/lib/learn/semaglutide-vs-tirzepatide";

const LEARN_ARTICLES = [
  {
    to: INITIAL_RESEARCH_PATH,
    title: INITIAL_RESEARCH_TITLE,
    excerpt: INITIAL_RESEARCH_DESCRIPTION,
    category: "Evidence guide",
    readMins: 18,
  },
  {
    to: RESISTANCE_TRAINING_PATH,
    title: RESISTANCE_TRAINING_TITLE,
    excerpt: RESISTANCE_TRAINING_DESCRIPTION,
    category: "Training guide",
    readMins: 16,
  },
  {
    to: REST_INTERVALS_PATH,
    title: REST_INTERVALS_TITLE,
    excerpt: REST_INTERVALS_DESCRIPTION,
    category: "Training guide",
    readMins: 14,
  },
  {
    to: SEMA_VS_TIRZ_PATH,
    title: SEMA_VS_TIRZ_TITLE,
    excerpt: SEMA_VS_TIRZ_DESCRIPTION,
    category: "Comparison guide",
    readMins: 10,
  },
] as const;

const VERTICAL_CARDS: Record<
  LearnVertical,
  { description: string; status: string }
> = {
  "weight-loss": {
    description:
      "Cited education on GLP-1 medicines for weight loss, online care, semaglutide, tirzepatide, side effects, and dosing questions. Beema Health's live clinical offering lives here.",
    status: "Live product education",
  },
  trt: {
    description:
      "Educational overview of testosterone replacement therapy. Beema Health does not offer TRT today.",
    status: "Education only",
  },
  hrt: {
    description:
      "Educational overview of menopausal hormone therapy. Beema Health does not offer HRT today.",
    status: "Education only",
  },
  ed: {
    description:
      "Cited education on tadalafil, sildenafil, and compounded ED combination formulations - how they work, labeled dosing, and how Beema Health's compounded options differ. Beema Health's live clinical offering lives here.",
    status: "Live product education",
  },
  hairloss: {
    description:
      "Cited education on finasteride for male pattern hair loss - how it works, FDA-labeled dosing, and a realistic results timeline. Beema Health's live clinical offering lives here.",
    status: "Live product education",
  },
};

export const Route = createFileRoute("/learn/")({
  head: () => {
    const { meta, links } = learnDocumentMeta({
      title: LEARN_INDEX_META.title,
      description: LEARN_INDEX_META.description,
      path: LEARN_INDEX_PATH,
      ogType: "website",
      ogDescription: LEARN_INDEX_META.ogDescription,
    });
    return {
      meta,
      links,
      scripts: learnHeadScripts({
        breadcrumbs: learnIndexBreadcrumbs(),
        medicalWebPage: medicalWebPageJsonLd({
          name: LEARN_INDEX_META.h1,
          description: LEARN_INDEX_META.description,
          path: LEARN_INDEX_PATH,
          dateModified: LEARN_INDEX_DATE_MODIFIED,
        }),
      }),
    };
  },
  component: LearnIndexPage,
});

function LearnIndexPage() {
  useEffect(() => {
    trackPageViewed("learn");
  }, []);

  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <LearnBreadcrumb />
        <SectionHeading
          as="h1"
          eyebrow="Learn"
          title={LEARN_INDEX_META.h1}
          description="Cited guides on GLP-1 weight-loss medicines, plus honest educational stubs for testosterone replacement and menopausal hormone therapy. Free to browse whether or not you are a Beema Health patient. Educational only, not medical advice."
        />
      </Section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-6">
          {LEARN_INDEX_INTRO.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {LEARN_VERTICALS.map((vertical) => {
            const card = VERTICAL_CARDS[vertical];
            const published = listArticles(vertical).length;
            return (
              <Link
                key={vertical}
                to={learnPath(vertical)}
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SurfaceCard className="flex h-full flex-col transition-shadow group-hover:shadow-soft">
                  <span className="inline-flex w-fit rounded-full bg-primary-soft/60 px-3 py-1 text-xs font-semibold text-primary">
                    {card.status}
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">
                    {LEARN_VERTICAL_LABELS[vertical]}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {vertical === "weight-loss"
                      ? `${published} new articles plus ${LEGACY_LEARN_GUIDES.length} longer guides`
                      : published === 1
                        ? "1 article"
                        : `${published} articles`}
                    <ArrowRight
                      className="ml-2 inline size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </p>
                </SurfaceCard>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-16 text-center text-2xl font-semibold text-foreground">
          Longer guides already published
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
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
                <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">
                  {article.title}
                </h3>
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

        <div className="mx-auto mt-12 max-w-3xl">
          <LearnDisclaimer />
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
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
