// Mock data for Beema Health marketing + qualify funnel (no backend yet).

import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
  dualCompoundedFaqPricingParagraph,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import {
  JURISDICTIONAL_NOTICE_BODY,
  JURISDICTIONAL_NOTICE_TITLE,
} from "@/lib/jurisdictional-notice";
import { partnerPharmacyFaqAnswer } from "@/lib/partner-pharmacy";
import {
  clinicalProviderGroupFaqAnswer,
  seanAroraFaqAnswer,
} from "@/lib/provider-info";
import { US_STATES } from "@/lib/us-states";

export const LAUNCH_STATES = [
  "California",
  "Texas",
  "Florida",
  "New York",
  "Illinois",
  "Pennsylvania",
  "Ohio",
  "Georgia",
  "North Carolina",
  "Arizona",
  "Washington",
] as const;

export { US_STATES } from "@/lib/us-states";
export type { UsStateName } from "@/lib/us-states";

export type Clinician = {
  id: string;
  name: string;
  credentials: string;
  role: string;
  bio: string;
  states: string;
  initials: string;
};

export const CLINICIANS: Clinician[] = [
  {
    id: "amara-osei",
    name: "Dr. Amara Osei",
    credentials: "MD, Internal Medicine",
    role: "Medical Director",
    bio: "Board-certified internist with 12 years in metabolic health. Amara believes weight care should be unhurried, judgment-free, and built around each person's real life.",
    states: "Licensed in CA, AZ, NV, WA, OR",
    initials: "AO",
  },
  {
    id: "daniel-reyes",
    name: "Daniel Reyes",
    credentials: "FNP-C, Family Nurse Practitioner",
    role: "Lead Clinician",
    bio: "Daniel focuses on GLP-1 onboarding and side-effect management. He's known for clear explanations and quick, thoughtful message replies.",
    states: "Licensed in TX, FL, GA, NC",
    initials: "DR",
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    credentials: "PA-C, Physician Associate",
    role: "Clinician",
    bio: "Priya works closely with patients switching providers, making sure dosing and refills stay safe and uninterrupted during the transition.",
    states: "Licensed in NY, IL, PA, OH",
    initials: "PS",
  },
];

export type PharmacyPartner = {
  name: string;
  detail: string;
  shipping: boolean;
  pickup: boolean;
  insurance: boolean;
  cashPay: boolean;
};

export const PHARMACY_PARTNERS: PharmacyPartner[] = [
  {
    name: "Beema Health Mail Pharmacy",
    detail:
      "Cold-chain shipping with tracking. 2–4 business days in launch states.",
    shipping: true,
    pickup: false,
    insurance: true,
    cashPay: true,
  },
  {
    name: "Regional Compounding Partner",
    detail:
      "Cash-pay options where clinically appropriate and legally permitted.",
    shipping: true,
    pickup: false,
    insurance: false,
    cashPay: true,
  },
  {
    name: "Local Retail Network",
    detail: "Pickup at participating local pharmacies for in-stock options.",
    shipping: false,
    pickup: true,
    insurance: true,
    cashPay: true,
  },
];

