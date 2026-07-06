import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import {
  ArrowRight,
  Heart,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Eyebrow,
  HexBadge,
  HexMotif,
  InfinityMotif,
  Reveal,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Beema Health" },
      {
        name: "description",
        content:
          "Health isn't a destination, it's a lifelong journey. The story behind Beema Health's bee, infinity wings, and hexagon — and what they mean for your care.",
      },
      { property: "og:title", content: "About — Beema Health" },
      {
        property: "og:description",
        content:
          "Precision, trust, community, health, and consistency — the values behind Beema Health telehealth care.",
      },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/about") }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    icon: Target,
    title: "Precision",
    text: "Every action serves a purpose — from intake questions to provider review.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    text: "Licensed clinicians make independent medical decisions, always.",
  },
  {
    icon: Users,
    title: "Community",
    text: "Patients, providers, and technology working toward the same goal.",
  },
  {
    icon: Heart,
    title: "Health",
    text: "Care measured in outcomes, not just prescriptions filled.",
  },
  {
    icon: RefreshCcw,
    title: "Consistency",
    text: "Follow-through that continues past the first visit.",
  },
];

function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <Section className="bg-grad-hero relative overflow-hidden">
        <HexMotif className="float-slow pointer-events-none absolute -right-16 top-8 hidden w-56 text-primary/15 lg:block" />
        <SectionHeading
          eyebrow="Our story"
          title="Health isn't a destination. It's a lifelong journey."
          description="The bee, the infinity wings, and the hexagon — every part of our mark says something about how we believe care should work."
        />
      </Section>

      {/* Manifesto — black band, honey accents */}
      <Section className="pt-0">
        <Reveal>
          <div className="bg-grad-ink relative overflow-hidden rounded-4xl px-6 py-14 text-ink-foreground md:px-16 md:py-20">
            <InfinityMotif className="pointer-events-none absolute -right-12 -top-8 w-80 text-primary/12" />
            <HexMotif className="pointer-events-none absolute -bottom-16 -left-14 w-64 text-primary/10" />
            <div className="relative mx-auto max-w-2xl space-y-6 text-pretty leading-relaxed text-ink-foreground/85">
              <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
                Manifesto
              </Eyebrow>
              <p className="text-xl font-semibold text-ink-foreground md:text-2xl">
                At Beema Health, we believe the best healthcare should work the
                way nature does.
              </p>
              <p>
                Honey bees are among nature's most efficient builders. Every
                action serves a purpose. Every member contributes to something
                greater than themselves. Together, they create thriving
                communities.
              </p>
              <p>That's how we believe healthcare should work.</p>
              <p>
                Our bee represents precision, trust, and collaboration. The
                infinity-shaped wings symbolize lifelong wellness, because
                health isn't a finish line, it's a continuous journey. The
                hexagon reflects efficiency and strength, inspired by one of
                nature's most perfect designs.
              </p>
              <p>
                At Beema Health, our mission is simple: connect patients,
                providers, and technology to deliver care that's smarter, more
                personal, and built for lasting results.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Five pillars */}
      <Section className="pt-0">
        <Reveal>
          <SectionHeading
            eyebrow="What the bee means"
            title="Five pillars, one mark"
          />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 100} className="h-full">
              <SurfaceCard className="flex h-full flex-col items-start p-6">
                <HexBadge className="size-11">
                  <p.icon className="size-5" />
                </HexBadge>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.text}
                </p>
              </SurfaceCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Infinity — continuous care */}
      <Section className="bg-muted/40 pt-0">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Infinity wings</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
              Continuous care, not a finish line
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              The infinity shape in our wings is a reminder that wellness
              doesn't end at a prescription. It's why we build for
              follow-through — refill coordination, ongoing check-ins, and a
              care team that stays with you long after your first visit.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
              <InfinityMotif className="float-slow w-3/4 text-primary" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Hexagon — efficiency */}
      <Section className="pt-0">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
              <HexMotif className="float-slower w-3/4 text-primary" />
              <Sparkles className="absolute size-10 text-accent-foreground" />
            </div>
          </Reveal>
          <Reveal delay={140} className="order-1 lg:order-2">
            <Eyebrow>Hexagon</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
              Nature's most efficient shape
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Hexagons tile perfectly with zero wasted space — the same
              principle we apply to your care. Minimal steps, no unnecessary
              friction, from eligibility check to provider review.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pt-0">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
            <HexMotif className="pointer-events-none absolute -left-10 -bottom-14 w-44 text-primary-foreground/10" />
            <HexMotif className="pointer-events-none absolute -right-8 -top-12 w-36 text-primary-foreground/10" />
            <h2 className="text-3xl font-bold">Ready to start your journey?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              The eligibility check takes about 5 minutes. No payment required,
              and no prescription is guaranteed.
            </p>
            <Button
              asChild
              size="xl"
              className="mt-8 bg-ink text-ink-foreground hover:bg-ink/85"
            >
              <Link to={qualifyHref(CTA_IDS.about)}>
                See if you qualify <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </Section>
    </MarketingLayout>
  );
}
