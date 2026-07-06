import { useEffect } from "react";
import { absoluteUrl } from "@/lib/seo";
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

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Beema Health" },
      {
        name: "description",
        content:
          "Terms governing your use of Beema Health's weight-management telehealth platform.",
      },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/legal/terms") }],
  }),
  component: TermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    content: (
      <>
        <LegalP>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of the websites, applications, and related services operated by
          Beema Health, Inc. (&quot;Beema Health,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) (collectively, the
          &quot;Service&quot;). By creating an account, completing intake, or
          otherwise using the Service, you agree to these Terms and our Privacy
          Policy.
        </LegalP>
        <LegalP>
          If you do not agree, do not use the Service. We may update these Terms
          from time to time. Material changes will be posted on the Service with
          an updated effective date. Your continued use after changes become
          effective constitutes acceptance of the revised Terms.
        </LegalP>
      </>
    ),
  },
  {
    id: "emergency",
    title: "Medical emergencies",
    content: (
      <LegalP>
        <strong className="font-semibold text-foreground">
          If you believe you are experiencing a medical emergency, call 911 or
          seek immediate in-person emergency care.
        </strong>{" "}
        The Service is not appropriate for all medical conditions and is not a
        substitute for emergency services.
      </LegalP>
    ),
  },
  {
    id: "relationship",
    title: "Your relationship with Beema Health",
    content: (
      <>
        <LegalP>
          Beema Health is a telehealth platform that connects patients with
          independently licensed clinicians, pharmacies, and laboratories
          (&quot;Care Partners&quot;). Beema Health does not practice medicine,
          nursing, or pharmacy and does not provide medical advice.
        </LegalP>
        <LegalP>
          Using the Service does not create a doctor-patient or other
          clinician-patient relationship between you and Beema Health. You may
          establish a clinical relationship with a Provider or medical group
          made available through the Service. Each Provider and Care Partner is
          solely responsible for the professional services they deliver.
        </LegalP>
        <LegalP>
          You establish a customer relationship with Beema Health for platform
          access, care coordination, billing for eligible services, and related
          non-clinical support.
        </LegalP>
      </>
    ),
  },
  {
    id: "financial",
    title: "Financial responsibility",
    content: (
      <>
        <LegalP>
          Unless we state otherwise, services offered through Beema Health are
          provided on a direct-pay basis. Beema Health and its Care Partners may not
          participate in Medicare, Medicaid, or commercial insurance networks
          for all services. You are responsible for charges disclosed at
          checkout or in your account, including clinical visits, medications,
          shipping, and laboratory fees when applicable.
        </LegalP>
        <LegalP>
          You agree not to submit claims to government or commercial payers for
          amounts already paid through the Service unless permitted by your plan
          and applicable law. Insurance coverage, prior authorization, and
          reimbursement outcomes are not guaranteed.
        </LegalP>
      </>
    ),
  },
  {
    id: "clinical",
    title: "Clinical services and prescriptions",
    content: (
      <>
        <LegalP>
          Prescription products require a valid prescription from a licensed
          Provider after a clinical evaluation. Completing intake, paying a fee,
          or messaging a clinician does not guarantee that any prescription will
          be issued.
        </LegalP>
        <LegalP>
          Providers make independent medical decisions based on your history,
          responses, and applicable standards of care. They may request
          additional information, labs, or an in-person visit before prescribing
          or continuing treatment.
        </LegalP>
        <LegalP>
          If a prescription is issued, you may fill it through an integrated
          pharmacy partner or, where allowed, at a pharmacy you select. You are
          responsible for obtaining, storing, and using medication as directed.
        </LegalP>
      </>
    ),
  },
  {
    id: "weight-loss",
    title: "Weight-management services",
    content: (
      <>
        <LegalP>
          Beema Health focuses on medication-supported weight management under
          clinician supervision. These services are not comprehensive primary
          care and are not a substitute for ongoing care from your regular
          physician.
        </LegalP>
        <LegalP>
          GLP-1 and related medications carry risks, including gastrointestinal
          side effects, gallbladder disease, pancreatitis, and other
          complications described during intake and by your Provider. Compounded
          products, when offered, are prepared by licensed pharmacies and may
          not be FDA-approved for your indication.
        </LegalP>
        <LegalP>
          Beema Health does not claim that any product is equivalent to a specific
          branded medication. Availability, pricing, and formulary options may
          change.
        </LegalP>
      </>
    ),
  },
  {
    id: "pricing",
    title: "Pricing, billing, and refills",
    content: (
      <>
        <LegalP>
          Beema Health uses medication-forward pricing: you pay for clinical care,
          medication, shipping, and applicable labs as disclosed before you are
          charged. There is no separate platform membership fee unless we
          clearly identify one at checkout.
        </LegalP>
        <LegalP>
          Recurring medication or refill plans, when offered, renew
          automatically at the interval shown at checkout until you cancel in
          accordance with the instructions provided in your account or by
          contacting support. Cancellation timing may affect whether an upcoming
          shipment or charge proceeds.
        </LegalP>
        <LegalP>
          Prices, promotions, and product availability may change. We will
          provide reasonable notice of recurring charge changes when required by
          law.
        </LegalP>
      </>
    ),
  },
  {
    id: "telehealth-consent",
    title: "Consent to telehealth",
    content: (
      <LegalP>
        To use clinical features of the Service, you must review and agree to
        our{" "}
        <a
          href="/legal/telehealth-consent"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Telehealth Consent
        </a>
        . You agree that Beema Health is a third-party beneficiary of that Consent
        and may enforce it to the extent permitted by law.
      </LegalP>
    ),
  },
  {
    id: "phi",
    title: "Protected health information",
    content: (
      <>
        <LegalP>
          You may provide health and medical information through the Service.
          Beema Health may be a business associate of certain Care Partners and, in
          that role, handle protected health information (&quot;PHI&quot;)
          subject to applicable law, including HIPAA where it applies.
        </LegalP>
        <LegalP>
          HIPAA does not apply to every entity that handles health-related data.
          Information that is not PHI or otherwise protected under applicable
          law may be used as described in our Privacy Policy. State privacy laws
          may provide additional protections.
        </LegalP>
      </>
    ),
  },
  {
    id: "communications",
    title: "Electronic communications and messaging",
    content: (
      <>
        <LegalP>
          You consent to receive disclosures, care messages, billing notices,
          and administrative communications electronically through the Service,
          email, SMS, or other channels you provide. It is your responsibility
          to keep contact information current and to review communications
          promptly.
        </LegalP>
        <LegalP>
          If you opt in to marketing or transactional text messages, message and
          data rates may apply. You may opt out of promotional messages using
          the instructions provided; service-related messages may continue while
          you have an active account or open clinical matter.
        </LegalP>
        <LegalP>
          Neither Beema Health nor your Provider is responsible for losses resulting
          from your failure to read or act on communications sent through the
          Service.
        </LegalP>
      </>
    ),
  },
  {
    id: "account",
    title: "Account eligibility and accuracy",
    content: (
      <>
        <LegalP>
          You must be at least 18 years old and located in a state where we
          offer services, unless a parent or legal guardian provides consent
          where permitted by law. You may use the Service only for yourself or
          for a minor for whom you are authorized to consent.
        </LegalP>
        <LegalP>
          You agree to provide accurate, complete, and current information and
          to update it as needed. Misrepresentation may result in termination of
          access and could affect your care.
        </LegalP>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited conduct",
    content: (
      <>
        <LegalP>You agree not to:</LegalP>
        <LegalList
          items={[
            <>Use the Service for unlawful, fraudulent, or abusive purposes.</>,
            <>
              Attempt to obtain controlled or prescription medications without a
              legitimate clinical indication.
            </>,
            <>Share account credentials or impersonate another person.</>,
            <>Interfere with the security or operation of the Service.</>,
            <>
              Scrape, copy, or reverse engineer the Service except as allowed by
              law.
            </>,
            <>
              Use the Service on behalf of another adult without authorization.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <LegalP>
        The Service, including its design, text, graphics, logos, and software,
        is owned by Beema Health or its licensors and is protected by
        intellectual-property laws. You receive a limited, non-exclusive,
        non-transferable license to use the Service for personal, non-commercial
        purposes in accordance with these Terms.
      </LegalP>
    ),
  },
  {
    id: "third-party",
    title: "Third-party services",
    content: (
      <LegalP>
        The Service may link to or integrate third-party websites, payment
        processors, pharmacies, laboratories, or tools. Those parties operate
        under their own terms and privacy policies. Beema Health is not responsible
        for third-party services except as expressly stated in writing.
      </LegalP>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <LegalP>
        THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
        AVAILABLE&quot; BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, BEEMA HEALTH
        AND ITS CARE PARTNERS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
        INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL
        BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS, OR THAT ANY
        CLINICAL OR MEDICATION OUTCOME WILL BE ACHIEVED.
      </LegalP>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <LegalP>
          TO THE FULLEST EXTENT PERMITTED BY LAW, BEEMA HEALTH WILL NOT BE LIABLE FOR
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
          FOR LOST PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE
          SERVICE.
        </LegalP>
        <LegalP>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE
          SERVICE OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT
          YOU PAID TO BEEMA HEALTH FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE
          EVENT GIVING RISE TO THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100),
          EXCEPT WHERE SUCH LIMITATIONS ARE PROHIBITED BY LAW.
        </LegalP>
        <LegalP>
          Some jurisdictions do not allow certain exclusions or limitations, so
          some of the above may not apply to you.
        </LegalP>
      </>
    ),
  },
  {
    id: "disputes",
    title: "Dispute resolution",
    content: (
      <>
        <LegalP>
          Before filing a formal claim, you agree to contact us at{" "}
          <a
            href="mailto:support@beemahealth"
            className="text-foreground underline-offset-2 hover:underline"
          >
            support@beemahealth
          </a>{" "}
          and attempt to resolve the dispute informally.
        </LegalP>
        <LegalP>
          Except where prohibited by law, you and Beema Health agree that disputes
          arising out of these Terms or the Service will be resolved through
          binding individual arbitration rather than in court, and that each
          party waives the right to participate in a class action. You may opt
          out of arbitration within thirty (30) days of first accepting these
          Terms by sending written notice to the address below with your name,
          account email, and a clear statement that you opt out.
        </LegalP>
        <LegalP>
          Either party may seek injunctive relief in court for misuse of
          intellectual property or unauthorized access to the Service. Claims
          must be brought within one (1) year after the event giving rise to the
          claim, unless a longer period is required by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: (
      <LegalP>
        We may suspend or terminate your access if you violate these Terms,
        create risk for us or others, or as required by law. You may stop using
        the Service at any time. Provisions that by their nature should survive
        termination — including payment obligations, disclaimers, limitations of
        liability, and dispute resolution — will survive.
      </LegalP>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    content: (
      <LegalP>
        These Terms are governed by the laws of the State of Colorado, without
        regard to conflict-of-law rules, except where federal law applies.
        Subject to the dispute-resolution section, courts located in Colorado
        will have exclusive jurisdiction over any non-arbitrable disputes.
      </LegalP>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <LegalP>
        Beema Health, Inc.
        <br />
        Email:{" "}
        <a
          href="mailto:support@beemahealth"
          className="text-foreground underline-offset-2 hover:underline"
        >
          support@beemahealth
        </a>
        <br />
        Website:{" "}
        <a
          href="https://beemahealth"
          className="text-foreground underline-offset-2 hover:underline"
        >
          beemahealth
        </a>
      </LegalP>
    ),
  },
];

function TermsPage() {
  useEffect(() => {
    trackPageViewed("terms");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Terms of Service"
          lastUpdated="June 18, 2026"
          description="These Terms explain how you may use Beema Health and what to expect from our platform and Care Partners."
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
