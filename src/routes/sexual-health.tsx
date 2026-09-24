import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Pill,
  Stethoscope,
} from "lucide-react";
import { breadcrumbJsonLd, canonicalUrl, serviceJsonLd } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  FloatingHexagons,
  HexBadge,
  HoverLiftButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  SimpleCategoryLineup,
  TreatmentBreadcrumb,
  type CategoryLineupItem,
} from "@/components/site/TreatmentPageBlocks";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PRICING,
  formatSimpleStartingAt,
} from "@/lib/simple-treatment-pricing";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";
import edMintsPhoto from "@/assets/treatments/ed-mints-tadalafil-sildenafil-rdt.webp";

const TITLE = "Sexual Health Treatment | Beema Health";
const DESCRIPTION = `Tadalafil (generic Cialis), sildenafil (generic Viagra), and compounded ED Mints, reviewed by licensed providers. From ${formatSimpleStartingAt(ED_TADALAFIL_PRICING)}. Never guaranteed.`;

export const Route = createFileRoute("/sexual-health")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/sexual-health") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/sexual-health") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Sexual Health", path: "/sexual-health" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Sexual Health Telehealth Program",
            description:
              "Telehealth sexual health program from Beema Health. Licensed providers review every patient and may prescribe tadalafil, sildenafil (the FDA-approved generic versions of Cialis and Viagra), or ED Mints (a compounded combination formulation) when clinically appropriate; prescribing is never guaranteed.",
            path: "/sexual-health",
            serviceType: "Sexual health telehealth program",
          }),
        ),
      },
    ],
  }),
  component: SexualHealthPage,
});

/**
 * TRT is paused (2026-08-28, not selling it right now) - this hub is
 * ED-only until it returns. When it does, it goes back here as its own
 * lineup entry, not folded into the ED page - see
 * docs/features/treatment-pages.md.
 *
 * "ED Mints" (2026-09-03) links to its own comparison page, /ed-mints, not
 * /ed - it's 2 dissolve-under-the-tongue combo products, each with its own
 * Bask intake, priced identically, so ED_MINTS_RDT_PRICING is used here as
 * the representative "starting at" price for the card.
 *
 * Each card's `image` (2026-09-23) reuses the real product photo already
 * shot for that medication's own money page - tadalafil/sildenafil's
 * bottle shots, and the RDT ED Mints photo already used for the "Sexual
 * Health" card on the homepage's WellnessLineupSection, for the same
 * two-SKU reason described there.
 */
const LINEUP: CategoryLineupItem[] = [
  {
    id: "ed-tadalafil",
    name: "Tadalafil",
    form: "Oral, taken as needed or daily",
    pricing: ED_TADALAFIL_PRICING,
    icon: Pill,
    image: {
      src: tadalafilPhoto,
      alt: "Bottle of Beema Health tadalafil oral tablets, generic Cialis",
      width: 720,
      height: 900,
    },
    to: "/tadalafil/",
  },
  {
    id: "ed-sildenafil",
    name: "Sildenafil",
    form: "Oral, taken as needed",
    pricing: ED_SILDENAFIL_PRICING,
    icon: Pill,
    image: {
      src: sildenafilPhoto,
      alt: "Bottle of Beema Health sildenafil oral tablets, generic Viagra",
      width: 720,
      height: 900,
    },
    to: "/sildenafil/",
  },
  {
    id: "ed-mints",
    name: "ED Mints",
    form: "Dissolves under the tongue, no water needed",
    pricing: ED_MINTS_RDT_PRICING,
    icon: Pill,
    image: {
      src: edMintsPhoto,
      alt: "Beema Health ED Mints tadalafil and sildenafil rapidly dissolving tablet",
      width: 1024,
      height: 1024,
    },
    to: "/ed-mints/",
  },
];

const BENEFITS = [
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "Every patient is reviewed by a licensed clinician who makes independent medical decisions.",
  },
  {
    icon: HeartPulse,
    title: "Multiple formulations",
    text: "Tadalafil, sildenafil, and ED Mints, a dissolve-under-the-tongue combination. Your provider reviews your intake and recommends which, if any, may be appropriate.",
  },
  {
    icon: Pill,
    title: "Tadalafil (Generic Cialis®) & Sildenafil (Generic Viagra®)",
    text: "Tadalafil and sildenafil are the FDA-approved generic versions of Cialis and Viagra. ED Mints is a separate compounded combination formulation, considered only when legally available and clinically appropriate.",
  },
];

