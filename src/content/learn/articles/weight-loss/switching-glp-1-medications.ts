import type { LearnArticle } from "../../types";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "switching-glp-1-medications",
  title: "Switching GLP-1 Medications: What Clinicians Weigh",
  h1: "Switching GLP-1 medications: labeled facts, not a conversion chart",
  description:
    "Switching GLP-1 medicines is a new prescription. There is no official milligram swap. See why people switch, SURMOUNT-5 context, washout, and safety steps.",
  keywords: [
    "switching glp-1 medications",
    "switching from wegovy to zepbound",
    "switching glp-1",
    "change glp-1 medication",
    "ozempic to wegovy",
    "mounjaro to zepbound",
    "glp-1 conversion",
  ],
  cluster: "switching-stopping",
  relatedSlugs: [
    "switching-from-zepbound-to-wegovy",
    "switching-from-wegovy-to-zepbound",
    "wegovy",
    "zepbound",
    "mounjaro",
    "ozempic",
    "glp-1-dosing",
    "glp-1-side-effects",
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
      label:
        "Aronne LJ, et al. Tirzepatide as compared with semaglutide for the treatment of obesity (SURMOUNT-5). N Engl J Med. 2025.",
      href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2416394",
    },
    {
      label: "Ozempic (semaglutide) U.S. Prescribing Information",
      href: "https://www.novo-pi.com/ozempic.pdf",
    },
  ],
  faqs: [
    {
      question:
        "Is there an official chart to convert Wegovy milligrams to Zepbound milligrams?",
      answer:
        "No. FDA labels do not provide a milligram-for-milligram conversion between semaglutide and tirzepatide, or between daily liraglutide and weekly products. A switch is a new prescribing decision. Online calculators that claim a universal equivalent are not a substitute for a clinician.",
    },
    {
      question: "Why do people switch GLP-1 medicines?",
      answer:
        "Common reasons include gastrointestinal intolerance, plateau, a new labeled indication (for example OSA on Zepbound, cardiovascular outcomes on Wegovy in SELECT-eligible adults), supply, a change from a diabetes brand (Ozempic or Mounjaro) to a weight-management brand (Wegovy or Zepbound), or the opposite when diabetes care is the priority. Each reason has a different risk if the old medicine is stopped abruptly.",
    },
    {
      question: "Can I take two GLP-1 brands at once during a switch?",
      answer:
        "Using two GLP-1 receptor agonists together is generally not recommended on product labels (Saxenda, for example, says not to combine with other GLP-1 receptor agonists). Overlapping full maintenance doses can worsen nausea, vomiting, and hypoglycemia risk when insulin is also used. Any overlap window belongs to the prescriber.",
    },
    {
      question: "Did a trial compare Zepbound with Wegovy?",
      answer:
        "SURMOUNT-5 compared maximum tolerated tirzepatide (10 or 15 mg) with maximum tolerated semaglutide (1.7 or 2.4 mg) for 72 weeks in adults with obesity without diabetes. Mean weight change was about -20.2% with tirzepatide and -13.7% with semaglutide. That is a population average in an open-label trial, not a rule that every individual must switch, and not a ranking of which medicine is 'best' for a given person.",
    },
    {
      question: "Does Beema Health switch people off branded GLP-1s?",
      answer:
        "Beema Health does not dispense Ozempic, Wegovy, Zepbound, Mounjaro, or Saxenda. If you already take one of those medicines, say so on any new intake so a licensed provider can review history. Completing a visit does not guarantee a prescription or a continuation of a prior brand.",
    },
    {
      question: "Should I stop one GLP-1 and start another the same day?",
      answer:
        "Timing depends on the two products' half-lives, current doses, glucose medicines, and side effects. Semaglutide stays in the body for weeks. There is no one-size same-day protocol on the labels for switching across manufacturers. Ask the clinician who will write the new prescription.",
    },
  ],
  sections: [
    {
      id: "not-a-generic-swap",
      heading: "A switch is a new prescription, not a generic substitution",
      body: [
        "Ozempic, Wegovy, Wegovy tablets, Rybelsus, Saxenda, Victoza, Mounjaro, and Zepbound are different FDA-approved products even when two of them share a molecule. Pharmacies cannot treat them as automatic substitutes. Insurance formularies (when a person uses insurance elsewhere) and cash-pay access also differ. This page does not claim Beema Health bills insurance or dispenses those brands.",
        "Educational only. Not medical advice. Prescription required. Completing telehealth intake does not guarantee any medicine. No weight-loss outcome is guaranteed. Beema Health does not sell the branded products named here.",
      ],
    },
    {
      id: "same-molecule-different-brand",
      heading: "Same molecule, different brand",
      body: [
        "Weekly semaglutide for type 2 diabetes (Ozempic) is not labeled as chronic weight management. Weekly semaglutide for weight management and related uses (Wegovy) has different strengths and trials. Oral semaglutide for diabetes (Rybelsus) is not the Wegovy pill. Daily liraglutide for diabetes (Victoza) is not Saxenda.",
        "Weekly tirzepatide for type 2 diabetes (Mounjaro) is not Zepbound. Clinicians sometimes change brands when the indication changes (diabetes versus weight versus OSA). That still requires a new prescription and a new counseling session on devices and missed-dose rules.",
      ],
    },
    {
      id: "different-molecules",
      heading: "Different molecules: semaglutide, tirzepatide, liraglutide",
      body: [
        "Semaglutide is a GLP-1 receptor agonist. Tirzepatide is a dual GIP and GLP-1 receptor agonist. Liraglutide is a shorter-acting daily GLP-1 receptor agonist. Head-to-head obesity data exist for tirzepatide versus semaglutide in SURMOUNT-5, not a complete round-robin of every brand.",
        "Gastrointestinal effects overlap. Switching because of nausea can still produce nausea on the next product. Switching because of a plateau may or may not change the trajectory; behavior, sleep, other medicines, and the labeled dose reached all matter.",
      ],
    },
    {
      id: "practical-safety",
      heading: "Practical safety during a switch",
      body: [
        "Bring the exact name, dose, last injection date, and device to the visit. Do not start a new weekly pen the same morning as the old one unless instructed. People with type 2 diabetes need a glucose-monitoring plan; stopping Mounjaro or Ozempic without a replacement can raise A1C.",
        "Watch for dehydration if both medicines' gastrointestinal effects stack. Seek care for severe abdominal pain. Tell anesthesia teams about any recent GLP-1 use. Pregnancy planning still requires stopping long-acting semaglutide well in advance per those labels.",
      ],
    },
    {
      id: "injection-to-tablet",
      heading: "Injection to tablet inside the Wegovy family",
      body: [
        "The Wegovy label does describe clinician-directed switches between 2.4 mg weekly injection and 25 mg daily tablets, with specified timing. That is the exception: same brand family, written in the PI. It is not a template for converting Zepbound 15 mg into a Wegovy tablet.",
        "Details are in the Wegovy pill article. Follow the current prescribing information, not a screenshot of an older table.",
      ],
    },
    {
      id: "next-reads",
      heading: "Product-specific switch pages and Beema Health",
      body: [
        "For Zepbound to Wegovy and Wegovy to Zepbound, see the dedicated articles in this cluster. They use labeled facts and SURMOUNT-5 averages without declaring a winner for every patient.",
        "If you are exploring telehealth medical weight loss, Beema Health's program overview explains how licensed providers review intake. Mention any current GLP-1 so the review is informed. That is not a request to stop a medicine without the clinician who will manage the change.",
      ],
    },
  ],
  ctaId: "learn_initial_research",
};
