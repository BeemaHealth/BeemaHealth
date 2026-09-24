import type { LearnArticle } from "../../types";
import {
  GENERIC_SILDENAFIL_REQUIRED,
  COMPOUNDED_ED_MINTS_REQUIRED,
} from "@/lib/compounded-disclosure";

const DATE = "2026-09-03";

export const article: LearnArticle = {
  vertical: "ed",
  slug: "sildenafil-dosing",
  title: "Sildenafil Dosing: How 50mg and 100mg Work",
  h1: "How sildenafil dosing works: 50mg and 100mg",
  description:
    "Sildenafil (Viagra) is FDA-labeled from 25mg to 100mg, taken as needed. See timing before activity, dose adjustments, and which strengths Beema Health offers.",
  keywords: [
    "sildenafil dosage",
    "sildenafil dosing",
    "viagra dosage",
    "how much sildenafil should I take",
    "sildenafil 50mg vs 100mg",
    "sildenafil timing",
  ],
  cluster: "dosing",
  relatedSlugs: [
    "tadalafil-dosing",
    "tadalafil-sildenafil-combo",
    "sildenafil-tadalafil-oxytocin",
  ],
  moneyPageHrefs: ["/sildenafil/", "/ed-mints/"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "VIAGRA (sildenafil citrate) tablets, FDA-approved prescribing information via DailyMed.",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4d60822d-1c9b-494d-adb3-20fe921d9c58",
    },
    {
      label: "MedlinePlus. Sildenafil: drug information.",
      href: "https://medlineplus.gov/druginfo/meds/a699015.html",
    },
  ],
  faqs: [
    {
      question:
        "What's the difference between the 50mg and 100mg sildenafil doses?",
      answer:
        "On the FDA label, 50 mg is the recommended starting dose for most patients, taken about an hour before sexual activity. Based on individual response and tolerability, a clinician may increase it to 100 mg or decrease it to 25 mg. Some patients, including those over 65 or with certain liver, kidney, or drug-interaction considerations, are labeled to start at 25 mg. A licensed provider, not the patient, decides the starting dose and any adjustment.",
    },
    {
      question: "How long before activity should I take sildenafil?",
      answer:
        "The FDA label describes a window of about 30 minutes to 4 hours before sexual activity, with peak effect typically around 1 hour after taking it. A high-fat meal can delay how quickly it starts working, which is a practical difference from tadalafil.",
    },
    {
      question: "Can I take sildenafil every day?",
      answer:
        "No. Sildenafil for erectile dysfunction is labeled for as-needed use, with a maximum recommended frequency of once per day. It is not labeled as a once-daily maintenance medication the way one tadalafil regimen is.",
    },
    {
      question: "What sildenafil strengths does Beema Health offer?",
      answer: `Beema Health's sildenafil is available at a single flat rate across the 50 mg and 100 mg strengths; a licensed provider decides which, if any, may be appropriate for a given patient. Beema Health does not currently offer the 25 mg starting-dose strength. ${GENERIC_SILDENAFIL_REQUIRED} See the sildenafil page for pricing and to start an intake. Looking for a formulation that combines sildenafil and tadalafil into one dissolve-under-the-tongue tablet instead? See ED Mints. ${COMPOUNDED_ED_MINTS_REQUIRED}`,
    },
    {
      question: "Is Beema Health's sildenafil the same as Viagra?",
      answer:
        "Yes. Beema Health's sildenafil is the FDA-approved generic version of Viagra - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.",
    },
  ],
  sections: [
    {
      id: "how-it-works",
      heading: "How sildenafil works",
      body: [
        "Sildenafil is a PDE5 (phosphodiesterase type 5) inhibitor. It relaxes smooth muscle and increases blood flow to the penis, which can make it easier to get and keep an erection when a person is sexually stimulated. Sildenafil does not cause arousal by itself - sexual stimulation is still required for it to have an effect.",
        "Compared with tadalafil, sildenafil generally has a shorter window of effect - the FDA label describes a single as-needed dose meant to be taken before one occasion, rather than a longer-acting or once-daily option.",
      ],
    },
    {
      id: "dosing-strengths",
      heading: "FDA-labeled strengths and how they're used",
      body: [
        "Sildenafil tablets are FDA-labeled in three strengths: 25 mg, 50 mg, and 100 mg. For most patients, 50 mg is the recommended starting dose, taken as needed roughly an hour before sexual activity.",
        "A lower 25 mg starting dose is labeled for specific situations: patients over 65, those with hepatic impairment or severe renal impairment, and those taking certain medications (like some HIV protease inhibitors) that slow how the body clears sildenafil.",
      ],
      bullets: [
        "25 mg: labeled starting dose for specific populations (65+, hepatic/severe renal impairment, certain drug interactions)",
        "50 mg: the recommended starting dose for most patients",
        "100 mg: the maximum labeled dose, based on response and tolerability",
        "Maximum frequency: once per day",
      ],
    },
    {
      id: "timing",
      heading: "Timing, food, and what changes the effect",
      body: [
        "The FDA label describes taking sildenafil anywhere from about 30 minutes to 4 hours before sexual activity, with the strongest effect around the one-hour mark. A high-fat meal can slow absorption and delay onset, so timing around food matters more for sildenafil than it does for tadalafil.",
      ],
    },
    {
      id: "what-beema-offers",
      heading: "What Beema Health's sildenafil offers",
      body: [
        `Beema Health's live sildenafil offering is available at 50 mg or 100 mg (the 25 mg starting-dose strength is not currently offered). ${GENERIC_SILDENAFIL_REQUIRED} A licensed provider reviews each patient's intake and independently decides the strength and dose, if any, that may be appropriate; completing intake does not guarantee a prescription. See the sildenafil page for eligibility and to start an intake.`,
        `If you're comparing sildenafil to tadalafil, or want a formulation that combines the two into one dissolve-under-the-tongue tablet, see the tadalafil dosing article and ED Mints. ${COMPOUNDED_ED_MINTS_REQUIRED}`,
      ],
    },
    {
      id: "safety",
      heading: "Safety basics this article will not skip",
      body: [
        "Sildenafil is contraindicated with nitrate medications (often used for chest pain), because the combination can cause a dangerous drop in blood pressure. It is not appropriate for everyone, including some people with certain cardiovascular conditions. Common side effects reported in trials include headache, flushing, indigestion, and vision changes (including a temporary blue-tinged vision in some patients). This article is educational, not medical advice - share your full medical history and current medications with a licensed provider before starting any ED treatment.",
      ],
    },
  ],
};