function SexualHealthPage() {
  const heroCta = resolveCta(CTA_IDS.sexual_health_hero);
  const footerCta = resolveCta(CTA_IDS.sexual_health_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("sexual_health");
  }, []);

  return (
    <MarketingLayout>
      <Section className="relative overflow-hidden bg-grad-hero">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <FloatingHexagons className="z-0" />
        <div className="relative z-10">
          <div className="mb-6 flex justify-center">
            <TreatmentBreadcrumb current="Sexual Health" />
          </div>
          <SectionHeading
            as="h1"
            eyebrow="Men's sexual health"
            title={
              <>
                <LineReveal>Sexual health care guided by </LineReveal>
                <LineReveal delay={0.1}>licensed providers</LineReveal>
              </>
            }
            description={`Beema Health offers tadalafil (generic Cialis), sildenafil (generic Viagra), and compounded ED Mints, from ${formatSimpleStartingAt(ED_TADALAFIL_PRICING)}.`}
          />
          <motion.div
            className="mt-10 text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.55,
              ease: EASE_OUT,
            }}
          >
            <HoverLiftButton>
              <Button asChild size="xl">
                <Link
                  to={heroCta.to}
                  search={heroCta.search}
                  onClick={heroCta.onClick}
                >
                  {heroCta.label} <ArrowRight />
                </Link>
              </Button>
            </HoverLiftButton>
          </motion.div>
        </div>
      </Section>

      <Section className="bg-muted/40 py-16 md:py-20">
        <SectionHeading
          align="left"
          eyebrow="Choose your formulation"
          title="ED formulations"
          description="Your provider decides which formulation, if any, is clinically appropriate for you. Women's sexual health products are coming soon."
          className="mx-0 max-w-2xl"
        />
        <h3 className="mt-10 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
          For Men
        </h3>
        <div className="mt-4">
          <SimpleCategoryLineup items={LINEUP} />
        </div>
      </Section>

      <Section>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            eyebrow="Why Beema Health"
            title="Sexual health care that respects your time and trust"
            description="No hype, no fake urgency, just a calm path from intake to provider review."
          />
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              className="h-full"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 32, rotate: i % 2 === 0 ? -1.5 : 1.5 }
              }
              whileInView={
                reduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }
              }
              viewport={{ once: true, amount: 0.3 }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : 0.55,
                delay: reduceMotion ? 0 : i * 0.1,
                ease: EASE_OUT,
              }}
            >
              <SurfaceCard className="flex h-full flex-col p-6 transition-shadow hover:shadow-lift">
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
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Who this is for
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Beema Health is here for adult men considering ED treatment.
              During your medical intake, we review your health history, current
              medications, and any factors that might make treatment
              inadvisable. A licensed provider decides whether treatment may be
              appropriate for you; prescribing is never guaranteed.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Adult men, 18 and older",
                "Eligibility considers cardiovascular history and current medications",
                "Final approval and formulation selection rests with a licensed provider",
              ].map((t, i) => (
                <motion.li
                  key={t}
                  className="flex items-start gap-2 text-sm text-foreground"
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : i * 0.08,
                    ease: EASE_OUT,
                  }}
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  {t}
                </motion.li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <HoverLiftButton>
                <Button asChild variant="outline">
                  <Link to="/safety/">Safety & eligibility</Link>
                </Button>
              </HoverLiftButton>
            </div>
          </SurfaceCard>
        </motion.div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div
            aria-hidden
            className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0 z-0"
          />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              <LineReveal>Ready to get started?</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Complete your medical intake online. A licensed provider makes
              every clinical decision independently, prescribing is never
              guaranteed.
            </p>
            <HoverLiftButton className="mt-8">
              <Button
                asChild
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link
                  to={footerCta.to}
                  search={footerCta.search}
                  onClick={footerCta.onClick}
                >
                  {footerCta.label} <ArrowRight />
                </Link>
              </Button>
            </HoverLiftButton>
          </div>
        </div>
      </Section>
      <MoneyPageGuides path="/sexual-health/" />
    </MarketingLayout>
  );
}
