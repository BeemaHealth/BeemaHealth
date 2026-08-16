import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import {
  dualCompoundedFaqPricingParagraph,
  dualCompoundedHeroPricingLine,
  dualCompoundedShortPricingLine,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

/** §F1.1 required sentences - reuse verbatim where compounded status is explained. */
const COMPOUNDED_SEMA_REQUIRED =
  "Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate.";
const COMPOUNDED_TIRZ_REQUIRED =
  "Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate.";
export const COMPOUNDED_DISCLOSURE = `${COMPOUNDED_SEMA_REQUIRED} ${COMPOUNDED_TIRZ_REQUIRED}`;

export type Glp1Market = "national" | "houston";

export type Glp1LandingCopy = {
  market: Glp1Market;
  /** Route path without trailing slash - matches createFileRoute + canonicalUrl. */
  path: "/glp-1" | "/glp-1-houston";
  /** Trailing-slash href for in-page Links (GitHub Pages canonical form). */
  linkPath: "/glp-1/" | "/glp-1-houston/";
  analyticsPage: "glp_1" | "glp_1_houston";
  title: string;
  description: string;
  serviceName: string;
  serviceDescription: string;
  serviceType: string;
  areaServed?: unknown;
  breadcrumbName: string;
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  faqItems: TreatmentFaqItem[];
  faqDescription: string;
  servingEyebrow: string;
  servingTitle: string;
  servingBody: string;
  servingMarketLink?: { to: "/glp-1-houston/"; label: string };
  footerCtaBody: string;
  dateModified: string;
};

export const CASH_PAY_POINTS = [
  "Transparent cash pricing - no insurance hoop-jumping to begin intake",
  "All-inclusive monthly rates cover provider care, medication, supplies, and expedited shipping when prescribed",
  "No platform membership fee; prescribing is never guaranteed",
] as const;

export const SERVING_POINTS = [
  "Adults 18+ seeking medical weight-loss support",
  "BMI and health history reviewed during intake",
  "Cash-pay compounded semaglutide or tirzepatide when appropriate",
] as const;

const SHARED_FAQ = {
  whatIs: {
    q: "What is GLP-1 care at Beema Health?",
    a: `GLP-1 care at Beema Health is provider-reviewed medical weight-loss care delivered by telehealth. After you complete an online medical intake, a licensed clinician reviews your health history and decides whether compounded semaglutide, compounded tirzepatide, or another approach is appropriate. ${COMPOUNDED_DISCLOSURE} Completing intake does not guarantee a prescription.`,
  },
  pricing: {
    q: "How much does cash-pay GLP-1 treatment cost?",
    a: `${dualCompoundedFaqPricingParagraph()} ${patientQuestionsGuidance()}`,
  },
  howItWorks: {
    q: "How does online GLP-1 care work?",
    a: "You start with a free online medical intake - no payment required to begin. A licensed provider reviews your answers and decides whether treatment may be appropriate. If approved and a compounded medication is prescribed, your plan includes provider care, medication, supplies, and expedited shipping, with follow-up as your care continues. Prescribing is never guaranteed.",
  },
  difference: {
    q: "What is the difference between compounded semaglutide and tirzepatide?",
    a: `Both are compounded options that a licensed provider may consider for medical weight management when clinically appropriate and legally available. Semaglutide acts on the GLP-1 pathway; tirzepatide is a dual GLP-1/GIP receptor agonist. Your provider decides which option, if any, fits your health history. ${COMPOUNDED_DISCLOSURE} Explore medication-specific details on our compounded semaglutide and compounded tirzepatide pages.`,
  },
  getStarted: {
    q: "How do I get started online?",
    a: "Select Get Started to open Beema’s secure online medical intake. Share your health history, current medications, and goals. A licensed provider reviews your case and decides next steps. No payment is required to start the intake, and a prescription is never guaranteed.",
  },
} as const satisfies Record<string, TreatmentFaqItem>;

const HOUSTON_AREA_SERVED = [
  {
    "@type": "City",
    name: "Houston",
    containedInPlace: { "@type": "State", name: "Texas" },
  },
  { "@type": "Country", name: "United States" },
];

const SHARED_HERO_DESCRIPTION = `Provider-reviewed telehealth care with transparent cash pricing: ${dualCompoundedHeroPricingLine()}. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`;

const GLP1_COPY: Record<Glp1Market, Glp1LandingCopy> = {
  national: {
    market: "national",
    path: "/glp-1",
    linkPath: "/glp-1/",
    analyticsPage: "glp_1",
    title: "Online GLP-1 Weight Loss | Beema Health",
    description: `Start online GLP-1 weight-loss care with transparent cash pricing: ${dualCompoundedShortPricingLine()}. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`,
    serviceName: "GLP-1 Telehealth Weight-Loss Care",
    serviceDescription: `Telehealth GLP-1 medical weight-loss care from Beema Health for adults nationwide. Licensed providers may prescribe compounded semaglutide or compounded tirzepatide when clinically appropriate and legally available. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`,
    serviceType: "GLP-1 medical weight-loss telehealth service",
    breadcrumbName: "GLP-1 Care",
    heroEyebrow: "Cash-pay GLP-1 care",
    heroTitleLine1: "GLP-1 weight-loss ",
    heroTitleLine2: "options",
    heroDescription: SHARED_HERO_DESCRIPTION,
    faqItems: [
      SHARED_FAQ.whatIs,
      {
        q: "Does Beema Health serve patients nationwide?",
        a: "Yes. Beema Health serves adults across all 50 U.S. states through telehealth. You complete intake online from home; a licensed provider reviews your case remotely. Medication availability still depends on applicable state rules and pharmacy fulfillment, and eligibility is always an individual clinical decision - never guaranteed just because you live in a covered state.",
      },
      SHARED_FAQ.pricing,
      SHARED_FAQ.howItWorks,
      SHARED_FAQ.difference,
      SHARED_FAQ.getStarted,
    ],
    faqDescription:
      "Straight answers for adults comparing cash-pay GLP-1 options online.",
    servingEyebrow: "Nationwide telehealth",
    servingTitle: "Cash-pay GLP-1 care without a clinic visit",
    servingBody:
      "You can complete Beema Health's medical intake online from anywhere in the United States. A licensed provider reviews your case by telehealth. When clinically appropriate and legally available, compounded GLP-1 options may be prescribed and shipped to you. Beema Health serves patients nationwide.",
    servingMarketLink: {
      to: "/glp-1-houston/",
      label: "See GLP-1 care for Houston",
    },
    footerCtaBody:
      "Complete medical intake from home. No payment required to start. A prescription is never guaranteed.",
    dateModified: "2026-08-16",
  },
  houston: {
    market: "houston",
    path: "/glp-1-houston",
    linkPath: "/glp-1-houston/",
    analyticsPage: "glp_1_houston",
    title: "GLP-1 Weight Loss Care in Houston | Cash-Pay | Beema Health",
    description: `Houston adults can start online GLP-1 weight-loss care with transparent cash pricing: ${dualCompoundedShortPricingLine()}. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`,
    serviceName: "GLP-1 Telehealth Weight-Loss Care in Houston",
    serviceDescription: `Telehealth GLP-1 medical weight-loss care from Beema Health for adults in Houston and nationwide. Licensed providers may prescribe compounded semaglutide or compounded tirzepatide when clinically appropriate and legally available. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`,
    serviceType: "GLP-1 medical weight-loss telehealth service",
    areaServed: HOUSTON_AREA_SERVED,
    breadcrumbName: "GLP-1 Care in Houston",
    heroEyebrow: "Houston · Cash-pay GLP-1 care",
    heroTitleLine1: "GLP-1 weight-loss care ",
    heroTitleLine2: "for Houston, online",
    heroDescription: SHARED_HERO_DESCRIPTION,
    faqItems: [
      SHARED_FAQ.whatIs,
      {
        q: "Does Beema Health serve Houston?",
        a: "Yes. Beema Health serves adults in Houston and across all 50 U.S. states through telehealth. You complete intake online from home; a licensed provider reviews your case remotely. Medication availability still depends on applicable state rules and pharmacy fulfillment, and eligibility is always an individual clinical decision - never guaranteed just because you live in Houston.",
      },
      SHARED_FAQ.pricing,
      SHARED_FAQ.howItWorks,
      SHARED_FAQ.difference,
      SHARED_FAQ.getStarted,
    ],
    faqDescription:
      "Straight answers for Houston adults comparing cash-pay GLP-1 options online.",
    servingEyebrow: "Serving Houston",
    servingTitle: "Cash-pay GLP-1 care without a clinic visit",
    servingBody:
      "If you're in Houston, or anywhere in Texas, you can complete Beema Health's medical intake online. A licensed provider reviews your case by telehealth. When clinically appropriate and legally available, compounded GLP-1 options may be prescribed and shipped to you. Beema Health serves patients nationwide, including Houston.",
    footerCtaBody:
      "Houston patients can complete medical intake from home. No payment required to start. A prescription is never guaranteed.",
    dateModified: "2026-08-16",
  },
};

export function getGlp1Copy(market: Glp1Market): Glp1LandingCopy {
  return GLP1_COPY[market];
}

export function glp1Head(market: Glp1Market) {
  const copy = getGlp1Copy(market);
  return {
    meta: [
      { title: copy.title },
      { name: "description", content: copy.description },
      { property: "og:title", content: copy.title },
      { property: "og:description", content: copy.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl(copy.path) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: copy.title },
      { name: "twitter:description", content: copy.description },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(copy.path) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: copy.breadcrumbName, path: copy.path },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(copy.faqItems)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: copy.serviceName,
            description: copy.serviceDescription,
            path: copy.path,
            serviceType: copy.serviceType,
            reviewedByClinicalLead: true,
            dateModified: copy.dateModified,
            areaServed: copy.areaServed,
          }),
        ),
      },
    ],
  };
}
