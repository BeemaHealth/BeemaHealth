import type { LearnArticle } from "../../types";
import { COMPOUNDED_ED_MINTS_REQUIRED } from "@/lib/compounded-disclosure";

const DATE = "2026-09-03";

export const article: LearnArticle = {
  vertical: "ed",
  slug: "sildenafil-tadalafil-oxytocin",
  title: "Sildenafil + Tadalafil + Oxytocin: ODT Explained",
  h1: "Sildenafil, tadalafil, and oxytocin combination tablets",
  description:
    "A compounded 3-ingredient tablet that dissolves under the tongue. What oxytocin's role is (and isn't proven to be), plus dosing and safety basics.",
  keywords: [
    "sildenafil tadalafil oxytocin",
    "oxytocin for ed",
    "oxytocin erectile dysfunction",
    "ed mints odt",
    "orally dissolving ed tablet",
  ],
  cluster: "combinations",
  relatedSlugs: [
    "tadalafil-sildenafil-combo",
    "tadalafil-dosing",
    "sildenafil-dosing",
  ],
  moneyPageHrefs: ["/ed-mints/", "/tadalafil/", "/sildenafil/"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "CIALIS (tadalafil) tablets, FDA-approved prescribing information via DailyMed.",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ebddb745-81f9-4b25-8739-b2886032ed26",
    },
    {
      label:
        "VIAGRA (sildenafil citrate) tablets, FDA-approved prescribing information via DailyMed.",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4d60822d-1c9b-494d-adb3-20fe921d9c58",
    },
    {
      label:
        "Oxytocin, Erectile Function and Sexual Behavior (review). PubMed.",
      href: "https://pubmed.ncbi.nlm.nih.gov/34638719/",
    },
  ],
  faqs: [
    {
      question: "What is the sildenafil + tadalafil + oxytocin combination?",
      answer:
        "It's a compounded formulation combining three ingredients, sildenafil, tadalafil, and oxytocin, into a single dose prepared at an FDA-registered 503B outsourcing facility. It is not a fixed-dose product approved by the FDA - no pharmaceutical manufacturer sells this three-ingredient combination as a single commercial product.",
    },
    {
      question: "Does oxytocin help erectile dysfunction?",
      answer:
        "Oxytocin's role in erectile and sexual function has mostly been studied in animal models, with some smaller human case-level research, not in the large randomized controlled trials that support tadalafil's and sildenafil's FDA labels for ED. Beema Health does not claim oxytocin is proven to improve outcomes when added to a compounded formulation - it is included as part of this specific compounded product, not as an FDA-approved ED treatment in its own right.",
    },
    {
      question: "What does ODT mean?",
      answer:
        "ODT stands for orally dissolving tablet - a tablet designed to dissolve in the mouth rather than being swallowed with water. Beema Health's sildenafil 50 mg/tadalafil 20 mg/oxytocin 125 IU formulation is prepared as an ODT.",
    },
    {
      question:
        "Why does this formulation use a higher tadalafil dose than the other ED Mints option?",
      answer:
        "Beema Health's two ED Mints formulations use different tadalafil amounts by design: the tadalafil + sildenafil RDT uses 12 mg, while this ODT uses 20 mg, which is within the FDA-labeled as-needed range for single-ingredient tadalafil (5-20 mg). A higher milligram count is not automatically a better outcome for a given person - a licensed provider decides which formulation and dose, if any, may be appropriate based on an individual's health history.",
    },
    {
      question:
        "Is this the same as taking tadalafil and sildenafil tablets separately?",
      answer: `No. This is a compounded, three-ingredient formulation in a different delivery format (dissolving in the mouth) than swallowing individual FDA-approved tablets. ${COMPOUNDED_ED_MINTS_REQUIRED} It should not be assumed identical in absorption, onset, or effect to taking separate tablets, and a licensed provider decides on a case-by-case basis whether it may be appropriate.`,
    },
  ],
  sections: [
    {
      id: "what-it-is",
      heading: "What this combination formulation is",
      body: [
        "This is a compounded formulation combining sildenafil, tadalafil, and oxytocin, prepared at an FDA-registered 503B outsourcing facility, as an orally dissolving tablet (ODT) that dissolves in the mouth rather than being swallowed with water. It is not sold as a single commercial product by any pharmaceutical manufacturer, and it is not FDA-approved.",
        "Beema Health markets this specific formulation, sildenafil 50 mg combined with tadalafil 20 mg and oxytocin 125 IU, as one of its two ED Mints options - the other being a lower-dose tadalafil + sildenafil RDT without oxytocin.",
      ],
    },
    {
      id: "the-two-approved-ingredients",
      heading:
        "Sildenafil and tadalafil: the two FDA-approved ingredients here",
      body: [
        "Sildenafil and tadalafil are both PDE5 inhibitors, individually FDA-approved as single-ingredient products under labels this hub summarizes in the sildenafil dosing and tadalafil dosing articles. In this formulation they are combined into one compounded dose alongside a third ingredient, oxytocin, rather than sold as separate single-ingredient tablets.",
      ],
    },
    {
      id: "oxytocin",
      heading: "Oxytocin's role: what the evidence actually shows",
      body: [
        "Oxytocin is a hormone best known for its roles in childbirth and bonding, but it also has receptors in brain regions involved in sexual behavior. Preclinical research in animal models has shown oxytocin can promote penile erection when administered directly to certain brain regions, and a small number of human case-level reports have described improvements in aspects of sexual function with oxytocin. That is meaningfully different from the phase 3 randomized trial evidence behind tadalafil's and sildenafil's FDA labels.",
        "Beema Health includes oxytocin in this formulation because a compounding pharmacy prepares it that way, not because oxytocin itself is an FDA-approved ED treatment or because its added benefit in this combination has been proven in controlled human trials. A licensed provider decides whether this formulation, or any other, may be appropriate for a specific patient.",
      ],
    },
    {
      id: "dosing-and-timing",
      heading: "Dosing and timing basics",
      body: [
        "As formulated by Beema Health, this ODT dissolves in the mouth with no water needed. Most patients take one about 30 minutes before sexual activity, and no more than one dose in a 24-hour period. Like single-ingredient tadalafil and sildenafil, it does not cause arousal by itself - sexual stimulation is still required for it to have an effect. A licensed provider confirms timing and dosing based on an individual patient's health history.",
      ],
    },
    {
      id: "what-beema-offers",
      heading: "What Beema Health actually offers",
      body: [
        `Beema Health's live ED Mints line has two formulations: this sildenafil + tadalafil + oxytocin 50 mg/20 mg/125 IU ODT, and a separate tadalafil + sildenafil 12 mg/60 mg RDT without oxytocin - see that formulation's own article. ${COMPOUNDED_ED_MINTS_REQUIRED} A licensed provider reviews each patient's intake and independently decides which formulation, if any, may be appropriate; completing intake does not guarantee a prescription. See the ED Mints page for eligibility and to start an intake.`,
      ],
    },
    {
      id: "safety",
      heading: "Safety basics this article will not skip",
      body: [
        "Because this formulation contains both tadalafil and sildenafil, the same nitrate contraindication and cardiovascular precautions that apply to each ingredient individually apply here too - it is not appropriate for people on nitrate medications or with certain cardiovascular conditions. This article is educational, not medical advice - share your full medical history and current medications with a licensed provider before starting any ED treatment.",
      ],
    },
  ],
};
