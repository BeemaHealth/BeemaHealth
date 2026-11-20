import type { ReactNode } from "react";
import { Pill, Stethoscope, Truck, Wallet } from "lucide-react";
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import {
  CancellationLink,
  LandingTemplate,
  type Callout,
  type HeroImage,
  type LandingTemplateProps,
  type PriceTile,
  type ProofStat,
} from "./LandingTemplate";
import {
  EligibilityCard,
  ProseSection,
  SafetySection,
  type SafetyCard,
} from "./blocks";
import { NO_MEMBERSHIP_FEE_STAT } from "./proof";

/**
 * New-layout page for a single nationwide product (hair loss, wellness).
 * Same design as the Houston and Boston pages: `LandingTemplate` supplies the
 * hero, proof stats, story, how it works, included, mid CTA, where, FAQ and
 * final CTA. Each page's variant file supplies only its own copy and data.
 */

const PRODUCT_CALLOUTS: readonly Callout[] = [
  {
    icon: Stethoscope,
    title: "Provider review",
    body: "A licensed provider reviews your history and decides what is right.",
  },
  {
    icon: Pill,
    title: "Licensed pharmacy",
    body: "Your medication is filled by a licensed pharmacy when prescribed.",
  },
  {
    icon: Truck,
    title: "Shipped to you",
    body: "Delivered to your door. No pharmacy counter.",
  },
  {
    icon: Wallet,
    title: "One cash-pay price",
    body: "No membership fee and no insurance paperwork.",
  },
];

export type ProductPageConfig = {
  /** Route path with slashes, e.g. "/nad-plus/". */
  pagePath: string;
  heroCtaId: keyof typeof CTA_IDS;
  footerCtaId: keyof typeof CTA_IDS;
  /** Short product name used mid-sentence, e.g. "hair loss spray". */
  name: string;
  h1: string;
  /** About 300 characters: benefit first, one feature, no guarantee. */
  lead: string;
  image: HeroImage;
  tile: PriceTile;
  /** Third proof stat (the first two are Google rating and 50 states). */
  proofThird: ProofStat;
  pricingTitle?: string;
  pricingDescription: string;
  /** The product's pricing card, usually `SimpleTreatmentPricingCard`. */
  pricingCard: ReactNode;
  eligibility: { intro: string; points: readonly string[] };
  whatIs: { title: string; body: ReactNode };
  safetyCards: readonly SafetyCard[];
  /** Compliance sentence shown under the pricing card (e.g. compounded). */
  disclosure?: string;
  faqTitle: string;
  faqDescription: string;
};

export type ProductPageProps = {
  config: ProductPageConfig;
  faqItems: TreatmentFaqItem[];
} & Pick<LandingTemplateProps, "overrides" | "insertAfter">;

export function ProductPage({
  config: c,
  faqItems,
  overrides,
  insertAfter,
}: ProductPageProps) {
  const heroCta = resolveCta(CTA_IDS[c.heroCtaId]);
  const footerCta = resolveCta(CTA_IDS[c.footerCtaId]);

  return (
    <LandingTemplate
      pagePath={c.pagePath}
      hero={{
        h1: c.h1,
        lead: c.lead,
        cta: heroCta,
        images: [c.image],
        tiles: [c.tile],
        priceNote: (
          <>
            Medication eligibility and availability are determined by a licensed
            provider and applicable law. Cash-pay when prescribed. Product
            images are illustrative. See our <CancellationLink />.
          </>
        ),
      }}
      proofStats={[
        { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
        {
          value: "50 states",
          label: "Providers licensed per state",
          stars: false,
        },
        c.proofThird,
        NO_MEMBERSHIP_FEE_STAT,
      ]}
      howItWorksTitle={`How Beema Health's ${c.name} care works`}
      pricing={{
        title: c.pricingTitle ?? "Transparent pricing",
        description: c.pricingDescription,
        children: (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-full">{c.pricingCard}</div>
            <EligibilityCard
              intro={c.eligibility.intro}
              points={c.eligibility.points}
            />
          </div>
        ),
        footnote: (
          <>
            <p>
              All prices are cash-pay when prescribed, with no membership fee
              and no insurance billed. Your provider decides the medication;
              prescribing is never guaranteed. See our <CancellationLink />.
            </p>
            {c.disclosure ? <p>{c.disclosure}</p> : null}
          </>
        ),
      }}
      included={{
        title: "One price covers your care",
        description:
          "Everything below is included when a licensed provider prescribes. No membership fee, no insurance paperwork.",
        ariaLabel: `What your ${c.name} plan includes`,
        callouts: PRODUCT_CALLOUTS,
      }}
      midCta={{
        heading: "Your care starts with a free intake",
        body: "Starting your intake is free. A licensed provider reviews your health history and decides whether treatment is right for you, and you won't be charged anything if you're not prescribed. If you are, one cash-pay price covers your care and medication.",
      }}
      where={{
        title: `Telehealth ${c.name} care in all 50 states`,
        body: (
          <p>
            Beema Health is available to adults in all 50 US states. You can
            complete the medical intake entirely online, from home. A licensed
            provider reviews your case by telehealth and decides, on an
            individual basis, whether {c.name} may be appropriate for you. When
            prescribed, medication ships directly to your door.
          </p>
        ),
      }}
      faq={{
        title: c.faqTitle,
        description: c.faqDescription,
        items: faqItems,
      }}
      finalCta={{
        heading: "Ready to see if this is right for you?",
        body: "Complete intake from home. You won't be charged anything if you're not prescribed, and a prescription is never guaranteed.",
        cta: footerCta,
      }}
      overrides={overrides}
      insertAfter={{
        howItWorks: (
          <ProseSection title={c.whatIs.title}>{c.whatIs.body}</ProseSection>
        ),
        included: <SafetySection cards={c.safetyCards} />,
        ...insertAfter,
      }}
    />
  );
}
