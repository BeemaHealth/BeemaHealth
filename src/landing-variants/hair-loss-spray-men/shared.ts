import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_TOPICAL_MEN_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Hair Loss Spray for Men Online | Beema Health";
export const DESCRIPTION = `Compounded topical spray (minoxidil, tretinoin, fluocinolone, finasteride) for men, reviewed by licensed providers. From ${formatSimpleQuarterlyStartingAt(HAIRLOSS_TOPICAL_MEN_PRICING)}. Never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for compounded topical hair loss spray evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const REQUIRED_COMPOUND_SENTENCE =
  "Compounded hair loss spray is not FDA-approved and is considered only when legally available and clinically appropriate.";

/**
 * Formulation, matching the pharmacy's compound label: "Minoxidil 7% /
 * Tretinoin 0.025% / Fluocinolone 0.025% / Finasteride 0.2% Hair Spray,
 * 60 mL" (per Matt, 2026-09-10) - strengths intentionally omitted from this
 * marketing-page sentence (per Matt, 2026-09-10); see the formulation table
 * in docs/features/treatment-pages.md for the exact percentages.
 */
export const FORMULATION_SENTENCE =
  "This 4-in-1 combination includes minoxidil, tretinoin, fluocinolone, and finasteride in a 60 mL bottle.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is Beema Health's hair loss spray for men and how does it work?",
    a: `This is a topical spray, applied directly to the scalp. ${FORMULATION_SENTENCE} Delivering these active ingredients topically is intended to target hair follicles while limiting how much medication reaches the rest of the body compared to an oral tablet. Results vary and can take several months to become noticeable.`,
  },
  {
    q: "Is Beema Health's hair loss spray FDA-approved?",
    a: `${REQUIRED_COMPOUND_SENTENCE} It is not the same as, and is not claimed to be clinically proven to produce the same results as, any FDA-approved product.`,
  },
  {
    q: "Is this spray safe for people around me?",
    a: "Because this formulation contains finasteride and tretinoin, avoid letting the treated area of skin contact anyone who is or may become pregnant until fully dry. Your provider will review full precautions, for every active ingredient, with you as part of your intake.",
  },
  {
    q: "How does online hair loss care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, hair loss pattern, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether this spray may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does the hair loss spray cost through Beema Health?",
    a: `${simplePricingSentence("Beema Health's hair loss spray for men", HAIRLOSS_TOPICAL_MEN_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications.",
  },
];

export const WHATS_INCLUDED = [
  "Prescription Formulation",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  "Dedicated Human Customer Support",
  { label: "Free learning resources", to: "/learn/" },
];

export const ELIGIBILITY_POINTS = [
  "Men, 18 and older",
  "4-in-1: minoxidil, tretinoin, fluocinolone, finasteride",
  "Contains finasteride and tretinoin - avoid contact with anyone who is or may become pregnant",
  "Final approval rests with a licensed provider",
];
