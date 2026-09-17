import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Pill,
  ShieldCheck,
  SprayCan,
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
  HAIRLOSS_FINASTERIDE_PRICING,
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  HAIRLOSS_TOPICAL_MEN_PRICING,
  HAIRLOSS_TOPICAL_WOMEN_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
} from "@/lib/simple-treatment-pricing";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";

const TITLE = "Hair Loss Treatment | Beema Health";
const DESCRIPTION = `FDA-approved oral meds and compounded topical formulas for hair loss, reviewed by licensed providers nationwide, from ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}. Never guaranteed.`;

export const Route = createFileRoute("/hair-loss")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/hair-loss") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/hair-loss") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Hair Loss", path: "/hair-loss" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Hair Loss Telehealth Program",
            description:
              "Telehealth hair loss program from Beema Health. Licensed providers review every patient and may prescribe FDA-approved generic oral medications or compounded topical hairloss formulations when clinically appropriate; compounded medications are not FDA-approved, and prescribing is never guaranteed.",
            path: "/hair-loss",
            serviceType: "Hair loss telehealth program",
          }),
        ),
      },
    ],
  }),
  component: HairLossPage,
});

/**
 * Single hub page for the hair-loss category (2026-09-04) - merges what used
 * to be two separate, competing pages: `/hair` (this hub) and `/hairloss`
 * (a broader 6-SKU overview/FAQ page). Neither had shipped to production, so
 * there was no SEO equity to preserve on either URL - they're combined here
 * rather than one redirecting to the other. Mirrors `/weight-loss` and
 * `/sexual-health`: a category overview linking straight to the dedicated
 * money page for each live product, not a deep FAQ page itself.
 *
 * Oral Minoxidil and both sexes' Hair Loss Spray launched 2026-09-09 (Matt),
 * alongside matching entries in HAIR_SECTIONS (SiteHeader.tsx). Oral
 * Minoxidil is one product/one price/one Bask questionnaire for both sexes,
 * but gets two separate cards here (like the spray) rather than one "for men
 * and women" card, so each links to its own single-sex page
 * (`/oral-minoxidil-men`, `/oral-minoxidil-women`) - per Matt, women
 * shouldn't land on copy that also addresses men, and vice versa. "Oral Hair
 * Compound" (women's, HAIRLOSS_WOMENS_COMPOUND_PRICING) is a distinct
 * formulation not part of this launch - do not add it here without a
 * separate go-ahead.
 */
const LINEUP: CategoryLineupItem[] = [
  {
    id: "oral-finasteride",
    name: "Oral Finasteride",
    form: "For men, once daily",
    pricing: HAIRLOSS_FINASTERIDE_PRICING,
    icon: Droplet,
    to: "/oral-finasteride/",
    perDayNote: simplePerDaySentence(HAIRLOSS_FINASTERIDE_PRICING),
  },
  {
    id: "oral-minoxidil-men",
    name: "Oral Minoxidil (Men)",
    form: "For men, once daily",
    pricing: HAIRLOSS_ORAL_MINOXIDIL_PRICING,
    icon: Pill,
    to: "/oral-minoxidil-men/",
    perDayNote: simplePerDaySentence(HAIRLOSS_ORAL_MINOXIDIL_PRICING),
  },
  {
    id: "oral-minoxidil-women",
    name: "Oral Minoxidil (Women)",
    form: "For women, once daily",
    pricing: HAIRLOSS_ORAL_MINOXIDIL_PRICING,
    icon: Pill,
    to: "/oral-minoxidil-women/",
    perDayNote: simplePerDaySentence(HAIRLOSS_ORAL_MINOXIDIL_PRICING),
  },
  {
    id: "hair-loss-spray-men",
    name: "Hair Loss Spray (Men)",
    form: "For men, topical spray",
    pricing: HAIRLOSS_TOPICAL_MEN_PRICING,
    icon: SprayCan,
    to: "/hair-loss-spray-men/",
    perDayNote: simplePerDaySentence(HAIRLOSS_TOPICAL_MEN_PRICING),
  },
  {
    id: "hair-loss-spray-women",
    name: "Hair Loss Spray (Women)",
    form: "For women, topical spray",
    pricing: HAIRLOSS_TOPICAL_WOMEN_PRICING,
    icon: SprayCan,
    to: "/hair-loss-spray-women/",
    perDayNote: simplePerDaySentence(HAIRLOSS_TOPICAL_WOMEN_PRICING),
  },
];

const BENEFITS = [
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "Every patient is reviewed by a licensed clinician who makes independent medical decisions.",
  },
  {
    icon: Droplet,
    title: "Oral and topical options",
    text: "Oral finasteride and oral minoxidil are FDA-approved generic medications. Topical hair loss sprays are compounded formulations, individualized to you. Your provider recommends the formulation, if any.",
  },
  {
    icon: ShieldCheck,
    title: "FDA-approved and compounded options",
    text: "Oral medications are FDA-approved generics. Compounded topical sprays are not FDA-approved and are considered only when legally available and clinically appropriate. Prescribing is never guaranteed.",
  },
];

function HairLossPage() {
  const heroCta = resolveCta(CTA_IDS.hair_hero);
  const footerCta = resolveCta(CTA_IDS.hair_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("hair_loss");
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
            <TreatmentBreadcrumb current="Hair Loss" />
          </div>
          <SectionHeading
            as="h1"
            eyebrow="Hair loss care"
            title={
              <>
                <LineReveal>Hair loss treatment guided by </LineReveal>
                <LineReveal delay={0.1}>licensed providers</LineReveal>
              </>
            }
            description={`Beema Health offers FDA-approved generic oral medications and compounded topical hairloss formulations, from ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}. Compounded medications are not FDA-approved.`}
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
          title="Hair loss formulations"
          description="Your provider decides which formulation, if any, is clinically appropriate for you."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-10">
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
            title="Hair loss care that respects your time and trust"
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
              Beema Health is here for adults considering hair loss treatment.
              During your medical intake, we review your hair loss pattern,
              health history, and current medications. A licensed provider
              decides whether a formulation may be appropriate; prescribing is
              never guaranteed.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Adults 18 and older",
                "Eligibility considers hair loss pattern, health history, and current medications",
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
      <MoneyPageGuides path="/hair-loss/" />
    </MarketingLayout>
  );
}
