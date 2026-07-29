import { useEffect, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { canonicalUrl } from "@/lib/seo";
import {
  LegalBusinessContact,
  LegalDocument,
  LegalList,
  LegalP,
  type LegalSection,
} from "@/components/site/LegalDocument";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact-info";

export const Route = createFileRoute("/legal/physician-code-of-conduct")({
  head: () => ({
    meta: [
      { title: "Physician Code of Conduct | Beema Health" },
      {
        name: "description",
        content:
          "Beema Health clinical policy: standards for physicians providing care through Beema Health-branded services on the Bask platform.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: canonicalUrl("/legal/physician-code-of-conduct"),
      },
    ],
  }),
  component: PhysicianCodeOfConductPage,
});

function ConductItem({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <strong className="font-semibold text-foreground">{title}</strong>{" "}
      {children}
    </>
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "purpose-scope",
    title: "Purpose and scope",
    content: (
      <>
        <LegalP>
          Beema Health seeks to make appropriate, high-quality healthcare easier
          to access and navigate. This Code establishes baseline conduct
          expectations for physicians who provide care through Beema
          Health-branded services using the Bask technology platform (the
          &quot;Platform&quot;).
        </LegalP>
        <LegalP>
          This Code supplements, and does not replace, applicable federal and
          state law; licensing-board rules; the policies, protocols, and
          agreements of the applicable licensed medical group; payer or pharmacy
          requirements; and generally accepted standards of medical practice.
          When requirements differ, physicians must follow the stricter
          applicable standard and promptly seek guidance from the designated
          Medical Operations Team.
        </LegalP>
        <LegalP>
          For this Code, &quot;Medical Operations Team&quot; means the clinical
          operations contact designated by the physician&apos;s contracting
          medical group and/or Bask for the applicable program. Beema Health
          support may assist with nonclinical platform and customer-service
          matters but does not direct clinical care.
        </LegalP>
      </>
    ),
  },
  {
    id: "patient-centered",
    title: "Patient-centered professional conduct",
    content: (
      <LegalList
        items={[
          <ConductItem key="patient" title="Be patient and respectful.">
            Telemedicine may be unfamiliar to patients. Explain processes and
            options in plain language, invite questions, and respond without
            ridicule, hostility, or judgment.
          </ConductItem>,
          <ConductItem key="explain" title="Explain each decision.">
            Give the patient a clinically meaningful explanation when
            recommending, modifying, or declining treatment. Do not promise a
            diagnosis, prescription, refund, outcome, or delivery date outside
            your authority.
          </ConductItem>,
          <ConductItem
            key="discrimination"
            title="Practice without discrimination."
          >
            Provide professional care without discrimination on a legally
            protected or clinically irrelevant basis. Use respectful language
            and accommodate disability, language, and health-literacy needs when
            reasonably available.
          </ConductItem>,
          <ConductItem key="boundaries" title="Maintain boundaries.">
            Keep communications professional and clinically relevant. Do not
            harass, exploit, retaliate against, or pursue an inappropriate
            personal, romantic, financial, or social relationship with a
            patient.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "availability",
    title: "Availability, work queues, and handoffs",
    content: (
      <LegalList
        items={[
          <ConductItem key="queues" title="Check assigned work and messages.">
            When scheduled or responsible for coverage, review assigned patient
            messages and work queues at least once each business day and as
            otherwise required by the applicable service-level, clinical, or
            on-call policy.
          </ConductItem>,
          <ConductItem key="coverage" title="Arrange coverage.">
            Provide notice of planned absences as early as practicable and in
            accordance with contractual requirements. For illness or emergency,
            notify the Medical Operations Team as soon as reasonably possible so
            safe coverage can be arranged.
          </ConductItem>,
          <ConductItem key="priority" title="Use clinical priority.">
            Process routine consultations in chronological order unless urgency,
            patient safety, continuity of care, an active adverse event, or an
            authorized queue instruction requires a different priority.
          </ConductItem>,
          <ConductItem key="conflict" title="Avoid conflicting care.">
            Do not take over an active consultation assigned to another
            clinician unless a handoff, coverage need, escalation, or second
            opinion has been authorized. Complete one substantive consultation
            at a time and give it your full attention.
          </ConductItem>,
          <ConductItem key="handoffs" title="Document handoffs.">
            Record the reason, status, pending actions, and responsible
            clinician whenever care is transferred.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "identity-licensure",
    title: "Identity, location, licensure, and consent",
    content: (
      <LegalList
        items={[
          <ConductItem key="verify" title="Verify the patient.">
            Before providing care, confirm the patient&apos;s identity using the
            Platform&apos;s required process. Compare the live or submitted
            photo with government-issued identification and confirm that name,
            date of birth, and other required demographics match. Automated
            verification assists but does not replace physician review. Pause
            and escalate material discrepancies.
          </ConductItem>,
          <ConductItem
            key="location"
            title="Confirm the patient's current physical location."
          >
            Confirm and document the jurisdiction in which the patient is
            physically located for the encounter or asynchronous episode before
            diagnosing, treating, or prescribing. Do not assume that residence,
            shipping address, or prior location is current.
          </ConductItem>,
          <ConductItem key="identify" title="Identify yourself.">
            Make your name, professional role, relevant credentials, and state
            of practice available to the patient as required by law and
            medical-group policy.
          </ConductItem>,
          <ConductItem key="authority" title="Confirm authority to practice.">
            Provide care only when appropriately licensed, registered,
            credentialed, privileged, and covered for the patient&apos;s
            location and the services provided. Maintain all required
            professional liability coverage, DEA registration, and
            controlled-substance authority, as applicable.
          </ConductItem>,
          <ConductItem
            key="consent"
            title="Establish the relationship and obtain consent."
          >
            Do not provide medical advice, diagnosis, treatment, or
            prescriptions until the physician-patient relationship and any
            required telemedicine and treatment consents have been established
            and documented under the law of the patient&apos;s location.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "clinical-evaluation",
    title: "Clinical evaluation and prescribing",
    content: (
      <LegalList
        items={[
          <ConductItem key="standard" title="Use the same standard of care.">
            Telemedicine does not lower the standard of care. Obtain a relevant
            history, review available records, ask follow-up questions, and
            obtain or arrange examination, laboratory testing, vital signs,
            imaging, or other information when clinically indicated.
          </ConductItem>,
          <ConductItem
            key="questionnaire"
            title="Do not rely on an inadequate questionnaire."
          >
            A questionnaire may support an evaluation but may not substitute for
            the individualized clinical assessment needed to meet the standard
            of care. If the modality or available information is insufficient,
            pause, request more information, arrange synchronous or in-person
            evaluation, or refer the patient.
          </ConductItem>,
          <ConductItem key="meds" title="Review medications and risks.">
            Review allergies, reported medications and supplements, relevant
            diagnoses, prior Platform treatment plans, contraindications, and
            clinically significant interactions before making a treatment
            decision.
          </ConductItem>,
          <ConductItem
            key="prescribe"
            title="Prescribe independently and lawfully."
          >
            Prescribe only when medically indicated and permitted by applicable
            federal and state law, medical-group policy, and the current
            standard of care. Check the applicable prescription drug monitoring
            program when required. Never prescribe when safety or legal
            authority is uncertain; seek clinical review or refer instead.
          </ConductItem>,
          <ConductItem
            key="competence"
            title="Remain within competence and scope."
          >
            Do not diagnose or treat beyond your training, experience, scope, or
            the approved program. Refer for in-person, urgent, specialty, or
            primary care when the patient&apos;s needs exceed what telemedicine
            or the program can safely provide.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "documentation",
    title: "Documentation, follow-up, and continuity",
    content: (
      <LegalList
        items={[
          <ConductItem key="record" title="Create a complete, timely record.">
            Document the relevant history, identity and location verification,
            evaluation modality, assessment, clinical reasoning, consents,
            orders, prescriptions, patient instructions, communications,
            follow-up plan, referrals, and disposition. Use objective,
            respectful language and never alter or backdate a record improperly.
          </ConductItem>,
          <ConductItem key="exceptions" title="Explain exceptions and flags.">
            When approving treatment despite a Platform flag, potential
            contraindication, or apparent inconsistency, document the additional
            information obtained, how it was obtained, and the clinical
            rationale for the decision.
          </ConductItem>,
          <ConductItem key="followup" title="Provide appropriate follow-up.">
            Use the program&apos;s configured follow-up workflow and add earlier
            or additional follow-up when clinically indicated. Do not rely
            solely on automated outreach when the standard of care requires
            clinician action.
          </ConductItem>,
          <ConductItem key="continuity" title="Support continuity of care.">
            Give patients clear instructions for questions, worsening symptoms,
            adverse effects, and follow-up. Coordinate or share records with the
            patient&apos;s authorized care team when permitted and clinically
            appropriate. Avoid abandonment and arrange an appropriate transition
            when ending care.
          </ConductItem>,
          <ConductItem key="unresolved" title="Track unresolved items.">
            Follow through on ordered tests, referrals, medication issues,
            adverse events, and patient messages until responsibility is
            transferred and the transfer is documented.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "patient-safety",
    title: "Patient safety and emergency escalation",
    content: (
      <LegalList
        items={[
          <ConductItem key="uncertainty" title="Clarify uncertainty.">
            If information is unclear, incomplete, contradictory, or suggests
            elevated risk, contact the patient or obtain additional records
            before proceeding. Seek a qualified second opinion when appropriate.
          </ConductItem>,
          <ConductItem
            key="urgent"
            title="Recognize urgent and emergent conditions."
          >
            Follow the current emergency and escalation protocol for severe
            symptoms, suicidality or self-harm risk, acute mental-status change,
            serious adverse reactions, suspected overdose, or other urgent
            concerns. Confirm the patient&apos;s location and direct the patient
            to the level of local care appropriate to the severity; do not use a
            blanket emergency-department referral when individualized triage is
            feasible and safe.
          </ConductItem>,
          <ConductItem key="adverse" title="Escalate adverse events.">
            Promptly report suspected serious adverse events, medication errors,
            safety events, and urgent patient complaints through the designated
            clinical channel, while taking immediate steps necessary to protect
            the patient.
          </ConductItem>,
          <ConductItem key="protocols" title="Review current protocols.">
            Use the current condition-specific protocols, emergency plan, and
            formulary guidance as continuing references. Protocols support but
            do not replace independent clinical judgment or the standard of
            care.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "privacy-security",
    title: "Privacy, security, and confidential information",
    content: (
      <LegalList
        items={[
          <ConductItem key="systems" title="Use only approved systems.">
            Create, access, transmit, and store protected health information
            (PHI) only through systems and workflows expressly approved by the
            applicable medical group and Platform privacy/security teams. Do not
            send PHI through personal email, ordinary SMS, personal cloud
            storage, consumer file-sharing tools, unapproved project-management
            tools, or unapproved artificial-intelligence services.
          </ConductItem>,
          <ConductItem
            key="minimum"
            title="Apply the minimum-necessary principle."
          >
            Access and share only the information reasonably necessary for your
            assigned role and the permitted purpose. Do not access a chart out
            of curiosity or discuss a patient with anyone who lacks a legitimate
            need to know.
          </ConductItem>,
          <ConductItem
            key="credentials"
            title="Protect credentials and devices."
          >
            Never share passwords, authentication codes, sessions, or accounts.
            Use required multifactor authentication, device encryption, security
            updates, screen locks, and other mandated safeguards. Do not leave
            an authenticated device unattended.
          </ConductItem>,
          <ConductItem
            key="environment"
            title="Maintain a private environment."
          >
            Work where unauthorized people cannot see the screen, overhear
            conversations, or view records. Use headphones or a privacy screen
            when appropriate and avoid unsecured public networks unless an
            approved secure connection is in use.
          </ConductItem>,
          <ConductItem key="copies" title="Do not make unauthorized copies.">
            Do not photograph, screenshot, print, download, locally store, or
            transfer patient information except through an approved workflow for
            a legitimate care or operational purpose.
          </ConductItem>,
          <ConductItem key="incidents" title="Report incidents immediately.">
            Immediately report suspected phishing, credential compromise,
            misdirected messages, unauthorized access or disclosure, lost or
            stolen devices, malware, and other privacy or security incidents
            through the designated incident-reporting process. Do not
            investigate, delete evidence, or contact affected patients unless
            directed by the authorized response team.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "ethics",
    title: "Ethics, conflicts, referrals, and fitness for duty",
    content: (
      <LegalList
        items={[
          <ConductItem key="patient-first" title="Put the patient first.">
            Clinical recommendations must be based on the patient&apos;s
            interests and medical needs. Compensation, business metrics,
            prescription volume, pharmacy utilization, patient demand, or a
            desired outcome must not influence clinical judgment.
          </ConductItem>,
          <ConductItem
            key="self-referral"
            title="Avoid improper self-referral and solicitation."
          >
            Do not steer Platform patients to your own practice, a business in
            which you or an immediate family member has a financial interest, or
            another service for personal gain. Any permitted referral involving
            a potential conflict must be clinically appropriate, lawful, fully
            disclosed, and handled under medical-group policy.
          </ConductItem>,
          <ConductItem key="benefits" title="Decline improper benefits.">
            Do not request or accept a kickback, fee split, gift, or other
            benefit intended to influence prescribing, referrals, or patient
            care.
          </ConductItem>,
          <ConductItem key="fitness" title="Practice only when fit for duty.">
            Do not provide care while impaired by alcohol, cannabis, controlled
            or mind-altering substances, medication effects, illness, fatigue,
            or any physical or mental condition that could compromise safe
            judgment. Arrange coverage and seek assistance when needed.
          </ConductItem>,
          <ConductItem key="trust" title="Protect patient trust.">
            Do not reveal patient information in public reviews, social media,
            teaching, marketing, or informal discussion without lawful authority
            and any required written authorization. Do not retaliate against a
            patient who complains, requests records, declines treatment, or
            exercises a legal right.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "reporting-training",
    title: "Reporting, training, and cooperation",
    content: (
      <LegalList
        items={[
          <ConductItem key="credentials" title="Keep credentials current.">
            Complete required onboarding, training, attestations, and continuing
            education, and promptly update licensure, credentialing, DEA,
            malpractice coverage, contact, and availability information.
          </ConductItem>,
          <ConductItem key="actions" title="Report professional actions.">
            Promptly notify the contracting medical group and designated Medical
            Operations Team, as required by agreement and law, of a license
            restriction or lapse; DEA action; board complaint or investigation;
            hospital or payer action; malpractice claim, suit, or judgment;
            exclusion or debarment; or criminal charge or conviction that may
            affect credentialing, patient safety, or the ability to practice.
          </ConductItem>,
          <ConductItem
            key="cooperate"
            title="Cooperate with quality and compliance review."
          >
            Participate honestly and promptly in authorized chart review, safety
            review, audit, complaint investigation, remediation, and peer
            review. Preserve records and confidentiality throughout the process.
          </ConductItem>,
          <ConductItem key="concerns" title="Raise concerns.">
            Report suspected unsafe, unlawful, unethical, discriminatory,
            fraudulent, or privacy-compromising conduct through the designated
            channel. Nothing in this Code prohibits a report to a regulator,
            licensing board, law-enforcement agency, or other authority as
            protected or required by law.
          </ConductItem>,
        ]}
      />
    ),
  },
  {
    id: "administration",
    title: "Administration and enforcement",
    content: (
      <>
        <LegalP>
          Physicians are responsible for reading and following the current
          version of this Code and all applicable clinical and operational
          policies. Questions about clinical, licensure, prescribing, or
          patient-safety requirements should be directed to the designated
          Medical Operations Team. Questions about nonclinical Beema Health
          access or support may be sent to{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </LegalP>
        <LegalP>
          A suspected violation may result in review, remediation, suspension of
          Platform access or assignments, reporting when legally required, or
          other action permitted by the physician&apos;s agreements and
          applicable law. Nothing in this Code alters the physician&apos;s
          independent professional obligations or creates an employment
          relationship where none otherwise exists.
        </LegalP>
        <LegalP>
          Beema Health may update this Code as laws, clinical standards,
          technology, and program requirements change. Material updates should
          be communicated through the applicable policy or contracting process.
        </LegalP>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact and service information",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Organization / Support
          </strong>
        </LegalP>
        <LegalBusinessContact />
        <LegalP>
          <strong className="font-semibold text-foreground">
            Platform and medical-services notice.
          </strong>{" "}
          Beema Health-branded services use technology supplied by Bask Health,
          Inc. Medical services are provided by the physician and the applicable
          licensed medical group identified in patient-facing disclosures,
          consent materials, and treatment records. Physicians must also follow
          that medical group&apos;s policies and protocols.
        </LegalP>
      </>
    ),
  },
];

function PhysicianCodeOfConductPage() {
  useEffect(() => {
    trackPageViewed("physician-code-of-conduct");
  }, []);

  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Physician Code of Conduct"
          lastUpdated="July 29, 2026"
          description="Standards for physicians providing care through Beema Health-branded services. Supersedes template dated September 30, 2021."
          callout={
            <>
              <strong className="font-semibold text-foreground">
                Clinical independence.
              </strong>{" "}
              Patient welfare, applicable law, professional ethics, and the
              standard of care control every clinical decision. No Beema Health,
              Bask, business, compensation, conversion, retention, formulary, or
              patient-preference consideration may override a physician&apos;s
              independent medical judgment.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
