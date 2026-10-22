import {
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { LEARN_USA_ONLY_SENTENCE } from "@/lib/learn-trust-copy";
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";

// Head metadata and FAQ stay identical across variants: SEO, JSON-LD, and
// ad-policy-reviewed copy do not change when the landing body is swapped.
export const HOUSTON_AREA_SERVED = [
  {
    "@type": "City",
    name: "Houston",
    containedInPlace: { "@type": "State", name: "Texas" },
  },
  { "@type": "Country", name: "United States" },
];

export const STARTER = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!;
export const TITLE =
  "Tirzepatide in Houston, TX | Online Weight Loss Care | Beema Health";
export const DESCRIPTION =
  "Explore online tirzepatide weight-loss care for eligible adults in Houston, Texas. Licensed provider review, transparent cash pricing, and medication delivery if prescribed.";
export const SERVICE_DESCRIPTION =
  "Telehealth medical weight-loss service connecting eligible adults in Houston, Texas with independent licensed providers for compounded tirzepatide evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded tirzepatide?",
    a: "Tirzepatide is a GLP-1/GIP medication used in medical weight-management care. It's available both as an FDA-approved branded medication and, separately, as a compounded version prepared by a licensed compounding pharmacy rather than sold under a brand name. Compounded tirzepatide is not the same product as the branded version: it is not FDA-approved, and it's considered as part of care only when it is legally available and clinically appropriate for the specific patient. A licensed provider decides, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, based on your BMI, health history, current medications, and applicable state law. To be considered, you'll complete a medical intake, which a licensed provider reviews before making that decision. Completing a medical intake does not guarantee that compounded tirzepatide, or any treatment, will ultimately be prescribed for you.",
  },
  {
    q: "Does Beema Health have a physical office in Houston?",
    a: `No. Beema Health is a telehealth service - there is no Houston clinic or office to visit. Your intake, provider review, and any prescribed medication are handled entirely online, with medication shipped to your Houston address. ${LEARN_USA_ONLY_SENTENCE}`,
  },
  {
    q: "Is tirzepatide right for me?",
    a: "Whether tirzepatide is right for you depends on your BMI, health history, current medications, and a licensed provider's independent clinical judgment, not a fixed checklist. Beema Health's tirzepatide care is intended for adults 18 and older, and eligibility also depends on applicable state law where you live. During the process, you create an account and submit a medical intake describing your health history, current medications, and goals. A licensed provider reviews that information and decides, on a case-by-case basis, whether tirzepatide specifically, or another approach like compounded semaglutide, may be appropriate for your situation. Completing intake does not guarantee that tirzepatide, or any treatment, will be prescribed, and not everyone who applies will be approved. If you're unsure, our BMI calculator and weight-loss program overview can help you think through whether it's worth starting a conversation with a provider.",
  },
  {
    q: "How does online tirzepatide care through Beema Health work for Houston patients?",
    a: "Care starts with creating an account and completing a secure medical intake questionnaire at your own pace, covering your health, location, weight-loss goals, health history, and current medications. A licensed provider then reviews your intake and independently decides whether tirzepatide, or another treatment, may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability. If a provider does prescribe treatment, care includes the doctor consultation and visit, the prescription medication, ongoing doctor follow-up, and supplies like syringes and alcohol pads, along with expedited shipping to your Houston address.",
  },
  {
    q: "How much does tirzepatide cost through Beema Health?",
    a: `${compoundedMonthlyPricingSentence("Compounded tirzepatide through Beema Health", COMPOUNDED_TIRZEPATIDE_PRICING)} Pricing is the same nationwide, including for Houston patients - that listed rate is all-inclusive cash-pay pricing with no separate platform membership fee: it covers doctor visits, prescription medication, ongoing doctor follow-up care, supplies like syringes and alcohol pads, and expedited shipping. Because compounded tirzepatide is a prescription medication, a licensed provider must review your medical intake and independently decide it's appropriate before treatment begins; completing intake never guarantees a prescription. Questions about promo codes or plan length? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Is compounded tirzepatide FDA-approved?",
    a: `No. Compounded tirzepatide is not an FDA-approved medication the way branded tirzepatide is; it's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug. Because of that, it is not the same product as an FDA-approved branded medication, and it's considered as part of care only when it is legally available and clinically appropriate for a given patient. A licensed provider weighs your BMI, health history, current medications, and applicable state law before deciding, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, or whether another approach, such as compounded semaglutide, makes more sense. ${patientQuestionsGuidance()} For more detail on eligibility, contraindications, and warning signs, see Beema Health's safety and eligibility information.`,
  },
  {
    q: "How quickly can treatment begin?",
    a: "How quickly you can start depends on a few factors: how fast you complete your medical intake questionnaire, how quickly a licensed provider reviews your information and makes an independent clinical decision, and how quickly the pharmacy can fulfill and ship your prescription if one is issued. Because intake is self-paced and provider review takes real clinical judgment rather than an automatic approval, we cannot promise a specific start date for any individual patient. Shipping is expedited once a prescription is issued as part of your included care, but pharmacy timelines can still vary. It's also worth remembering that prescribing is never guaranteed: a licensed provider may determine that tirzepatide, or any treatment, is not appropriate for you based on your health history, current medications, or applicable state law, regardless of how quickly you move through intake.",
  },
  {
    q: "Can I switch to Beema Health if I'm already on tirzepatide elsewhere?",
    a: "Yes. If you're already taking tirzepatide with another provider, tell us about your current provider, dose, and how long you've been on treatment during your medical intake. Your Beema Health provider will factor that history into their independent clinical review, generally with the goal of keeping you on a comparable dose rather than having you restart from scratch, though the final decision is always theirs based on your full health history and current medications. It's important to give accurate, complete details in your intake, since your answers directly shape the dose and treatment plan your provider considers appropriate for you. As with any new patient, completing intake doesn't guarantee that tirzepatide, or any specific dose, will be prescribed.",
  },
];
