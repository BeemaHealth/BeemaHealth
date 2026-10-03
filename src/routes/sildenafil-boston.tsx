import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, HeartPulse } from "lucide-react";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import {
  CLINICAL_PROVIDER_GROUP,
  SEAN_ARORA_PROVIDER,
} from "@/lib/provider-info";
import { trackPageViewed } from "@/lib/analytics";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  HoverLiftButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  TreatmentBreadcrumb,
  TreatmentFaqSection,
  TreatmentIncludedDropdown,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  ED_SILDENAFIL_PER_PILL_USD,
  ED_SILDENAFIL_PRICING,
  formatPerPillStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import {
  LEARN_FIFTY_STATE_SENTENCE,
  LEARN_USA_ONLY_SENTENCE,
} from "@/lib/learn-trust-copy";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";

/**
 * Boston paid-search landing page (2026-09-27) - Google Ads keyword ->
 * landing-page alignment for "sildenafil boston" / "viagra online boston"
 * style queries. Mirrors /sildenafil's copy, components, product data,
 * pricing, and Bask intake, with genuinely localized hero/FAQ copy rather
 * than a mechanical "nationwide" -> "Boston" swap. Self-canonicalizes;
 * never canonicalize back to /sildenafil. See
 * docs/features/treatment-pages.md "City ED pages" and /sildenafil.tsx
 * (the nationwide page, unchanged).
 */

