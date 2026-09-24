import { useEffect, useState } from "react";
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
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import {
  MINT_OPTIONS,
  EdMintsPickerModal,
} from "@/components/site/EdMintsPicker";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import edMintsOdtPhoto from "@/assets/treatments/ed-mints-sildenafil-tadalafil-oxytocin-odt.webp";

const TITLE = "ED Mints - Compounded Dissolving ED Treatment | Beema Health";
const DESCRIPTION =
  "Compounded ED formulations that dissolve under the tongue, reviewed by licensed providers. Nationwide telehealth care. Prescribing is never guaranteed.";
const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for compounded, dissolve-under-the-tongue ED formulation evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What's the difference between the two ED Mints formulations?",
    a: "Both are compounded combination formulations that dissolve under the tongue rather than being swallowed. One combines tadalafil and sildenafil at 12mg/60mg as a rapidly dissolving tablet (RDT); the other combines sildenafil, tadalafil, and oxytocin at 50mg/20mg/125 IU as an orally dissolving tablet (ODT). Both are prepared at an FDA-registered 503B outsourcing facility and are not sold as single commercial products. Your licensed provider reviews your intake and recommends which option, if any, may be appropriate for your case; prescribing either is never guaranteed.",
  },
  {
    q: "How do ED Mints work, and when should I take one?",
    a: "ED Mints dissolve under the tongue - no water needed. Most patients take one about 30 minutes before sexual activity, and no more than one dose in a 24-hour period. Your provider will confirm timing and dosing based on your health history. Like other ED formulations, these medicines don't cause arousal by themselves - you still need to be sexually stimulated for them to work.",
  },
  {
    q: "Are ED Mints the same as generic Viagra or Cialis?",
    a: "No. ED Mints are compounded, not FDA-approved, and are not the same product as any FDA-approved branded or generic medication, even when they share active ingredients. They're prepared at an FDA-registered 503B outsourcing facility as combination formulations not available as a single commercial product, and are considered only when legally available and clinically appropriate.",
  },
  {
    q: "How much do ED Mints cost through Beema Health?",
    a: `Pricing for both formulations, including any quarterly savings, is shown during your online questionnaire before you complete your order - our low cost fee covers your provider consultation, prescription formulation, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Whether a specific compounded formulation is available to you still depends on your state's rules around compounded medications and pharmacy fulfillment in your area, and eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications, including cardiovascular history.",
  },
];

const WHATS_INCLUDED = [
  "Prescription Formulation",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Final approval and formulation selection rests with a licensed provider",
];

export const Route = createFileRoute("/ed-mints")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/ed-mints") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/ed-mints") },
      ...bootImagePreloadLinks("/ed-mints"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "ED Mints", path: "/ed-mints" },
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
            name: "ED Mints Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/ed-mints",
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-03",
          }),
        ),
      },
    ],
  }),
  component: EdMintsPage,
});

function EdMintsPage() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<"rdt" | "odt">("rdt");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("ed_mints");
  }, []);

  const openPicker = (preselect: "rdt" | "odt" = "rdt") => {
    setPickerInitial(preselect);
    setPickerOpen(true);
  };

  return (
    <MarketingLayout>
      <EdMintsPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialSelected={pickerInitial}
      />

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
          <TreatmentBreadcrumb current="ED Mints" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth ED care"
                title={
                  <>
                    <LineReveal>ED Mints, </LineReveal>
                    <LineReveal delay={0.1}>
                      dissolve-under-the-tongue relief.
                    </LineReveal>
                  </>
                }
                description="Two combination formulations that dissolve under the tongue - no water needed. Completing intake does not guarantee a prescription."
                className="mx-0 max-w-xl text-left"
              />
              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.4,
                  ease: EASE_OUT,
                }}
              >
                <HoverLiftButton>
                  <Button size="xl" onClick={() => openPicker()}>
                    Get Started <ArrowRight />
                  </Button>
                </HoverLiftButton>
                <Button asChild size="xl" variant="outline">
                  <Link to="/ed-mints/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility, formulation, and availability are
                determined by a licensed provider and applicable law. Pricing is
                shown during your online questionnaire.
              </p>
            </div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.7,
                delay: reduceMotion ? 0 : 0.2,
                ease: EASE_OUT,
              }}
              className="mx-auto w-full max-w-sm"
            >
              <div className="relative aspect-square overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={edMintsOdtPhoto}
                  alt={MINT_OPTIONS[1].photoAlt}
                  width={1024}
                  height={1024}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <TreatmentIncludedDropdown
                items={WHATS_INCLUDED}
                className="mt-6 w-full"
              />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="What are ED Mints?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            ED Mints are compounded combination formulations that dissolve under
            the tongue instead of being swallowed with water. Most patients take
            one about 30 minutes before sexual activity, and no more than one
            dose in a 24-hour period. They don't cause arousal by themselves -
            you still need to be sexually stimulated for them to work.
          </p>
          <p>
            Beema Health offers two ED Mints formulations, each a combination
            not sold as a single commercial product and prepared at an
            FDA-registered 503B outsourcing facility. These formulations are not
            FDA-approved and are considered only when legally available and
            clinically appropriate. Which option, if any, may be appropriate for
            you is a decision your licensed provider makes individually.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/ed-mints/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <h3 className="text-base font-semibold text-foreground">
              Tadalafil + Sildenafil 12mg/60mg RDT
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A rapidly dissolving tablet combining tadalafil and sildenafil
              into one dose.
            </p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-base font-semibold text-foreground">
              Sildenafil 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              An orally dissolving tablet combining sildenafil, tadalafil, and
              oxytocin into one dose.
            </p>
          </SurfaceCard>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's ED Mints care works"
        showCareFollowUpNote
      />

      <Section id="formulations" className="pt-0">
        <SectionHeading
          align="left"
          title="Choose your formulation"
          description="Your provider decides which formulation, if any, is clinically appropriate - this is a starting point, not a self-selected order. Each formulation has its own intake, where pricing is shown."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 flex justify-center">
          <HoverLiftButton>
            <Button size="xl" onClick={() => openPicker()}>
              Get Started <ArrowRight />
            </Button>
          </HoverLiftButton>
        </div>
        <div className="mt-8">
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Who may be eligible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Not everyone qualifies. Your provider weighs cardiovascular
              history, current medications, and applicable state law before
              making an independent decision.
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
        </div>
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
                  These formulations are prescription products and aren't
                  appropriate for everyone, including people on certain nitrate
                  medications or with certain cardiovascular conditions. They
                  are compounded at an FDA-registered 503B outsourcing facility,
                  not FDA-approved, and considered only when legally available
                  and clinically appropriate.
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
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={() => openPicker()}
              >
                Get Started <ArrowRight />
              </Button>
            </HoverLiftButton>
          </div>
        </div>
      </Section>
      <MoneyPageGuides path="/ed-mints/" />
    </MarketingLayout>
  );
}
