import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  SERMORELIN_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Compounded Sermorelin Injections | Beema Health";
export const DESCRIPTION = `Compounded sermorelin injections, reviewed by licensed providers. Nationwide telehealth care from ${formatSimpleQuarterlyStartingAt(SERMORELIN_PRICING)}. Prescribing is never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adults with independent licensed providers for compounded sermorelin injection evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is sermorelin?",
    a: "Sermorelin is a growth-hormone-releasing hormone analog. It is not currently sold as an FDA-approved commercial drug product, which is why it's available today only through licensed compounding pharmacies. Beema Health's compounded sermorelin is prepared by a licensed compounding pharmacy specifically for you, made available only when legally permitted in your state and a licensed provider determines it's clinically appropriate for your individual case.",
  },
  {
    q: "Is compounded sermorelin FDA-approved?",
    a: "No. Compounded sermorelin is not FDA-approved. It's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug, so it should not be assumed identical in formulation, strength, or effect to any other product. Beema Health only makes it available when legally permitted and when a licensed provider independently determines it's clinically appropriate for your specific case.",
  },
  {
    q: "How does online sermorelin care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether compounded sermorelin may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does sermorelin cost through Beema Health?",
    a: `${simplePricingSentence("Compounded sermorelin through Beema Health", SERMORELIN_PRICING)} That covers your provider consultation and ongoing doctor care, prescription medication, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications.",
  },
];

export const WHATS_INCLUDED = [
  "Prescription Medication",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  "Dedicated Human Customer Support",
  { label: "Free learning resources", to: "/learn/" },
];

export const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility considers health history and current medications",
  "Final approval rests with a licensed provider",
];
