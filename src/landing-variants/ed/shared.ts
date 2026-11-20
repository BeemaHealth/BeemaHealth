import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PER_PILL_USD,
  ED_TADALAFIL_PRICING,
  formatPerPillStartingAt,
  formatSimpleStartingAt,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

export const TITLE = "Generic ED Treatment Online | Beema Health";
export const DESCRIPTION = `Tadalafil (generic Cialis) and sildenafil (generic Viagra), reviewed by licensed providers. From ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}. Never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for ED medication evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What's the difference between Tadalafil and Sildenafil?",
    a: "Tadalafil and sildenafil are the FDA-approved generic versions of Cialis and Viagra - they work similarly but differ in how quickly they take effect and how long they last. Your licensed provider reviews your intake and recommends which option and dose may be appropriate for your case; prescribing either is never guaranteed. Looking for a dissolve-under-the-tongue combination formulation instead? See ED Mints, a separate compounded product.",
  },
  {
    q: "Is Beema Health's ED treatment the same as generic Viagra or Cialis?",
    a: "Yes, for tadalafil and sildenafil. Beema Health's tadalafil and sildenafil are the FDA-approved generic versions of Cialis and Viagra - the identical active ingredient, strength, and intended use as the brand-name products, dispensed by a licensed pharmacy, not a compounded formulation. ED Mints is different: a compounded combination formulation, not sold as a single commercial product by any manufacturer.",
  },
  {
    q: "How does online ED care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether tadalafil or sildenafil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does ED treatment cost through Beema Health?",
    a: `Tadalafil is ${formatSimpleStartingAt(ED_TADALAFIL_PRICING)} and sildenafil is ${formatSimpleStartingAt(ED_SILDENAFIL_PRICING)}, each with a lower-cost quarterly option. Both cover your provider consultation, medication, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications, including cardiovascular history.",
  },
];
