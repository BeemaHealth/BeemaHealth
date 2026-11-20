/**
 * Copy for the peptide quiz results screen. Wording follows the blog article
 * /blogs/how-to-choose-the-right-peptide-for-your-goals/ (FDA status framing,
 * sources). No brand-name drugs, no dosing, no "right for you" language, no
 * clinical-review claim. Do not use dashes in this copy.
 */

import type { GoalCategory, QuizResult } from "@/lib/peptide-quiz";

export const QUIZ_DISCLAIMER =
  "This quiz is for general education only. It is not medical advice, does not diagnose any condition, and does not recommend a specific medication or dose. Talk with a licensed clinician before starting any treatment.";

export const QUIZ_PRIVACY_NOTE =
  "Takes about a minute. At the end you enter your email to see your results list. Your answers stay in this browser tab and are not sent or saved anywhere.";

export const QUIZ_EMAIL_CONSENT =
  "By continuing, you agree that Beema Health may receive your email address. Your quiz answers are not sent. See our";

/** What sits behind the email gate, shown on the gate so the value is clear. */
export const RESULT_PREVIEW = [
  "What the evidence looks like for your goal",
  "Questions to bring to a clinician",
  "Where to begin in the six steps",
  "Pages to read next",
] as const;

export const BLOG_ARTICLE_PATH: string =
  "/blogs/how-to-choose-the-right-peptide-for-your-goals/";

export type ResultLink = { label: string; to: string; note: string };

export type CategoryContent = {
  title: string;
  summary: string;
  evidence: string;
  clinicianQuestions: readonly string[];
  links: readonly ResultLink[];
};

const BLOG_LINK: ResultLink = {
  label: "How to choose the right peptide for your goals",
  to: BLOG_ARTICLE_PATH,
  note: "The six-step guide this quiz is based on",
};
const SAFETY_LINK: ResultLink = {
  label: "Safety and eligibility",
  to: "/safety/",
  note: "Side effects, contraindications, and who may not be a fit",
};
const HOW_IT_WORKS_LINK: ResultLink = {
  label: "How Beema Health works",
  to: "/how-it-works/",
  note: "Intake, independent provider review, and pharmacy fulfillment",
};

