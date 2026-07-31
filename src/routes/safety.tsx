import { useEffect } from "react";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  medicalWebPageJsonLd,
} from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ShieldCheck,
  AlertTriangle,
  Phone,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Eyebrow,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { TreatmentBreadcrumb } from "@/components/site/TreatmentPageBlocks";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  SEAN_ARORA_PROVIDER,
  CLINICAL_PROVIDER_LEGAL_NAME,
} from "@/lib/provider-info";

const TITLE = "Safety & Eligibility | Beema Health";
const DESCRIPTION =
  "Eligibility, contraindications, side effects, and emergency warning signs explained in plain language. Clinicians make independent medical decisions.";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content:
          "Plain-language safety information for weight-management care.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/safety") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Safety & Eligibility", path: "/safety" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: "Safety & Eligibility",
            description: DESCRIPTION,
            path: "/safety",
            reviewedByClinicalLead: true,
          }),
        ),
      },
    ],
  }),
  component: SafetyPage,
});

/**
 * Gentle fade-up entrance shared by the info cards on this page. Kept
 * restrained (no rotation, modest offsets) since this is serious medical
 * content, not a playful marketing moment.
 */
function useCardMotion(reduceMotion: boolean, delay = 0) {
  return {
    initial: reduceMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 } as const,
    transition: {
      duration: reduceMotion ? 0 : 0.55,
      delay: reduceMotion ? 0 : delay,
      ease: EASE_OUT,
    },
  };
}

