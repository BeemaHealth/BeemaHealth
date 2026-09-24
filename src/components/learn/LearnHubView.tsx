import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LearnBreadcrumb } from "@/components/learn/LearnBreadcrumb";
import { LearnDisclaimer } from "@/components/learn/LearnDisclaimer";
import { LearnWeightLossCta } from "@/components/learn/LearnWeightLossCta";
import { LEGACY_LEARN_GUIDES } from "@/content/learn/legacy-guides";
import {
  LEARN_HUBS,
  WEIGHT_LOSS_CLUSTERS,
  type LearnHubCopy,
} from "@/content/learn/hubs";
import { getArticle, listArticles } from "@/content/learn/registry";
import { resolveMoneyPageHrefs } from "@/content/learn/money-pages";
import {
  LEARN_INDEX_PATH,
  learnPath,
  type LearnVertical,
} from "@/content/learn/types";
import { citationRel } from "@/lib/outbound-links";
import { LearnRichText } from "@/components/learn/LearnRichText";

function HubSections({ hub }: { hub: LearnHubCopy }) {
  return (
    <>
      {hub.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-28 space-y-4"
        >
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {section.heading}
          </h2>
          {section.body.map((paragraph, index) => (
            <p
              key={`${section.id}-${index}`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              <LearnRichText text={paragraph} />
            </p>
          ))}
        </section>
      ))}
    </>
  );
}

function HubFaqs({ hub }: { hub: LearnHubCopy }) {
  if (hub.faqs.length === 0) return null;
  return (
    <section id="faq" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Frequently asked questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {hub.faqs.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`faq-${index}`}
            className="mb-3 rounded-2xl border border-border bg-card px-5"
          >
            <AccordionTrigger className="text-left text-base font-medium text-foreground">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              <LearnRichText text={item.answer} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function HubSources({ hub }: { hub: LearnHubCopy }) {
  return (
    <section id="sources" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Sources
      </h2>
      <ol className="space-y-2 text-sm text-muted-foreground">
        {hub.sources.map((source, index) => (
          <li
            key={source.href}
            id={`ref-${index + 1}`}
            className="scroll-mt-28"
          >
            [{index + 1}]{" "}
            <a
              href={source.href}
              target="_blank"
              rel={citationRel(source.href)}
              className="text-primary underline-offset-2 hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WeightLossClusters() {
  return (
    <section id="topics" className="scroll-mt-28 space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Topic clusters
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Cluster headings stay visible even before every child article is
        published. Links appear only when that article exists in the library.
      </p>
      <div className="space-y-6">
        {WEIGHT_LOSS_CLUSTERS.map((cluster) => {
          const live = cluster.slugs.flatMap((slug) => {
            const article = getArticle("weight-loss", slug);
            return article ? [article] : [];
          });
          return (
            <div key={cluster.id} id={cluster.id} className="scroll-mt-28">
              <SurfaceCard>
                <h3 className="text-lg font-semibold text-foreground">
                  {cluster.heading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {cluster.intro}
                </p>
                {live.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {live.map((article) => (
                      <li key={article.slug}>
                        <Link
                          to={learnPath("weight-loss", article.slug)}
                          className="text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Articles in this cluster are being added. The overview above
                    is written to stand on its own until they ship.
                  </p>
                )}
              </SurfaceCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeightLossMoneyLinks() {
  const pages = resolveMoneyPageHrefs([
    "/weight-loss/",
    "/semaglutide/",
    "/tirzepatide/",
    "/glp-1/",
    "/glp-1-houston/",
  ]);
  return (
    <section id="program-pages" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Live Beema Health program pages
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        These commercial pages are where pricing, intake, and the compounded
        offering live. They use different headlines on purpose so this
        educational hub does not compete with them.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.href}
            to={page.href}
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SurfaceCard className="h-full transition-shadow group-hover:shadow-soft">
              <p className="font-semibold text-foreground group-hover:text-primary">
                {page.label}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                Open program page
                <ArrowRight className="size-3.5 text-primary" aria-hidden />
              </p>
            </SurfaceCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LegacyGuides() {
  return (
    <section id="published-guides" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Longer guides already on Learn
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {LEGACY_LEARN_GUIDES.map((guide) => (
          <Link
            key={guide.path}
            to={guide.path}
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SurfaceCard className="h-full transition-shadow group-hover:shadow-soft">
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                {guide.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
            </SurfaceCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

function VerticalArticles({ vertical }: { vertical: LearnVertical }) {
  const articles = listArticles(vertical);
  if (articles.length === 0) return null;
  return (
    <section id="articles" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        Articles in this hub
      </h2>
      <ul className="space-y-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              to={learnPath(vertical, article.slug)}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-shadow hover:shadow-soft"
            >
              <span>
                <span className="block group-hover:text-primary">
                  {article.title}
                </span>
                <span className="mt-1 block font-normal text-muted-foreground">
                  {article.description}
                </span>
              </span>
              <ArrowRight
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LearnHubView({ vertical }: { vertical: LearnVertical }) {
  const hub = LEARN_HUBS[vertical];

  useEffect(() => {
    trackPageViewed(`learn_${vertical}_hub`);
  }, [vertical]);

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-12 md:py-16">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div className="veya-container relative z-10 max-w-3xl">
          <LearnBreadcrumb vertical={vertical} />
          <SectionHeading
            as="h1"
            align="left"
            eyebrow={hub.meta.eyebrow}
            title={hub.meta.h1}
            description={hub.meta.description}
          />
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <LearnDisclaimer />
          <p className="text-sm">
            <Link
              to={LEARN_INDEX_PATH}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              All Learn topics
            </Link>
          </p>
          <HubSections hub={hub} />
          {vertical === "weight-loss" ? <WeightLossMoneyLinks /> : null}
          {vertical === "weight-loss" ? <WeightLossClusters /> : null}
          {vertical === "weight-loss" ? <LegacyGuides /> : null}
          <VerticalArticles vertical={vertical} />
          <HubFaqs hub={hub} />
          <HubSources hub={hub} />
          {hub.productLive ? (
            <LearnWeightLossCta
              {...(hub.liveCta
                ? { ctaId: hub.liveCta.ctaId, headline: hub.liveCta.headline }
                : {})}
            />
          ) : (
            <SurfaceCard>
              <h2 className="text-lg font-semibold text-foreground">
                No intake for this topic yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Beema Health is not currently offering this therapy. For live
                care, see{" "}
                <Link
                  to={learnPath("weight-loss")}
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  GLP-1 weight-loss education
                </Link>{" "}
                or the{" "}
                <Link
                  to="/weight-loss/"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  medical weight-loss program
                </Link>
                .
              </p>
            </SurfaceCard>
          )}
        </div>
      </Section>
    </MarketingLayout>
  );
}
