/**
 * Shared copy for /learn/semaglutide-vs-tirzepatide. FAQ plain text must
 * stay in sync with the visible accordion (faqPageJsonLd consumes this
 * array). All trial figures are reused verbatim from the already-published
 * /learn/initial-research guide - no new clinical claims are introduced
 * here, only a dedicated, comparison-focused presentation of the same data.
 *
 * Not clinician-reviewed, by design - the page carries a permanent visible
 * disclaimer instead (see the route file). If new figures are ever added
 * here that don't already appear on /learn/initial-research, get those
 * reviewed first.
 */

export const SEMA_VS_TIRZ_PATH = "/learn/semaglutide-vs-tirzepatide/" as const;
export const SEMA_VS_TIRZ_DATE_MODIFIED = "2026-08-17" as const;

export const SEMA_VS_TIRZ_TITLE =
  "Semaglutide vs. Tirzepatide: Trial Data & Cost" as const;

export const SEMA_VS_TIRZ_DESCRIPTION =
  "A cited, side-by-side comparison of semaglutide and tirzepatide for weight loss: mechanism, head-to-head trial results, side-effect rates, dosing, and cost. Educational only, not medical advice." as const;

export type SemaVsTirzTocItem = { id: string; title: string };

export const SEMA_VS_TIRZ_TOC: readonly SemaVsTirzTocItem[] = [
  { id: "answer", title: "Quick Answer" },
  { id: "mechanism", title: "How Each Drug Works" },
  { id: "head-to-head", title: "Head-to-Head Trial: SURMOUNT-5" },
  { id: "individual-trials", title: "Individual Pivotal Trials" },
  { id: "side-effects", title: "Side-Effect Profile" },
  { id: "dosing", title: "Dosing and Administration" },
  { id: "cost", title: "Cost Comparison" },
  { id: "choosing", title: "Which One Is Right for You?" },
  { id: "faq", title: "Frequently Asked Questions" },
  { id: "references", title: "References" },
] as const;

export const SEMA_VS_TIRZ_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "Is tirzepatide more effective than semaglutide?",
    a: "In the SURMOUNT-5 head-to-head trial, tirzepatide produced greater average weight loss than semaglutide (20.2% vs. 13.7% at 72 weeks, P<0.001) and had a lower rate of GI-related discontinuation. That trial was open-label and industry-funded, and it is the only randomized head-to-head comparison. Averages describe trial populations, not individuals - the most appropriate medication for any one person, including whether medication is appropriate at all, is a clinical decision made by a licensed provider.",
  },
  {
    q: "What's the main difference between semaglutide and tirzepatide?",
    a: "Semaglutide is a GLP-1 receptor agonist. Tirzepatide is a dual agonist that activates both the GLP-1 receptor and the GIP receptor, a second incretin pathway. That dual mechanism is thought to contribute to tirzepatide's larger average weight-loss effect in trials, though both drugs work primarily by reducing appetite and slowing gastric emptying rather than by directly increasing metabolism.",
  },
  {
    q: "Do semaglutide and tirzepatide have different side effects?",
    a: "Both are associated primarily with gastrointestinal side effects - nausea, diarrhea, vomiting, and constipation - most common during dose titration. In pooled STEP 1-3 data, nausea occurred in 43.9% of the semaglutide group vs. 16.1% placebo. In SURMOUNT-1, nausea ranged from 24.6% to 33.3% depending on dose. Both carry an FDA boxed warning for thyroid C-cell tumors (based on rodent data, not confirmed in humans) and are contraindicated with a personal or family history of medullary thyroid carcinoma or MEN 2.",
  },
  {
    q: "Which is cheaper, semaglutide or tirzepatide?",
    a: "Brand list prices are broadly similar (Wegovy roughly $1,349/28-day package; Zepbound roughly $1,086/month), though both offer manufacturer cash-pay programs at lower prices for eligible self-pay patients. Compounded versions, when clinically appropriate and legally available, are typically the lowest-cost cash-pay option - see the cost section below for current Beema Health pricing on both.",
  },
  {
    q: "Can I switch from semaglutide to tirzepatide, or the other way around?",
    a: "That is a clinical decision that depends on individual response, tolerability, and medical history. It is not something to decide from a comparison page - talk to a licensed provider about whether switching medications makes sense for your situation.",
  },
];

export type SemaVsTirzReference = {
  /** Citation text shown on the page. */
  label: string;
  /** External URL opened in a new tab. Prefer DOI or official primary sources. */
  href: string;
};

/**
 * Subset of citations already used and reviewed on /learn/initial-research,
 * renumbered for this page's own reference list. Keep figures identical to
 * that page - do not introduce new unreviewed statistics here.
 */
export const SEMA_VS_TIRZ_REFERENCES: readonly SemaVsTirzReference[] = [
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
] as const;
