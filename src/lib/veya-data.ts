// Mock data for Beema Health marketing + qualify funnel (no backend yet).

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
  /* Pricing category disabled — pricing model not finalized yet.
  {
    category: "Pricing",
    items: [
      {
        q: "How much does Beema Health cost?",
        a: "There is no platform membership or subscription fee. You pay for your prescribed medication — typically $199–$349/month cash-pay, or your insurance copay if covered. Shipping and labs, when applicable, are shown separately before any charge.",
      },
      {
        q: "Is there a monthly membership fee?",
        a: "No. Beema Health uses medication-only pricing. Your cost is the medication your clinician prescribes, if appropriate. We do not charge a separate monthly platform or care-coordination membership on top of that.",
      },
      {
        q: "Are there hidden fees?",
        a: "No. Medication, shipping, and labs are listed separately. We send a reminder before every charge and email a receipt for every payment.",
      },
    ],
  },
  */
  {
    category: "Medication",
    items: [
      {
        q: "Will I be guaranteed a prescription?",
        a: "No. A licensed clinician independently reviews your intake and decides whether treatment is appropriate. Completing intake does not guarantee a prescription.",
      },
      {
        q: "Which medications does Beema Health support?",
        a: "Beema Health supports clinically appropriate weight-management options. Your clinician will discuss what's right for you. We don't claim any product is equivalent to a specific branded medication.",
      },
    ],
  },
  {
    category: "Shipping",
    items: [
      {
        q: "How is medication shipped?",
        a: "Through cold-chain shipping with tracking, typically 2–4 business days in launch states.",
      },
      {
        q: "What if my shipment is delayed or lost?",
        a: "Please report it in the app and we will open a ticket immediately. Refill reliability is our core promise — we urgently escalate all cold-chain and lost-shipment issues.",
      },
    ],
  },
  {
    category: "Refills",
    items: [
      {
        q: "How do refills work?",
        a: "Your Refills screen shows days remaining, refill window, pharmacy status, and a refill-risk level (green / yellow / red). You can quickly and easily request a refill and track your order and shipment status every step along the way.",
      },
      {
        q: "What's your refill response promise?",
        a: "We aim to acknowledge refill requests within one business day and proactively flag refill risk before you run out.",
      },
    ],
  },
  {
    category: "Cancellation",
    items: [
      {
        q: "Can I stop treatment anytime?",
        a: "Yes. You can stop requesting refills at any time. Because there is no platform membership fee, you are not locked into a separate monthly subscription — you only pay when medication is prescribed and you choose to fill it.",
      },
      {
        q: "Can I pause refills?",
        a: "Yes. If you need a break, you can pause refills and resume when you're ready. We'll show you any upcoming medication charges clearly before they occur.",
      },
    ],
  },
  {
    category: "Eligibility",
    items: [
      {
        q: "Who is eligible?",
        a: "Eligibility depends on your medical history and a clinician's independent evaluation. Some conditions will disqualify you for some prescriptions. We explain eligibility in plain language during the intake process.",
      },
      {
        q: "Which states is Beema Health available in?",
        a: "We launch state by state. During intake we check your state instantly — if we're not live there yet, you can join the waitlist.",
      },
    ],
  },
  {
    category: "Labs",
    items: [
      {
        q: "Do I need labs?",
        a: "Sometimes. If you have recent labs you can upload them; if not, we'll show lab options. Labs, when needed, are billed separately and disclosed up front.",
      },
    ],
  },
  {
    category: "Privacy",
    items: [
      {
        q: "How is my health data protected?",
        a: "We are always within strict compliance with all HIPAA requirements. We use encryption in transit and at rest, role-based access, as well as audit logs for clinical and administrative actions. We never expose any of your health data in logs.",
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
      "Medication vs labs vs shipping — what to actually budget for with medication-only pricing.",
    readMins: 7,
  },
];
