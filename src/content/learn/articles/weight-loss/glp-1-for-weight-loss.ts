import type { LearnArticle } from "../../types";
import {
  COMPOUNDED_DISCLOSURE,
  LEARN_USA_ONLY_SENTENCE,
  getGlp1OnlineWithBeemaFaq,
} from "@/lib/learn-trust-copy";

const DATE = "2026-08-24";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "glp-1-for-weight-loss",
  title: "GLP-1 Drugs for Weight Loss: How Treatment Works",
  h1: "GLP-1 drugs for weight loss: how the treatment works",
  description:
    "GLP-1 receptor agonists reduce appetite and slow gastric emptying. Labeled uses, trial-scale results, safety, and how telehealth prescribing works.",
  keywords: [
    "glp 1 drugs for weight loss",
    "glp 1 weight loss",
    "glp 1 treatment",
    "GLP-1 receptor agonist",
    "semaglutide weight loss",
    "tirzepatide",
    "glp 1 peptide for weight loss",
  ],
  cluster: "programs-local",
  relatedSlugs: [
    "glp-1-weight-loss-program",
    "online-glp-1",
    "glp-1-doctor",
    "best-glp-1-for-weight-loss",
    "glp-1-side-effects",
    "glp-1-dosing",
    "semaglutide-weight-loss",
    "glp-1-cost",
  ],
  moneyPageHrefs: ["/weight-loss", "/semaglutide", "/tirzepatide", "/glp-1"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "Drucker DJ. Mechanisms of action and therapeutic application of glucagon-like peptide-1. Cell Metabolism. 2018.",
      href: "https://doi.org/10.1016/j.cmet.2018.03.001",
    },
    {
      label:
        "Wilding JPH, et al. STEP 1: once-weekly semaglutide 2.4 mg. N Engl J Med. 2021.",
      href: "https://doi.org/10.1056/NEJMoa2032183",
    },
    {
      label:
        "Jastreboff AM, et al. SURMOUNT-1: tirzepatide for obesity. N Engl J Med. 2022.",
      href: "https://doi.org/10.1056/NEJMoa2206038",
    },
    {
      label: "NIDDK. Prescription medications to treat overweight and obesity.",
      href: "https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity",
    },
  ],
  faqs: [
    {
      question: "What is a GLP-1 drug for weight loss?",
      answer:
        "GLP-1 receptor agonists are prescription medicines that mimic a gut hormone involved in insulin secretion, appetite, and stomach emptying. Some are FDA-approved for type 2 diabetes, some for chronic weight management, and some for both depending on the brand and dose. They are medications, not research peptides and not over-the-counter fat burners.",
    },
    {
      question: "Is tirzepatide a GLP-1?",
      answer:
        "Tirzepatide activates both the GLP-1 receptor and the GIP receptor. People still search it under GLP-1 because the class conversation includes dual agonists. SURMOUNT-1 reported large mean weight reductions at 72 weeks. A licensed clinician decides whether any dual agonist is appropriate for you.",
    },
    {
      question: "Can I buy GLP-1 online without a prescription?",
      answer:
        "No. In the United States, GLP-1 medicines used for weight management are prescription drugs. There is no lawful vitamin-style checkout. If a site ships a vial with no licensed provider, leave.",
    },
    getGlp1OnlineWithBeemaFaq(),
    {
      question: "Do GLP-1 medicines guarantee a certain percent lost?",
      answer:
        "No. Trial averages (about 14.9% with semaglutide 2.4 mg in STEP 1; higher means at higher tirzepatide doses in SURMOUNT-1) describe groups. Individuals do better or worse. Stopping often leads to regain. Nobody should promise you a number.",
    },
    {
      question: "What does Beema Health offer?",
      answer: `Beema Health is a cash-pay telehealth program. Licensed providers may prescribe compounded semaglutide or compounded tirzepatide when legally available and clinically appropriate. ${COMPOUNDED_DISCLOSURE} Beema Health does not sell Wegovy, Ozempic, Zepbound, or Mounjaro. ${LEARN_USA_ONLY_SENTENCE}`,
    },
    {
      question: "Who is a typical labeled candidate?",
      answer:
        "Obesity-medicine labels commonly describe adults with BMI 30 or higher, or 27 or higher with a weight-related condition. Contraindications include personal or family history of medullary thyroid carcinoma or MEN 2 for products that carry that boxed warning. Pregnancy is a stop. Your clinician applies the label to you.",
    },
  ],
  sections: [
    {
      id: "biology",
      heading: "What GLP-1 is doing in the body",
      body: [
        "Glucagon-like peptide-1 is released after meals. Receptor agonists used as medicines amplify that signal. The practical results people notice first are earlier fullness, fewer intrusive food thoughts, and slower stomach emptying. Those effects are why the class is used in medical weight loss, not because the drugs 'melt fat' in the way a cream claims to.",
        "This page is educational, not a product landing page and not medical advice. Beema Health's commercial program pages for weight loss, compounded semaglutide, and compounded tirzepatide explain how to start intake. Here the job is to explain the pharmacology so 'GLP-1 for weight loss' is not a mystery slogan.",
      ],
    },
    {
      id: "which-medicines",
      heading: "Which medicines sit in the conversation",
      body: [
        "Semaglutide is a GLP-1 receptor agonist. At obesity doses studied in STEP 1, mean weight change was about 14.9% at 68 weeks versus 2.4% with placebo. Tirzepatide is a dual GIP/GLP-1 agonist; SURMOUNT-1 reported dose-dependent mean losses, with the 15 mg dose around 20.9% at 72 weeks in that trial. Liraglutide (Saxenda) is a daily GLP-1 option with smaller average losses. Newer oral and triple-agonist stories are covered in pipeline articles. None of those sentences assigns you a drug.",
        "Searchers often type 'GLP-1 peptide for weight loss.' Licensed products are prescription medications manufactured to drug standards. Research-chemical websites selling 'GLP-1 peptides' are not pharmacies. Do not use them.",
      ],
    },
    {
      id: "not-a-cart",
      heading: "How to get GLP-1 treatment online in the United States",
      body: [
        "A licensed provider reviews health history, medicines, and BMI-related factors, then decides whether a prescription is appropriate. Telehealth can establish that relationship under state law. Shipping from a licensed pharmacy may follow. That is online GLP-1 treatment. It is not adding a vial to a cart.",
        `Beema Health serves adults in all 50 US states with that telehealth model. Medication availability can still depend on compounding rules and pharmacy fulfillment. Prescribing is never guaranteed. ${LEARN_USA_ONLY_SENTENCE}`,
      ],
    },
    {
      id: "safety",
      heading: "Side effects and when to seek care",
      body: [
        "Nausea, constipation, diarrhea, and vomiting are common, especially during dose increases. Gallbladder problems and pancreatitis are less common but serious. Seek urgent care for severe abdominal pain, signs of dehydration, or allergic reaction. People with MTC or MEN 2 history are generally excluded from many labeled incretin obesity products. Read the Medication Guide for any branded product you are prescribed.",
        "Compounded versions, when used, are not FDA-approved and must not be described as generic equivalents of a brand. Beema Health's treatment pages state that required distinction.",
      ],
    },
    {
      id: "lifestyle",
      heading: "Why diet still shows up in every trial protocol",
      body: [
        "Pivotal trials paired medicine with diet and activity counseling. Protein and resistance training help protect lean mass when intake falls. Alcohol can worsen nausea and add calories. GLP-1 treatment is not a reason to abandon those basics. See diet and side-effect articles for practical detail.",
      ],
    },
    {
      id: "next",
      heading: "If you want a program, not just a definition",
      body: [
        "A weight-loss program wraps follow-up, titration, and supplies around the molecule. Read the [GLP-1 weight-loss program](/learn/weight-loss/glp-1-weight-loss-program/) explainer and the [GLP-1 doctor](/learn/weight-loss/glp-1-doctor/) explainer next. When you are ready for Beema Health's cash-pay intake, use the live [program overview](/weight-loss/), [compounded semaglutide](/semaglutide/), or [compounded tirzepatide](/tirzepatide/) pages. Those pages carry current plan prices. This educational article does not.",
      ],
    },
  ],
  ctaId: "weight_loss_hero",
};
