/**
 * SEO copy for /sexual-health, the ED category hub (tadalafil, sildenafil,
 * ED mints). /ed stays the tadalafil-vs-sildenafil comparison page.
 */
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import {
  COMPOUNDED_ED_MINTS_REQUIRED,
  GENERIC_SILDENAFIL_REQUIRED,
  GENERIC_TADALAFIL_REQUIRED,
} from "@/lib/compounded-disclosure";
import {
  LEARN_FIFTY_STATE_SENTENCE,
  LEARN_USA_ONLY_SENTENCE,
} from "@/lib/learn-trust-copy";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";

export const SEXUAL_HEALTH_PATH = "/sexual-health" as const;
export const SEXUAL_HEALTH_LINK = "/sexual-health/" as const;

const CHEAPEST_ED_MONTHLY_EQUIVALENT = Math.min(
  ED_TADALAFIL_PRICING.quarterly?.monthlyEquivalentUsd ??
    ED_TADALAFIL_PRICING.monthlyUsd,
  ED_SILDENAFIL_PRICING.quarterly?.monthlyEquivalentUsd ??
    ED_SILDENAFIL_PRICING.monthlyUsd,
  ED_MINTS_RDT_PRICING.quarterly?.monthlyEquivalentUsd ??
    ED_MINTS_RDT_PRICING.monthlyUsd,
);

const CHEAPEST_ED_PER_DAY_NOTE = simplePerDaySentence({
  monthlyUsd: CHEAPEST_ED_MONTHLY_EQUIVALENT,
});

export const SEXUAL_HEALTH_STARTING_AT_PHRASE = CHEAPEST_ED_PER_DAY_NOTE
  ? "from less than $1 a day"
  : `from ${formatSimpleStartingAt(ED_SILDENAFIL_PRICING)}`;

export const SEXUAL_HEALTH_TITLE = "Online ED Treatment | Beema Health";

export const SEXUAL_HEALTH_DESCRIPTION = `Sexual health care online for men: tadalafil, sildenafil, and ED mints, ${SEXUAL_HEALTH_STARTING_AT_PHRASE}. Prescribing is never guaranteed.`;

export const SEXUAL_HEALTH_DATE_MODIFIED = "2026-10-02";

export const SEXUAL_HEALTH_HERO = {
  eyebrow: "Sexual health",
  titleLine1: "ED treatment ",
  titleLine2: "online, for men",
  description: `Tadalafil (generic Cialis), sildenafil (generic Viagra), and compounded ED mints, ${SEXUAL_HEALTH_STARTING_AT_PHRASE}. A licensed provider reviews every visit, and a prescription is never guaranteed.`,
} as const;

export const SEXUAL_HEALTH_SERVING_POINTS = [
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Formulation choice rests with a licensed provider",
] as const;

export const SEXUAL_HEALTH_FAQ: TreatmentFaqItem[] = [
  {
    q: "What ED treatment does Beema Health offer online?",
    a: `Beema Health connects adult men with licensed providers for ED care by telehealth. Options a provider may consider are tadalafil, sildenafil, and ED mints. ${GENERIC_TADALAFIL_REQUIRED} ${GENERIC_SILDENAFIL_REQUIRED} ${COMPOUNDED_ED_MINTS_REQUIRED} Completing intake does not guarantee a prescription.`,
  },
  {
    q: "What is the difference between tadalafil, sildenafil, and ED mints?",
    a: `Tadalafil and sildenafil are FDA-approved generics. They work similarly and differ in onset and how long they last. ED mints are a separate compounded combination that dissolves under the tongue. ${GENERIC_TADALAFIL_REQUIRED} ${GENERIC_SILDENAFIL_REQUIRED} ${COMPOUNDED_ED_MINTS_REQUIRED} Your provider decides which option, if any, fits your health history. A side-by-side of the two generics is on the ED treatment page.`,
  },
  {
    q: "How much does online ED treatment cost?",
    a: `${simplePricingSentence("Tadalafil", ED_TADALAFIL_PRICING)} ${simplePricingSentence("Sildenafil", ED_SILDENAFIL_PRICING)} ${simplePricingSentence("ED Mints", ED_MINTS_RDT_PRICING)} Both ED mints formulations are the same price. ${patientQuestionsGuidance()}`,
  },
  {
    q: "How does online ED care work?",
    a: "You start with a secure online medical intake covering your health history, current medications, and goals. A licensed provider reviews your case and independently decides whether tadalafil, sildenafil, ED mints, or no medication is appropriate. If prescribed, a licensed pharmacy fills the medication and it ships to you. Prescribing is never guaranteed.",
  },
  {
    q: "Who can use Beema Health for ED treatment?",
    a: `This page is for adult men, 18 and older. Eligibility considers cardiovascular history and current medications. ${LEARN_FIFTY_STATE_SENTENCE} You complete intake online from home. Eligibility is an individual clinical decision, never guaranteed because you live in a covered state. ${LEARN_USA_ONLY_SENTENCE}`,
  },
  {
    q: "How do I start ED treatment online?",
    a: "Choose a formulation to open that medication's page, then start its online intake. Tadalafil, sildenafil, and ED mints each have their own visit. No payment is required to start an intake, and a prescription is never guaranteed.",
  },
];

export function sexualHealthHead() {
  return {
    meta: [
      { title: SEXUAL_HEALTH_TITLE },
      { name: "description", content: SEXUAL_HEALTH_DESCRIPTION },
      { property: "og:title", content: SEXUAL_HEALTH_TITLE },
      { property: "og:description", content: SEXUAL_HEALTH_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl(SEXUAL_HEALTH_PATH) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SEXUAL_HEALTH_TITLE },
      { name: "twitter:description", content: SEXUAL_HEALTH_DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl(SEXUAL_HEALTH_PATH) },
      ...bootImagePreloadLinks(SEXUAL_HEALTH_PATH),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Sexual Health", path: SEXUAL_HEALTH_PATH },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(SEXUAL_HEALTH_FAQ)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Sexual Health Telehealth Program",
            description: `Telehealth sexual health program from Beema Health for adult men. Licensed providers may prescribe tadalafil or sildenafil (FDA-approved generics) or ED mints (a compounded combination) when clinically appropriate. ${COMPOUNDED_ED_MINTS_REQUIRED} Prescribing is never guaranteed.`,
            path: SEXUAL_HEALTH_PATH,
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: SEXUAL_HEALTH_DATE_MODIFIED,
          }),
        ),
      },
    ],
  };
}
