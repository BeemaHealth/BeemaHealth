import { useEffect } from "react";
import { absoluteUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_GROUPS } from "@/lib/veya-data";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Beema Health" },
      {
        name: "description",
        content:
          "Answers about pricing, medication, shipping, refills, cancellation, eligibility, labs, and privacy.",
      },
      {
        property: "og:title",
        content: "Frequently asked questions — Beema Health",
      },
      {
        property: "og:description",
        content: "Clear answers about how Beema Health works.",
      },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/faq") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_GROUPS.flatMap((g) =>
            g.items.map((i) => ({
              "@type": "Question",
              name: i.q,
              acceptedAnswer: { "@type": "Answer", text: i.a },
            })),
          ),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  useEffect(() => {
    trackPageViewed("faq");
  }, []);
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Pricing, medication, shipping, refills, cancellation, eligibility, labs, and privacy — all in one place."
        />
      </Section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          {FAQ_GROUPS.map((g) => (
            <div key={g.category}>
              <h2 className="text-xl font-semibold text-foreground">
                {g.category}
              </h2>
              <Accordion type="single" collapsible className="mt-3">
                {g.items.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`${g.category}-${i}`}
                    className="rounded-2xl border border-border bg-card px-5 mb-3"
                  >
                    <AccordionTrigger className="text-left text-base font-medium text-foreground">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="xl">
            <Link to={qualifyHref(CTA_IDS.faq)}>
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
