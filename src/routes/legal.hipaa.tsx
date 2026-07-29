import { useEffect } from "react";
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
import {
  BUSINESS_ADDRESS_SINGLE_LINE,
  LEGAL_BUSINESS_NAME,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "@/lib/contact-info";
import { SITE_URL, canonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/legal/hipaa")({
  head: () => ({
    meta: [
      { title: "HIPAA Privacy Policy | Beema Health" },
      {
        name: "description",
        content:
          "Beema Health Notice of Privacy Practices for Protected Health Information (PHI) under HIPAA.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/hipaa") }],
  }),
  component: HipaaPrivacyPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "notice",
    title: "Notice of Privacy Practices for Protected Health Information (PHI)",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            {LEGAL_BUSINESS_NAME} HIPAA Privacy Statement
          </strong>
        </LegalP>
        <LegalP>Effective Date: July 29, 2026</LegalP>
        <LegalP>
          This Notice of Privacy Practices (&quot;Notice&quot;) describes how{" "}
          {LEGAL_BUSINESS_NAME} (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) may use and disclose your Protected Health
          Information (PHI) to carry out treatment, payment, or healthcare
          operations and for other purposes that are permitted or required by
          law. This Notice also describes your rights regarding your PHI. We are
          required by law to maintain the privacy of your PHI, provide you with
          this Notice of our legal duties and privacy practices, and to abide by
          the terms of this Notice.
        </LegalP>
      </>
    ),
  },
  {
    id: "uses-disclosures",
    title: "Uses and Disclosures of PHI",
    content: (
      <>
        <LegalP>
          We may use and disclose your PHI for the following purposes:
        </LegalP>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">
                Treatment:
              </strong>{" "}
              We may use and disclose your PHI to provide, coordinate, or manage
              your healthcare and related services. This may include
              communication with other healthcare providers about your treatment
              and coordinating your care with other providers.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Payment:
              </strong>{" "}
              We may use and disclose your PHI to obtain payment for healthcare
              services provided to you. This may include contacting your
              insurance company to verify your coverage, billing and collection
              activities, and sharing PHI with other healthcare providers,
              insurance companies, or collection agencies.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Healthcare Operations:
              </strong>{" "}
              We may use and disclose your PHI for healthcare operations,
              including quality assessment, improvement activities, case
              management, accreditation, licensing, credentialing, and
              conducting or arranging for medical reviews, audits, or legal
              services.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                As Required by Law:
              </strong>{" "}
              We may use and disclose your PHI when required to do so by
              federal, state, or local law.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Public Health and Safety:
              </strong>{" "}
              We may use and disclose your PHI to prevent or control disease,
              injury, or disability, to report child abuse or neglect, to report
              reactions to medications or problems with products, and to notify
              persons who may have been exposed to a communicable disease or may
              be at risk of spreading a disease or condition.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Health Oversight Activities:
              </strong>{" "}
              We may disclose your PHI to health oversight agencies for
              activities authorized by law, such as audits, investigations,
              inspections, and licensure.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Judicial and Administrative Proceedings:
              </strong>{" "}
              We may disclose your PHI in response to a court or administrative
              order, subpoena, discovery request, or other lawful process.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Law Enforcement:
              </strong>{" "}
              We may disclose your PHI for law enforcement purposes, such as to
              report certain types of wounds or injuries, or to comply with a
              court order, warrant, or other legal process.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Research:
              </strong>{" "}
              We may use and disclose your PHI for research purposes when the
              research has been approved by an institutional review board and
              privacy protections are in place.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Organ and Tissue Donation:
              </strong>{" "}
              If you are an organ donor, we may disclose your PHI to
              organizations that handle organ procurement, transplantation, or
              donation.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Workers&apos; Compensation:
              </strong>{" "}
              We may disclose your PHI for workers&apos; compensation or similar
              programs that provide benefits for work-related injuries or
              illnesses.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Military and Veterans:
              </strong>{" "}
              If you are a member of the armed forces, we may disclose your PHI
              as required by military authorities.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Inmates:
              </strong>{" "}
              If you are an inmate, we may disclose your PHI to the correctional
              institution or law enforcement official having custody of you.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights Regarding PHI",
    content: (
      <>
        <LegalP>You have the following rights with respect to your PHI:</LegalP>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">
                Right to Inspect and Copy:
              </strong>{" "}
              You have the right to inspect and copy your PHI that we maintain,
              with certain exceptions. To request access, submit a written
              request to our Privacy Officer. We may charge a reasonable fee for
              the costs of copying, mailing, or other supplies associated with
              your request.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to Amend:
              </strong>{" "}
              You have the right to request an amendment to your PHI if you
              believe it is incorrect or incomplete. To request an amendment,
              submit a written request to our Privacy Officer, specifying the
              information you believe is incorrect and why. We may deny your
              request if we believe the information is accurate and complete, or
              if we did not create the information.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to an Accounting of Disclosures:
              </strong>{" "}
              You have the right to request an accounting of disclosures of your
              PHI made by us in the past six years, except for disclosures made
              for treatment, payment, or healthcare operations, and certain
              other disclosures. To request an accounting, submit a written
              request to our Privacy Officer.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to Request Restrictions:
              </strong>{" "}
              You have the right to request a restriction on our use or
              disclosure of your PHI for treatment, payment, or healthcare
              operations. We are not required to agree to your request but will
              consider it. To request a restriction, submit a written request to
              our Privacy Officer, specifying the restriction you are requesting
              and to whom it applies.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to Request Confidential Communications:
              </strong>{" "}
              You have the right to request that we communicate with you about
              your PHI in a certain way or at a certain location. To request
              confidential communications, submit a written request to our
              Privacy Officer, specifying how or where you wish to be contacted.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to a Paper Copy of This Notice:
              </strong>{" "}
              You have the right to receive a paper copy of this Notice, even if
              you have agreed to receive it electronically. To obtain a paper
              copy of this Notice, contact our Privacy Officer.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to be Notified of a Breach:
              </strong>{" "}
              You have the right to be notified in the event that we discover a
              breach of your PHI.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "transmission",
    title: "Transmission of PHI",
    content: (
      <LegalP>
        We are committed to protecting the privacy of your PHI and will ensure
        that any electronic transmission of PHI complies with the Health
        Insurance Portability and Accountability Act (HIPAA) Privacy Rule (45
        CFR 164). This includes the use of Secure-Socket Layer (SSL) or
        equivalent technology for the transmission of PHI, as well as adherence
        to all applicable security standards for online transmissions of PHI.
      </LegalP>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Notice",
    content: (
      <LegalP>
        We reserve the right to change this Notice and the revised Notice will
        be effective for PHI we already have about you, as well as any
        information we receive in the future. We will post a copy of the current
        Notice in our office and on our website. The Notice will contain the
        effective date on the first page.
      </LegalP>
    ),
  },
  {
    id: "complaints",
    title: "Complaints",
    content: (
      <LegalP>
        If you believe your privacy rights have been violated, you may file a
        complaint with our Privacy Officer or with the Secretary of the
        Department of Health and Human Services. You will not be retaliated
        against for filing a complaint.
      </LegalP>
    ),
  },
  {
    id: "contact",
    title: "Contact Information",
    content: (
      <>
        <LegalP>
          To exercise any of your rights, or if you have any questions about
          this Notice or our privacy practices, please contact our Privacy
          Officer at:
        </LegalP>
        <LegalP>
          {LEGAL_BUSINESS_NAME}
          <br />
          {BUSINESS_ADDRESS_SINGLE_LINE}
          <br />
          <a
            href={SITE_URL}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SITE_URL}
          </a>
          <br />
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          <br />
          Phone:{" "}
          <a
            href={SUPPORT_PHONE_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </LegalP>
        <LegalP>
          This Notice is provided in accordance with the Notice of Privacy
          Practices for Protected Health Information from the Department of
          Health and Human Services&apos; Model and is applicable across all US
          states.
        </LegalP>
      </>
    ),
  },
  {
    id: "california",
    title: "Rights of Specific Jurisdictions — California Residents",
    content: (
      <>
        <LegalP>
          Certain states may have additional privacy protections that apply to
          your PHI. The following is an example of specific rights in the state
          of California. If you reside in a state with additional privacy
          protections, you may have additional rights related to your PHI.
        </LegalP>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">
                Right to Access:
              </strong>{" "}
              In addition to the rights described above, California residents
              have the right to request access to their PHI in a readily usable
              electronic format, as well as any additional information required
              by California law. To request access, submit a written request to
              our Privacy Officer.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Right to Restrict Certain Disclosures:
              </strong>{" "}
              California residents have the right to request restrictions on
              certain disclosures of their PHI to health plans if they paid
              out-of-pocket for a specific healthcare item or service in full.
              To request such a restriction, submit a written request to our
              Privacy Officer.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Confidentiality of Medical Information Act (CMIA):
              </strong>{" "}
              California residents are protected by the Confidentiality of
              Medical Information Act (CMIA), which provides additional privacy
              protections for medical information. We are required to comply
              with CMIA in addition to HIPAA.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Marketing and Sale of PHI:
              </strong>{" "}
              California residents have the right to request that their PHI not
              be used for marketing purposes or sold to third parties without
              their authorization. To request a restriction on the use of your
              PHI for marketing or the sale of your PHI, submit a written
              request to our Privacy Officer.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Minor&apos;s Rights:
              </strong>{" "}
              If you are a minor (under the age of 18), you have the right to
              request that certain information related to certain sensitive
              services, such as reproductive health, mental health, or substance
              use disorder treatment, not be disclosed to your parent or
              guardian without your consent. To request a restriction on the
              disclosure of such information, submit a written request to our
              Privacy Officer.
            </>,
          ]}
        />
        <LegalP>
          If you reside in a state other than California, please consult your
          state&apos;s specific privacy laws for information about any
          additional rights you may have regarding your PHI. You may also
          contact our Privacy Officer for more information about your rights
          under specific state laws.
        </LegalP>
      </>
    ),
  },
  {
    id: "state-specific",
    title: "State-Specific Provisions",
    content: (
      <>
        <LegalP>
          {LEGAL_BUSINESS_NAME} Privacy Policy: Notice of Privacy Practices for
          Protected Health Information (PHI) — State-Specific Provisions
        </LegalP>
        <LegalP>
          In addition to the privacy practices described in our Notice of
          Privacy Practices for Protected Health Information, we comply with
          applicable state-specific privacy laws related to PHI.
        </LegalP>
        <LegalP>
          The following are examples of a few states with additional privacy
          protections:
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">New York:</strong>{" "}
          For residents of New York, we comply with the New York State
          Confidentiality of Information Law, which provides additional privacy
          protections for HIV-related information, mental health records, and
          genetic testing results. We will obtain written consent before
          disclosing such information, even for treatment, payment, or
          healthcare operations.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">Texas:</strong> For
          residents of Texas, we comply with the Texas Medical Privacy Act,
          which offers privacy protections beyond HIPAA, including requiring
          consent for certain disclosures of PHI, additional safeguards for
          electronic PHI, and specific requirements for the destruction of PHI.
          We also adhere to Texas&apos;s specific privacy protections for mental
          health records and substance use treatment records.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">Florida:</strong>{" "}
          For residents of Florida, we comply with Florida&apos;s privacy laws,
          which offer additional protections for mental health records,
          HIV/AIDS-related information, and substance abuse treatment records.
          We will obtain written consent before disclosing such information,
          even for treatment, payment, or healthcare operations. We also
          implement specific security measures to protect electronic PHI, as
          required by Florida law.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">Illinois:</strong>{" "}
          For residents of Illinois, we comply with Illinois&apos;s specific
          privacy laws related to mental health records, HIV/AIDS-related
          information, and genetic testing results. We will obtain written
          consent before disclosing such information, even for treatment,
          payment, or healthcare operations. In addition, we will notify
          patients of any unauthorized access to their electronic PHI, as
          required by Illinois law.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Massachusetts:
          </strong>{" "}
          For residents of Massachusetts, we comply with Massachusetts&apos;s
          specific privacy laws related to mental health records,
          HIV/AIDS-related information, and genetic testing results. We will
          obtain written consent before disclosing such information, even for
          treatment, payment, or healthcare operations. We also implement
          specific security measures to protect electronic PHI, as required by
          Massachusetts law.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">California:</strong>{" "}
          For residents of California, we comply with the Confidentiality of
          Medical Information Act (CMIA), as well as California&apos;s specific
          privacy laws related to marketing, sale of PHI, and minors&apos;
          rights. We will obtain written consent before disclosing certain
          information and adhere to additional privacy protections, as required
          by California law.
        </LegalP>
      </>
    ),
  },
];

function HipaaPrivacyPage() {
  useEffect(() => {
    trackPageViewed("hipaa");
  }, []);
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="HIPAA Privacy Policy"
          lastUpdated="July 29, 2026"
          description={`${LEGAL_BUSINESS_NAME} Notice of Privacy Practices for Protected Health Information (PHI).`}
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
