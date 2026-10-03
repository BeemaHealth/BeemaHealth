/**
 * SEO copy for /weight-loss. Layout follows the GLP-1 landing
 * (Glp1LandingPage). This page targets "medical weight loss" / "online
 * weight loss"; /glp-1 stays the GLP-1 head term. Keep the two distinct.
 */
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { COMPOUNDED_DISCLOSURE } from "@/lib/compounded-disclosure";
import {
  LEARN_FIFTY_STATE_SENTENCE,
  LEARN_USA_ONLY_SENTENCE,
} from "@/lib/learn-trust-copy";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import {
  dualCompoundedFaqPricingParagraph,
  dualCompoundedShortPricingLine,
} from "@/lib/medication-pricing";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";

export const WEIGHT_LOSS_PATH = "/weight-loss" as const;
export const WEIGHT_LOSS_LINK = "/weight-loss/" as const;

export const WEIGHT_LOSS_TITLE = "Online Medical Weight Loss | Beema Health";

export const WEIGHT_LOSS_DESCRIPTION = `Online medical weight loss in all 50 states. ${dualCompoundedShortPricingLine()}. Prescribing is never guaranteed.`;

export const WEIGHT_LOSS_DATE_MODIFIED = "2026-10-02";

export const WEIGHT_LOSS_HERO = {
  eyebrow: "Medical weight loss",
  titleLine1: "Online medical ",
  titleLine2: "weight-loss care",
  description:
    "Provider-reviewed telehealth care with transparent cash pricing on compounded semaglutide and tirzepatide. No membership fee. Completing intake does not guarantee a prescription.",
} as const;

export const WEIGHT_LOSS_CASH_PAY_POINTS = [
  "Transparent cash pricing - no insurance hoop-jumping to begin intake",
  "All-inclusive monthly rates cover provider care, medication, supplies, and expedited shipping when prescribed",
  "No platform membership fee; prescribing is never guaranteed",
] as const;

export const WEIGHT_LOSS_SERVING_POINTS = [
  "Adults 18+ seeking medical weight-loss support",
  "BMI and health history reviewed during intake",
  "Cash-pay compounded semaglutide or tirzepatide when appropriate",
] as const;

export const WEIGHT_LOSS_FAQ: TreatmentFaqItem[] = [
  {
    q: "What is Beema Health's medical weight-loss program?",
    a: `Beema Health's medical weight-loss program is provider-reviewed telehealth care. After you complete an online medical intake, a licensed clinician reviews your health history and decides whether compounded semaglutide, compounded tirzepatide, or another approach is appropriate. ${COMPOUNDED_DISCLOSURE} Completing intake does not guarantee a prescription. Beema Health does not sell branded GLP-1 products.`,
  },
  {
    q: "Does Beema Health offer medical weight loss in all 50 states?",
    a: `Yes. ${LEARN_FIFTY_STATE_SENTENCE} You complete intake online from home; a licensed provider reviews your case remotely. Medication availability still depends on applicable state rules and pharmacy fulfillment, and eligibility is always an individual clinical decision. ${LEARN_USA_ONLY_SENTENCE}`,
  },
  {
    q: "How much does online medical weight loss cost?",
    a: `${dualCompoundedFaqPricingParagraph()} ${patientQuestionsGuidance()}`,
  },
  {
    q: "How does the online weight-loss program work?",
    a: "You start with a free online medical intake - no payment required to begin. A licensed provider reviews your answers and decides whether treatment may be appropriate. If approved and a compounded medication is prescribed, your plan includes provider care, medication, supplies, and expedited shipping, with follow-up as your care continues. Prescribing is never guaranteed.",
  },
  {
    q: "What is the difference between compounded semaglutide and tirzepatide?",
    a: `Both are compounded options a licensed provider may consider for medical weight management when clinically appropriate and legally available. Semaglutide acts on the GLP-1 pathway; tirzepatide is a dual GLP-1/GIP receptor agonist. Your provider decides which option, if any, fits your health history. ${COMPOUNDED_DISCLOSURE} Medication-specific details live on the compounded semaglutide and compounded tirzepatide pages. A broader GLP-1 overview is on the GLP-1 care page.`,
  },
  {
    q: "How do I start medical weight-loss care online?",
    a: "Select Get Started to open Beema Health's secure online medical intake. Share your health history, current medications, and goals. A licensed provider reviews your case and decides next steps. No payment is required to start the intake, and a prescription is never guaranteed.",
  },
];

export function weightLossHead() {
  return {
    meta: [
      { title: WEIGHT_LOSS_TITLE },
      { name: "description", content: WEIGHT_LOSS_DESCRIPTION },
      { property: "og:title", content: WEIGHT_LOSS_TITLE },
      { property: "og:description", content: WEIGHT_LOSS_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl(WEIGHT_LOSS_PATH) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: WEIGHT_LOSS_TITLE },
      { name: "twitter:description", content: WEIGHT_LOSS_DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl(WEIGHT_LOSS_PATH) },
      ...bootImagePreloadLinks(WEIGHT_LOSS_PATH),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Weight Loss", path: WEIGHT_LOSS_PATH },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(WEIGHT_LOSS_FAQ)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Medical Weight-Loss Program",
            description: `Telehealth medical weight-loss program from Beema Health for adults nationwide. Licensed providers may prescribe compounded semaglutide or compounded tirzepatide when clinically appropriate and legally available. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`,
            path: WEIGHT_LOSS_PATH,
            serviceType: "Medical weight-loss telehealth program",
            reviewedByClinicalLead: false,
            dateModified: WEIGHT_LOSS_DATE_MODIFIED,
          }),
        ),
      },
    ],
  };
}