export type FaqItem = { q: string; a: string };
export type FaqGroup = { category: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    category: "Clinical providers",
    items: [
      {
        q: "Who provides Beema Health's clinical care?",
        a: clinicalProviderGroupFaqAnswer(),
      },
      {
        q: "Who is Dr. Sean Arora?",
        a: seanAroraFaqAnswer(),
      },
    ],
  },
  {
    category: "Pricing",
    items: [
      {
        q: "How much does Beema Health cost?",
        a: `${dualCompoundedFaqPricingParagraph()} We also send a reminder before every recurring charge and email a receipt for every payment, so you always know exactly what you're being billed and when.`,
      },
      {
        q: "What is the price for compounded semaglutide?",
        a: `${compoundedMonthlyPricingSentence("Compounded semaglutide", COMPOUNDED_SEMAGLUTIDE_PRICING)} That price applies only if a clinician determines compounded semaglutide is appropriate for you and you choose to continue treatment. It is all-inclusive cash-pay pricing: provider care, prescription medication, supplies, and expedited shipping are included, and Beema Health does not charge a separate monthly platform or membership fee on top of it. Dose adjustments within compounded semaglutide do not change the monthly price. Because completing intake does not guarantee a prescription, this price reflects what you'd pay for compounded semaglutide specifically, if your clinician prescribes it after reviewing your medical history.`,
      },
      {
        q: "What is the price for compounded tirzepatide?",
        a: `${compoundedMonthlyPricingSentence("Compounded tirzepatide", COMPOUNDED_TIRZEPATIDE_PRICING)} That price applies only if a clinician determines compounded tirzepatide is appropriate for you and you choose to continue treatment. It is all-inclusive cash-pay pricing: provider care, prescription medication, supplies, and expedited shipping are included, and Beema Health does not charge a separate monthly platform or membership fee on top of it. Dose adjustments within compounded tirzepatide do not change the monthly price. Because completing intake does not guarantee a prescription, this price reflects what you'd pay for compounded tirzepatide specifically, if your clinician prescribes it after reviewing your medical history.`,
      },
      {
        q: "Is there a monthly membership fee?",
        a: `No. Beema Health uses all-inclusive cash-pay pricing rather than a subscription or care-coordination membership model. If treatment is appropriate for you, your monthly cost is the listed plan rate — for example, compounded semaglutide is $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/month and compounded tirzepatide is available as a $${COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!.totalUsd} ${COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!.months}-month starter pack for ${COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!.dosePathLabel}, or standard/maintenance at $${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}/month. Those rates already cover provider care, medication, supplies, and expedited shipping. We do not layer a separate platform fee, membership fee, or coordination fee on top. Because there's no membership locking you in, you can stop requesting refills at any time without needing to cancel a subscription — you only pay when medication is prescribed and you choose to fill it. Promo codes (${COMPOUNDED_SEMAGLUTIDE_PRICING.promoCode} for semaglutide, ${COMPOUNDED_TIRZEPATIDE_PRICING.promoCode} for tirzepatide maintenance) can reduce your first month's cost on a three-month plan; for tirzepatide, the starter pack and the promo code can't be used together. Promo codes never apply to a one-month purchase.`,
      },
      {
        q: "Are there hidden fees?",
        a: `No. The listed monthly rate is all-inclusive for standard care: provider visits, prescription medication, supplies, and expedited shipping. There is no monthly membership or platform fee hidden behind that price, and any promotional discount — such as the one-time code available on a three-month plan — is applied transparently at checkout, never as a rate that changes on you later. Dose adjustments within the same medication do not change your monthly price. Before every recurring charge, we send a reminder so nothing hits your card as a surprise, and we email a receipt for every payment so you have a running record of what you've been billed. If you ever see a charge you don't recognize, our support team will explain it in plain language.`,
      },
    ],
  },
  {
    category: "Medication",
    items: [
      {
        q: "Will I be guaranteed a prescription?",
        a: "No. A licensed clinician independently reviews your medical intake and makes the final decision about whether treatment is appropriate for you — Beema Health itself never makes or influences that clinical judgment. Your clinician looks at your medical history, current health, and any conditions that could affect the safety of a given medication, including things like a personal or family history of certain thyroid cancers, pancreatitis, gallbladder issues, pregnancy or breastfeeding, or a history of eating disorders. Completing intake, paying for the visit, or having a BMI in a particular range does not guarantee you'll receive a prescription; it simply starts the clinical review process. If your clinician determines that a GLP-1 medication isn't safe or appropriate for you, they'll explain why and, where relevant, discuss alternatives or next steps rather than leaving you without guidance. This independent review is part of why intake questions matter — thorough, accurate answers help your clinician make a safe, well-informed decision more quickly.",
      },
      {
        q: "Which medications does Beema Health support?",
        a: "Beema Health's clinical provider group offers clinically appropriate weight-management medications, most commonly compounded semaglutide and compounded tirzepatide, prescribed based on your individual medical history and your clinician's independent evaluation. These are compounded formulations, and Beema Health does not claim that any compounded product is equivalent to, or interchangeable with, a specific FDA-approved branded medication — your clinician will explain the differences and help you understand what's being prescribed after you're an active patient. Which medication, if any, is right for you depends on factors like your health history, current medications, prior treatment experience, and any contraindications identified during intake; you complete a questionnaire rather than chatting live inside intake, and your clinician decides based on what you submit. If you're switching from another provider, your clinician will also factor in your existing prescription and dose so your treatment can continue as consistently as possible. Pricing for compounded semaglutide and compounded tirzepatide is listed separately in the pricing answers above.",
      },
      {
        q: "Can I switch from another provider to Beema Health?",
        a: "Yes. If you're currently being treated elsewhere, your medical intake will ask about your existing prescription, current dose, how long you've been on treatment, and any side effects you've experienced, so a Beema provider can review your history and aim to keep your treatment consistent rather than restarting you from the beginning. Filling out that part of intake carefully matters a great deal, since it's the information your clinician uses to land on the right medication and dose for you and to avoid unsafe gaps or jumps in treatment. As with any new patient, a licensed clinician independently reviews your case and makes the final call — switching providers doesn't guarantee your previous prescription or dose will simply carry over unchanged, but continuity of care is the goal whenever it's clinically appropriate. If you have current labs from your previous provider, you can upload them so your new clinician has as complete a picture as possible before making treatment decisions.",
      },
    ],
  },
  {
    category: "Shipping",
    items: [
      {
        q: "How is medication shipped?",
        a: "Through cold-chain shipping with tracking, typically 1-3 business days nationwide. Cold-chain handling matters for GLP-1 medications like compounded semaglutide and compounded tirzepatide because they need to stay within a safe temperature range from the pharmacy to your door; our partner pharmacy packages each shipment accordingly and provides a tracking number so you can follow it the whole way. Because Beema Health's clinical provider group and pharmacy partners are licensed and authorized nationwide, this shipping timeline generally applies wherever in the U.S. you're located. Once you're an active patient, you'll be able to see your shipment status, along with days of medication remaining and your refill window, in one place, so you're never guessing where an order stands. If a delivery seems delayed beyond the expected window, or the packaging looks compromised on arrival, don't use the medication — report it to our support team right away so we can escalate it with the pharmacy.",
      },
      {
        q: "What if my shipment is delayed or lost?",
        a: `Please report it to ${SUPPORT_EMAIL} immediately, including your name and, if you have it, your tracking number, so our team can look into it right away. Refill reliability is our core promise: we treat every cold-chain and lost-shipment issue as urgent, since GLP-1 medications like compounded semaglutide and compounded tirzepatide can be affected by extended time outside a safe temperature range. If your package appears to have been exposed to extreme heat or cold, was left out for an unusually long time, or simply doesn't arrive within the expected 1-3 business day window, don't use it — we'll work with our pharmacy partner to investigate and arrange a replacement or reshipment where appropriate rather than leaving you without medication. Your Refills screen also tracks days of medication remaining and flags refill risk in advance, so a delayed shipment is less likely to catch you completely out. We aim to acknowledge any report like this within one business day, consistent with our general refill response promise.`,
      },
      {
        q: "Who is Beema Health's partner pharmacy?",
        a: partnerPharmacyFaqAnswer(),
      },
    ],
  },
  {
    category: "Refills",
    items: [
      {
        q: "How do refills work?",
        a: "Your Refills screen shows days of medication remaining, your refill window, current pharmacy status, and a simple refill-risk level (green, yellow, or red), so you always know where you stand at a glance without having to guess. When it's time, you can request a refill in just a few steps, and from there you can track your order and shipment status every step along the way, from pharmacy processing through cold-chain shipping to delivery. Refills go through the same kind of clinical review as your original prescription — a licensed clinician confirms it's still appropriate to continue your current medication and dose before it ships, rather than refilling automatically without any oversight. If your refill risk moves into yellow or red, we proactively flag it so you have time to act before you run low, and if anything about your shipment looks delayed or off, you can report it right from the same screen.",
      },
      {
        q: "What's your refill response promise?",
        a: "We aim to acknowledge refill requests within one business day, so you're never left wondering whether your request went through or is being worked on. Beyond just responding quickly, we proactively flag refill risk before you run out — your Refills screen surfaces a green, yellow, or red risk level based on your days of medication remaining and refill window, so you can request your next refill with enough lead time rather than discovering you're almost out at the last minute. If a refill needs additional clinical review, or there's a delay on the pharmacy or shipping side, we'll communicate that to you rather than leaving the request silent. Refill reliability is one of our core promises, alongside cold-chain shipping and tracking, because running out of a GLP-1 medication partway through treatment can affect both your results and how your body tolerates restarting. If your refill ever seems to be taking longer than expected, you can reach out and we'll look into the status for you.",
      },
    ],
  },
  {
    category: "Cancellation",
    items: [
      {
        q: "Can I stop treatment anytime?",
        a: "Yes. You can stop requesting refills at any time, for any reason, without needing to go through a formal cancellation process for a subscription you were never locked into in the first place. Because Beema Health uses all-inclusive cash-pay pricing rather than a monthly membership or platform fee, there's no separate recurring subscription to cancel — you only pay when a clinician has prescribed medication and you choose to fill that specific order. If you decide to stop, simply don't request your next refill; there's no penalty, no cancellation fee, and no obligation to explain your reasoning. If you change your mind later, you can typically resume care by going through intake again so a clinician can confirm treatment is still appropriate given any changes in your health since your last prescription. This flexibility is intentional: we'd rather you stay because the care is working, not because you feel stuck in a contract.",
      },
      {
        q: "Can I pause refills?",
        a: "Yes. If you need a break, whether for cost, side effects, travel, or any other reason, you can pause refills and pick back up when you're ready, without losing your account or having to restart the entire intake process from scratch in most cases. Pausing is different from a hard cancellation: it simply means you're not actively requesting your next refill right now, and your Refills screen will reflect that paused status rather than showing an active refill-risk countdown. We'll always show you any upcoming medication charges clearly before they occur, so pausing also protects you from being billed for a refill you didn't ask for. When you're ready to resume, your clinician will confirm that continuing your previous medication and dose is still clinically appropriate given any changes in your health, weight, or medications since your pause began, since ongoing prescribing decisions are always made independently based on your current situation rather than assumed to carry over automatically.",
      },
    ],
  },
  {
    category: "Eligibility",
    items: [
      {
        q: "Who is eligible?",
        a: "Eligibility depends on your medical history, current health, and a licensed clinician's independent evaluation — there's no single number or checkbox that automatically qualifies or disqualifies you. During intake, we'll calculate your BMI and ask about conditions that can affect the safety of a given medication, such as a personal or family history of medullary thyroid cancer or MEN2, pancreatitis, certain gallbladder issues, pregnancy or breastfeeding, or a history of eating disorders; any of these can make a particular prescription unsafe even if you'd otherwise be a good candidate. Some conditions will disqualify you from certain prescriptions specifically, rather than from care altogether, and your clinician will explain what that means for you rather than leaving you with just a rejection. We explain eligibility in plain language throughout the intake process so you understand why each question is being asked. Completing intake and appearing eligible on paper still doesn't guarantee a prescription — the final clinical decision is always made independently by your reviewing clinician.",
      },
      {
        q: "Which states is Beema Health available in?",
        a: `Beema Health is available to patients in all 50 U.S. states: ${US_STATES.join(", ")}. ${JURISDICTIONAL_NOTICE_TITLE}: ${JURISDICTIONAL_NOTICE_BODY} Medication availability, prescribing, and pharmacy fulfillment still depend on your state's individual requirements and your provider's independent clinical decision.`,
      },
    ],
  },
  {
    category: "Labs",
    items: [
      {
        q: "Do I need labs?",
        a: "Sometimes. Whether you need labs depends on your medical history, the medication being considered, and your clinician's independent judgment about what's necessary to prescribe safely — it isn't a blanket requirement for every patient. If you already have recent lab results from another provider, you can upload them during intake so your clinician can review your existing values instead of requiring a brand-new draw. If you don't have recent labs, or your clinician determines updated labs are needed, we'll show you lab options so you can complete them before treatment moves forward. When labs are needed, they're disclosed clearly up front before you're charged. Your clinician may also request labs later in treatment, not just at the start, if it becomes clinically relevant to monitor how you're responding to a medication or to check in on your overall health while you continue care.",
      },
    ],
  },
  {
    category: "Support",
    items: [
      {
        q: "Can I ask questions during the medical intake?",
        a: patientQuestionsGuidance(),
      },
    ],
  },
  {
    category: "Privacy",
    items: [
      {
        q: "How is my health data protected?",
        a: `We maintain strict compliance with HIPAA requirements for handling your protected health information, both in how our systems are built and in how our team is allowed to access your data. Your health information is encrypted in transit and at rest, and access is role-based, meaning only the people who actually need to see your information for your care, such as your reviewing clinician, are able to. Clinical and administrative actions on your records are tracked with audit logs, so there's an accountable record of who accessed or changed what, and when. We never expose your health data in logs or error messages, and pre-account information collected before you create an account is never stored in your browser's local storage the way some other sites might handle form data — it stays protected on our servers instead. If you ever have questions about how your specific information is used, email ${SUPPORT_EMAIL} and our support team can point you to our full privacy policy and notice of privacy practices.`,
      },
    ],
  },
];

