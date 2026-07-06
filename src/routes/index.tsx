import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { createFunnelSession } from "@/lib/api/client";
import { getPendingUtms, clearPendingUtms } from "@/lib/utm";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Send,
  Stethoscope,
  Truck,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { TreatmentLineup } from "@/components/site/TreatmentLineup";
import {
  Eyebrow,
  FloatingHexagons,
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
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beema Health — Medical weight-loss care" },
      {
        name: "description",
        content:
          "Medical weight-loss care reviewed by a licensed provider. Secure intake for Zepbound, Wegovy, and affordable alternatives when appropriate.",
      },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer a short set of questions to see if Beema Health may be a fit. It takes about 5 minutes.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Complete a secure medical questionnaire for provider review — private, encrypted, and at your pace.",
  },
  {
    icon: Stethoscope,
    title: "A licensed provider reviews",
    text: "A licensed provider reviews your information and decides next steps. No prescription is guaranteed.",
  },
];

const TRUST_ITEMS = [
  {
    icon: Stethoscope,
    title: "Licensed providers",
    text: "Independent clinicians review every intake",
  },
  {
    icon: BadgeCheck,
    title: "Transparent pricing",
    text: "Every charge shown before you pay",
  },
  {
    icon: Truck,
    title: "US pharmacies",
    text: "Medication ships from US-based pharmacies",
  },
  {
    icon: Lock,
    title: "Private & secure",
    text: "HIPAA-aligned handling of your health data",
  },
];

function HomePage() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const utms = getPendingUtms();
      const hasUtms = Object.keys(utms).length > 0;
      createFunnelSession(hasUtms ? utms : undefined)
        .then(() => {
          if (hasUtms) clearPendingUtms();
          trackPageViewed("home");
        })
        .catch((err: unknown) => {
          console.error("[beemahealth] home session failed:", err);
          trackPageViewed("home");
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-grad-hero relative overflow-hidden">
        <FloatingHexagons className="z-0" />
        <div className="veya-container relative z-10 grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <Eyebrow>GLP-1 weight-loss care</Eyebrow>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] text-foreground md:text-6xl">
              Weight-loss care that's{" "}
              <span className="text-grad-brand">human</span> and built for the{" "}
              <span className="text-grad-brand">long run.</span>
            </h1> 
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Licensed providers, pricing you see before you pay, and
              follow-through that doesn't stop at the first prescription.
              Continuous care. Precision medicine.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link to={qualifyHref(CTA_IDS.home_hero)}>
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/how-it-works">How it works</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                "Licensed provider review",
                "No surprise charges",
                "Reliable refills",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent-foreground" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <HexMotif className="float-slow pointer-events-none absolute -right-8 -top-10 w-28 text-primary/30" />
            <div className="clip-hex relative aspect-[100/112] w-full overflow-hidden bg-ink">
              <img
                src={heroImg}
                alt="A calm, bright kitchen with fresh vegetables and a glass of water"
                width={1280}
                height={1024}
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/10 to-transparent"
              />
              <div className="absolute inset-x-0 top-[24%] px-8 text-left md:px-12">
                <p className="text-sm font-semibold text-ink-foreground">
                  Care that stays with you
                </p>
                <p className="mt-1 text-xs text-ink-foreground/80">
                  From first check-in to lasting results
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-grad-ink text-ink-foreground">
        <div className="veya-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="clip-hex grid size-10 shrink-0 place-items-center bg-primary/15 text-primary">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-foreground/70">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Section id="how-it-works">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Three simple steps"
            description="A minimal path from eligibility to provider review — education here, care decisions with your clinician."
          />
        </Reveal>
        <div className="mt-12 grid w-full gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 120} className="h-full">
              <SurfaceCard className="flex h-full flex-col p-6">
                <span className="text-sm font-semibold text-muted-foreground">
                  Step {i + 1}
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <HexBadge className="size-11">
                    <s.icon className="size-5" />
                  </HexBadge>
                  <h3 className="text-lg font-semibold text-foreground">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </SurfaceCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <TreatmentLineup />

      {/* Brand manifesto teaser */}
      <Section>
        <Reveal>
          <div className="bg-grad-ink relative overflow-hidden rounded-4xl px-6 py-14 text-ink-foreground md:px-14 md:py-16">
            <InfinityMotif className="pointer-events-none absolute -right-10 -bottom-12 w-72 text-primary/12" />
            <div className="relative max-w-2xl">
              <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
                Why the bee?
              </Eyebrow>
              <h2 className="mt-4 text-balance text-3xl font-bold md:text-4xl">
                The best healthcare works the way nature does.
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-ink-foreground/75">
                Our bee stands for precision, trust, and consistency. Its
                infinity-shaped wings are a reminder that health isn't a finish
                line, but a lifelong journey we stay on with you.
              </p>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-8 border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
              >
                <Link to="/about">
                  Our story <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Transparent pricing teaser — disabled, pricing model not finalized yet
      <Section className="pt-0">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Transparent pricing</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
              You see every charge before you pay.
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              No platform membership fee. Medication, shipping, and labs are
              always listed separately — estimate your monthly cost before you
              even create an account.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/pricing">
                Explore pricing <ArrowRight />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={140}>
            <SurfaceCard>
              <ul className="space-y-4">
                {[
                  "Medication-only pricing — no monthly membership",
                  "Pre-charge reminders before every payment",
                  "Insurance, cash-pay, and local pickup paths",
                  "Receipts for every charge",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </Reveal>
        </div>
      </Section>
      */}

      {/* Final CTA */}
      <Section className="pt-0">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
            <HexMotif className="pointer-events-none absolute -left-10 -bottom-14 w-44 text-primary-foreground/10" />
            <HexMotif className="pointer-events-none absolute -right-8 -top-12 w-36 text-primary-foreground/10" />
            <h2 className="text-3xl font-bold">Ready to start?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              The eligibility check takes about 5 minutes. No payment required
              to start, and no prescription is guaranteed.
            </p>
            <Button
              asChild
              size="xl"
              className="mt-8 bg-ink text-ink-foreground hover:bg-ink/85"
            >
              <Link to={qualifyHref(CTA_IDS.home_mid)}>
                See if you qualify <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </Section>
    </MarketingLayout>
  );
}
