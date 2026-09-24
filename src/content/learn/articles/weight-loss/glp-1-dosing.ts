import type { LearnArticle } from "../../types";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "glp-1-dosing",
  title: "GLP-1 Dosing Guide: Titration Schedules and Maintenance",
  h1: "How GLP-1 dosing and titration usually work",
  description:
    "GLP-1 dosing starts low and steps up to limit nausea. Compare labeled weekly and daily schedules, missed-dose rules, and why you should not self-titrate.",
  keywords: [
    "glp-1 dosing",
    "glp 1 dose",
    "glp-1 titration",
    "semaglutide dosing",
    "tirzepatide dosing",
    "glp 1 weight loss dose",
    "glp-1 maintenance dose",
  ],
  cluster: "dosing",
  relatedSlugs: [
    "wegovy-dosing",
    "zepbound-dosing",
    "glp-1-maintenance-dose",
    "microdosing-glp-1",
    "glp-1-side-effects",
    "wegovy",
    "zepbound",
    "glp-1-for-weight-loss",
  ],
  moneyPageHrefs: ["/weight-loss", "/glp-1"],
  datePublished: "2026-08-24",
  dateModified: "2026-08-24",
  sources: [
    {
      label: "Wegovy (semaglutide) U.S. Prescribing Information",
      href: "https://www.novo-pi.com/wegovy.pdf",
    },
    {
      label: "Zepbound (tirzepatide) U.S. Prescribing Information",
      href: "https://pi.lilly.com/us/zepbound-uspi.pdf",
    },
    {
      label: "Ozempic (semaglutide) U.S. Prescribing Information",
      href: "https://www.novo-pi.com/ozempic.pdf",
    },
    {
      label: "Saxenda (liraglutide) U.S. Prescribing Information",
      href: "https://www.novo-pi.com/saxenda.pdf",
    },
  ],
  faqs: [
    {
      question: "Why do GLP-1 medicines start at a low dose?",
      answer:
        "Labels for weekly semaglutide, weekly tirzepatide, and daily liraglutide all start below the usual maintenance dose to reduce gastrointestinal adverse reactions such as nausea, vomiting, and diarrhea. The first weeks are often for tolerability, not for the full effect studied in phase 3 trials.",
    },
    {
      question: "How often does the dose increase?",
      answer:
        "Many weekly products increase about every four weeks if the current step is tolerated. Daily liraglutide (Saxenda) increases about every week to 3 mg. Oral Wegovy tablets increase about every 30 days to 25 mg. A clinician may delay a step. Patients should not skip ahead to 'get results faster.'",
    },
    {
      question: "What if I miss a weekly injection?",
      answer:
        "Missed-dose windows differ by product (for example, Ozempic's label commonly allows five days; tirzepatide labels often allow four days). After the window, the usual instruction is to skip and take the next dose on the regular day. Always follow the Medication Guide for the exact brand in the refrigerator, not a generic internet chart.",
    },
    {
      question: "Can I choose my own GLP-1 dose?",
      answer:
        "No. These are prescription medicines. Splitting pens, buying extra starter boxes, or following a social-media schedule is not a labeled protocol and can be unsafe. Talk with the prescribing clinician if side effects or plateaus are the concern.",
    },
    {
      question: "Is GLP-1 dosing the same for diabetes and weight management?",
      answer:
        "Not always. Ozempic and Mounjaro are diabetes products with their own ceilings and steps. Wegovy and Zepbound are weight-management (and other) products with different maintenance targets. Same molecule class does not mean same milligram schedule.",
    },
    {
      question: "Does Beema Health use one standard GLP-1 dose for everyone?",
      answer:
        "Beema Health does not dispense the branded products named in this article. Any prescription that a Beema Health-network clinician may issue after intake is individualized. Completing a visit does not guarantee a prescription or a particular dose. This page is educational.",
    },
  ],
  sections: [
    {
      id: "titration-idea",
      heading: "The titration idea, in one paragraph",
      body: [
        "GLP-1 receptor agonists (and the dual GIP/GLP-1 agonist tirzepatide) commonly cause nausea when the dose jumps too fast. Prescribing information therefore uses a climb: a low starting dose, then stepwise increases until a labeled maintenance range is reached. Diet and activity remain part of labeled use for weight-management products. This article is a map of those labeled patterns, not a dosing calculator and not medical advice.",
        "A licensed clinician must prescribe these medicines. Beema Health does not sell Ozempic, Wegovy, Zepbound, Mounjaro, or Saxenda. Completing telehealth intake does not guarantee a prescription. No weight-loss result is guaranteed.",
      ],
    },
    {
      id: "weekly-schedules",
      heading: "Typical weekly injection schedules (labeled products)",
      body: [
        "Wegovy injection starts at 0.25 mg weekly and steps every four weeks through 0.5, 1, and 1.7 mg toward a recommended 2.4 mg maintenance (1.7 mg is also a maintenance option; additional adult options appear on the current label). Ozempic, a diabetes product, starts at 0.25 mg then 0.5 mg, with possible later 1 mg and 2 mg steps for glycemic control - a different ceiling and a different indication.",
        "Zepbound starts at 2.5 mg weekly for four weeks (initiation only), then 5 mg, with 2.5 mg increments to a maximum of 15 mg. Weight-reduction maintenance is 5, 10, or 15 mg; OSA maintenance is 10 or 15 mg. Mounjaro uses a similar tirzepatide ladder for type 2 diabetes, not as a weight-management brand.",
        "Product-specific articles (Wegovy dosing, Zepbound dosing) list the tables. Do not mix Wegovy milligrams with Zepbound milligrams. 2.4 mg of semaglutide is not 'equal' to 2.5 mg of tirzepatide.",
      ],
    },
    {
      id: "daily-and-oral",
      heading: "Daily injection and oral GLP-1 schedules",
      body: [
        "Saxenda (liraglutide) is injected every day, climbing weekly from 0.6 mg to 3 mg. That daily burden is the main practical difference from weekly pens, aside from the different molecule and trial program (SCALE versus STEP or SURMOUNT).",
        "Wegovy tablets are taken once daily in the morning with strict fasting and water-only rules, escalating every 30 days from 1.5 mg to 4 mg to 9 mg to 25 mg. Oral semaglutide for diabetes (Rybelsus) is a different labeled product. Investigational once-daily pills such as orforglipron are not FDA-approved GLP-1 dosing schedules to copy.",
      ],
    },
    {
      id: "who-sets-the-dose",
      heading: "Who sets the dose - and what 'hold' means",
      body: [
        "The prescriber sets the dose using the indication, other medicines (especially insulin or sulfonylureas), kidney and gastrointestinal history, and how the last step felt. 'Hold at this pen for another month' is a common, labeled-style response to nausea. 'Stay at the starter dose forever because a forum said so' is not.",
        "People with type 2 diabetes need a plan for glucose if a weight-management product is added or if a diabetes GLP-1 is stopped. Surgery and anesthesia teams need to know about delayed gastric emptying. Pregnancy planning requires stopping well before conception for long-acting semaglutide products, per those labels.",
      ],
    },
    {
      id: "missed-doses-and-errors",
      heading: "Missed doses, extra doses, and unsafe workarounds",
      body: [
        "Each Medication Guide states how late a weekly dose may still be taken. Doubling up to 'make up' a month of missed pens is not a labeled recovery plan and raises gastrointestinal and hypoglycemia risk in people on insulin.",
        "Counting clicks to create unofficial micro-doses, sharing pens, or buying research vials is unsafe. See microdosing GLP-1 for why those trends are not a clinical protocol. If cost or supply is the barrier, that is an access conversation with the clinic, not a reason to improvise sterile compounding at home.",
      ],
    },
    {
      id: "maintenance-link",
      heading: "After titration: maintenance, switching, stopping",
      body: [
        "Once a tolerated maintenance dose is reached, many people stay there for as long as benefit and safety support continued use. Withdrawal trials (STEP 4, SURMOUNT-4) show that stopping often leads to weight regain. That is covered in GLP-1 maintenance dose, stopping GLP-1, and rebound weight gain articles.",
        "Switching between branded weekly products is a new prescription, not a milligram conversion chart. See switching GLP-1 medications. If you want to understand Beema Health's telehealth medical weight-loss visit, use the program overview. That link is not a branded-drug order form.",
      ],
    },
  ],
  ctaId: "learn_initial_research",
};
