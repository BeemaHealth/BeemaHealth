import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import {
  LegalDocument,
  LegalList,
  LegalP,
  type LegalSection,
} from "@/components/site/LegalDocument";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/intake-acknowledgments")({
  head: () => ({
    meta: [
      { title: "Intake Acknowledgments — Beema Health" },
      {
        name: "description",
        content:
          "Medication risks, telehealth care, emergency instructions, and other acknowledgments for Beema Health weight-management intake.",
      },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/legal/intake-acknowledgments") },
    ],
  }),
  component: IntakeAcknowledgmentsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <LegalP>
        Before your intake is reviewed, you must read and understand the topics
        below. You agree to this document when you check the box on the final
        intake step. You sign and submit your intake on the following screen
        with your typed legal name.
      </LegalP>
    ),
  },
  {
    id: "no-guarantee",
    title: "No guarantee of prescription",
    content: (
      <LegalP>
        Completing this intake does not guarantee that a prescription will be
        issued. Treatment decisions are made solely by a licensed medical
        provider based on your health information, applicable law, and clinical
        judgment.
      </LegalP>
    ),
  },
  {
    id: "provider-review",
    title: "Licensed provider review",
    content: (
      <LegalP>
        A licensed physician, nurse practitioner, or other qualified clinician
        will review your intake before any treatment decision. You may be asked
        for additional information, labs, or an in-person visit if your provider
        determines that telehealth alone is not appropriate.
      </LegalP>
    ),
  },
  {
    id: "medication-risks",
    title: "Medication risks and side effects",
    content: (
      <>
        <LegalP>
          GLP-1 and other weight-management medications can cause side effects
          and serious complications. Common side effects may include nausea,
          vomiting, diarrhea, constipation, abdominal pain, and decreased
          appetite.
        </LegalP>
        <LegalP>Less common but serious risks may include:</LegalP>
        <LegalList
          items={[
            <>Gallbladder disease or pancreatitis</>,
            <>Kidney problems, especially with dehydration</>,
            <>Allergic reactions</>,
            <>
              Changes in mood or suicidal thoughts (seek care promptly if you
              notice new or worsening symptoms)
            </>,
            <>Drug interactions with other medications you take</>,
          ]}
        />
        <LegalP>
          Your provider will discuss benefits, risks, and alternatives before
          prescribing. Follow dosing instructions and report new or worsening
          symptoms promptly.
        </LegalP>
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
            Beema Health does not provide emergency care. Call 911 or go to the
            nearest emergency department if you experience:
          </strong>
        </LegalP>
        <LegalList
          items={[
            <>Severe or persistent abdominal pain</>,
            <>Signs of allergic reaction (swelling, rash, trouble breathing)</>,
            <>Chest pain, fainting, or severe dizziness</>,
            <>Trouble breathing</>,
            <>Any symptom you believe is a medical emergency</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "compounded",
    title: "Compounded medications",
    content: (
      <LegalP>
        If a compounded GLP-1 medication is offered, it is prepared by a
        licensed compounding pharmacy and is not FDA-approved in the same manner
        as brand-name products. Compounded medications may only be used when
        legally available in your state and clinically appropriate for you. Your
        provider will explain how compounded options differ from FDA-approved
        alternatives.
      </LegalP>
    ),
  },
  {
    id: "accuracy",
    title: "Accuracy of your information",
    content: (
      <LegalP>
        You confirm that the health information you provide in this intake is
        accurate and complete to the best of your knowledge. Withholding or
        misstating information could lead to inappropriate treatment and harm
        your health.
      </LegalP>
    ),
  },
  {
    id: "telehealth",
    title: "Telehealth care",
    content: (
      <>
        <LegalP>
          You consent to receive evaluation and follow-up care through
          telehealth when clinically appropriate. This may include secure
          messaging, questionnaires, and video or phone visits. Telehealth has
          limitations compared with in-person care.
        </LegalP>
        <LegalP>
          For full details, see our{" "}
          <Link
            to="/legal/telehealth-consent"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Telehealth Consent
          </Link>
          .
        </LegalP>
      </>
    ),
  },
  {
    id: "electronic",
    title: "Electronic communication",
    content: (
      <LegalP>
        You consent to receive care-related communications electronically
        through Beema Health, including email, SMS where you opt in, and in-app
        notifications about your intake, prescriptions, refills, and account.
      </LegalP>
    ),
  },
  {
    id: "storage",
    title: "Storage and use of intake information",
    content: (
      <>
        <LegalP>
          You consent to Beema Health securely storing your intake answers, uploaded
          documents, and related health information so that licensed providers
          can review your case, coordinate pharmacy fulfillment, and support
          your ongoing care.
        </LegalP>
        <LegalP>
          Use and disclosure of your information are described in our{" "}
          <Link
            to="/legal/privacy"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </LegalP>
      </>
    ),
  },
];

function IntakeAcknowledgmentsPage() {
  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Intake Acknowledgments & Informed Consent"
          lastUpdated="June 18, 2026"
          description="Please read this document before agreeing on the final intake step, then sign on the submit screen."
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
