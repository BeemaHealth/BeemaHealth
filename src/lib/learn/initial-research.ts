/**
 * Shared copy for /learn/initial-research. FAQ plain text must stay in sync
 * with the visible accordion (faqPageJsonLd consumes this array).
 */

export const INITIAL_RESEARCH_PATH = "/learn/initial-research/" as const;
export const INITIAL_RESEARCH_DATE_MODIFIED = "2026-08-03" as const;

export const INITIAL_RESEARCH_TITLE =
  "Traditional Weight Loss vs. GLP-1-Assisted Weight Loss" as const;

export const INITIAL_RESEARCH_DESCRIPTION =
  "An evidence-based educational guide comparing traditional lifestyle weight loss with GLP-1 medications, including trial data, lean-mass findings, regain after stopping, dosing overview, cost context, and FAQs." as const;

export type TocItem = { id: string; title: string };

export const INITIAL_RESEARCH_TOC: readonly TocItem[] = [
  { id: "traditional", title: "The Traditional Weight Loss Path" },
  { id: "glp1", title: "The GLP-1 Path: How It Works" },
  { id: "comparison", title: "Side-by-Side Comparison" },
  { id: "leanmass", title: "Muscle Preservation and Lean Mass" },
  { id: "regain", title: "What Happens After Stopping: Weight Regain" },
  { id: "dosing", title: "Drug and Dose Overview (Educational Only)" },
  { id: "cost", title: "Cost Comparison" },
  { id: "faq", title: "Frequently Asked Questions" },
  { id: "references", title: "References" },
] as const;

export const INITIAL_RESEARCH_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "Who is eligible for GLP-1 weight-management medication?",
    a: "FDA indicates adults with a BMI ≥30, or BMI ≥27 with at least one weight-related comorbidity (examples named in labeling include hypertension, type 2 diabetes, dyslipidemia, obstructive sleep apnea, and cardiovascular disease). Eligibility, contraindications, and appropriateness are determined by a licensed provider, not by any calculator or marketing page.",
  },
  {
    q: "What are the common side effects?",
    a: "Gastrointestinal effects are most common and usually mild-to-moderate. In pooled STEP 1-3 data, nausea occurred in 43.9% of the semaglutide group (vs. 16.1% placebo), diarrhea 29.7%, vomiting 24.5%, and constipation 24.2%; 99.5% of GI events were non-serious, and 4.3% of patients permanently discontinued due to GI events. In SURMOUNT-1, nausea ranged from 24.6% to 33.3% depending on dose, with GI-related discontinuation under about 8%. GLP-1 medications carry a boxed warning for thyroid C-cell tumors (based on rodent data; no confirmed human causation) and are contraindicated in people with a personal or family history of medullary thyroid carcinoma or MEN 2. Rarer risks include pancreatitis and gallbladder events. Any symptoms should be discussed promptly with a provider.",
  },
  {
    q: "How do compounded medications differ from brand-name?",
    a: "Compounded drugs are prepared by pharmacies rather than manufactured and FDA-approved as finished products. They have not undergone FDA review for safety, effectiveness, or quality and are not therapeutically equivalent to branded products, even when they use the same active ingredient.",
  },
  {
    q: "How does telehealth prescribing work?",
    a: "A licensed provider reviews the patient's medical history and eligibility (often through an asynchronous online intake), determines whether treatment is clinically appropriate, and (if so) may issue a prescription that is fulfilled by a licensed pharmacy partner. Beema Health does not practice medicine, prescribe, or dispense medication; those functions rest entirely with independent licensed providers and pharmacies.",
  },
  {
    q: 'Is one medication "better" than another?',
    a: "In the SURMOUNT-5 head-to-head trial, tirzepatide produced greater average weight loss than semaglutide (20.2% vs. 13.7%) and had a lower GI-related discontinuation rate. However, averages are not individual outcomes, and the most appropriate medication for any person (including whether medication is appropriate at all) is a clinical decision.",
  },
];

export type InitialResearchReference = {
  /** Citation text shown on the page. */
  label: string;
  /** External URL opened in a new tab. Prefer DOI or official primary sources. */
  href: string;
};

