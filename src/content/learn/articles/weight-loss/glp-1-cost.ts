import type { LearnArticle } from "../../types";
import {
  learnDualMedTeaserSentence,
  learnSemaCashPayFaqAnswer,
  learnTirzCashPayFaqAnswer,
} from "@/lib/learn-pricing-copy";
import { FIRST_MONTH_PROMO_LINE } from "@/lib/marketing-copy";
import { LEARN_CLINICIAN_RX_SENTENCE } from "@/lib/learn-trust-copy";

const DATE = "2026-08-24";

export const article: LearnArticle = {
  vertical: "weight-loss",
  slug: "glp-1-cost",
  title: "GLP-1 Cost: Cash-Pay Telehealth Pricing, Explained Honestly",
  h1: "What GLP-1 treatment costs with cash-pay telehealth",
  description:
    "Cash-pay telehealth GLP-1 programs charge a bundled monthly rate. See what Beema Health bills for compounded semaglutide and tirzepatide - no insurance math.",
  keywords: [
    "glp 1 cost",
    "cash pay GLP-1",
    "semaglutide cost telehealth",
    "tirzepatide cost",
    "glp 1 weight loss program",
    "compounded GLP-1 price",
  ],
  cluster: "programs-local",
  relatedSlugs: [
    "glp-1-weight-loss-program",
    "online-glp-1",
    "glp-1-for-weight-loss",
    "semaglutide-weight-loss",
    "tirzepatide-online",
    "glp-1-doctor",
    "best-glp-1-for-weight-loss",
    "glp-1-dosing",
  ],
  moneyPageHrefs: ["/weight-loss", "/semaglutide", "/tirzepatide", "/glp-1"],
  datePublished: DATE,
  dateModified: DATE,
  sources: [
    {
      label:
        "Beema Health live cash-pay rates are maintained in medication pricing on /semaglutide and /tirzepatide (provider care, medication, supplies, expedited shipping; no membership fee).",
      href: "https://beemahealth.com/semaglutide/",
    },
    {
      label:
        "NIDDK. Prescription obesity medications: cost and coverage vary; cash-pay programs exist separately from insurance benefit design.",
      href: "https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity",
    },
    {
      label:
        "U.S. Food and Drug Administration. FDA's concerns with unapproved GLP-1 drugs used for weight loss.",
      href: "https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss",
    },
    {
      label:
        "Wilding JPH, et al. Once-weekly semaglutide in adults with overweight or obesity (STEP 1). N Engl J Med. 2021. Efficacy evidence is not a price list.",
      href: "https://doi.org/10.1056/NEJMoa2032183",
    },
  ],
  faqs: [
    {
      question: "How much does a GLP-1 cost at Beema Health?",
      answer: learnDualMedTeaserSentence(),
    },
    {
      question: "Does insurance cover Beema Health GLP-1s?",
      answer:
        "Beema Health's published model is cash-pay. This article will not estimate copays, deductibles, or prior-authorization odds. If you have coverage elsewhere, that is a conversation with your insurer and a clinician who bills insurance. Do not send Beema Health your insurance card through a marketing form.",
    },
    {
      question: "Why not show Ozempic list price next to Beema Health's price?",
      answer:
        "That layout is a branded-versus-compounded comparison. Beema Health's compounded products are not FDA-approved and are not Ozempic, Wegovy, Zepbound, or Mounjaro. This page will not build that table. Cash-pay telehealth programs exist; Beema Health's rates are on the medication pages.",
    },
    {
      question: "Is there a membership fee?",
      answer:
        "No separate platform membership fee. The listed monthly or prepaid rate is the commercial price for included care and product when prescribed.",
    },
    {
      question: "Do dose increases cost more?",
      answer:
        "Within the same compounded medication, dose adjustments do not change the monthly price in Beema Health's current model. Switching molecules is a new clinical decision.",
    },
    {
      question: "Do I pay before a clinician says yes?",
      answer:
        "You can start intake without paying. Payment, when it happens in checkout, is not a peptide pre-order and is not a guaranteed prescription. A licensed clinician still reviews your case and may decline to prescribe. Completing intake never guarantees a prescription. Beema Health serves adults in all 50 US states and only the United States.",
    },
  ],
  sections: [
    {
      id: "cash-pay-frame",
      heading: "Cash-pay means the number on the page is the number",
      body: [
        "Many U.S. adults pay for incretin therapy without running it through an obesity-drug insurance benefit. Cash-pay telehealth programs bundle clinician time, medication, supplies, and shipping into a monthly or prepaid rate so you are not reconciling five invoices. That model is what Beema Health publishes. It is not a claim that insurance never covers GLP-1s somewhere else, and this page will not do insurance math.",
        "This article is educational. The interactive plan selector on [compounded semaglutide](/semaglutide/) and [compounded tirzepatide](/tirzepatide/) is the live price UI. If those pages and this article ever disagree, trust the lockup.",
      ],
    },
    {
      id: "sema-rates",
      heading: "Compounded semaglutide cash-pay rates (Beema Health)",
      body: [learnSemaCashPayFaqAnswer()],
    },
    {
      id: "tirz-rates",
      heading: "Compounded tirzepatide cash-pay rates (Beema Health)",
      body: [learnTirzCashPayFaqAnswer()],
    },
    {
      id: "what-price-is-not",
      heading: "What these prices are not",
      body: [
        "They are not a medical-necessity argument. Lower cash price does not prove a compounded product is legally interchangeable with a brand. They are not Ozempic or Wegovy list prices. They are not a promise you will be prescribed anything. They are not research-peptide catalog prices, which you should not pay anyway.",
      ],
    },
    {
      id: "how-to-compare-programs",
      heading: "How to compare cash-pay programs without a brand table",
      body: [
        `Ask what is included. Ask whether refill shipping is extra. Ask whether labs are extra. Ask whether the quoted rate assumes a coupon that expires. Ask who the prescriber is. Beema Health's dual-medication teaser on marketing pages is ${FIRST_MONTH_PROMO_LINE}, with full math on the medication pages. Other clinics will quote other bundles. Compare bundles, not a screenshot of a manufacturer's list price.`,
      ],
    },
    {
      id: "next",
      heading: "Where to go next",
      body: [
        `For the program shape, read the [GLP-1 weight-loss program](/learn/weight-loss/glp-1-weight-loss-program/) article. For lawful online access, read [online GLP-1](/learn/weight-loss/online-glp-1/). For molecule evidence, read [semaglutide for weight loss](/learn/weight-loss/semaglutide-weight-loss/) and [tirzepatide online](/learn/weight-loss/tirzepatide-online/). When you want to start, use the [program overview](/weight-loss/), [compounded semaglutide](/semaglutide/), or [compounded tirzepatide](/tirzepatide/). ${LEARN_CLINICIAN_RX_SENTENCE}`,
      ],
    },
  ],
  ctaId: "weight_loss_hero",
};
