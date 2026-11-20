import { useEffect } from "react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading } from "@/components/site/primitives";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LearnBreadcrumb } from "@/components/learn/LearnBreadcrumb";
import { LearnDisclaimer } from "@/components/learn/LearnDisclaimer";
import { LearnInternalLinks } from "@/components/learn/LearnInternalLinks";
import { LearnWeightLossCta } from "@/components/learn/LearnWeightLossCta";
import { PreferredSourceButton } from "@/components/learn/PreferredSourceButton";
import { resolveLearnArticleCtaId } from "@/content/learn/registry";
import { trackPageViewed } from "@/lib/analytics";
import type { LearnArticle } from "@/content/learn/types";
import { citationRel } from "@/lib/outbound-links";
import { LearnRichText } from "@/components/learn/LearnRichText";

export function LearnArticleView({ article }: { article: LearnArticle }) {
  const ctaId = resolveLearnArticleCtaId(article);

  useEffect(() => {
    trackPageViewed(`learn_${article.vertical}_${article.slug}`);
  }, [article.slug, article.vertical]);

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-12 md:py-16">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <div className="veya-container relative z-10 max-w-3xl">
          <LearnBreadcrumb vertical={article.vertical} current={article.h1} />
          <SectionHeading
            as="h1"
            align="left"
            eyebrow="Learn"
            title={article.h1}
            description={article.description}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {article.dateModified}
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <article className="mx-auto max-w-3xl space-y-10">
          <LearnDisclaimer />

          {article.sections.map((section) => (
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
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {section.bullets.map((bullet, index) => (
                    <li key={`${section.id}-bullet-${index}`}>
                      <LearnRichText text={bullet} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {article.faqs.length > 0 ? (
            <section id="faq" className="scroll-mt-28 space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {article.faqs.map((item, index) => (
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
          ) : null}

          {article.sources.length > 0 ? (
            <section id="sources" className="scroll-mt-28 space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                Sources
              </h2>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {article.sources.map((source, index) => (
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
          ) : null}

          <LearnInternalLinks article={article} />
          {ctaId ? <LearnWeightLossCta ctaId={ctaId} /> : null}
          <PreferredSourceButton className="mt-10" />
        </article>
      </Section>
    </MarketingLayout>
  );
}
