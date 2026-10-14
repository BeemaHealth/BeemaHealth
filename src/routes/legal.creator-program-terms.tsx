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

export const Route = createFileRoute("/legal/creator-program-terms")({
  head: () => ({
    meta: [
      { title: "Creator Program Terms | Beema Health" },
      {
        name: "description",
        content:
          "Public summary of the Beema Health Creator Program terms, including eligibility, required disclosure, claim rules, and what creators never receive.",
      },
      ...(GROWTH_PROGRAMS_INDEXABLE
        ? []
        : [{ name: "robots", content: "noindex" }]),
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/legal/creator-program-terms") },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Creator Program Terms",
              path: "/legal/creator-program-terms",
            },
          ]),
        ),
      },
    ],
  }),
  component: CreatorProgramTermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <>
        <LegalP>
          Creators must be 18 or older, US-based, and have at least 5,000
          followers on TikTok or Instagram, with public, original content about
          fitness, wellness, weight loss, or lifestyle. Licensed healthcare
          professionals and Beema Health, Bask, and Care Partner staff are not
          eligible. Beema Health may limit or exclude certain states.
        </LegalP>
      </>
    ),
  },
  {
    id: "compensation",
    title: "Compensation",
    content: (
      <>
        <LegalP>
          Compensation is for advertising services only and is described in the
          signed creator agreement. Earnings are not guaranteed. Compensation
          depends on the program terms and on actual, eligible new patients, and
          many creators earn nothing. Payments may be reversed for refunds,
          chargebacks, or fraud.
        </LegalP>
      </>
    ),
  },
  {
    id: "independence",
    title: "No role in care",
    content: (
      <>
        <LegalP>
          Creators do not provide, recommend, or influence clinical decisions
          and have no role in whether anyone receives treatment. Creators never
          receive patient names, status, or health information.
        </LegalP>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Required disclosure",
    content: (
      <>
        <LegalP>
          Every post must clearly disclose the paid partnership, spoken and on
          screen for video, at the start of captions, and using the platform's
          paid partnership tools. Generic profile-level disclosure is not
          enough.
        </LegalP>
      </>
    ),
  },
  {
    id: "claims",
    title: "Claim rules",
    content: (
      <>
        <LegalP>
          Creators may not promise results, state weight-loss numbers, compare
          to or name brand-name medications as equivalent, call compounded
          medications FDA-approved, give dosing or medical advice, ask followers
          for health information, or use the LegitScript seal.
        </LegalP>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Monitoring and enforcement",
    content: (
      <>
        <LegalP>
          Beema Health reviews creator content. Violations may require removal
          within 24 hours, hold payments, or end the partnership.
        </LegalP>
      </>
    ),
  },
  {
    id: "agreement",
    title: "Signed agreement",
    content: (
      <>
        <LegalP>
          This page is a summary. The full creator agreement is signed at
          onboarding and controls.
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

function CreatorProgramTermsPage() {
  useEffect(() => {
    trackPageViewed("creator_program_terms");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Creator Program Terms"
          lastUpdated="October 13, 2026"
          description="Public summary of the Beema Health Creator Program terms, including eligibility, required disclosure, claim rules, and what creators never receive."
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
