import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  MOTS_C_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Compounded MOTS-C Injections Online | Beema Health";
export const DESCRIPTION = `Compounded MOTS-C peptide injections, reviewed by licensed providers. Nationwide telehealth care from ${formatSimpleQuarterlyStartingAt(MOTS_C_PRICING)}. Prescribing is never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adults with independent licensed providers for compounded MOTS-C peptide injection evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is MOTS-C?",
    a: "MOTS-C is a short peptide encoded in mitochondrial DNA. It has been studied in early-stage research, and it is not an FDA-approved drug product. Beema Health's compounded MOTS-C is prepared by a licensed compounding pharmacy specifically for you, made available only when legally permitted in your state and a licensed provider determines it's clinically appropriate for your individual case.",
  },
  {
    q: "Is compounded MOTS-C FDA-approved?",
    a: "No. Compounded MOTS-C is not FDA-approved. It's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug, so it should not be assumed identical in formulation, strength, or effect to any other product. Beema Health only makes it available when legally permitted and when a licensed provider independently determines it's clinically appropriate for your specific case.",
  },
  {
    q: "How does online MOTS-C care through Beema Health work?",
    a: "Care starts with completing a private medical questionnaire covering your health history, current medications, and goals, at your own pace. A licensed provider reviews it and independently decides whether compounded MOTS-C may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does MOTS-C cost through Beema Health?",
    a: `${simplePricingSentence("Compounded MOTS-C through Beema Health", MOTS_C_PRICING)} That covers your provider consultation and ongoing doctor care, prescription medication, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications.",
  },
];

export const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility considers health history and current medications",
  "Final approval rests with a licensed provider",
];