function SafetyPage() {
  const cta = resolveCta(CTA_IDS.safety);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("safety");
  }, []);
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero relative overflow-hidden">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0 opacity-70"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <TreatmentBreadcrumb current="Safety & Eligibility" />
          </div>
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
          >
            <Eyebrow>Safety & eligibility</Eyebrow>
          </motion.div>
          <h1 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            <LineReveal>Plain-language, safety, </LineReveal>
            <LineReveal delay={0.1}>no fine-print games</LineReveal>
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            We believe you should fully understand your care. Here's how
            eligibility, reasons for not prescribing a GLP-1, and side effects
            work, in simple terms.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <motion.div {...useCardMotion(Boolean(reduceMotion), 0)}>
          <SurfaceCard className="border-primary/30 bg-primary-soft/30">
            <div className="flex gap-4">
              <Stethoscope className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Clinical oversight
                </h2>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {SEAN_ARORA_PROVIDER.displayName},{" "}
                  {SEAN_ARORA_PROVIDER.credentials} · {SEAN_ARORA_PROVIDER.role}
                  , {CLINICAL_PROVIDER_LEGAL_NAME} · NPI{" "}
                  {SEAN_ARORA_PROVIDER.npi}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {SEAN_ARORA_PROVIDER.bio} {CLINICAL_PROVIDER_LEGAL_NAME} is
                  Beema Health's clinical provider group and provides clinical
                  leadership over the group of licensed providers who deliver
                  care through Beema. Licensed clinicians make all medical
                  decisions independently. The clinician assigned to your care
                  may vary based on state licensure and availability.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/80">
                  Medically reviewed on July 31, 2026
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="Who may be eligible"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Eligibility depends on your medical history, current health, and a
            clinician's independent evaluation, not on completing a form. We'll
            calculate your BMI during intake and ask about conditions that
            affect safety before any medication is considered.
          </p>
          <p>
            As general guidance, GLP-1 weight-management medications are
            typically considered for adults with a BMI of 30 or higher, or a BMI
            of 27 or higher when a weight-related condition such as high blood
            pressure, type 2 diabetes, or high cholesterol is also present.
            Meeting a BMI threshold does not guarantee a prescription; it only
            means a conversation with a licensed provider may be appropriate.
          </p>
          <p>
            Your clinician also weighs factors beyond BMI: current medications
            (including insulin or other diabetes medications, since GLP-1s can
            affect blood sugar), kidney or liver function, other chronic
            conditions, and anything else in your history that could change how
            safely a GLP-1 medication could be used.
          </p>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="Contraindications and precautions"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Some histories make GLP-1 medications unsafe for a given patient.
            These medications are generally not prescribed to people with a
            personal or family history of medullary thyroid carcinoma (MTC) or
            Multiple Endocrine Neoplasia syndrome type 2 (MEN2), or to anyone
            with a known hypersensitivity or allergic reaction to the active
            ingredient (semaglutide, tirzepatide, or a related compound) or any
            component of the formulation.
          </p>
          <p>
            Other conditions call for extra caution rather than an automatic
            "no." A personal history of pancreatitis, significant
            gastrointestinal disease, diabetic retinopathy, or a history of an
            eating disorder are all things your clinician will weigh carefully.
            GLP-1 medications are not prescribed during pregnancy or while
            breastfeeding, and anyone who could become pregnant will be asked
            about pregnancy plans and contraception during intake.
          </p>
          <p>
            None of this is exhaustive, and it isn't medical advice. Your intake
            responses and, where relevant, your records are reviewed by a
            licensed clinician who makes the final call for your specific
            situation.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="Common side effects"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            The most commonly reported side effects of GLP-1 medications are
            gastrointestinal: nausea, vomiting, diarrhea, and constipation. They
            tend to be most noticeable shortly after starting treatment or after
            a dose increase, and they often ease as your body adjusts.
          </p>
          <p>
            Starting at a low dose and increasing gradually, which is how these
            medications are typically prescribed, is intended to reduce the
            frequency and severity of these effects. Staying hydrated and eating
            smaller, lower-fat meals can also help with nausea and digestive
            changes. If vomiting or diarrhea becomes severe or persistent, it
            can lead to dehydration, so message your care team promptly if that
            happens.
          </p>
          <p>
            Most side effects are manageable, and your clinician can adjust your
            dose, pace, or plan based on what you report. We ask about side
            effects at check-ins specifically so problems get caught and
            addressed early rather than left to guesswork.
          </p>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="How Beema's intake screens for safety"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Before any prescription is considered, our medical intake asks about
            your personal and family medical history, current medications and
            supplements, known allergies, prior surgeries, and the
            contraindications and precautions described above, including thyroid
            cancer history, pancreatitis history, and pregnancy or breastfeeding
            status.
          </p>
          <p>
            That information, along with your height, weight, and BMI, is
            reviewed by a licensed clinician before a prescribing decision is
            made. Completing intake does not guarantee treatment. If something
            in your history raises a safety concern, your clinician may decline
            to prescribe, recommend a different medication or dose, or ask for
            additional information before moving forward.
          </p>
          <p>
            Care doesn't stop at the first prescription. We check in over time
            so your clinician can monitor side effects, confirm the medication
            is still appropriate, and adjust your plan as needed.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <motion.div {...useCardMotion(Boolean(reduceMotion), 0)}>
          <SurfaceCard className="border-destructive/40 bg-destructive/5">
            <div className="flex gap-4">
              <AlertTriangle className="size-6 shrink-0 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Emergency warning signs
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Seek emergency care for severe abdominal pain (including pain
                  that spreads to your back, which can signal pancreatitis),
                  persistent vomiting, signs of a gallbladder problem
                  (upper-right abdominal pain, fever, or yellowing of the skin
                  or eyes), signs of an allergic reaction (swelling, hives,
                  trouble breathing), or other severe symptoms.
                </p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
                  <Phone className="size-4" /> If this is an emergency, call
                  911.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        <motion.div
          className="mt-6"
          {...useCardMotion(Boolean(reduceMotion), 0.08)}
        >
          <SurfaceCard className="border-primary/30 bg-primary-soft/30">
            <div className="flex gap-4">
              <ShieldCheck className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Clinical independence
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Clinical decisions are made independently by licensed
                  providers based on a clinical evaluation. Completing intake
                  does not guarantee a prescription, and Beema Health does not
                  influence medical judgment.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        <motion.div
          className="mt-10 text-center"
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: reduceMotion ? 0 : 0.55,
            delay: reduceMotion ? 0 : 0.1,
            ease: EASE_OUT,
          }}
        >
          <MagneticButton>
            <Button asChild size="xl">
              <Link to={cta.to} search={cta.search}>
                {cta.label} <ArrowRight />
              </Link>
            </Button>
          </MagneticButton>
        </motion.div>
      </Section>
    </MarketingLayout>
  );
}
