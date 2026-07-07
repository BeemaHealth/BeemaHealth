import { useEffect } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import {
  LegalDocument,
  LegalList,
  LegalP,
  type LegalSection,
} from "@/components/site/LegalDocument";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Beema Health" },
      {
        name: "description",
        content:
          "How Beema Health collects, uses, shares, and protects your personal and health information.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/privacy") }],
  }),
  component: PrivacyPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    content: (
      <>
        <LegalP>
          Beema Health, Inc. (&quot;Beema Health,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) respects your privacy. This
          Privacy Policy explains how we collect, use, disclose, and protect
          personal information when you visit our websites, use our
          applications, or interact with our weight-management telehealth
          services (collectively, the &quot;Service&quot;).
        </LegalP>
        <LegalP>
          This Policy applies alongside our Terms of Service and Telehealth
          Consent. Where clinical care is delivered by independent Providers or
          medical groups, those parties may also maintain their own privacy
          notices for information they control as covered entities or custodians
          under applicable law.
        </LegalP>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "Information we collect",
    content: (
      <>
        <LegalP>
          The information we collect depends on how you use the Service. It may
          include:
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information you provide.
          </strong>{" "}
          Name, email, phone number, date of birth, sex, address, account
          credentials, intake and health-history responses, photos or documents
          you upload, payment details, communications with clinicians and
          support, and preferences you set in your account.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Health and clinical information.
          </strong>{" "}
          Weight, BMI, symptoms, medication history, allergies, lab results,
          prescription and refill status, progress logs, and other data needed
          to evaluate eligibility and deliver care.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information collected automatically.
          </strong>{" "}
          Device identifiers, browser type, IP address, general location derived
          from IP, pages viewed, referral URLs, session timestamps, and
          diagnostic data about app or site performance.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information from third parties.
          </strong>{" "}
          Payment confirmation from processors, identity or fraud-prevention
          signals, pharmacy or laboratory fulfillment updates, and information
          you authorize us to receive from other healthcare sources.
        </LegalP>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    content: (
      <>
        <LegalP>We use personal information to:</LegalP>
        <LegalList
          items={[
            <>
              Provide, operate, and improve the Service, including intake,
              clinical coordination, billing, and refill support.
            </>,
            <>
              Connect you with licensed Providers and Care Partners in your
              state.
            </>,
            <>
              Verify identity, prevent fraud, and maintain the security of
              accounts and systems.
            </>,
            <>
              Communicate about appointments, prescriptions, lab orders,
              billing, and support requests.
            </>,
            <>
              Send service-related notices and, where permitted, marketing about
              Beema Health products and features.
            </>,
            <>
              Analyze usage to improve performance, accessibility, and patient
              experience.
            </>,
            <>
              Comply with legal obligations, respond to lawful requests, and
              enforce our agreements.
            </>,
            <>
              Create de-identified or aggregated data that does not reasonably
              identify you.
            </>,
          ]}
        />
        <LegalP>
          We do not use your protected health information with third-party AI
          services unless there is a signed business associate agreement and an
          approved, compliant architecture. Where automated tools assist with
          non-clinical tasks, human review is required before clinical or
          compliance-sensitive content is sent externally.
        </LegalP>
      </>
    ),
  },
  {
    id: "how-we-share",
    title: "How we share information",
    content: (
      <>
        <LegalP>We may share information with:</LegalP>
        <LegalList
          items={[
            <>
              Providers, medical groups, pharmacies, and laboratories involved
              in your care.
            </>,
            <>
              Vendors that help us operate the Service, such as hosting,
              payment, messaging, analytics, and customer-support providers
              bound by contractual confidentiality and security obligations.
            </>,
            <>
              Professional advisors, auditors, or insurers where reasonably
              necessary.
            </>,
            <>
              Law enforcement, regulators, or others when required by law or to
              protect rights, safety, and security.
            </>,
            <>
              A successor entity in connection with a merger, acquisition, or
              asset sale, subject to this Policy.
            </>,
          ]}
        />
        <LegalP>
          We do not sell your personal information for money. We do not share
          PHI with advertisers.
        </LegalP>
      </>
    ),
  },
  {
    id: "hipaa",
    title: "HIPAA and protected health information",
    content: (
      <>
        <LegalP>
          Some information you provide may be PHI under the Health Insurance
          Portability and Accountability Act (&quot;HIPAA&quot;) when handled by
          a covered entity or business associate. Beema Health may act as a business
          associate to certain Care Partners and, in that role, use and disclose
          PHI only as permitted by HIPAA and our agreements.
        </LegalP>
        <LegalP>
          HIPAA does not apply to every organization that handles health-related
          data. Information that is not PHI or otherwise protected under
          applicable law may be handled as described in this Policy.
          De-identified information created in accordance with HIPAA is not PHI.
        </LegalP>
      </>
    ),
  },
  {
    id: "consumer-health",
    title: "State consumer health privacy laws",
    content: (
      <>
        <LegalP>
          Residents of certain states with consumer health data laws may have
          additional rights regarding &quot;consumer health data&quot; or
          similarly defined sensitive health information.
        </LegalP>
        <LegalP>
          Depending on your state, you may have the right to confirm whether we
          process consumer health data, access a copy, request deletion,
          withdraw consent for certain processing, or obtain a list of
          categories of third parties with whom data has been shared. We may
          need to verify your identity before fulfilling a request.
        </LegalP>
        <LegalP>
          Some data is required to provide the Service. If you delete required
          information or withdraw consent for essential processing, we may be
          unable to continue your care through Beema Health.
        </LegalP>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    content: (
      <>
        <LegalP>
          We use cookies, local storage, and similar technologies to keep you
          signed in, remember preferences, measure traffic, and improve the
          Service. You can control cookies through browser settings, but
          disabling them may limit functionality.
        </LegalP>
        <LegalP>
          We may use analytics providers to understand how the Service is used.
          Where required, we will obtain consent before using non-essential
          cookies or similar tracking technologies.
        </LegalP>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights",
    content: (
      <>
        <LegalP>Depending on where you live, you may have the right to:</LegalP>
        <LegalList
          items={[
            <>Access personal information we maintain about you.</>,
            <>Correct inaccurate information.</>,
            <>
              Request deletion of certain information, subject to legal and
              clinical record-retention requirements.
            </>,
            <>Opt out of promotional communications.</>,
            <>Receive a portable copy of information you provided.</>,
            <>
              Appeal or lodge a complaint if we decline a request, where
              applicable.
            </>,
          ]}
        />
        <LegalP>
          To exercise these rights, contact{" "}
          <a
            href="mailto:support@beemahealth"
            className="text-foreground underline-offset-2 hover:underline"
          >
            support@beemahealth
          </a>
          . We will respond within the timeframe required by applicable law.
        </LegalP>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    content: (
      <LegalP>
        We retain information for as long as needed to provide the Service,
        comply with legal and regulatory obligations, resolve disputes, and
        enforce agreements. Clinical and billing records may be kept for longer
        periods as required by healthcare, tax, or licensing laws. When data is
        no longer needed, we delete or de-identify it using reasonable
        safeguards.
      </LegalP>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <LegalP>
          We use administrative, technical, and physical safeguards designed to
          protect personal information, including encryption in transit and at
          rest for sensitive systems, role-based access controls, and audit logs
          for clinical and administrative actions. We avoid logging PHI in
          application logs.
        </LegalP>
        <LegalP>
          No method of transmission or storage is completely secure. You are
          responsible for maintaining the confidentiality of your account
          credentials and for using secure channels when communicating with us.
        </LegalP>
      </>
    ),
  },
  {
    id: "children",
    title: "Children's privacy",
    content: (
      <LegalP>
        The Service is intended for adults 18 and older unless a parent or legal
        guardian provides consent where permitted by law. We do not knowingly
        collect personal information from children under 13. If you believe we
        have collected information from a child under 13, contact us so we can
        delete it.
      </LegalP>
    ),
  },
  {
    id: "international",
    title: "U.S. focus",
    content: (
      <LegalP>
        Beema Health is based in the United States and the Service is directed to
        U.S. residents. If you access the Service from outside the United
        States, you understand that information may be processed in the U.S. and
        other locations where we or our vendors operate.
      </LegalP>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <LegalP>
        We may update this Privacy Policy from time to time. When we make
        material changes, we will post the updated Policy on the Service and
        revise the &quot;Last updated&quot; date. Your continued use after
        changes become effective means you accept the updated Policy.
      </LegalP>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <LegalP>
        For privacy questions or requests, contact:
        <br />
        Beema Health, Inc.
        <br />
        Email:{" "}
        <a
          href="mailto:support@beemahealth"
          className="text-foreground underline-offset-2 hover:underline"
        >
          support@beemahealth
        </a>
      </LegalP>
    ),
  },
];

function PrivacyPage() {
  useEffect(() => {
    trackPageViewed("privacy");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Privacy Policy"
          lastUpdated="June 18, 2026"
          description="This Policy describes how Beema Health handles personal and health information across our telehealth platform."
          callout={
            <>
              <strong className="font-semibold text-foreground">
                Important:
              </strong>{" "}
              This document is provided for transparency. Have qualified legal
              counsel review it before launch or reliance for compliance
              purposes.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
