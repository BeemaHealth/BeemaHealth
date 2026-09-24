import type { LearnArticle } from "../../types";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "switching-from-zepbound-to-wegovy",
  title: "Switching From Zepbound to Wegovy: Labeled Facts Guide",
  h1: "Switching from Zepbound to Wegovy",
  description:
    "There is no FDA milligram conversion from Zepbound to Wegovy. See SURMOUNT-5 context, why people switch, timing, GI overlap, and what to tell a clinician.",
  keywords: [
    "switching from zepbound to wegovy",
    "zepbound to wegovy",
    "tirzepatide to semaglutide",
    "zepbound vs wegovy switch",
    "stop zepbound start wegovy",
    "glp-1 switch",
  ],
  cluster: "switching-stopping",
  relatedSlugs: [
    "switching-from-wegovy-to-zepbound",
    "switching-glp-1-medications",
    "zepbound",
    "wegovy",
    "zepbound-dosing",
    "wegovy-dosing",
    "glp-1-side-effects",
    "glp-1-maintenance-dose",
  ],
  moneyPageHrefs: ["/weight-loss"],
  datePublished: "2026-08-24",
  dateModified: "2026-08-24",
  sources: [
    {
      label: "Zepbound (tirzepatide) U.S. Prescribing Information, Eli Lilly",
      href: "https://pi.lilly.com/us/zepbound-uspi.pdf",
    },
    {
      label: "Wegovy (semaglutide) U.S. Prescribing Information, Novo Nordisk",
      href: "https://www.novo-pi.com/wegovy.pdf",
    },
    {
      label:
        "Aronne LJ, et al. Tirzepatide as compared with semaglutide for the treatment of obesity (SURMOUNT-5). N Engl J Med. 2025.",
      href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2416394",
    },
    {
      label:
        "Jastreboff AM, et al. Tirzepatide once weekly for the treatment of obesity (SURMOUNT-1). N Engl J Med. 2022.",
      href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2206038",
    },
  ],
  faqs: [
    {
      question: "Can I convert Zepbound 15 mg to Wegovy 2.4 mg one-for-one?",
      answer:
        "No. There is no official conversion. Tirzepatide and semaglutide have different mechanisms, half-lives, and labeled dose ladders. A clinician chooses a Wegovy starting or maintenance strength based on recent tirzepatide dose, side effects, other medicines, and how long it has been since the last Zepbound injection - not a public spreadsheet.",
    },
    {
      question: "Why would someone switch from Zepbound to Wegovy?",
      answer:
        "Reasons include supply of a tirzepatide pen, gastrointestinal intolerance at higher tirzepatide doses, a labeled Wegovy indication that matches the person (for example certain cardiovascular-risk uses after SELECT), device preference, or a clinic that only manages one product. None of those reasons makes Wegovy 'better' for every patient. SURMOUNT-5 found larger mean weight reduction with tirzepatide than with semaglutide in a specific trial population.",
    },
    {
      question: "Will I regain weight if I switch?",
      answer:
        "Possibly, especially if the new dose is much less effective for that individual, if there is a gap without either medicine, or if nausea on Wegovy cuts intake erratically. SURMOUNT-4 showed regain after stopping tirzepatide entirely. A switch is not the same as stopping, but a gap without coverage can look similar. Individual results vary. Nothing is guaranteed.",
    },
    {
      question: "Do I need to restart Wegovy at 0.25 mg?",
      answer:
        "Not always, and not never. People who have never used semaglutide may need the full Wegovy titration to limit gastrointestinal effects. People moving from a high tirzepatide dose still can have severe nausea if they jump to 2.4 mg semaglutide immediately. The prescriber decides. Do not start leftover Wegovy pens from a friend.",
    },
    {
      question: "Does Beema Health perform this switch?",
      answer:
        "Beema Health does not dispense Zepbound or Wegovy. This article is educational. If you use either brand through another clinician, keep that clinician in the loop. Completing a Beema Health online visit does not guarantee a prescription of any kind.",
    },
    {
      question: "What should I tell the new prescriber?",
      answer:
        "Last Zepbound dose and date, highest dose reached, side effects, other medicines (especially insulin or sulfonylureas), OSA or heart-disease history, and whether pregnancy is possible. Bring the pen or a photo of the box so the name is not confused with Mounjaro.",
    },
  ],
  sections: [
    {
      id: "two-products",
      heading: "Two different FDA-approved weekly injections",
      body: [
        "Zepbound is tirzepatide, a dual GIP and GLP-1 receptor agonist, labeled for chronic weight management and for moderate to severe OSA in adults with obesity. Wegovy is semaglutide, a GLP-1 receptor agonist, labeled for chronic weight management (injection, and tablets for specified adult uses) and for cardiovascular risk reduction in adults with established CVD plus overweight or obesity, among other labeled uses on the current PI.",
        "Switching is not a refill. It is a change of molecule, manufacturer, device, and missed-dose rules. This page is educational, not medical advice. Beema Health does not sell either brand. Prescription required. No weight-loss outcome is guaranteed.",
      ],
    },
    {
      id: "surmount-5-context",
      heading:
        "What SURMOUNT-5 does - and does not - tell a person who is switching",
      body: [
        "SURMOUNT-5 randomized adults with obesity without type 2 diabetes to maximum tolerated tirzepatide (10 or 15 mg) or maximum tolerated semaglutide (1.7 or 2.4 mg) for 72 weeks. Mean weight change was about -20.2% with tirzepatide and -13.7% with semaglutide. Gastrointestinal events were the most common adverse reactions in both groups.",
        "That trial enrolled people who were starting one of the two medicines, not people converting from a stable Zepbound 15 mg pen to Wegovy. It cannot predict how much weight a specific person will change after a switch. It also does not mean remaining on tirzepatide is always the right clinical choice when supply, side effects, or a Wegovy-specific indication dominate.",
      ],
    },
    {
      id: "no-conversion-table",
      heading: "There is no FDA conversion table",
      body: [
        "Do not use '15 mg Zepbound equals 2.4 mg Wegovy' as a medical fact. Receptor targets differ. Oral Wegovy milligrams are a third system and must not be mixed into the same arithmetic.",
        "Clinicians often consider how recently the last tirzepatide dose was given (tirzepatide's half-life is about five days), current gastrointestinal symptoms, and whether to enter Wegovy at a titration step versus a higher labeled strength. Those are professional judgments. This article will not publish a homemade chart that could be copied unsafely.",
      ],
    },
    {
      id: "practical-steps",
      heading: "Practical steps people actually need",
      body: [
        "Do not inject both products at maintenance doses in the same week unless a clinician has given a specific overlap plan. Labels generally discourage combining GLP-1 receptor agonists.",
        "If type 2 diabetes is also present, remember Zepbound is not Mounjaro. Glucose monitoring still matters if you were relying on tirzepatide's glycemic effect. Wegovy has its own hypoglycemia warnings when combined with insulin or sulfonylureas.",
        "If OSA was the reason for Zepbound, ask whether Wegovy is being used only for weight or whether another OSA therapy (including PAP) must stay in place. Wegovy does not carry Zepbound's OSA indication.",
      ],
    },
    {
      id: "safety",
      heading: "Shared class risks still apply",
      body: [
        "Both products have boxed warnings for rodent thyroid C-cell tumors and contraindications in MTC and MEN 2. Pancreatitis, gallbladder disease, dehydration, severe gastrointestinal reactions, and anesthesia aspiration risk remain relevant on the new medicine.",
        "Seek urgent care for severe persistent abdominal pain or anaphylaxis. Restarting titration after a long gap may be safer than jumping to 2.4 mg if several Wegovy weeks were missed later on.",
      ],
    },
    {
      id: "beema",
      heading: "Beema Health",
      body: [
        "Beema Health does not offer a branded Zepbound-to-Wegovy switching service. If you are exploring telehealth medical weight loss, the program overview explains intake and provider review. Tell any clinician the truth about the last tirzepatide dose. Completing a visit does not guarantee a prescription.",
      ],
    },
  ],
  ctaId: "learn_initial_research",
};
