import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  ED_MINTS_RDT_PRICING,
  formatSimpleQuarterlyStartingAt,
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
  "ED Treatment in Boston, MA | Online ED Care | Beema Health";
export const DESCRIPTION = `Online erectile dysfunction treatment for eligible adults in Boston, Massachusetts. Licensed provider review, transparent pricing from ${formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING)}, and medication delivery if prescribed.`;
export const SERVICE_DESCRIPTION =
  "Telehealth service connecting eligible adult men in Boston and nationwide with independent licensed providers for compounded, dissolve-under-the-tongue ED formulation evaluation and ongoing care. Completing intake does not guarantee a prescription.";

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
    q: "What's the difference between the two ED Mints formulations?",
    a: "Both are compounded combination formulations that dissolve under the tongue rather than being swallowed. One combines tadalafil and sildenafil at 12mg/60mg as a rapidly dissolving tablet (RDT); the other combines sildenafil, tadalafil, and oxytocin at 50mg/20mg/125 IU as an orally dissolving tablet (ODT). Both are prepared at an FDA-registered 503B outsourcing facility and are not sold as single commercial products. Your licensed provider reviews your intake and recommends which option, if any, may be appropriate for your case; prescribing either is never guaranteed.",
  },
  {
    q: "How do ED Mints work, and when should I take one?",
    a: "ED Mints dissolve under the tongue - no water needed. Most patients take one about 30 minutes before sexual activity, and no more than one dose in a 24-hour period. Your provider will confirm timing and dosing based on your health history. Like other ED formulations, these medicines don't cause arousal by themselves - you still need to be sexually stimulated for them to work.",
  },
  {
    q: "Are ED Mints the same as generic Viagra or Cialis?",
    a: "No. ED Mints are compounded, not FDA-approved, and are not the same product as any FDA-approved branded or generic medication, even when they share active ingredients. They're prepared at an FDA-registered 503B outsourcing facility as combination formulations not available as a single commercial product, and are considered only when legally available and clinically appropriate.",
  },
  {
    q: "How much do ED Mints cost through Beema Health?",
    a: `${simplePricingSentence("Either ED Mints formulation through Beema Health", ED_MINTS_RDT_PRICING)} Both formulations are the same price. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve Boston and Massachusetts?",
    a: `Yes. Beema Health serves adults in Boston and across all 50 US states through telehealth - there is no physical Boston office or in-person clinic; care happens entirely online. ${LEARN_FIFTY_STATE_SENTENCE} Whether a specific compounded formulation is available to you still depends on your state's rules around compounded medications and pharmacy fulfillment, and eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications, including cardiovascular history. ${LEARN_USA_ONLY_SENTENCE}`,
  },
];