const TITLE = "Sildenafil in Boston, MA | Online ED Treatment | Beema Health";
const DESCRIPTION = `Online sildenafil treatment for eligible adults in Boston, Massachusetts. Licensed provider review, transparent pricing from ${formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}, and discreet delivery if prescribed.`;
const SERVICE_DESCRIPTION =
  "Telehealth service connecting eligible adults in Boston and nationwide with independent licensed providers for sildenafil evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const BOSTON_AREA_SERVED = [
  {
    "@type": "City",
    name: "Boston",
    containedInPlace: { "@type": "State", name: "Massachusetts" },
  },
  { "@type": "Country", name: "United States" },
];

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is sildenafil and how does it work?",
    a: "Sildenafil works by relaxing blood vessels so more blood can flow to the penis, making it easier to get and keep an erection when you're sexually aroused. It doesn't cause arousal by itself - you still need to be sexually stimulated for it to work. Sildenafil typically takes effect within 30-60 minutes and lasts several hours, so it's usually taken as needed before sexual activity rather than daily.",
  },
  {
    q: "Is Beema Health's sildenafil the same as generic Viagra?",
    a: "Yes. Beema Health's sildenafil is the FDA-approved generic version of Viagra - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.",
  },
  {
    q: "Sildenafil or tadalafil - which is right for me?",
    a: "Both work similarly but differ in how quickly they take effect and how long they last; your licensed provider reviews your intake and recommends which option and dose may be appropriate for your case. See Tadalafil for that option, or ED Mints for a dissolve-under-the-tongue combination formulation.",
  },
  {
    q: "How does online ED care work for Boston patients?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace, from anywhere in Boston or Massachusetts. A licensed provider reviews your intake and independently decides whether sildenafil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does sildenafil cost through Beema Health?",
    a: `${simplePricingSentence("Sildenafil through Beema Health", ED_SILDENAFIL_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve Boston and Massachusetts?",
    a: `Yes. Beema Health serves adults in Boston and across all 50 US states through telehealth - there is no physical Boston office or in-person clinic; care happens entirely online. ${LEARN_FIFTY_STATE_SENTENCE} A licensed provider reviews your case remotely and decides, on an individual basis, whether sildenafil may be appropriate for you, considering cardiovascular history and current medications - never guaranteed just because you live in Boston. ${LEARN_USA_ONLY_SENTENCE}`,
  },
];

const WHATS_INCLUDED = [
  "Prescription Formulation",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  "Dedicated Human Customer Support",
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Final approval rests with a licensed provider",
];

export const Route = createFileRoute("/sildenafil-boston")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/sildenafil-boston") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/sildenafil-boston") },
      ...bootImagePreloadLinks("/sildenafil-boston"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Sildenafil in Boston", path: "/sildenafil-boston" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(FAQ_ITEMS)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Sildenafil Telehealth Care in Boston",
            description: SERVICE_DESCRIPTION,
            path: "/sildenafil-boston",
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-27",
            areaServed: BOSTON_AREA_SERVED,
            offer: {
              introPrice: ED_SILDENAFIL_PRICING.monthlyUsd,
              recurringPrice: ED_SILDENAFIL_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: SildenafilBostonPage,
});

function SildenafilBostonPage() {
  const heroCta = resolveCta(CTA_IDS.sildenafil_boston_hero);
  const footerCta = resolveCta(CTA_IDS.sildenafil_boston_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("sildenafil_boston");
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
        <div className="relative z-10">
          <TreatmentBreadcrumb current="Sildenafil in Boston" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <SectionHeading
                  as="h1"
                  align="left"
                  eyebrow="Boston telehealth ED care"
                  title={
                    <>
                      <LineReveal>Sildenafil treatment </LineReveal>
                      <LineReveal delay={0.1}>for Boston patients.</LineReveal>
                    </>
                  }
                  description="Beema Health connects eligible adults in Boston with licensed medical providers for sildenafil-based erectile dysfunction care. Complete your visit online and, if prescribed, medication is delivered discreetly to your door."
                  className="mx-0 max-w-xl text-left"
                />
              </div>
              <motion.div
                className="mt-6"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.35,
                  ease: EASE_OUT,
                }}
              >
                <GoogleRatingBadge />
              </motion.div>
              <motion.div
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.4,
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
                <Button asChild size="xl" variant="outline">
                  <Link to="/sildenafil-boston/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 max-w-md text-2xl font-bold text-foreground">
                From {formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}
              </p>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility and availability are determined by a
                licensed provider and applicable law.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm">
              {/*
                Not motion-animated: this is the page's LCP element (preloaded,
                fetchPriority="high"). See docs/features/treatment-pages.md,
                "Hero photo is never motion-animated" - same fix applied to
                /sildenafil applies here, since this hero reuses that photo.
              */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={sildenafilPhoto}
                  alt="Bottle of Beema Health sildenafil oral tablets, generic Viagra"
                  width={720}
                  height={900}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.3,
                  ease: EASE_OUT,
                }}
              >
                <TreatmentIncludedDropdown
                  items={WHATS_INCLUDED}
                  className="mt-6 w-full"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="What is sildenafil?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Sildenafil works by relaxing blood vessels so more blood can flow to
            the penis. That can make it easier to get and keep an erection when
            you're sexually aroused. It doesn't cause arousal by itself - you
            still need to be sexually stimulated for it to work. Sildenafil
            typically takes effect within 30-60 minutes and lasts several hours,
            so it's usually taken as needed before activity.
          </p>
          <p>
            Beema Health's sildenafil is the FDA-approved generic version of
            Viagra - the identical active ingredient, strength, and intended use
            as the brand-name product, dispensed by a licensed pharmacy, not a
            compounded formulation. Looking for tadalafil instead? See{" "}
            <Link to="/tadalafil-boston/" className="text-primary underline">
              Tadalafil in Boston
            </Link>
            . Looking for a dissolve-under-the-tongue combination formulation?
            See{" "}
            <Link to="/ed-mints-boston/" className="text-primary underline">
              ED Mints in Boston
            </Link>
            , a separate compounded product.
          </p>
          <p>
            Whether sildenafil may be appropriate for you is a decision your
            licensed provider makes individually, based on your health history
            and current medications. Completing intake does not guarantee a
            prescription.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/sildenafil-boston/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          eyebrow="Serving Boston"
          title="Telehealth sildenafil care for Boston, Massachusetts"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            If you're in Boston, or anywhere else in Massachusetts, you can
            complete Beema Health's medical intake entirely online, from home -
            there is no physical Boston office or in-person clinic to visit. A
            licensed provider reviews your case by telehealth and decides, on an
            individual basis, whether sildenafil may be appropriate for you.
            When prescribed, medication ships to your Boston address.
          </p>
          <p>
            Licensed providers can evaluate adults in all 50 US states,
            including Massachusetts. Looking for the nationwide version of this
            page instead? See{" "}
            <Link to="/sildenafil/" className="text-primary underline">
              Sildenafil
            </Link>
            .
          </p>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's sildenafil care works"
        showCareFollowUpNote
      />

      <Section className="pt-0">
        <SurfaceCard>
          <h3 className="text-lg font-semibold text-foreground">
            Who may be eligible
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Not everyone qualifies. Your provider weighs cardiovascular history,
            current medications, and applicable state law before making an
            independent decision.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {ELIGIBILITY_POINTS.map((t) => (
              <li
                key={t}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                {t}
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="Safety and important information"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <div className="flex gap-4">
              <HeartPulse className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Prescription medical care
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This medication is a prescription product and isn't
                  appropriate for everyone, including people on certain nitrate
                  medications or with certain cardiovascular conditions. It is
                  the FDA-approved generic version of Viagra, dispensed by a
                  licensed pharmacy.
                </p>
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex gap-4">
              <HeartPulse className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Talk to your provider
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Include your full medical history, possible contraindications,
                  side effects, and any medication interactions, especially
                  nitrates, in your intake questionnaire. After you complete
                  intake and pay, you can ask follow-up questions. Before then,
                  email{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-primary underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  . For more on eligibility and warning signs, see{" "}
                  <Link to="/safety/" className="text-primary underline">
                    Safety &amp; eligibility
                  </Link>
                  .
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Clinical oversight: Beema Health&rsquo;s clinical provider network is
          led by {SEAN_ARORA_PROVIDER.displayName},{" "}
          {SEAN_ARORA_PROVIDER.credentials}, {SEAN_ARORA_PROVIDER.role} of{" "}
          {CLINICAL_PROVIDER_GROUP}. Licensed clinicians make every treatment
          decision independently, the clinician assigned to your care may vary
          by state licensure and availability.
        </p>
      </Section>

      <Section id="faq" className="scroll-mt-20 bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="Frequently asked questions"
          description={
            <>
              For broader questions about pricing, shipping, and refills, see
              our full{" "}
              <Link to="/faq/" className="text-primary underline">
                FAQ
              </Link>
              .
            </>
          }
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <TreatmentFaqSection items={FAQ_ITEMS} />
        </div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div
            aria-hidden
            className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0 z-0"
          />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              <LineReveal>Start with your medical intake.</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Save your progress and finish at your own pace. A licensed
              provider makes every clinical decision independently, prescribing
              is never guaranteed.
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
      <MoneyPageGuides path="/sildenafil-boston/" />
    </MarketingLayout>
  );
}
