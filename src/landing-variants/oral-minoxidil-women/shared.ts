import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  formatSimpleStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Oral Minoxidil for Women Online | Beema Health";
export const DESCRIPTION = `Oral minoxidil, an FDA-approved generic used off-label for hair loss in women, reviewed by licensed providers, from ${formatSimpleStartingAt(HAIRLOSS_ORAL_MINOXIDIL_PRICING)}. Never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult women with independent licensed providers for oral minoxidil evaluation and ongoing care. Oral minoxidil is an FDA-approved generic medication; using it for hair loss is a well-established off-label use. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is oral minoxidil and how does it work?",
    a: "Minoxidil is best known as a topical treatment, but taken as a low-dose oral tablet it can also help support hair growth by improving blood flow to hair follicles and extending the hair growth cycle. It's taken once daily. Results vary and can take several months to become noticeable.",
  },
  {
    q: "Is Beema Health's oral minoxidil for women FDA-approved?",
    a: "Yes. Oral minoxidil is an FDA-approved generic medication, not a compounded formulation. It was originally approved to treat high blood pressure; using it for hair loss is a well-established off-label use in dermatology, and your licensed provider decides whether it's appropriate for you.",
  },
  {
    q: "Is oral minoxidil safe during pregnancy?",
    a: "Your provider reviews your full health history, including pregnancy status, before deciding whether oral minoxidil may be appropriate for you. Always share your pregnancy status and any plans to become pregnant during intake.",
  },
  {
    q: "How does online hair loss care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, hair loss pattern, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether oral minoxidil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does oral minoxidil cost through Beema Health?",
    a: `${simplePricingSentence("Oral minoxidil through Beema Health", HAIRLOSS_ORAL_MINOXIDIL_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
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
  "Women, 18 and older",
  "Your provider reviews health history, including pregnancy status",
  "Final approval rests with a licensed provider",
];