export const INITIAL_RESEARCH_REFERENCES: readonly InitialResearchReference[] =
  [
    {
      label:
        "Centers for Disease Control and Prevention. Steps for Losing Weight / Losing Weight. cdc.gov.",
      href: "https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html",
    },
    {
      label:
        "Jensen MD, Ryan DH, Apovian CM, et al. 2013 AHA/ACC/TOS Guideline for the Management of Overweight and Obesity in Adults. Circulation. 2014;129(25 Suppl 2):S102-S138.",
      href: "https://doi.org/10.1161/01.cir.0000437739.71477.ee",
    },
    {
      label:
        "Gardner CD, Trepanowski JF, Del Gobbo LC, et al. Effect of Low-Fat vs Low-Carbohydrate Diet on 12-Month Weight Loss (DIETFITS). JAMA. 2018;319(7):667-679.",
      href: "https://doi.org/10.1001/jama.2018.0245",
    },
    {
      label:
        "Look AHEAD Research Group. Eight-year weight losses with an intensive lifestyle intervention: the Look AHEAD study. Obesity (Silver Spring). 2014;22(1):5-13.",
      href: "https://doi.org/10.1002/oby.20662",
    },
    {
      label:
        "Sardeli AV, et al. Resistance Training Prevents Muscle Loss Induced by Caloric Restriction in Obese Elderly Individuals: A Systematic Review and Meta-Analysis. Nutrients. 2018.",
      href: "https://doi.org/10.3390/nu10080960",
    },
    {
      label:
        "Mechanisms of GLP-1 Receptor Agonist-Induced Weight Loss: A Review of Central and Peripheral Pathways. The American Journal of Medicine. 2025.",
      href: "https://doi.org/10.1016/j.amjmed.2025.01.021",
    },
    {
      label:
        "Wilding JPH, Batterham RL, Calanna S, et al. Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1). N Engl J Med. 2021;384(11):989-1002.",
      href: "https://doi.org/10.1056/NEJMoa2032183",
    },
    {
      label:
        "Garvey WT, et al. Two-year effects of semaglutide in adults with overweight or obesity (STEP 5). Nature Medicine. 2022.",
      href: "https://doi.org/10.1038/s41591-022-02026-4",
    },
    {
      label:
        "Jastreboff AM, Aronne LJ, Ahmad NN, et al. Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1). N Engl J Med. 2022.",
      href: "https://doi.org/10.1056/NEJMoa2206038",
    },
    {
      label:
        "Aronne LJ, Horn DB, le Roux CW, et al. Tirzepatide as Compared with Semaglutide for the Treatment of Obesity (SURMOUNT-5). N Engl J Med. 2025;393(1):26-36.",
      href: "https://doi.org/10.1056/NEJMoa2416394",
    },
    {
      label:
        "Wilding JPH, et al. Weight regain and cardiometabolic effects after withdrawal of semaglutide: the STEP 1 trial extension. Diabetes, Obesity and Metabolism. 2022.",
      href: "https://doi.org/10.1111/dom.14725",
    },
    {
      label:
        "Rubino D, Abrahamsson N, Davies M, et al. Effect of Continued Weekly Subcutaneous Semaglutide vs Placebo on Weight Loss Maintenance (STEP 4). JAMA. 2021;325(14):1414-1425.",
      href: "https://doi.org/10.1001/jama.2021.3224",
    },
    {
      label:
        "Impact of Semaglutide on Body Composition in Adults With Overweight or Obesity: Exploratory Analysis of STEP 1. Journal of the Endocrine Society. 2021.",
      href: "https://doi.org/10.1210/jendso/bvab048.030",
    },
    {
      label:
        "Look M, et al. Body composition changes during weight reduction with tirzepatide (SURMOUNT-1 substudy). Diabetes, Obesity and Metabolism. 2025.",
      href: "https://doi.org/10.1111/dom.16275",
    },
    {
      label:
        "Effect of glucagon-like peptide-1 receptor agonists and co-agonists on body composition: Systematic review and network meta-analysis. Metabolism. 2024.",
      href: "https://doi.org/10.1016/j.metabol.2024.156113",
    },
    {
      label:
        "Prado CM, et al. Changes in lean body mass with GLP-1-based therapies and mitigation strategies. Diabetes, Obesity and Metabolism. 2024.",
      href: "https://doi.org/10.1111/dom.15728",
    },
    {
      label:
        "Aronne LJ, Sattar N, Horn DB, et al. Continued Treatment With Tirzepatide for Maintenance of Weight Reduction (SURMOUNT-4). JAMA. 2024;331(1):38-48.",
      href: "https://doi.org/10.1001/jama.2023.24945",
    },
    {
      label:
        "Horn DB, Linetzky B, Davies MJ, et al. Cardiometabolic Parameter Change by Weight Regain on Tirzepatide Withdrawal (SURMOUNT-4 post hoc analysis). JAMA Internal Medicine. 2026;186(2):157-167.",
      href: "https://doi.org/10.1001/jamainternmed.2025.6112",
    },
    {
      label:
        "Wegovy (semaglutide) injection: FDA Prescribing Information. Novo Nordisk (DailyMed / FDA labeling).",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ee06186f-2aa3-4990-a760-757579d8f77b",
    },
    {
      label: "GoodRx (2025), average U.S. gym-membership cost data.",
      href: "https://www.goodrx.com/healthcare-access/health-technology/average-cost-of-gym-membership",
    },
    {
      label:
        "Healthline: How Much Does a Dietitian Cost? (dietitian and meal-plan cost context).",
      href: "https://www.healthline.com/nutrition/how-much-does-a-dietitian-cost",
    },
    {
      label:
        "NovoCare Wegovy savings / self-pay information; LillyDirect Zepbound self-pay pricing.",
      href: "https://www.novocare.com/obesity/products/wegovy/letting-us-help.html",
    },
    {
      label:
        "U.S. Food and Drug Administration. Status of Compounded GLP-1 Drugs (compounding policy and warning-letter context).",
      href: "https://www.fda.gov/drugs/human-drug-compounding/status-compounded-glp-1-drugs",
    },
    {
      label:
        "U.S. Food and Drug Administration. Compounding and GLP-1 shortage-resolution determinations (2024-2026).",
      href: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-clarifies-policies-compounders-outsourcing-facilities-and-state-licensed-pharmacies",
    },
    {
      label:
        "FDA labeling and eligibility criteria (Wegovy, Zepbound); NIDDK overview of prescription medications to treat overweight and obesity.",
      href: "https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity",
    },
    {
      label:
        "Wharton S, et al. Gastrointestinal tolerability of once-weekly semaglutide 2.4 mg (STEP 1-3 pooled analysis). Diabetes, Obesity and Metabolism. 2022.",
      href: "https://doi.org/10.1111/dom.14683",
    },
    {
      label:
        "Eli Lilly / NEJM 2022 SURMOUNT-1 adverse-event data (Jastreboff et al.).",
      href: "https://doi.org/10.1056/NEJMoa2206038",
    },
  ];
