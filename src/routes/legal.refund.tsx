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
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact-info";
import { HIVE_LOGIN_URL } from "@/lib/cta-ids";

export const Route = createFileRoute("/legal/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy | Beema Health" },
      {
        name: "description",
        content:
          "Beema Health refund policy for prescription products. All sales are final; contact support if you believe a prescription was filled in error.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/refund") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Refund Policy", path: "/legal/refund" },
          ]),
        ),
      },
    ],
  }),
  component: RefundPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "policy",
    title: "Refund Policy",
    content: (
      <>
        <LegalP>
          Unfortunately we cannot accept returns of prescription products for
          reuse or resale, and all sales are final. However, if you feel we have
          made an error in the filling of your prescription, please contact us
          at{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </LegalP>
        <LegalP>
          Prepaid plans are final. If you prepay for a multi-month plan (for
          example, 6 months upfront) and decide not to continue after part of it
          has shipped, we cannot refund the months that have not yet shipped.
        </LegalP>
      </>
    ),
  },
  {
    id: "cancel-refills",
    title: "How to Cancel Future Refills",
    content: (
      <>
        <LegalP>
          You can pause your future refills at any time from your patient
          account. To do so:
        </LegalP>
        <ol className="list-decimal space-y-1 pl-6 text-muted-foreground">
          <li>
            Log in to your account at{" "}
            <a
              href={HIVE_LOGIN_URL}
              className="text-foreground underline-offset-2 hover:underline"
            >
              hive.beemahealth.com
            </a>
            .
          </li>
          <li>Select the Treatments tab.</li>
          <li>Click your treatment.</li>
          <li>Click Manage.</li>
          <li>Click Pause Refills.</li>
        </ol>
        <LegalP>
          Pausing refills stops your next refill from being processed. If you
          have trouble pausing your refills, contact us at{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          and we will help you.
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

function RefundPage() {
  useEffect(() => {
    trackPageViewed("refund");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Refund and Cancellation Policy"
          lastUpdated="November 3, 2026"
          description="How Beema Health handles returns and refunds for prescription products."
          sections={SECTIONS}
          showToc={false}
        />
      </Section>
    </MarketingLayout>
  );
}
