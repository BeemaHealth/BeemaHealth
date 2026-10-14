import { useEffect } from "react";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import {
  LegalBusinessContact,
  LegalDocument,
  LegalP,
  type LegalSection,
} from "@/components/site/LegalDocument";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";
import { GROWTH_PROGRAMS_INDEXABLE } from "@/lib/growth-programs";

export const Route = createFileRoute("/legal/referral-terms")({
  head: () => ({
    meta: [
      { title: "Referral Terms | Beema Health" },
      {
        name: "description",
        content:
          "Terms for the Beema Health patient Referral Program, including who can refer, how credits work, and how we protect your friend's privacy.",
      },
      ...(GROWTH_PROGRAMS_INDEXABLE
        ? []
        : [{ name: "robots", content: "noindex" }]),
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/referral-terms") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Referral Terms", path: "/legal/referral-terms" },
          ]),
        ),
      },
    ],
  }),
  component: ReferralTermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <>
        <LegalP>
          Current patients in good standing who are 18 or older may refer.
          Licensed clinicians and Beema Health, Bask, and Care Partner staff may
          not. Referred friends must be new patients. Self-referrals and
          household referrals, including matching name, address, payment method,
          or device, do not qualify.
        </LegalP>
      </>
    ),
  },
  {
    id: "credits",
    title: "Credits",
    content: (
      <>
        <LegalP>
          When a referred friend completes a first paid order and the refund
          window passes, you each receive an equal credit toward your own future
          Beema Health charges. Credits are the same for everyone regardless of
          medication, dose, or plan, have no cash value, cannot be transferred,
          may expire, and are limited per referrer per 12 months.
        </LegalP>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How you may share",
    content: (
      <>
        <LegalP>
          Share your link yourself, with people you know. Beema Health does not
          send messages to your friends and does not import contacts. Posting
          your link publicly, on coupon sites, or in paid advertising is not
          allowed.
        </LegalP>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    content: (
      <>
        <LegalP>
          We never tell you who became a patient or share any health
          information. You only see credits earned. A referred friend must agree
          at checkout that we may tell the referrer a reward was earned, and
          nothing else.
        </LegalP>
      </>
    ),
  },
  {
    id: "independence",
    title: "Care is independent",
    content: (
      <>
        <LegalP>
          Referring a friend is optional and does not affect anyone's care.
          Providers and pharmacies receive nothing for referrals. A prescription
          is issued only if clinically appropriate.
        </LegalP>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and exclusions",
    content: (
      <>
        <LegalP>
          Beema Health may change or end the program, exclude certain states,
          and cancel credits for fraud or abuse.
        </LegalP>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: <LegalBusinessContact />,
  },
];

function ReferralTermsPage() {
  useEffect(() => {
    trackPageViewed("referral_terms");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Referral Terms"
          lastUpdated="October 13, 2026"
          description="Terms for the Beema Health patient Referral Program, including who can refer, how credits work, and how we protect your friend's privacy."
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
