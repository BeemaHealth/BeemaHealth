import type { LearnArticle } from "../../types";
import { learnSemaCashPayFaqAnswer } from "@/lib/learn-pricing-copy";
import {
  COMPOUNDED_SEMA_REQUIRED,
  LEARN_TRIAL_ATTRIBUTION_SENTENCE,
  LEARN_USA_ONLY_SENTENCE,
} from "@/lib/learn-trust-copy";

const DATE = "2026-08-24";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "semaglutide-weight-loss",
  title: "Semaglutide for Weight Loss: What Trials and Labels Show",
  h1: "Semaglutide for weight loss: what STEP and labels show",
  description:
    "Semaglutide 2.4 mg produced about 14.9% mean weight change in STEP 1. Dose differences from diabetes brands, safety, and compounded care.",
  keywords: [
    "semaglutide weight loss",
    "semaglutide weight loss program",
    "STEP 1",
    "glp 1 weight loss",
    "Wegovy vs Ozempic dose",
    "semaglutide texas",
  ],
  cluster: "programs-local",
  relatedSlugs: [
    "semaglutide-in-houston",
    "glp-1-for-weight-loss",
    "semaglutide-in-texas",
    "ozempic",
    "wegovy",
    "glp-1-dosing",
    "glp-1-side-effects",
    "tirzepatide-online",
    "best-glp-1-for-weight-loss",
  ],
  moneyPageHrefs: ["/weight-loss", "/semaglutide", "/tirzepatide", "/glp-1"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "Wilding JPH, et al. Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1). N Engl J Med. 2021;384(11):989-1002.",
      href: "https://doi.org/10.1056/NEJMoa2032183",
    },
    {
      label:
        "Garvey WT, et al. Two-year effects of semaglutide (STEP 5). Nature Medicine. 2022.",
      href: "https://doi.org/10.1038/s41591-022-02026-4",
    },
    {
      label:
        "Lincoff AM, et al. Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT). N Engl J Med. 2023.",
      href: "https://doi.org/10.1056/NEJMoa2307563",
    },
    {
      label:
        "Wegovy (semaglutide) injection prescribing information via DailyMed.",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ee06186f-2aa3-4990-a760-757579d8f77b",
    },
  ],
  faqs: [
    {
      question: "Is semaglutide good for weight loss?",
      answer: `${LEARN_TRIAL_ATTRIBUTION_SENTENCE} In STEP 1, adults without diabetes taking branded semaglutide 2.4 mg weekly (the Wegovy obesity regimen) had about 14.9% mean body-weight change at 68 weeks versus 2.4% with placebo. SELECT showed cardiovascular benefit for 2.4 mg in people with obesity and heart disease without diabetes. Those are group results. They are not a guarantee for you, and they are not medical advice to start therapy.`,
    },
    {
      question: "Is this Beema Health's compounded semaglutide sales page?",
      answer:
        "No. /semaglutide uses the H1 'Compounded Semaglutide, personalized around you.' This article explains trial evidence and dose names so 'semaglutide weight loss' is an education query. Commercial pricing and intake live on the money page. Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate.",
    },
    {
      question: "Is Ozempic the weight-loss dose?",
      answer:
        "Ozempic is branded semaglutide labeled for type 2 diabetes (and a T2D cardiovascular indication). Chronic weight management at 2.4 mg is the Wegovy regimen studied in STEP. Casual speech mixes the brands. Clinicians should not.",
    },
    {
      question: "Does Beema Health offer Wegovy?",
      answer: `No. Beema Health may offer compounded semaglutide after provider review. ${COMPOUNDED_SEMA_REQUIRED} It is not Wegovy. ${LEARN_USA_ONLY_SENTENCE}`,
    },
    {
      question:
        "What does compounded semaglutide cost at Beema Health if prescribed?",
      answer: learnSemaCashPayFaqAnswer(),
    },
    {
      question: "What side effects matter most?",
      answer:
        "Gastrointestinal effects are common. Pooled STEP 1-3 analyses reported nausea in 43.9% on semaglutide versus 16.1% on placebo. Serious risks discussed on labels include gallbladder disease, pancreatitis warnings, and the thyroid C-cell boxed warning. Seek care for severe abdominal pain.",
    },
  ],
  sections: [
    {
      id: "evidence",
      heading: "STEP, SELECT, and what a mean percent is",
      body: [
        `${LEARN_TRIAL_ATTRIBUTION_SENTENCE} Semaglutide is a GLP-1 receptor agonist. STEP 1 is the obesity trial most people mean: branded semaglutide 2.4 mg weekly (Wegovy), 68 weeks, about 14.9% versus 2.4% placebo. STEP 5 extended the time window. SELECT asked a cardiovascular question in people with obesity and preexisting heart disease without diabetes and found fewer major adverse cardiovascular events on 2.4 mg. That is a different claim than 'everyone loses 15%.'`,
        "This page is educational, not medical advice, and not the compounded product lander.",
      ],
    },
    {
      id: "names",
      heading: "Names and milligrams",
      body: [
        "Wegovy is the FDA-approved 2.4 mg chronic-weight-management brand. Ozempic is the diabetes brand at a different dose ladder. Rybelsus is oral semaglutide for diabetes with meal-timing rules. Compounded semaglutide, when legally used, is prepared by a compounding pharmacy and is not FDA-approved. Mixing those four in one shopping-list sentence is how misinformation starts.",
      ],
    },
    {
      id: "program",
      heading: "A semaglutide weight-loss program is follow-up",
      body: [
        "Titration exists because nausea is common. Protein intake and resistance training matter when calories drop. Stopping often brings regain (STEP 1 extension, STEP 4). A program, including Beema Health's if you enroll, should talk about that before week one. See the GLP-1 program explainer.",
      ],
    },
    {
      id: "online",
      heading: "How people in Texas and Houston actually start",
      body: [
        "Telehealth intake plus a licensed clinician is the lawful online path. Beema Health serves all 50 states, including Texas. Semaglutide-in-Texas and Houston articles cover statute and metro logistics. 'Semaglutide doctor Houston' still means a licensed reviewer, not a guaranteed local exam.",
        "A semaglutide weight-loss program is more than the first box. Titration, protein intake, and a plan for what happens if you stop are part of responsible care. Beema Health's commercial page is where cash-pay plans live. This article stays on evidence so it does not clone that H1.",
      ],
    },
    {
      id: "beema",
      heading: "What Beema Health will and will not claim",
      body: [
        "If prescribed, compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate. Beema Health will not say it is generic Wegovy. Cash-pay figures above belong to the live lockup. A prescription is never guaranteed.",
        "When you want the commercial H1 and plan selector, go to /semaglutide. When you want dual-agonist comparison at the trial level, read SURMOUNT-5 coverage in tirzepatide-online and best-GLP-1. This page stays on semaglutide's own evidence.",
      ],
    },
    {
      id: "safety",
      heading: "Safety in one place",
      body: [
        "Do not use products with the boxed warning if you have MTC or MEN 2 history. Avoid during pregnancy. Report vision changes if you have diabetic retinopathy. Gallbladder symptoms and pancreatitis symptoms are stop-and-call events. Unregulated 'semaglutide peptides' are not STEP 1 supplies.",
      ],
    },
  ],
  ctaId: "semaglutide_hero",
};
