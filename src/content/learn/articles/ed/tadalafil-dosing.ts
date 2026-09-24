import type { LearnArticle } from "../../types";
import {
  GENERIC_TADALAFIL_REQUIRED,
  COMPOUNDED_ED_MINTS_REQUIRED,
} from "@/lib/compounded-disclosure";

const DATE = "2026-09-03";

export const article: LearnArticle = {
  vertical: "ed",
  slug: "tadalafil-dosing",
  title: "Tadalafil Dosing: How 5mg to 20mg Doses Work",
  h1: "How tadalafil dosing works: 5mg, 10mg, and 20mg",
  description:
    "Tadalafil (Cialis) is FDA-labeled from 5mg to 20mg. See as-needed vs once-daily dosing, timing before activity, and which strengths Beema Health offers.",
  keywords: [
    "tadalafil dosage",
    "tadalafil dosing",
    "cialis dosage",
    "how much tadalafil should I take",
    "tadalafil 10mg vs 20mg",
    "tadalafil daily dose",
  ],
  cluster: "dosing",
  relatedSlugs: [
    "sildenafil-dosing",
    "tadalafil-sildenafil-combo",
    "sildenafil-tadalafil-oxytocin",
  ],
  moneyPageHrefs: ["/tadalafil/", "/ed-mints/"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "CIALIS (tadalafil) tablets, FDA-approved prescribing information via DailyMed.",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ebddb745-81f9-4b25-8739-b2886032ed26",
    },
    {
      label: "MedlinePlus. Tadalafil: drug information.",
      href: "https://medlineplus.gov/druginfo/meds/a604008.html",
    },
  ],
  faqs: [
    {
      question:
        "What's the difference between the 10mg and 20mg tadalafil doses?",
      answer:
        "On the FDA label for as-needed use, 10 mg is the recommended starting dose, taken before anticipated sexual activity. Based on individual response and tolerability, a clinician may increase it to 20 mg or decrease it to 5 mg. Higher milligram counts are not automatically 'stronger' in a way that guarantees a better result for a given person - a licensed provider weighs response, side effects, and other medications when deciding whether to adjust a dose.",
    },
    {
      question: "Can I take tadalafil every day?",
      answer:
        "The FDA label describes two different regimens: an as-needed regimen (5-20 mg, taken before activity) and a separate once-daily regimen (2.5 mg or 5 mg, taken at the same time every day without regard to timing of sexual activity). They are not the same prescription. Which regimen, if either, may be appropriate is a decision a licensed provider makes individually - this article is not instructions to start daily dosing on your own.",
    },
    {
      question: "How long does tadalafil last?",
      answer:
        "The FDA label reports improved erectile function compared to placebo for up to 36 hours after a dose in clinical trials, which is why tadalafil is sometimes informally called a longer-acting option compared to sildenafil. Individual duration varies, and food does not need to be avoided with tadalafil.",
    },
    {
      question: "What tadalafil strengths does Beema Health offer?",
      answer: `Beema Health's tadalafil is available at a single flat rate across the 5 mg, 10 mg, and 20 mg as-needed strengths; a licensed provider decides which of those, if any, may be appropriate for a given patient. Beema Health does not currently offer the 2.5 mg once-daily strength. ${GENERIC_TADALAFIL_REQUIRED} See the tadalafil page for pricing and to start an intake. Looking for a formulation that combines tadalafil and sildenafil into one dissolve-under-the-tongue tablet instead? See ED Mints. ${COMPOUNDED_ED_MINTS_REQUIRED}`,
    },
    {
      question: "Is Beema Health's tadalafil the same as Cialis?",
      answer:
        "Yes. Beema Health's tadalafil is the FDA-approved generic version of Cialis - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.",
    },
  ],
  sections: [
    {
      id: "how-it-works",
      heading: "How tadalafil works",
      body: [
        "Tadalafil is a PDE5 (phosphodiesterase type 5) inhibitor. It relaxes smooth muscle and increases blood flow to the penis, which can make it easier to get and keep an erection when a person is sexually stimulated. Tadalafil does not cause arousal by itself - sexual stimulation is still required for it to have an effect.",
        "Tadalafil can be effective for a comparatively long window: the FDA label reports improved erectile function versus placebo for up to 36 hours after a single as-needed dose in clinical trials. That duration is one reason some patients and providers consider a low once-daily dose instead of timing a dose around a specific occasion.",
      ],
    },
    {
      id: "dosing-strengths",
      heading: "FDA-labeled strengths and how they're used",
      body: [
        "Tadalafil tablets are FDA-labeled in four strengths: 2.5 mg, 5 mg, 10 mg, and 20 mg. They are used in two different regimens, not interchangeably.",
        "Tadalafil may be taken without regard to food, unlike some ED medications where a high-fat meal can slow absorption.",
      ],
      bullets: [
        "10 mg (as needed): the labeled starting dose, taken before anticipated sexual activity",
        "5 mg or 20 mg (as needed): adjustment range based on individual response and tolerability",
        "2.5 mg (once daily): a labeled starting dose taken at the same time each day, not tied to activity",
        "5 mg (once daily): the labeled once-daily adjustment, based on efficacy and tolerability",
      ],
    },
    {
      id: "as-needed-vs-daily",
      heading: "As-needed dosing vs once-daily dosing",
      body: [
        "As-needed dosing means taking a tablet before a specific occasion, with no more than one dose typically taken per day. Once-daily dosing means taking a lower-strength tablet every day regardless of when sexual activity happens, so there is nothing to time or plan around. Neither regimen is inherently better - they suit different situations, and a licensed provider is the one who decides which, if either, may be appropriate for a specific patient's health history and goals.",
      ],
    },
    {
      id: "what-beema-offers",
      heading: "What Beema Health's tadalafil offers",
      body: [
        `Beema Health's live tadalafil offering is available at 5 mg, 10 mg, or 20 mg (as-needed strengths; the 2.5 mg once-daily strength is not currently offered). ${GENERIC_TADALAFIL_REQUIRED} A licensed provider reviews each patient's intake and independently decides the strength and dose, if any, that may be appropriate; completing intake does not guarantee a prescription. See the tadalafil page for eligibility and to start an intake.`,
        `If you're comparing tadalafil to sildenafil, or want a formulation that combines the two into one dissolve-under-the-tongue tablet, see the sildenafil dosing article and ED Mints. ${COMPOUNDED_ED_MINTS_REQUIRED}`,
      ],
    },
    {
      id: "safety",
      heading: "Safety basics this article will not skip",
      body: [
        "Tadalafil is contraindicated with nitrate medications (often used for chest pain), because the combination can cause a dangerous drop in blood pressure. It is not appropriate for everyone, including some people with certain cardiovascular conditions. Common side effects reported in trials include headache, indigestion, back pain, and muscle aches. This article is educational, not medical advice - share your full medical history and current medications with a licensed provider before starting any ED treatment.",
      ],
    },
  ],
};
