import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, LegalList, LegalP, type LegalSection } from "@/components/site/LegalDocument";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/telehealth-consent")({
  head: () => ({
    meta: [
      { title: "Telehealth Consent — Aretide" },
      { name: "description", content: "Informed consent for receiving weight-management care via telehealth through Aretide." },
    ],
    links: [{ rel: "canonical", href: "/legal/telehealth-consent" }],
  }),
  component: TelehealthConsentPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose",
    content: (
      <>
        <LegalP>
          This Telehealth Consent (&quot;Consent&quot;) explains how care is delivered remotely through Aretide and asks for
          your informed consent to receive healthcare via telehealth from independently licensed physicians, nurse
          practitioners, physician assistants, and other qualified clinicians (&quot;Providers&quot;).
        </LegalP>
        <LegalP>
          Aretide Health, Inc. (&quot;Aretide,&quot; &quot;we,&quot; or &quot;us&quot;) operates the Aretide platform (the
          &quot;Service&quot;). Aretide is a technology and care-coordination platform — not a medical practice. Clinical
          decisions are made solely by your Provider.
        </LegalP>
      </>
    ),
  },
  {
    id: "use-of-telehealth",
    title: "Use of telehealth",
    content: (
      <>
        <LegalP>
          Telehealth involves delivering healthcare when you and your Provider are not in the same physical location.
          Care may include secure messaging, asynchronous questionnaires, photo or document uploads, video or phone
          visits when clinically appropriate, and electronic transmission of medical records and prescriptions.
        </LegalP>
        <LegalP>
          In-person care may be available from other healthcare professionals. You may discuss alternatives with your
          Provider at any time and may choose a different method of care.
        </LegalP>
      </>
    ),
  },
  {
    id: "benefits",
    title: "Anticipated benefits",
    content: (
      <LegalP>
        Telehealth may make it easier to access weight-management care, communicate with a Provider on your schedule,
        receive follow-up without traveling to an office, and coordinate prescriptions, labs, and refill support
        through a single platform.
      </LegalP>
    ),
  },
  {
    id: "risks",
    title: "Potential risks and limitations",
    content: (
      <>
        <LegalP>Telehealth has limitations. Possible risks include:</LegalP>
        <LegalList
          items={[
            <>The quality, accuracy, or effectiveness of care may be limited compared with an in-person visit.</>,
            <>Technology failures, outages, or errors may delay diagnosis, treatment, or communication.</>,
            <>Your Provider may be unable to perform certain physical exams, vital-sign checks, or in-office tests remotely.</>,
            <>Your condition may not be suitable for telehealth, and you may need in-person, specialist, or emergency care.</>,
            <>Delays may occur if your Provider is unavailable or if information you provide is incomplete or inaccurate.</>,
            <>Electronic systems can fail or be breached despite safeguards, which could affect privacy.</>,
            <>Email, SMS, or other channels you use outside the Service may not be secure.</>,
            <>Limited access to your full medical history may increase the risk of drug interactions or missed diagnoses.</>,
            <>State rules may limit certain prescriptions or treatment options through telehealth.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "emergency",
    title: "Emergency and urgent care",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            If you think you are having a medical emergency, call 911 or go to the nearest emergency department
            immediately.
          </strong>{" "}
          Do not use Aretide for emergency or crisis care.
        </LegalP>
        <LegalP>
          Providers may not respond immediately to messages sent through the Service. If you need urgent in-person
          evaluation, seek care at an emergency facility or urgent-care center equipped to treat your condition.
        </LegalP>
        <LegalP>
          If a technical failure prevents you from reaching your Provider through the Service, contact{" "}
          <a href="mailto:support@aretide.com" className="text-foreground underline-offset-2 hover:underline">
            support@aretide.com
          </a>
          .
        </LegalP>
      </>
    ),
  },
  {
    id: "clinical-limitations",
    title: "Clinical suitability",
    content: (
      <>
        <LegalP>
          Not every condition can be diagnosed or treated through telehealth. Your Provider will assess whether
          telehealth is medically appropriate for you. If your Provider determines that your condition requires
          in-person evaluation, specialist referral, or a different level of care, you agree to follow that guidance.
        </LegalP>
        <LegalP>
          Completing intake or receiving a telehealth visit does not guarantee that a prescription will be issued.
          All treatment decisions are made independently by your Provider based on clinical judgment.
        </LegalP>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy and security",
    content: (
      <>
        <LegalP>
          We use administrative, technical, and physical safeguards designed to protect information transmitted through
          the Service, including encryption in transit, access controls, and audit logging for sensitive actions.
        </LegalP>
        <LegalP>
          Your information may be used and disclosed as described in our Privacy Policy and as permitted by law for
          treatment, payment, healthcare operations, and related administrative purposes. We cannot guarantee the
          security of systems outside our control, such as your personal email or mobile carrier.
        </LegalP>
      </>
    ),
  },
  {
    id: "records",
    title: "Access to health records",
    content: (
      <LegalP>
        By accepting this Consent, you authorize your Provider and authorized clinical staff to access, review, and use
        health information you provide through the Service — including intake answers, uploaded documents, prior
        prescriptions, lab results, and communications — as needed for diagnosis, treatment, follow-up, and care
        coordination.
      </LegalP>
    ),
  },
  {
    id: "labs",
    title: "Laboratory and diagnostic services",
    content: (
      <>
        <LegalP>
          Some care plans may require laboratory testing or other diagnostics. If ordered, you may need to visit a
          designated lab, use an at-home collection kit, or provide results from another licensed facility. You are
          responsible for following collection instructions and completing tests within any stated timeframe.
        </LegalP>
        <LegalP>
          Test availability, accuracy, and turnaround times depend on the laboratory and your circumstances. Your
          Provider will explain how results affect your care.
        </LegalP>
      </>
    ),
  },
  {
    id: "prescriptions",
    title: "Prescriptions and pharmacy choice",
    content: (
      <>
        <LegalP>
          If a Provider writes a prescription, you may fill it through a pharmacy partner integrated with Aretide or,
          where permitted, at a pharmacy of your choice. Prescriptions may be transferred between pharmacies as needed
          to fulfill your order.
        </LegalP>
        <LegalP>
          Aretide and affiliated entities may have commercial relationships with pharmacy partners. You are free to
          obtain prescriptions elsewhere by updating your pharmacy preferences or contacting support, subject to
          applicable law and pharmacy policies.
        </LegalP>
        <LegalP>
          Some products discussed on the Service — including compounded GLP-1 medications when legally available — may
          not be FDA-approved for your specific use. Your Provider will explain risks, benefits, and alternatives
          before treatment.
        </LegalP>
      </>
    ),
  },
  {
    id: "acknowledgments",
    title: "Your acknowledgments",
    content: (
      <>
        <LegalP>By using the Service for clinical care, you acknowledge that:</LegalP>
        <LegalList
          items={[
            <>You have read and understand the benefits, risks, and limitations of telehealth described in this Consent.</>,
            <>You will provide truthful, accurate, and complete information to Aretide and your Provider.</>,
            <>You are responsible for monitoring communications about your care and following treatment instructions.</>,
            <>Some visits may be conducted by nurse practitioners or physician assistants where permitted by law.</>,
            <>No specific outcome, prescription, or test result is guaranteed.</>,
            <>Treatment sessions through the Service are not routinely recorded unless you are separately notified and agree.</>,
            <>You may ask questions about telehealth before or during your care.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "withdrawal",
    title: "Withdrawing consent",
    content: (
      <>
        <LegalP>
          You may withdraw consent to telehealth at any time by notifying your Provider in writing or contacting{" "}
          <a href="mailto:support@aretide.com" className="text-foreground underline-offset-2 hover:underline">
            support@aretide.com
          </a>
          . Withdrawal does not affect care already provided in reliance on this Consent and does not entitle you to
          in-person treatment from Providers who offer care exclusively through telehealth.
        </LegalP>
        <LegalP>
          Withdrawing telehealth consent may limit or end your ability to receive certain services through Aretide.
        </LegalP>
      </>
    ),
  },
];

function TelehealthConsentPage() {
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Telehealth Consent"
          lastUpdated="June 18, 2026"
          description="Please read this document carefully before starting care through Aretide."
          callout={
            <>
              <strong className="font-semibold text-foreground">Important:</strong> This document is provided for
              transparency and patient education. Have qualified legal counsel review it before relying on it for
              regulatory or clinical compliance.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