export type LearnPost = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readMins: number;
};

export const LEARN_POSTS: LearnPost[] = [
  {
    slug: "glp1-basics",
    title: "GLP-1 basics: how this class of medication works",
    category: "GLP-1 basics",
    excerpt:
      "A plain-language guide to what GLP-1 medications do, what to expect, and common questions.",
    readMins: 6,
  },
  {
    slug: "insurance-guide",
    title: "Understanding insurance coverage for weight care",
    category: "Insurance",
    excerpt:
      "Formularies, prior authorizations, and what to check before you start.",
    readMins: 8,
  },
  {
    slug: "prior-authorizations",
    title: "Prior authorizations, explained simply",
    category: "Prior authorizations",
    excerpt:
      "What a PA is, why it happens, and how Beema Health helps you through it.",
    readMins: 5,
  },
  {
    slug: "side-effects",
    title: "Managing common side effects",
    category: "Side effects",
    excerpt:
      "Practical tips for nausea, appetite changes, and when to message your clinician.",
    readMins: 7,
  },
  {
    slug: "protein-strength",
    title: "Protein and strength training during weight loss",
    category: "Protein/strength training",
    excerpt: "Why protecting muscle matters and simple ways to do it.",
    readMins: 6,
  },
  {
    slug: "ask-your-doctor",
    title: "What to ask your clinician",
    category: "What to ask your doctor",
    excerpt: "A checklist of smart questions for your first visit.",
    readMins: 4,
  },
  {
    slug: "switching-providers",
    title: "Switching providers without a gap in care",
    category: "Switching providers",
    excerpt: "How to transfer safely and avoid running out of medication.",
    readMins: 6,
  },
  {
    slug: "cost-guides",
    title: "A clear-eyed guide to the real costs",
    category: "Cost guides",
    excerpt:
      "What the all-inclusive monthly rate covers, and how promo pricing works.",
    readMins: 7,
  },
];
