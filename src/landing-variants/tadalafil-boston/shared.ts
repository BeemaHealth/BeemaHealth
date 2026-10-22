import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  ED_TADALAFIL_PER_PILL_USD,
  ED_TADALAFIL_PRICING,
  formatPerPillStartingAt,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import {
  LEARN_FIFTY_STATE_SENTENCE,
  LEARN_USA_ONLY_SENTENCE,
} from "@/lib/learn-trust-copy";

// Head metadata and FAQ stay identical across variants: SEO, JSON-LD, and
// ad-policy-reviewed copy do not change when the landing body is swapped.
export const TITLE =
  "Tadalafil in Boston, MA | Online ED Treatment | Beema Health";
export const DESCRIPTION = `Online tadalafil treatment for eligible adults in Boston, Massachusetts. Licensed provider review, transparent pricing from ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}, and discreet delivery if prescribed.`;
export const SERVICE_DESCRIPTION =
  "Telehealth service connecting eligible adults in Boston and nationwide with independent licensed providers for tadalafil evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const BOSTON_AREA_SERVED = [
  {
    "@type": "City",
    name: "Boston",
    containedInPlace: { "@type": "State", name: "Massachusetts" },
  },
  { "@type": "Country", name: "United States" },
];

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is tadalafil and how does it work?",
    a: "Tadalafil works by relaxing blood vessels so more blood can flow to the penis, making it easier to get and keep an erection when you're sexually aroused. It doesn't cause arousal by itself - you still need to be sexually stimulated for it to work. Tadalafil is known for a longer duration of action than sildenafil, which is why it's sometimes taken at a low daily dose rather than only as needed.",
  },
  {
    q: "Is Beema Health's tadalafil the same as generic Cialis?",
    a: "Yes. Beema Health's tadalafil is the FDA-approved generic version of Cialis - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.",
  },
  {
    q: "Tadalafil or sildenafil - which is right for me?",
    a: "Both work similarly but differ in how quickly they take effect and how long they last; your licensed provider reviews your intake and recommends which option and dose may be appropriate for your case. See Sildenafil for that option, or ED Mints for a dissolve-under-the-tongue combination formulation.",
  },
  {
    q: "How does online ED care work for Boston patients?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace, from anywhere in Boston or Massachusetts. A licensed provider reviews your intake and independently decides whether tadalafil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does tadalafil cost through Beema Health?",
    a: `${simplePricingSentence("Tadalafil through Beema Health", ED_TADALAFIL_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve Boston and Massachusetts?",
    a: `Yes. Beema Health serves adults in Boston and across all 50 US states through telehealth - there is no physical Boston office or in-person clinic; care happens entirely online. ${LEARN_FIFTY_STATE_SENTENCE} A licensed provider reviews your case remotely and decides, on an individual basis, whether tadalafil may be appropriate for you, considering cardiovascular history and current medications - never guaranteed just because you live in Boston. ${LEARN_USA_ONLY_SENTENCE}`,
  },
];
