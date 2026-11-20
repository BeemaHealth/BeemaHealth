import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  BPC_157_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Compounded BPC-157 Injections Online | Beema Health";
export const DESCRIPTION = `Compounded BPC-157 peptide injections, reviewed by licensed providers. Nationwide telehealth care from ${formatSimpleQuarterlyStartingAt(BPC_157_PRICING)}. Prescribing is never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adults with independent licensed providers for compounded BPC-157 peptide injection evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is BPC-157?",
    a: "BPC-157 is a short synthetic peptide, a chain of 15 amino acids, based on part of a protein found in human gastric juice. It has been studied in early-stage research, mostly in laboratory and animal studies, and it is not an FDA-approved drug product. Beema Health's compounded BPC-157 is prepared by a licensed compounding pharmacy specifically for you, made available only when legally permitted in your state and a licensed provider determines it's clinically appropriate for your individual case.",
  },
  {
    q: "Is compounded BPC-157 FDA-approved?",
    a: "No. Compounded BPC-157 is not FDA-approved. It's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug, so it should not be assumed identical in formulation, strength, or effect to any other product. Beema Health only makes it available when legally permitted and when a licensed provider independently determines it's clinically appropriate for your specific case.",
  },
  {
    q: "How does online BPC-157 care through Beema Health work?",
    a: "Care starts with completing a private medical questionnaire covering your health history, current medications, and goals, at your own pace. A licensed provider reviews it and independently decides whether compounded BPC-157 may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does BPC-157 cost through Beema Health?",
    a: `${simplePricingSentence("Compounded BPC-157 through Beema Health", BPC_157_PRICING)} That covers your provider consultation and ongoing doctor care, prescription medication, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
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
