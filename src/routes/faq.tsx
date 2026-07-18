import { useEffect, useRef } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  HexMotif,
  MagneticButton,
  Section,
  SectionHeading,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";
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
    links: [{ rel: "canonical", href: canonicalUrl("/faq") }],
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

  const reduceMotion = useReducedMotion();

  // Single scroll-linked decorative accent for the list section — a lone
  // hexagon drifting a little slower than the page scrolls.
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start end", "end start"],
  });
  const hexY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -60],
  );

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-16 md:py-24">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <HexMotif className="float-slow pointer-events-none absolute -left-10 top-8 z-0 hidden w-28 text-primary/15 md:block" />
        <HexMotif className="float-slower pointer-events-none absolute -right-8 bottom-2 z-0 hidden w-36 text-primary/10 md:block" />

        <div className="veya-container relative z-10">
          <SectionHeading
            as="h1"
            eyebrow="FAQ"
            title={<LineReveal>Frequently asked questions</LineReveal>}
            description="Pricing, medication, shipping, refills, cancellation, eligibility, labs, and privacy — all in one place."
          />
        </div>
      </section>

      <Section className="pt-0">
        <div ref={listRef} className="relative">
          <motion.div
            aria-hidden
            style={reduceMotion ? undefined : { y: hexY }}
            className="pointer-events-none absolute -right-6 top-4 z-0 hidden lg:block"
          >
            <HexMotif className="w-20 text-primary/15" />
          </motion.div>

          <div className="relative mx-auto max-w-3xl space-y-10">
            {FAQ_GROUPS.map((g) => (
              <div key={g.category}>
                <motion.h2
                  className="text-xl font-semibold text-foreground"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.5,
                    ease: EASE_OUT,
                  }}
                >
                  {g.category}
                </motion.h2>
                <Accordion type="single" collapsible className="mt-3">
                  {g.items.map((item, i) => (
                    <motion.div
                      key={item.q}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.5,
                        delay: reduceMotion ? 0 : i * 0.07,
                        ease: EASE_OUT,
                      }}
                    >
                      <AccordionItem
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
                    </motion.div>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <MagneticButton>
              <Button asChild size="xl">
                <Link to={QUALIFY_PATH} search={qualifySearch(CTA_IDS.faq)}>
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