export const CATEGORY_CONTENT: Record<GoalCategory, CategoryContent> = {
  weight_metabolic: {
    title: "Weight and metabolic health",
    summary:
      "Your questions sit in weight management, where the most developed human evidence for peptide-based medicines exists.",
    evidence:
      "FDA-approved medicines containing semaglutide or tirzepatide are approved for chronic weight management alongside a reduced-calorie diet and more physical activity in eligible adults. In randomized trials, eligible people using them with lifestyle support lost more weight on average than comparison groups. Those results come from specific approved products, doses, and populations. Compounded preparations are not FDA-approved, and results from an approved product should not be assumed to apply to them. Every option carries risks, and eligibility is an individual clinical decision.",
    clinicianQuestions: [
      "Do my health history and current medications make a weight-management medicine reasonable to consider at all?",
      "Is the option you are describing FDA-approved for this use, or compounded? If compounded, why would that be clinically necessary and legally available for me?",
      "What side effects and contraindications matter most for me?",
      "What happens to my weight if I stop, and what is the maintenance plan?",
      "What will treatment and follow-up cost over the next several months?",
    ],
    links: [
      BLOG_LINK,
      {
        label: "GLP-1 care at Beema Health",
        to: "/glp-1/",
        note: "What the program includes and how provider review works",
      },
      {
        label: "GLP-1 side effects",
        to: "/learn/weight-loss/glp-1-side-effects/",
        note: "Common reactions versus signs that need urgent care",
      },
      {
        label: "Traditional vs. GLP-1 weight loss",
        to: "/learn/initial-research/",
        note: "How lifestyle and medication-assisted approaches compare",
      },
      HOW_IT_WORKS_LINK,
      SAFETY_LINK,
    ],
  },
  recovery_injury: {
    title: "Muscle recovery or an injury",
    summary:
      "Your questions sit in recovery and injury, where interest online is high and human evidence for peptides is thin.",
    evidence:
      "Compounds such as BPC-157 and TB-500 are often discussed for tissue repair. Neither is an FDA-approved drug, and the FDA has described limited safety information and impurity and immunogenicity concerns for both. A 2026 systematic review of human research on BPC-157 found only three small studies of poor methodological quality and rated the certainty of evidence as very low. A proposed mechanism or an animal result is not a demonstrated benefit in people. A symptom that has not been evaluated usually needs a diagnosis and a rehabilitation plan first.",
    clinicianQuestions: [
      "What is causing this injury or symptom, and has it been properly evaluated?",
      "What evidence-based rehabilitation, load management, or other established care should come first?",
      "If a peptide is being suggested, is it FDA-approved for my condition, compounded, or an investigational research product?",
      "What human studies support it for my situation, and what is unknown about its safety?",
      "Could it affect my sport, my work, or any anti-doping rules I follow?",
    ],
    links: [
      BLOG_LINK,
      {
        label: "Resistance training for muscle",
        to: "/learn/resistance-training/",
        note: "Evidence-based volume, effort, protein, and rest",
      },
      SAFETY_LINK,
    ],
  },
  growth_hormone: {
    title: "Growth hormone signaling or body composition",
    summary:
      "Your questions sit in growth hormone signaling, where regulatory history matters as much as the marketing.",
    evidence:
      "Sermorelin is a synthetic fragment of growth hormone-releasing hormone. It was once FDA-approved as Geref for diagnostic use and for children with growth failure from growth hormone deficiency, and the branded products were discontinued in 2008. There is no marketed FDA-approved sermorelin product today, so it is available only as a compounded medication, and compounded preparations are not FDA-approved. Using it for adult body composition, recovery, or anti-aging is not an FDA-approved use, and the evidence for those goals is limited. A diagnosed hormone issue is a different question from a general wellness goal.",
    clinicianQuestions: [
      "Is there a diagnosed or suspected hormone problem that should be tested first?",
      "What does the evidence show for my specific goal, and what was the approved use in the first place?",
      "If a compounded preparation is suggested, why is it clinically appropriate for me and legally available in my state?",
      "Which licensed pharmacy would prepare it, and how can I verify that pharmacy?",
      "What would success look like, how would we measure it, and when would we stop?",
    ],
    links: [
      BLOG_LINK,
      {
        label: "Compounded sermorelin at Beema Health",
        to: "/sermorelin/",
        note: "Compounded, not FDA-approved; a prescription is never guaranteed",
      },
      HOW_IT_WORKS_LINK,
      SAFETY_LINK,
    ],
  },
  skin_appearance: {
    title: "Skin and appearance",
    summary:
      "Your questions sit in skin and appearance, where cosmetic products and injectable treatments are very different things.",
    evidence:
      "GHK-Cu is a naturally occurring copper-binding tripeptide that appears in many skincare products. Research on topical use is preliminary, and a cosmetic is regulated very differently from a drug. A cosmetic claim says nothing about what happens when a substance is injected. For injectable GHK-Cu, the FDA has said there are limited human data to inform safety. For most skin goals, a dermatology visit and an evidence-based routine are stronger starting points than a peptide.",
    clinicianQuestions: [
      "What is the specific skin concern, and what established treatments could address it first?",
      "Is the product a cosmetic, an FDA-approved drug, a compounded preparation, or a research chemical?",
      "What do human studies show for this exact product and use?",
      "What are the risks of an injectable version compared with a topical one?",
      "How would we tell whether it is working, and what would make us stop?",
    ],
    links: [BLOG_LINK, SAFETY_LINK],
  },
  healthy_aging: {
    title: "Healthy aging",
    summary:
      "Your questions sit in healthy aging, a broad goal that is hard to measure and easy to oversell.",
    evidence:
      "Researchers are studying how peptide signaling influences metabolism, tissue repair, and the biology of aging, and some of that work may matter in the future. But anti-aging is not one measurable medical outcome, and no single peptide has been proven to deliver every benefit people associate with the phrase. A product that promises better energy, faster recovery, younger-looking skin, and a longer life all at once deserves questions about which outcomes were shown in well-designed human trials, for whom, and over what period.",
    clinicianQuestions: [
      "Which specific, measurable outcome do I care about, such as a lab value, a symptom, or a function I want back?",
      "What established lifestyle or medical steps could help with that outcome first?",
      "Which human trials support the product I am hearing about, and were they in people like me?",
      "What are the known risks and the unknowns?",
      "How will we review progress, and when would we change course?",
    ],
    links: [
      BLOG_LINK,
      {
        label: "Resistance training for muscle",
        to: "/learn/resistance-training/",
        note: "Evidence-based guidance on building and keeping muscle",
      },
      SAFETY_LINK,
    ],
  },
  unsure: {
    title: "Still working out the goal",
    summary:
      "Not knowing yet is a normal place to start. A clear goal comes before any product name.",
    evidence:
      "Peptide is a broad scientific term, not a stamp of approval. Two products described as peptides can have different purposes, evidence, risks, and legal status. The evidence is strongest for a few FDA-approved medicines used for specific conditions, and much weaker for many products marketed for recovery, skin, and anti-aging. Getting specific about what you want to change is the step that makes the rest of the research useful.",
    clinicianQuestions: [
      "Given what I want to feel or do differently, which of my concerns should be evaluated first?",
      "Could this be addressed with established care, lifestyle changes, or testing before any medication?",
      "If a medication makes sense, is it FDA-approved for my situation, compounded, or investigational?",
      "What would a reasonable plan and timeline look like?",
    ],
    links: [
      BLOG_LINK,
      HOW_IT_WORKS_LINK,
      SAFETY_LINK,
      {
        label: "Learn library",
        to: "/learn/",
        note: "Plain-language guides on treatments and health topics",
      },
    ],
  },
};

