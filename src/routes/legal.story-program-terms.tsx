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

export const Route = createFileRoute("/legal/story-program-terms")({
  head: () => ({
    meta: [
      { title: "Story Program Terms | Beema Health" },
      {
        name: "description",
        content:
          "Terms for the Beema Health patient Story Program, including eligibility, the patient credit, content guidelines, and how to revoke your authorization.",
      },
      ...(GROWTH_PROGRAMS_INDEXABLE
        ? []
        : [{ name: "robots", content: "noindex" }]),
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/legal/story-program-terms") },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Story Program Terms", path: "/legal/story-program-terms" },
          ]),
        ),
      },
    ],
  }),
  component: StoryProgramTermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <>
        <LegalP>
          You must be 18 or older and a current or former Beema Health patient
          with at least one completed paid order. Beema Health, Bask, and Care
          Partner staff, licensed clinicians, and creators in the Creator
          Program are not eligible. One rewarded submission is allowed per
          patient every 12 months.
        </LegalP>
      </>
    ),
  },
  {
    id: "credit",
    title: "Your credit",
    content: (
      <>
        <LegalP>
          Approved submissions receive a credit toward your own future Beema
          Health charges. The credit has no cash value, cannot be transferred or
          combined with other offers unless stated, expires 12 months after it
          is issued, and may be cancelled for fraud. It is issued after
          approval, whether or not Beema Health publishes your story.
        </LegalP>
      </>
    ),
  },
  {
    id: "no-sentiment",
    title: "Honest stories only",
    content: (
      <>
        <LegalP>
          Approval and payment never depend on whether your story is positive or
          negative. We review only for technical quality and for the content
          guidelines below. You were not told what to say.
        </LegalP>
      </>
    ),
  },
  {
    id: "guidelines",
    title: "Content guidelines",
    content: (
      <>
        <LegalP>
          Use your first name only. Do not name brand-name medications, give
          dosing or medical advice, state exact weight-loss numbers or
          timeframes, show other people, prescription labels, or pharmacy names,
          or make claims about side effects, safety, or guaranteed results. We
          may ask you to re-record for these reasons.
        </LegalP>
      </>
    ),
  },
  {
    id: "authorization",
    title: "Authorization and release",
    content: (
      <>
        <LegalP>
          Before uploading, you sign a separate Authorization and Media Release
          describing how your story may be used. Your treatment, prices, and
          eligibility do not depend on signing. Paid advertising use is a
          separate, optional choice.
        </LegalP>
      </>
    ),
  },
  {
    id: "revocation",
    title: "Revoking and takedown",
    content: (
      <>
        <LegalP>
          You may revoke your authorization at any time by contacting us. We
          stop new uses and remove your story from channels we control within 10
          business days. We cannot recall copies already shared by others or
          advertising already delivered.
        </LegalP>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Compensation disclosure",
    content: (
      <>
        <LegalP>
          Whenever your story is shown, we disclose that it is a compensated
          patient story and that individual results vary and are not typical.
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

function StoryProgramTermsPage() {
  useEffect(() => {
    trackPageViewed("story_program_terms");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Story Program Terms"
          lastUpdated="October 13, 2026"
          description="Terms for the Beema Health patient Story Program, including eligibility, the patient credit, content guidelines, and how to revoke your authorization."
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
