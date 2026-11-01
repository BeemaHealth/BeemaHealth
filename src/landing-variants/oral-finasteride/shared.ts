import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_FINASTERIDE_PRICING,
  formatSimpleStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Oral Finasteride for Hair Loss Online | Beema Health";
export const DESCRIPTION = `Oral finasteride, the FDA-approved generic version of Propecia, reviewed by licensed providers. From ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}. Never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for oral finasteride evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is oral finasteride and how does it work?",
    a: "Finasteride is a once-daily oral tablet that blocks a hormone (DHT) that can shrink hair follicles over time in men with pattern hair loss. Taken consistently, it may help slow further hair loss and support the hair you still have. Results vary and can take several months to become noticeable.",
  },
  {
    q: "Is Beema Health's finasteride the same as brand-name Propecia?",
    a: "Beema Health's finasteride is the FDA-approved generic version of Propecia - the same active ingredient, strength, and intended use as the brand-name product, at generic pricing. It is only appropriate for men; it is not for women who are or may become pregnant.",
  },
  {
    q: "How does online hair loss care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, hair loss pattern, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether finasteride may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does finasteride cost through Beema Health?",
    a: `${simplePricingSentence("Oral finasteride through Beema Health", HAIRLOSS_FINASTERIDE_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
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
  "Men, 18 and older",
  "Not appropriate for women who are or may become pregnant",
  "Final approval rests with a licensed provider",
];
