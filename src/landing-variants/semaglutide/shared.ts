import { type TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  compoundedMonthlyPricingSentence,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

// Head metadata and FAQ stay identical across variants: SEO, JSON-LD, and
// ad-policy-reviewed copy do not change when the page body is swapped.
export const TITLE = "Compounded Semaglutide for Weight Loss | Beema Health";
export const DESCRIPTION = `Compounded semaglutide for medical weight loss, personalized by licensed providers. Nationwide telehealth care at $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/mo. Prescribing is never guaranteed.`;
export const SERVICE_DESCRIPTION =
  "Nationwide telehealth medical weight-loss service connecting eligible adults with independent licensed providers for compounded semaglutide evaluation and ongoing care. Completing intake does not guarantee a prescription.";

export const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded semaglutide?",
    a: "Compounded semaglutide is a GLP-1 medication prepared by a licensed compounding pharmacy rather than manufactured and sold under a brand name. It's used in medical weight-management care, and because it isn't reviewed and approved by the FDA the same way a branded drug is, its formulation, strength, and preparation can differ from an FDA-approved branded medication. Beema Health only makes compounded semaglutide available when it's legally permitted in your state and a licensed provider determines it's clinically appropriate for your individual case. To be considered, you'll create a secure account and complete a medical intake questionnaire covering your health history, current medications, and goals. A licensed provider then reviews that information and independently decides whether compounded semaglutide, compounded tirzepatide, or another option makes sense for you. Because it's a prescription medication, your provider's individual judgment always determines eligibility, dosage, and whether treatment is appropriate at all.",
  },
  {
    q: "Is semaglutide right for me?",
    a: "Whether semaglutide is right for you depends on several factors your licensed provider reviews individually: your BMI, health history, current medications, and any potential contraindications or interactions. During your medical intake questionnaire, you'll share detailed information about your health so your provider can make an informed, independent clinical decision, prescribing is never guaranteed, and not everyone who applies will be approved. If semaglutide isn't the right fit for you, your provider may discuss compounded tirzepatide or another approach as part of Beema Health's broader weight-loss program instead. The most reliable way to find out if semaglutide is appropriate for your situation is to complete your intake so a licensed provider can evaluate your case directly.",
  },
  {
    q: "How does online semaglutide care through Beema Health work?",
    a: "Care starts with creating a secure account and completing a medical intake questionnaire covering your health, location, weight-loss goals, health history, and current medications; you can save your progress and return to it anytime. A licensed provider then reviews your intake and makes an independent clinical decision about whether compounded semaglutide is appropriate for you, prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, of Arora Health & Aesthetics, though the specific clinician assigned to your case may vary by state licensure and availability. If approved, your plan includes prescription medication, ongoing doctor care, supplies like alcohol pads and syringes, and expedited shipping, with follow-up visits so your provider can monitor your progress and adjust care as needed.",
  },
  {
    q: "How much does semaglutide cost through Beema Health?",
    a: `${compoundedMonthlyPricingSentence("Compounded semaglutide through Beema Health", COMPOUNDED_SEMAGLUTIDE_PRICING)} That listed rate is all-inclusive cash-pay pricing with no platform membership fee: our low cost fee covers your provider consul covers your provider consultation and ongoing doctor care, prescription medication, supplies like alcohol pads and syringes, and expedited shipping. Dose adjustments within compounded semaglutide do not change the monthly price. Questions about promo codes or plan length? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema Health serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states, so you can start your medical intake no matter where you live. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history, current medications, and BMI, it isn't guaranteed just because you're in a covered state. If compounded semaglutide isn't an option for your specific case, your provider may discuss compounded tirzepatide or another approach as part of Beema Health's broader weight-loss program. Completing your intake is the fastest way to find out what's available to you.",
  },
  {
    q: "Is compounded semaglutide FDA-approved?",
    a: "No, compounded semaglutide is not FDA-approved. Unlike the branded, FDA-approved version of semaglutide, compounded versions are prepared individually by a licensed compounding pharmacy and are not manufactured, tested, or reviewed by the FDA the same way. Beema Health only makes compounded semaglutide available when it's legally permitted under applicable state and federal rules and when a licensed provider independently determines it's clinically appropriate for your specific case. It should not be assumed to be identical in formulation, strength, or effect to an FDA-approved branded medication, even though both are the same class of medication. Your provider will discuss this distinction with you, along with your medical history, potential contraindications, and side effects, before recommending or prescribing compounded semaglutide. For more detail on how eligibility, safety, and warning signs are evaluated, see Beema Health's safety and eligibility information, which covers these considerations in more depth.",
  },
  {
    q: "How quickly can treatment begin?",
    a: "How quickly treatment can begin depends on a few things you influence and a few your provider and pharmacy control. On your end, it depends on how quickly you complete your full medical intake questionnaire, since incomplete or inaccurate information can slow provider review. From there, timing depends on how fast a licensed provider can review your case and make an independent clinical decision, and, if approved, how quickly the pharmacy can fulfill and ship your prescription with expedited shipping. Because prescribing is never guaranteed and depends on your individual health history, current medications, and applicable state law, Beema Health can't guarantee a specific start date or that treatment will be approved at all. If you're switching from another provider, sharing your current dose accurately can also help your provider determine your correct starting dose without unnecessary delay.",
  },
  {
    q: "Can I switch to Beema Health if I'm already on semaglutide elsewhere?",
    a:
      "Yes. If you're already taking semaglutide through another provider, your medical intake questionnaire asks about your current provider, medication, and dose so your Beema Health provider can review your treatment history as part of their independent clinical evaluation. The goal is to help your provider aim to continue you at a comparable dose rather than starting your titration over from the beginning, though the final dosing decision always rests with your licensed provider based on your full health picture. Accuracy matters here: the dose and history you report is the information your provider relies on to determine what's appropriate for you going forward, so double-check those details before submitting your intake. As with any new patient, your provider will also review your broader health history, current medications, and any contraindications before confirming your plan. For more context on how transitions are evaluated, see Beema Health's safety and eligibility information. " +
      patientQuestionsGuidance(),
  },
];
