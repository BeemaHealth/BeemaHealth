import { useEffect } from "react";
import { canonicalUrl } from "@/lib/seo";
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
          title="Refund Policy"
          lastUpdated="July 29, 2026"
          description="How Beema Health handles returns and refunds for prescription products."
          sections={SECTIONS}
          showToc={false}
        />
      </Section>
    </MarketingLayout>
  );
}
