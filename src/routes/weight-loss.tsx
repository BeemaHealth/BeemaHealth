import { useEffect } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Scale,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { TreatmentLineup } from "@/components/site/TreatmentLineup";
import {
  HexBadge,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

export const Route = createFileRoute("/weight-loss")({
  head: () => ({
    meta: [
      { title: "Weight Loss — Beema Health" },
      {
        name: "description",
        content:
          "Medical weight-loss care with Zepbound, Wegovy, and affordable compounded options when clinically appropriate. Reviewed by licensed providers.",
      },
      { property: "og:title", content: "Weight Loss — Beema Health" },
      {
        property: "og:description",
        content:
          "Provider-reviewed GLP-1 weight-loss options with clear pricing and follow-through.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/weight-loss") }],
  }),
  component: WeightLossPage,
});

const BENEFITS = [
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "Every patient is reviewed by a licensed clinician who makes independent medical decisions.",
  },
  {
    icon: Syringe,
    title: "Proven GLP-1 pathways",
    text: "Compounded Semaglutide and Compounded Tirzepatide when clinically appropriate and legally available.",
  },
  {
    icon: Scale,
    title: "Built for follow-through",
    text: "Refill coordination, progress tracking, and ongoing support from first visit to success — not just a one-time script.",
  },
];

function WeightLossPage() {
  useEffect(() => {
    trackPageViewed("weight_loss");
  }, []);
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Medical weight loss"
          title="GLP-1 care guided by medical professionals"
          description="Beema Health focuses on evidence-based weight-loss treatments — reviewed by licensed providers, with clear, transparent pricing"
        />
        <div className="mt-10 text-center">
          <Button asChild size="xl">
            <Link to={qualifyHref(CTA_IDS.weight_loss_hero)}>
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>

      <TreatmentLineup />

      <Section>
        <SectionHeading
          eyebrow="Why Beema Health"
          title="Weight-loss care that respects your time and trust"
          description="No hype, no fake urgency — just a calm path from eligibility to provider review."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 120} className="h-full">
              <SurfaceCard className="flex h-full flex-col p-6">
                <HexBadge className="size-11">
                  <b.icon className="size-5" />
                </HexBadge>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {b.text}
                </p>
              </SurfaceCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SurfaceCard>
          <h3 className="text-lg font-semibold text-foreground">
            Who this is for
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Beema Health is here for adults seeking medical weight-loss support.
            During your eligibility check, we review BMI, health history, and
            any factors that might make a GLP-1 treatment plan inadvisable. A
            licensed provider decides whether treatment may be appropriate —
            prescribing is never guaranteed.
          </p>
          <ul className="mt-5 space-y-2">
            {[
              "Adults 18 and older",
              "Adults with BMI and health history suitable for review",
              "Patients seeking cash-pay compounded Semaglutide or Tirzepatide options",
            ].map((t) => (
              <li
                key={t}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/safety">Safety & eligibility</Link>
            </Button>
            {/* Pricing page disabled — pricing model not finalized yet.
            <Button asChild variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
            */}
          </div>
        </SurfaceCard>
      </Section>

      <Section className="pt-0">
        <div className="overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <h2 className="text-3xl font-bold">Ready to see if you qualify?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            The eligibility check takes about 5 minutes. No payment required to
            start.
          </p>
          <Button
            asChild
            size="xl"
            className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link to={qualifyHref(CTA_IDS.weight_loss_footer)}>
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