export const SIX_STEPS = [
  "Get specific about your goal",
  "Check the evidence",
  "Talk to a healthcare professional",
  "Weigh benefits, risks and legal status",
  "Consider the bigger plan",
  "Monitor and adjust",
] as const;

/** 1-based step in SIX_STEPS to highlight as the suggested place to begin. */
export function suggestedStep(result: QuizResult): number {
  if (result.flags.isUnsureOfGoal) return 1;
  if (result.flags.wantsClinician) return 3;
  if (result.flags.hasClinician) return 4;
  switch (result.priority) {
    case "evidence":
      return 2;
    case "safety_legal":
      return 4;
    case "cost_commitment":
    case "convenience":
      return 5;
    default:
      return 2;
  }
}

/** Extra notes driven by flags. Each is a short, neutral sentence or two. */
export function flagNotes(result: QuizResult): string[] {
  const notes: string[] = [];
  if (result.flags.usedUnsupervisedProducts) {
    notes.push(
      "You mentioned using supplements or products without a clinician. Tell any clinician exactly what you have taken, including the source and how long, so they can factor it into their advice. Products sold online or in stores may not be what the label says, and the FDA does not review most of them before sale.",
    );
  }
  if (result.flags.heardFromMarketing) {
    notes.push(
      "You first heard about this through social media, a creator, an ad, or a store. Those sources often have something to sell and may not be showing the full evidence. A testimonial is one person's experience, not proof that a product works or is safe for you.",
    );
  }
  if (result.flags.wantsClinician) {
    notes.push(
      "You want to talk to someone first. That is a sound instinct. Bring the questions below and your full medication and health history.",
    );
  }
  if (result.flags.hasClinician) {
    notes.push(
      "You already have a clinician. Share what you have read and what you are considering, and let them tell you what fits your history.",
    );
  }
  if (result.nextStep === "compare_options") {
    notes.push(
      "When you compare options, compare the status of each one too: FDA-approved, compounded, investigational, or cosmetic. They are not interchangeable.",
    );
  }
  return notes;
}

/** Whether to show the Bask intake CTA (goes through resolveCta, never hardcoded). */
export function showIntakeCta(result: QuizResult): boolean {
  return result.category === "weight_metabolic" && !result.flags.hasClinician;
}

export const INTAKE_CTA_NOTE =
  "Beema Health offers telehealth GLP-1 care for eligible adults. Independent licensed providers review your intake and decide whether any treatment is appropriate. A prescription is never guaranteed, and compounded medications are not FDA-approved.";
