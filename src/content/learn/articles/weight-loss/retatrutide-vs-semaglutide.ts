import type { LearnArticle } from "../../types";

const DATE = "2026-08-24";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "retatrutide-vs-semaglutide",
  title: "Retatrutide vs Semaglutide: Trial Context, Not a Winner",
  h1: "Retatrutide versus semaglutide: different stages of evidence",
  description:
    "Compare retatrutide's investigational triple-agonist data with published semaglutide obesity trials. Retatrutide is not a Beema Health offering today.",
  keywords: [
    "retatrutide vs semaglutide",
    "triple agonist vs GLP-1",
    "STEP 1",
    "TRIUMPH trials",
    "investigational vs approved",
    "glp 1 drugs for weight loss",
  ],
  cluster: "pipeline",
  relatedSlugs: [
    "retatrutide",
    "retatrutide-vs-ozempic",
    "semaglutide-weight-loss",
    "orforglipron-vs-semaglutide",
    "wegovy",
    "glp-1-for-weight-loss",
    "best-glp-1-for-weight-loss",
    "glp-1-side-effects",
  ],
  moneyPageHrefs: ["/weight-loss", "/semaglutide", "/tirzepatide"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "Jastreboff AM, et al. Triple-Hormone-Receptor Agonist Retatrutide for Obesity - A Phase 2 Trial. N Engl J Med. 2023.",
      href: "https://doi.org/10.1056/NEJMoa2301972",
    },
    {
      label:
        "Wilding JPH, et al. Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1). N Engl J Med. 2021;384(11):989-1002.",
      href: "https://doi.org/10.1056/NEJMoa2032183",
    },
    {
      label:
        "Lincoff AM, et al. Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT). N Engl J Med. 2023.",
      href: "https://doi.org/10.1056/NEJMoa2307563",
    },
    {
      label:
        "Eli Lilly. TRIUMPH-2 and TRIUMPH-3 topline results and planned Q1 2027 BLA. July 23, 2026.",
      href: "https://www.prnewswire.com/news-releases/lillys-triple-agonist-retatrutide-successful-in-two-additional-phase-3-obesity-trials-delivering-significant-improvements-in-weight-and-a1c-302832674.html",
    },
  ],
  faqs: [
    {
      question: "Is retatrutide better than semaglutide?",
      answer:
        "There is no head-to-head, peer-reviewed trial that lets a reader declare a personal winner. Phase 2 retatrutide produced a large mean weight change at 12 mg (about 24.2% at 48 weeks). STEP 1 produced about 14.9% mean change with semaglutide 2.4 mg at 68 weeks. Different durations, estimands, and populations make slogan comparisons misleading. Semaglutide also has a completed cardiovascular-outcomes trial in people with obesity (SELECT). Retatrutide's outcomes package is still unfolding. A licensed clinician matches a medicine to a person, and retatrutide is not FDA-approved as of August 2026.",
    },
    {
      question: "Can I get retatrutide from Beema Health while I wait?",
      answer:
        "No. Beema Health does not offer retatrutide. If a clinician at Beema Health prescribes anything after intake, it would be compounded semaglutide or compounded tirzepatide when legally available and appropriate - not an investigational triple agonist. Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate. Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate. Prescribing is never guaranteed.",
    },
    {
      question: "Is Wegovy the same as the semaglutide in this comparison?",
      answer:
        "Wegovy is the FDA-approved semaglutide 2.4 mg product for chronic weight management. Ozempic is semaglutide labeled for type 2 diabetes at different doses. STEP 1 used 2.4 mg weekly, the obesity-trial dose. Do not assume diabetes-dose semaglutide matches STEP 1 means.",
    },
    {
      question: "Why do retatrutide percentages look higher?",
      answer:
        "Triple agonism (GIP, GLP-1, glucagon) is designed to add energy-expenditure and appetite effects. Phase 2 and company-reported TRIUMPH figures are impressive and still not a substitute for an approved label. Higher means can come with more gastrointestinal effects and heart-rate changes that regulators will scrutinize.",
    },
    {
      question: "Should I delay care until retatrutide is approved?",
      answer:
        "That is a personal clinical decision. Lilly has discussed a Q1 2027 U.S. filing, which would put any decision well after that date. Semaglutide already has years of labeled use. Waiting has opportunity costs if obesity-related disease is progressing. Discuss timing with a licensed provider rather than a forum countdown.",
    },
    {
      question: "Does this page say compounded semaglutide beats retatrutide?",
      answer:
        "No. This page does not rank Beema Health products against investigational drugs and does not claim compounding is superior. It explains evidence stages so readers do not buy gray-market retatrutide or abandon indicated care based on a rumor.",
    },
  ],
  sections: [
    {
      id: "frame",
      heading: "Compare evidence stages, not Instagram winners",
      body: [
        "Semaglutide is a GLP-1 receptor agonist with completed Phase 3 obesity trials, FDA-approved branded products for diabetes and chronic weight management, and a cardiovascular-outcomes trial in people with overweight or obesity and established heart disease. Retatrutide is a GIP, GLP-1, and glucagon triple agonist that remains investigational in the United States as of August 2026. Lilly has reported Phase 3 TRIUMPH toplines and plans a Q1 2027 application. Those are not the same regulatory category.",
        "This article is educational, not medical advice. It does not name a best drug for you. It does not claim Beema Health's compounded semaglutide is better than retatrutide or better than Wegovy. Beema Health does not currently offer retatrutide.",
      ],
    },
    {
      id: "mechanisms",
      heading: "One receptor versus three",
      body: [
        "Semaglutide occupies the GLP-1 receptor. That is enough to reduce energy intake substantially in STEP trials. Retatrutide adds GIP and glucagon receptor activity. Researchers hope the extra glucagon signaling increases energy expenditure. Extra receptors also mean extra things to monitor, including pulse rate in Phase 2.",
        "Mechanism diagrams are not dosing instructions. Nobody should stack unregulated glucagon agonists onto semaglutide to 'simulate retatrutide.'",
      ],
    },
    {
      id: "numbers",
      heading: "Numbers you can cite without pretending they are head-to-head",
      body: [
        "STEP 1 (Wilding et al., 2021): adults with overweight or obesity without diabetes, semaglutide 2.4 mg versus placebo for 68 weeks, mean body-weight change about 14.9% versus 2.4%. Gastrointestinal events were common. SELECT later showed fewer major cardiovascular events with semaglutide 2.4 mg in a high-risk obesity population without diabetes.",
        "Retatrutide Phase 2 (Jastreboff et al., 2023): 48 weeks, 12 mg dose mean change about 24.2% versus 2.1% placebo. TRIUMPH-3 company release (July 2026): 12 mg mean 22.6% at 80 weeks versus 3.2% placebo in severe obesity with cardiovascular disease. Those TRIUMPH figures were topline at announcement; peer-reviewed full papers were still pending.",
        "You cannot subtract 14.9 from 24.2 and call the difference 'how much better retatrutide is for me.' Duration, diet run-in, diabetes status, and dropout handling all differ.",
      ],
    },
    {
      id: "safety",
      heading: "Safety files are not the same length",
      body: [
        "Semaglutide's labeled risks - gastrointestinal effects, gallbladder disease, pancreatitis warnings, pregnancy avoidance, and the rodent thyroid C-cell boxed warning on obesity products - are documented in FDA prescribing information. Retatrutide will need its own label if approved. Phase 2 already described dose-related GI effects and heart-rate increases. Unknowns remain around long-term cardiovascular outcomes for the triple agonist.",
        "Unregulated 'retatrutide' vials have no label at all. That is the worst of both worlds.",
      ],
    },
    {
      id: "access",
      heading: "What you can be prescribed today",
      body: [
        "A U.S. clinician can prescribe FDA-approved semaglutide products when indicated, or other approved obesity medicines. Beema Health's cash-pay telehealth program may offer compounded semaglutide or compounded tirzepatide after independent review. Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate. Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate. Retatrutide is none of those channels except a sponsored trial.",
        "If your question is 'which molecule has more Phase 3 obesity plus CV data today,' the answer is semaglutide. If your question is 'which investigational mean looks larger,' retatrutide's early figures are larger and unfinished. Neither sentence tells Beema Health to call compounded semaglutide the winner.",
      ],
    },
    {
      id: "decision",
      heading: "A decision framework that stays honest",
      body: [
        "Write down your constraints: diabetes or not, heart disease or not, injection willingness, pregnancy plans, cost, and how long you can wait. Bring that list to a licensed provider. If you use Beema Health, complete intake accurately. A prescription is never guaranteed.",
        "For more on the investigational drug itself, read the retatrutide explainer. For branded diabetes-dose semaglutide, read the Ozempic education page. For how clinicians compare several GLP-1-class options, read 'best GLP-1 for weight loss' as a process article, not a trophy.",
      ],
    },
  ],
  ctaId: "learn_sema_vs_tirz",
};
