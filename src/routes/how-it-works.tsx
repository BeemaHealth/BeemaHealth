import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import {
  ArrowRight,
  ClipboardCheck,
  MessageCircle,
  RefreshCcw,
  Send,
  Stethoscope,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  HexBadge,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Beema Health" },
      {
        name: "description",
        content:
          "From a 5-minute eligibility check to licensed provider review — how Beema Health telehealth weight-loss care works, step by step.",
      },
      { property: "og:title", content: "How it works — Beema Health" },
      {
        property: "og:description",
        content:
          "A minimal path from eligibility to provider review. No membership fee, no prescription guarantees.",
      },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/how-it-works") }],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer short questions about your health, location, and treatment interest. It takes about 5 minutes.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Create an account and complete a secure medical questionnaire. Save and continue later anytime.",
  },
  {
    icon: Stethoscope,
    title: "Provider review",
    text: "A licensed provider reviews your intake and decides whether treatment may be appropriate. Prescribing is never guaranteed.",
  },
];

const AFTER = [
  {
    icon: MessageCircle,
    title: "Stay connected",
    text: "Your care doesn't end at checkout — track your status and updates from your dashboard.",
  },
  {
    icon: RefreshCcw,
    title: "Refills that follow through",
    text: "When treatment continues, refill coordination keeps your plan moving without restarting from zero.",
  },
];

function HowItWorksPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="How it works"
          title="A minimal path from intake to provider review"
          description="Medication-only pricing with no platform membership fee — just the essentials from eligibility to provider review."
        />
      </Section>

      <Section className="pt-0">
        <ol className="grid w-full gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="h-full">
              <Reveal delay={i * 120} className="h-full">
                <SurfaceCard className="flex h-full flex-col p-6">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <HexBadge>
                      <s.icon className="size-5" />
                    </HexBadge>
                    <h3 className="text-lg font-semibold text-foreground">
                      {s.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </SurfaceCard>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal className="mt-10">
          <div className="bg-grad-ink grid gap-6 rounded-4xl px-6 py-10 text-ink-foreground md:grid-cols-2 md:px-12">
            {AFTER.map((a) => (
              <div key={a.title} className="flex items-start gap-4">
                <span className="clip-hex grid size-11 shrink-0 place-items-center bg-primary/15 text-primary">
                  <a.icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-foreground/70">
                    {a.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link to={qualifyHref(CTA_IDS.how_it_works)}>
              See if you qualify <ArrowRight />
            </Link>
          </Button>
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
            A licensed provider makes every clinical decision independently.
            Completing intake does not guarantee a prescription.
          </p>
        </div>
      </Section>
    </MarketingLayout>
  );
}
