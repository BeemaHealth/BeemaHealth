import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  ED_SILDENAFIL_PER_PILL_USD,
  ED_SILDENAFIL_PRICING,
  formatPerPillStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata, FAQ, and reviewed copy stay identical across variants: SEO,
// JSON-LD, and ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Sildenafil for ED Online | Beema Health";
export const DESCRIPTION = `Sildenafil, the FDA-approved generic version of Viagra, reviewed by licensed providers. From ${formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}. Never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for sildenafil evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is sildenafil and how does it work?",
    a: "Sildenafil works by relaxing blood vessels so more blood can flow to the penis, making it easier to get and keep an erection when you're sexually aroused. It doesn't cause arousal by itself - you still need to be sexually stimulated for it to work. Sildenafil typically takes effect within 30-60 minutes and lasts several hours, so it's usually taken as needed before sexual activity rather than daily.",
  },
  {
    q: "Is Beema Health's sildenafil the same as generic Viagra?",
    a: "Yes. Beema Health's sildenafil is the FDA-approved generic version of Viagra - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.",
  },
  {
    q: "Sildenafil or tadalafil - which is right for me?",
    a: "Both work similarly but differ in how quickly they take effect and how long they last; your licensed provider reviews your intake and recommends which option and dose may be appropriate for your case. See Tadalafil for that option, or ED Mints for a dissolve-under-the-tongue combination formulation.",
  },
  {
    q: "How does online ED care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether sildenafil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does sildenafil cost through Beema Health?",
    a: `${simplePricingSentence("Sildenafil through Beema Health", ED_SILDENAFIL_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications, including cardiovascular history.",
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
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Final approval rests with a licensed provider",
];
