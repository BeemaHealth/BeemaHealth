import type { LearnArticle } from "../../types";
import { COMPOUNDED_ED_MINTS_REQUIRED } from "@/lib/compounded-disclosure";

const DATE = "2026-09-03";

export const article: LearnArticle = {
  vertical: "ed",
  slug: "tadalafil-sildenafil-combo",
  title: "Tadalafil + Sildenafil Combo: How the RDT Works",
  h1: "Tadalafil + sildenafil combination tablets, explained",
  description:
    "A compounded tablet combining tadalafil and sildenafil that dissolves under the tongue. How it differs from single-ingredient tablets, and dosing basics.",
  keywords: [
    "tadalafil sildenafil combo",
    "tadalafil sildenafil combination",
    "ed mints",
    "dissolvable ed tablet",
    "rapidly dissolving ed tablet",
  ],
  cluster: "combinations",
  relatedSlugs: [
    "sildenafil-tadalafil-oxytocin",
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
  ],
  faqs: [
    {
      question: "What is a tadalafil + sildenafil combination tablet?",
      answer:
        "It's a compounded formulation that combines both active ingredients, tadalafil and sildenafil, into a single dose prepared at an FDA-registered 503B outsourcing facility. It is not a fixed-dose product approved by the FDA - no pharmaceutical manufacturer sells a tadalafil-plus-sildenafil tablet as a single commercial product. Individual ingredient information (mechanism, dosing ranges, side effects) comes from the separate FDA labels for single-ingredient tadalafil and sildenafil products.",
    },
    {
      question: "Why combine two ED medications into one tablet?",
      answer:
        "The rationale some compounding pharmacies and clinicians describe is convenience - one dose instead of two separate pills - and combining a fast-onset ingredient (sildenafil) with a longer-acting one (tadalafil). That is a plausible pharmacologic rationale, not a claim backed by large clinical trials of the combined product itself. A licensed provider decides whether a combination formulation, a single-ingredient formulation, or neither may be appropriate for a specific patient.",
    },
    {
      question: "What does RDT mean?",
      answer:
        "RDT stands for rapidly dissolving tablet - a tablet designed to dissolve under the tongue rather than being swallowed with water. Beema Health's combination formulation combining tadalafil and sildenafil at 12 mg/60 mg is prepared as an RDT.",
    },
    {
      question:
        "Is this the same as taking a tadalafil pill and a sildenafil pill separately?",
      answer: `Not necessarily. A compounded combination tablet is prepared as one formulation, in a different delivery format (dissolving under the tongue) than swallowing two separate FDA-approved tablets. ${COMPOUNDED_ED_MINTS_REQUIRED} It should not be assumed identical in absorption, onset, or effect to taking two individual tablets. A licensed provider makes that comparison on a case-by-case basis, not a webpage.`,
    },
    {
      question:
        "How is this different from Beema Health's single-ingredient tadalafil or sildenafil?",
      answer:
        "Beema Health's single-ingredient tadalafil and sildenafil pages describe standalone formulations of one active ingredient each, each with its own labeled-style dosing range described in the tadalafil dosing and sildenafil dosing articles. This combination formulation, marketed by Beema Health as one of two ED Mints options, combines both ingredients into a single dissolve-under-the-tongue dose. They are different products with different intake flows.",
    },
  ],
  sections: [
    {
      id: "what-it-is",
      heading: "What this combination formulation is",
      body: [
        "This is a compounded formulation combining tadalafil and sildenafil, prepared at an FDA-registered 503B outsourcing facility, as a rapidly dissolving tablet (RDT) that dissolves under the tongue rather than being swallowed with water. It is not sold as a single commercial product by any pharmaceutical manufacturer, and it is not FDA-approved.",
        "Beema Health markets this specific formulation, tadalafil 12 mg combined with sildenafil 60 mg, as one of its two ED Mints options.",
      ],
    },
    {
      id: "why-combine",
      heading: "Why compounding pharmacies combine these two ingredients",
      body: [
        "Tadalafil and sildenafil are both PDE5 inhibitors that work the same general way (relaxing smooth muscle and increasing blood flow), but they differ in onset speed and how long they last. Some compounding pharmacies and clinicians describe combining them as a way to get a faster-acting component alongside a longer-acting one in a single dose. That is a pharmacologic rationale based on the two ingredients' individual, separately studied profiles - it is not itself a claim that has been tested in large randomized trials of the combined product, and Beema Health does not represent it that way.",
      ],
    },
    {
      id: "dosing-and-timing",
      heading: "Dosing and timing basics",
      body: [
        "As formulated by Beema Health, this RDT dissolves under the tongue with no water needed. Most patients take one about 30 minutes before sexual activity, and no more than one dose in a 24-hour period. Like single-ingredient tadalafil and sildenafil, it does not cause arousal by itself - sexual stimulation is still required for it to have an effect. A licensed provider confirms timing and dosing based on an individual patient's health history.",
      ],
    },
    {
      id: "how-it-differs",
      heading:
        "How a compounded combination differs from single-ingredient tablets",
      body: [
        `Because this formulation is compounded rather than manufactured and FDA-approved as a fixed product, it should not be assumed identical in strength, absorption, or effect to taking a single-ingredient tadalafil tablet or a single-ingredient sildenafil tablet, even though it shares active ingredients with both. ${COMPOUNDED_ED_MINTS_REQUIRED} It is considered only when legally available and clinically appropriate, and a licensed provider decides on a case-by-case basis.`,
      ],
    },
    {
      id: "what-beema-offers",
      heading: "What Beema Health actually offers",
      body: [
        `Beema Health's live ED Mints line has two formulations: this tadalafil + sildenafil 12 mg/60 mg RDT, and a separate sildenafil + tadalafil + oxytocin 50 mg/20 mg/125 IU ODT (orally dissolving tablet) - see that formulation's own article. ${COMPOUNDED_ED_MINTS_REQUIRED} A licensed provider reviews each patient's intake and independently decides which formulation, if any, may be appropriate; completing intake does not guarantee a prescription. See the ED Mints page for eligibility and to start an intake.`,
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
