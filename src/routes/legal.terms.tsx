import { useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
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
import {
  LEGAL_BUSINESS_NAME,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "@/lib/contact-info";
import {
  PARTNER_PHARMACY_ADDRESS_LINE1,
  PARTNER_PHARMACY_ADDRESS_LINE2,
  PARTNER_PHARMACY_NAME,
  PARTNER_PHARMACY_PHONE_DISPLAY,
  PARTNER_PHARMACY_PHONE_HREF,
  PARTNER_PHARMACY_WEBSITE,
} from "@/lib/partner-pharmacy";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Beema Health" },
      {
        name: "description",
        content:
          "Terms of Service for Beema Health LLC, including telehealth, billing, cancellations, arbitration, and limitations of liability.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/terms") }],
  }),
  component: TermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance and scope",
    content: (
      <>
        <LegalP>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of beemahealth.com, hive.beemahealth.com, any other website or
          patient portal operated for Beema Health, any future Beema Health
          application, and all related products, features, communications, and
          services (collectively, the &quot;Services&quot;). These Terms form a
          legally binding agreement between you and {LEGAL_BUSINESS_NAME}{" "}
          (&quot;Beema Health,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;).
        </LegalP>
        <LegalP>
          By visiting or using the Services, joining a waitlist, creating an
          account, submitting an intake form, electronically accepting these
          Terms, authorizing a payment, or requesting healthcare or pharmacy
          services through the Services, you acknowledge that you have read,
          understood, and agreed to these Terms.
        </LegalP>
        <LegalP>
          These Terms incorporate our{" "}
          <Link
            to="/legal/privacy/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            to="/legal/telehealth-consent/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Telehealth Consent
          </Link>
          , any checkout disclosures, and any supplemental terms presented for a
          particular service, plan, promotion, or transaction. A Provider or
          medical group may also provide a separate Notice of Privacy Practices,
          informed consent, or clinical agreement. If you do not agree to these
          Terms, do not use the Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and availability",
    content: (
      <>
        <LegalP>You may use the Services only if:</LegalP>
        <LegalList
          items={[
            <>
              You are at least 18 years old and legally capable of entering into
              a binding agreement.
            </>,
            <>
              You are physically located in a state where the requested Service
              is offered at the time the Service is provided.
            </>,
            <>
              You provide accurate identity, contact, payment, and health
              information.
            </>,
            <>
              You use the Services for yourself and not for another person
              unless Beema Health expressly authorizes an approved
              representative workflow.
            </>,
            <>Your use complies with these Terms and all applicable laws.</>,
          ]}
        />
        <LegalP>
          Services, Providers, medications, pharmacies, and fulfillment options
          vary by state and may not be available everywhere. Meeting the
          eligibility requirements does not guarantee acceptance into a program,
          access to a Provider, a diagnosis, a prescription, a specific
          medication, or continued treatment.
        </LegalP>
        <LegalP>
          You must have a compatible device, internet access, and any software
          reasonably required to use the Services. You are responsible for
          charges imposed by your internet, telephone, or wireless provider.
        </LegalP>
      </>
    ),
  },
  {
    id: "emergencies",
    title: "Medical emergencies and urgent concerns",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Emergency warning:
          </strong>{" "}
          The Services are not emergency services and are not monitored
          continuously. If you believe you are experiencing a medical emergency,
          call 911 or go to the nearest emergency department.
        </LegalP>
        <LegalP>
          Do not use the website, patient portal, email, or SMS for urgent or
          emergency medical concerns. Messages may not be reviewed immediately.
          If you experience severe or rapidly worsening symptoms, contact
          emergency services or an appropriate in-person healthcare
          professional.
        </LegalP>
      </>
    ),
  },
  {
    id: "role",
    title: "Beema Health's role and independent Care Partners",
    content: (
      <>
        <LegalP>
          Beema Health operates a technology and administrative platform that
          facilitates access to independently licensed physicians, nurse
          practitioners, physician assistants, medical groups, pharmacies,
          laboratories, and other organizations involved in care or fulfillment.
          Licensed healthcare professionals and their medical groups are
          referred to as &quot;Providers.&quot; Providers, pharmacies,
          laboratories, and similar organizations are collectively referred to
          as &quot;Care Partners.&quot;
        </LegalP>
        <LegalP>
          Beema Health does not practice medicine, nursing, or pharmacy and does
          not direct or control a Provider&apos;s independent medical judgment.
          Beema Health does not manufacture, compound, dispense, or ship
          prescription medication. A Provider-patient relationship, if
          established, is between you and the applicable Provider or medical
          group, not between you and Beema Health.
        </LegalP>
        <LegalP>
          You have a separate customer relationship with Beema Health for
          technology access, care coordination, administrative support,
          communications, and payment processing. Care Partners are independent
          parties unless expressly stated otherwise. They are responsible for
          the professional services, laboratory services, dispensing, or
          fulfillment they provide.
        </LegalP>
        <LegalP>
          Nothing in these Terms creates a partnership, joint venture,
          employment, franchise, or agency relationship between you and Beema
          Health or authorizes you to bind Beema Health.
        </LegalP>
      </>
    ),
  },
  {
    id: "telehealth",
    title: "Telehealth services and limitations",
    content: (
      <>
        <LegalP>
          Telehealth involves healthcare delivered through electronic
          communications when the patient and Provider are in different
          locations. Depending on the Service and applicable law, telehealth may
          include secure questionnaires, store-and-forward review, messaging,
          telephone calls, audio-video visits, photographs, medical records,
          remote measurements, and other electronic information.
        </LegalP>
        <LegalP>
          Telehealth has limitations. A Provider may not have access to your
          complete medical record or the information that could be obtained
          through an in-person physical examination. Technology failures may
          delay evaluation or treatment. A Provider may determine that
          telehealth is inappropriate and require laboratory testing, a live
          visit, an in-person examination, specialist care, or emergency care.
        </LegalP>
        <LegalP>
          Before using clinical features, you must review and accept the
          applicable{" "}
          <Link
            to="/legal/telehealth-consent/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Telehealth Consent
          </Link>
          . Your consent remains subject to any state-specific disclosures
          presented to you. You may withdraw telehealth consent as permitted by
          law, but doing so may prevent continued use of clinical Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "clinical",
    title: "Clinical evaluations and prescriptions",
    content: (
      <>
        <LegalP>
          All diagnosis, treatment, prescribing, refill, dosing, laboratory, and
          follow-up decisions are made solely by a Provider using independent
          medical judgment. Beema Health does not guarantee that a Provider will
          diagnose any condition, approve treatment, issue a prescription,
          continue a prescription, prescribe a particular medication or dosage,
          or agree with a previous clinician&apos;s recommendation.
        </LegalP>
        <LegalP>
          Completing an intake, paying an amount, joining a plan, or
          communicating with a Provider does not guarantee a prescription. A
          Provider may request additional information, medical records,
          laboratory testing, synchronous communication, or an in-person
          examination. A Provider may decline or discontinue treatment when
          clinically appropriate or legally required.
        </LegalP>
        <LegalP>
          If a prescription is issued, you are responsible for reviewing all
          instructions and warnings, asking questions, using the medication only
          as directed, storing it safely, and promptly reporting adverse
          effects. Never share prescription medication. Contact your Provider or
          pharmacist before changing a dose or stopping treatment unless
          emergency circumstances require immediate care.
        </LegalP>
        <LegalP>
          The Services are not comprehensive primary care. You should maintain
          an ongoing relationship with a primary-care clinician and inform your
          other healthcare professionals about treatment received through the
          Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "weight-management",
    title: "Weight-management services and compounded medications",
    content: (
      <>
        <LegalP>
          Beema Health may facilitate access to Provider-supervised
          weight-management services, including services involving FDA-approved
          medications or patient-specific compounded medications when clinically
          appropriate and legally available. Weight-management treatment
          involves risks and is not appropriate for every person. Your Provider
          will determine whether a particular treatment is appropriate.
        </LegalP>
        <LegalP>
          Compounded drugs are not FDA-approved. They do not undergo FDA
          premarket review for safety, effectiveness, or quality and are not
          FDA-approved generic versions of branded medications. Beema Health
          does not represent that a compounded medication is the same as,
          equivalent to, or interchangeable with any branded or FDA-approved
          product.
        </LegalP>
        <LegalP>
          A Provider may prescribe a compounded medication only when the
          Provider determines it is clinically appropriate for an identified
          patient and the prescription can be filled in compliance with
          applicable federal and state law. Compounded medication availability
          may change because of regulatory action, shortage status, pharmacy
          capacity, ingredient availability, or a Provider&apos;s clinical
          judgment.
        </LegalP>
        <LegalP>
          No weight-loss amount, rate, timeline, or other clinical outcome is
          promised or guaranteed. Results vary based on individual factors,
          treatment adherence, medication availability, tolerability, nutrition,
          activity, other health conditions, and Provider decisions.
        </LegalP>
      </>
    ),
  },
  {
    id: "health-info",
    title: "Your health-information responsibilities",
    content: (
      <>
        <LegalP>
          You agree to provide complete, truthful, accurate, and current
          information, including your identity, physical location, symptoms,
          diagnoses, allergies, pregnancy status when relevant, medications,
          supplements, medical history, laboratory results, and other
          information requested by a Provider.
        </LegalP>
        <LegalP>
          You must promptly update material changes and respond to Provider
          follow-up requests. Withholding or misrepresenting information may
          result in inappropriate treatment, adverse events, suspension or
          termination of Services, and other consequences.
        </LegalP>
        <LegalP>
          You agree not to seek duplicate, conflicting, or medically
          inappropriate prescriptions from multiple clinicians; alter a
          prescription; provide medication to another person; or use the
          Services to obtain medication through fraud or misrepresentation.
        </LegalP>
        <LegalP>
          You are responsible for reviewing communications sent through the
          patient portal and following reasonable clinical instructions. Beema
          Health is not responsible for consequences caused by inaccurate
          information you provide or your failure to review messages, complete
          requested follow-up, obtain required testing, or follow treatment
          instructions, except to the extent prohibited by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "financial",
    title: "Direct-pay services, insurance, and financial responsibility",
    content: (
      <>
        <LegalP>
          Unless expressly stated otherwise, the Services are offered on a
          direct-pay basis. Beema Health and Care Partners may not participate
          in Medicare, Medicaid, TRICARE, or commercial insurance networks for
          the Services. The Services are not health insurance and do not replace
          health-insurance coverage.
        </LegalP>
        <LegalP>
          You are responsible for all amounts disclosed before purchase, which
          may include Provider consultation fees, medication costs, pharmacy
          fulfillment, shipping, laboratory fees, taxes, and other charges.
          Services obtained outside the Beema Health platform are not included
          unless expressly stated.
        </LegalP>
        <LegalP>
          Beema Health does not guarantee insurance reimbursement, prior
          authorization, health savings account eligibility, flexible spending
          account eligibility, or coverage for any Service. You are responsible
          for confirming reimbursement eligibility with your plan administrator
          and for any claim you submit.
        </LegalP>
        <LegalP>
          By providing a payment method, you represent that you are authorized
          to use it and authorize Beema Health, its payment processor, and
          applicable Care Partners to charge disclosed amounts. You agree to
          maintain valid payment information and pay amounts lawfully due.
        </LegalP>
      </>
    ),
  },
  {
    id: "recurring",
    title: "Plans, recurring billing, and automatic renewal",
    content: (
      <>
        <LegalP>
          Some Services may be offered as one-time purchases, multi-month plans,
          refill plans, subscriptions, or other automatically renewing
          arrangements. The applicable checkout page or order confirmation will
          disclose the plan term, products or services included, amount and
          frequency of recurring charges, minimum commitment if any, renewal
          terms, and cancellation method.
        </LegalP>
        <LegalP>
          By enrolling in an automatically renewing plan, you authorize
          recurring charges to your payment method at the interval disclosed at
          checkout until you cancel or the plan ends. Renewal timing may vary
          slightly because Provider review, pharmacy processing, weekends,
          holidays, or operational requirements may affect an order cycle.
        </LegalP>
        <LegalP>
          You may cancel future automatic renewals through any cancellation
          method made available in your account or by contacting support at{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          or{" "}
          <a
            href={SUPPORT_PHONE_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>
          . We will provide renewal reminders, material-change notices, and
          accessible cancellation methods when required by law.
        </LegalP>
        <LegalP>
          Cancellation stops future renewals but does not automatically cancel
          or refund an order that has already entered Provider review, pharmacy
          processing, or shipment. Refund eligibility for an in-process order is
          determined under Section 12.
        </LegalP>
      </>
    ),
  },
  {
    id: "pricing",
    title: "Prices, promotions, and product availability",
    content: (
      <>
        <LegalP>
          Prices, Provider fees, medication costs, shipping charges, plan terms,
          discounts, promotions, and product availability may change at any time
          before purchase or renewal, subject to applicable law. We will provide
          notice of changes to recurring charges when required.
        </LegalP>
        <LegalP>
          A price displayed in an advertisement, social-media post, email,
          search result, landing page, or other promotional material does not
          guarantee that price for life or for any particular period. A price is
          guaranteed for a stated period only when the applicable written offer,
          checkout terms, or order confirmation expressly says so.
        </LegalP>
        <LegalP>
          The price and terms displayed at checkout when you authorize a
          purchase control over earlier advertising or promotional content.
          Promotions may be limited by eligibility, expiration date, plan,
          product, quantity, state, or one-per-person restrictions and may not
          be combined unless expressly allowed.
        </LegalP>
        <LegalP>
          We may correct pricing or description errors before shipment. If an
          error materially increases your charge, we will seek authorization or
          cancel and refund the affected order as required by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "cancellation-refund",
    title: "Cancellation and refund policy",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Core refund rule:
          </strong>{" "}
          Before Provider Review, a full refund is guaranteed. After Provider
          Review but before Shipment, a refund is guaranteed minus the disclosed
          Provider consultation fee. After Shipment, the sale is final. See also
          our{" "}
          <Link
            to="/legal/refund/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Refund Policy
          </Link>
          .
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.1 Definitions.
          </strong>{" "}
          &quot;Provider Review&quot; occurs when a licensed Provider has
          reviewed your submitted clinical information or otherwise performed
          the clinical evaluation associated with the order.
          &quot;Shipment&quot; occurs when the dispensing pharmacy transfers the
          medication or product to the shipping carrier.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.2 Cancellation before Provider Review.
          </strong>{" "}
          If we receive your cancellation request before Provider Review occurs,
          you are guaranteed a full refund of all amounts paid for the canceled
          order.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.3 Cancellation after Provider Review but before Shipment.
          </strong>{" "}
          If we receive your cancellation request after Provider Review occurs
          but before Shipment, you are guaranteed a refund of all amounts paid
          for the canceled order minus the applicable Provider consultation or
          review fee. The Provider fee compensates the independent Provider or
          medical group for clinical services already performed and is
          non-refundable once Provider Review has occurred.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.4 After Shipment.
          </strong>{" "}
          Once Shipment occurs, the order is final and cannot be canceled,
          returned, or refunded, except where required by law. Prescription
          medications cannot be restocked or resold after shipment, even if the
          package remains unopened.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.5 If treatment is not prescribed.
          </strong>{" "}
          If a Provider completes Provider Review and determines that a
          prescription or requested treatment is not appropriate, the
          medication, fulfillment, and shipping portions of the order will be
          refunded. The disclosed Provider consultation or review fee remains
          non-refundable because the clinical service was performed.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.6 Multi-shipment and recurring plans.
          </strong>{" "}
          For a plan involving multiple shipments, each shipment is evaluated
          separately. Amounts attributable to medication that has already
          shipped are final. Future unshipped orders may be canceled, subject to
          whether Provider Review has occurred for the applicable order.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            12.7 How to cancel.
          </strong>{" "}
          You may request cancellation through the cancellation feature in your
          account, by emailing{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          , or by calling{" "}
          <a
            href={SUPPORT_PHONE_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>
          . Include your name, account email, and order information. Refund
          eligibility is determined using the order status when we receive a
          sufficiently identifiable cancellation request through one of these
          channels.
        </LegalP>
        <LegalP>
          Approved refunds are issued to the original payment method. Your
          financial institution controls when the credit appears. A chargeback
          does not replace the cancellation process and does not alter amounts
          properly owed under these Terms.
        </LegalP>
      </>
    ),
  },
  {
    id: "pharmacy",
    title: "Pharmacy services, fulfillment, and shipping",
    content: (
      <>
        <LegalP>
          If a Provider issues a prescription, it may be transmitted to a
          participating licensed pharmacy or, where legally permitted and
          operationally supported, another pharmacy you select. Pharmacy
          availability, pricing, shipping areas, formulations, packaging, and
          delivery times may vary.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Partner Pharmacy Information.
          </strong>{" "}
          One participating pharmacy partner is {PARTNER_PHARMACY_NAME},{" "}
          {PARTNER_PHARMACY_ADDRESS_LINE1}, {PARTNER_PHARMACY_ADDRESS_LINE2}.
          Phone:{" "}
          <a
            href={PARTNER_PHARMACY_PHONE_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {PARTNER_PHARMACY_PHONE_DISPLAY}
          </a>
          . Website:{" "}
          <a
            href={PARTNER_PHARMACY_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-2 hover:underline"
          >
            {PARTNER_PHARMACY_WEBSITE}
          </a>
          . Services are available in all 50 U.S. states through affiliated
          medical providers and pharmacy partners operating in accordance with
          applicable state licensure requirements. The Pharmacy Hub states that
          it is licensed by state boards of pharmacy nationwide and supports
          prescription fulfillment in all 50 states. Certain medications,
          formulations, or fulfillment options may vary depending on
          state-specific pharmacy regulations, prescribing requirements, and
          dispensing restrictions.
        </LegalP>
        <LegalP>
          The dispensing pharmacy is responsible for compounding or dispensing
          the medication, pharmacy counseling, packaging, labeling, and
          pharmacy-quality obligations. Beema Health does not control the
          pharmacy&apos;s professional judgment or guarantee that a pharmacy
          will accept, fill, or transfer a prescription.
        </LegalP>
        <LegalP>
          You must provide a complete and accurate delivery address and promptly
          notify support of address changes before Shipment. We are not
          responsible for delays or losses caused by an incorrect address,
          failure to retrieve a package, carrier disruptions, weather, force
          majeure, or events outside our reasonable control, except as required
          by law.
        </LegalP>
        <LegalP>
          Inspect your delivery promptly. If you receive the wrong item or
          believe a package was damaged, tampered with, lost, or exposed to
          conditions that may affect medication quality, do not use the
          medication until you have contacted support or the dispensing pharmacy
          and received instructions. A pharmacy may require photographs or other
          information before determining whether replacement is appropriate.
        </LegalP>
        <LegalP>
          Keep all medication securely stored and out of the reach of children
          and pets. Follow the label and pharmacy instructions concerning
          refrigeration, storage, handling, beyond-use dates, and disposal.
        </LegalP>
      </>
    ),
  },
  {
    id: "laboratory",
    title: "Laboratory and other third-party services",
    content: (
      <>
        <LegalP>
          A Provider may require laboratory testing, imaging, an in-person
          examination, or other third-party services. Unless expressly included
          in your checkout terms, those services are not included in amounts
          paid to Beema Health and may be billed separately by the third party.
        </LegalP>
        <LegalP>
          Third-party laboratories and other service providers determine their
          own availability, prices, billing, collection methods, turnaround
          times, and refund policies. Beema Health does not guarantee that an
          insurer will cover those services.
        </LegalP>
      </>
    ),
  },
  {
    id: "electronic",
    title: "Electronic records, signatures, email, and SMS",
    content: (
      <>
        <LegalP>
          You consent to conduct transactions electronically and to receive
          these Terms, consents, disclosures, receipts, clinical and
          administrative messages, billing notices, renewal notices, and other
          records electronically through the Services, patient portal, email,
          SMS, or another contact method you provide.
        </LegalP>
        <LegalP>
          Your electronic acceptance has the same effect as a handwritten
          signature. You are responsible for maintaining current contact
          information, access to a compatible device, and the ability to retain
          electronic records. You may request a paper copy by contacting
          support, although certain Services may remain electronic by design.
        </LegalP>
        <LegalP>
          By providing a telephone number and consenting to SMS, you represent
          that you are the subscriber or authorized user of that number. Message
          frequency varies. Message and data rates may apply. Carriers are not
          liable for delayed or undelivered messages. Reply STOP to opt out of
          the applicable SMS program and HELP for assistance. Consent to receive
          marketing texts is not a condition of purchase.
        </LegalP>
        <LegalP>
          Opting out of marketing does not prevent necessary account, treatment,
          safety, billing, or legal communications through other available
          channels. Standard email and SMS may not be encrypted. By choosing
          those channels, you acknowledge the risk that messages may be accessed
          by someone with access to your device, account, or network.
        </LegalP>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy and protected health information",
    content: (
      <>
        <LegalP>
          Our{" "}
          <Link
            to="/legal/privacy/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          explains how Beema Health collects, uses, discloses, and protects
          personal information. Providers and medical groups may provide a
          separate Notice of Privacy Practices describing their handling of
          protected health information and your rights under HIPAA. See also our{" "}
          <Link
            to="/legal/hipaa/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            HIPAA Privacy Policy
          </Link>
          .
        </LegalP>
        <LegalP>
          HIPAA does not apply to every organization or every category of
          health-related information. To the extent Beema Health acts as a
          business associate for a HIPAA-covered entity, Beema Health handles
          protected health information in accordance with HIPAA and the
          applicable business associate agreement.
        </LegalP>
        <LegalP>
          You authorize Beema Health and applicable Care Partners to exchange
          information reasonably necessary to coordinate requested treatment,
          payment, pharmacy fulfillment, laboratory services, support, and
          healthcare operations, subject to the Privacy Policy, applicable
          Notices of Privacy Practices, and law.
        </LegalP>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and security",
    content: (
      <>
        <LegalP>
          Certain Services require an account. You agree to provide accurate
          information, maintain only the accounts you are authorized to use,
          protect your credentials, and promptly notify support of suspected
          unauthorized access or security incidents.
        </LegalP>
        <LegalP>
          You may not share credentials, permit another person to impersonate
          you, access another person&apos;s account, or attempt to bypass
          authentication. You are responsible for activity performed through
          your account to the extent caused by your failure to use reasonable
          security.
        </LegalP>
        <LegalP>
          We may require identity verification, reset credentials, restrict
          access, or suspend an account when reasonably necessary to protect
          patients, Providers, Care Partners, Beema Health, or the Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "educational",
    title: "Educational content and no medical advice",
    content: (
      <>
        <LegalP>
          Website articles, FAQs, advertisements, social-media content,
          calculators, product descriptions, and other general materials are
          provided for informational purposes only. They are not medical advice
          and do not create a Provider-patient relationship.
        </LegalP>
        <LegalP>
          Only individualized communications from a licensed Provider
          responsible for your care should be treated as clinical guidance. Do
          not disregard professional medical advice or delay seeking care
          because of general content available through the Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "license",
    title: "Limited license and prohibited conduct",
    content: (
      <>
        <LegalP>
          Subject to these Terms, Beema Health grants you a limited, personal,
          revocable, non-exclusive, non-transferable license to access and use
          the Services in the United States for your own lawful, non-commercial
          purposes. No other rights are granted.
        </LegalP>
        <LegalP>You may not, and may not assist another person to:</LegalP>
        <LegalList
          items={[
            <>
              Use the Services unlawfully, fraudulently, abusively, or in a way
              that threatens another person.
            </>,
            <>
              Impersonate another person or misrepresent identity, location,
              eligibility, symptoms, or medical history.
            </>,
            <>
              Seek prescription medication without a legitimate clinical purpose
              or through deception.
            </>,
            <>
              Share, resell, transfer, or distribute prescription medication.
            </>,
            <>
              Interfere with, disrupt, overload, or damage the Services or
              related systems.
            </>,
            <>
              Introduce malware, malicious code, automated attacks, or harmful
              content.
            </>,
            <>
              Circumvent access controls, authentication, rate limits, or
              security measures.
            </>,
            <>
              Probe, scan, test, or exploit a system vulnerability without
              written authorization.
            </>,
            <>
              Reverse engineer, decompile, disassemble, or attempt to derive
              source code except where the law expressly permits it.
            </>,
            <>
              Scrape, crawl, harvest, copy, index, or use automated means to
              access the Services except as expressly authorized.
            </>,
            <>
              Use Beema Health content, data, branding, or technology to train a
              competing system or develop a competing product without written
              permission.
            </>,
            <>
              Infringe intellectual-property, privacy, publicity,
              confidentiality, or other rights.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "submissions",
    title: "User submissions and feedback",
    content: (
      <>
        <LegalP>
          You retain ownership of personal information and content you submit,
          subject to the rights necessary to operate the Services. You grant
          Beema Health and its service providers a limited, non-exclusive
          license to host, store, reproduce, transmit, display, and process
          submitted content only as reasonably necessary to provide, secure,
          maintain, and improve the Services; comply with law; and exercise
          rights under these Terms and the Privacy Policy.
        </LegalP>
        <LegalP>
          This license does not transfer ownership of your medical records and
          does not authorize uses or disclosures prohibited by HIPAA or other
          applicable privacy law.
        </LegalP>
        <LegalP>
          If you voluntarily provide suggestions, ideas, or feedback unrelated
          to your personal health information, you grant Beema Health a
          perpetual, worldwide, royalty-free, transferable, and sublicensable
          license to use that feedback without restriction or compensation. Do
          not submit confidential business information as feedback.
        </LegalP>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party technology and services",
    content: (
      <>
        <LegalP>
          The Services may use or link to third-party technology, patient
          portals, payment processors, communications providers, pharmacies,
          laboratories, shipping carriers, social-media platforms, and other
          services. Supplemental third-party terms or privacy notices may apply
          when presented to you.
        </LegalP>
        <LegalP>
          Beema Health does not control independent third-party services and is
          not responsible for their content, availability, security, or acts,
          except to the extent Beema Health has expressly assumed responsibility
          in writing or applicable law provides otherwise.
        </LegalP>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes, suspension, and termination",
    content: (
      <>
        <LegalP>
          We may add, modify, suspend, or discontinue a Service, feature, plan,
          product, pharmacy option, or geographic area because of operational,
          clinical, legal, regulatory, safety, supply, or business reasons.
        </LegalP>
        <LegalP>
          We may suspend or terminate your access if you violate these Terms,
          provide false information, fail to pay amounts due, misuse the
          Services, create a safety or security risk, or if suspension is
          required by law or requested by a Care Partner. A Provider may
          separately discontinue a clinical relationship in accordance with
          professional and legal obligations.
        </LegalP>
        <LegalP>
          You may stop using the Services at any time. Stopping use or closing
          an account does not eliminate payment obligations for Services already
          provided or orders already processed and does not require deletion of
          records that must be retained.
        </LegalP>
        <LegalP>
          We may update these Terms by posting the revised version and changing
          the effective date. We will provide additional notice of material
          changes when required. Changes apply prospectively unless otherwise
          stated. If applicable law requires affirmative consent, the change
          will not take effect for you until that consent is obtained.
        </LegalP>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <>
        <LegalP>
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE BEEMA HEALTH PLATFORM,
          WEBSITE, PATIENT PORTAL, EDUCATIONAL CONTENT, AND NON-CLINICAL
          SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot;
          BEEMA HEALTH DISCLAIMS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          TITLE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY, SECURITY, AND
          RELIABILITY.
        </LegalP>
        <LegalP>
          WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE,
          TIMELY, OR FREE OF HARMFUL COMPONENTS. WE DO NOT GUARANTEE ACCEPTANCE
          INTO A PROGRAM, A DIAGNOSIS, A PRESCRIPTION, MEDICATION AVAILABILITY,
          SHIPPING TIME, INSURANCE REIMBURSEMENT, OR ANY CLINICAL OR WEIGHT-LOSS
          OUTCOME.
        </LegalP>
        <LegalP>
          CLINICAL, PHARMACY, LABORATORY, AND FULFILLMENT SERVICES ARE PROVIDED
          BY THE APPLICABLE INDEPENDENT CARE PARTNER. EACH CARE PARTNER IS
          RESPONSIBLE FOR ITS OWN PROFESSIONAL SERVICES, ACTS, AND OMISSIONS.
          NOTHING IN THESE TERMS DISCLAIMS OR LIMITS A RESPONSIBILITY THAT
          CANNOT LAWFULLY BE DISCLAIMED.
        </LegalP>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <LegalP>
          TO THE FULLEST EXTENT PERMITTED BY LAW, BEEMA HEALTH AND ITS MEMBERS,
          MANAGERS, OFFICERS, EMPLOYEES, AGENTS, LICENSORS, SUCCESSORS, AND
          ASSIGNS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; LOSS OF PROFITS,
          REVENUE, DATA, GOODWILL, OR USE; SERVICE INTERRUPTION; OR THE COST OF
          SUBSTITUTE SERVICES ARISING OUT OF OR RELATING TO THE SERVICES OR
          THESE TERMS, REGARDLESS OF THE LEGAL THEORY AND EVEN IF ADVISED THAT
          SUCH DAMAGES WERE POSSIBLE.
        </LegalP>
        <LegalP>
          TO THE FULLEST EXTENT PERMITTED BY LAW, BEEMA HEALTH&apos;S TOTAL
          AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE
          SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT
          YOU PAID DIRECTLY TO BEEMA HEALTH DURING THE TWELVE MONTHS BEFORE THE
          EVENT GIVING RISE TO THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
        </LegalP>
        <LegalP>
          These limitations do not apply to liability that cannot legally be
          limited, including liability for Beema Health&apos;s fraud, willful
          misconduct, or gross negligence where applicable law prohibits
          limitation. They also do not determine an independent Provider&apos;s
          liability for professional services.
        </LegalP>
        <LegalP>
          Some jurisdictions do not permit certain warranty exclusions or
          liability limitations. In those jurisdictions, the exclusions and
          limitations apply only to the maximum extent permitted by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    content: (
      <>
        <LegalP>
          To the extent permitted by law, you agree to defend, indemnify, and
          hold harmless Beema Health and its members, managers, officers,
          employees, agents, licensors, successors, and assigns from third-party
          claims, damages, judgments, liabilities, losses, costs, and reasonable
          attorneys&apos; fees arising from your unlawful or unauthorized use of
          the Services, fraud, willful misconduct, infringement of another
          person&apos;s rights, or material breach of these Terms.
        </LegalP>
        <LegalP>
          This obligation does not require you to indemnify a party for that
          party&apos;s own negligence, professional malpractice, willful
          misconduct, or other conduct for which indemnification is prohibited
          by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "arbitration",
    title: "Dispute resolution, arbitration, and class-action waiver",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Please read carefully:
          </strong>{" "}
          Except for the limited exceptions below, you and Beema Health agree to
          resolve disputes through binding individual arbitration and waive the
          right to a jury trial or class proceeding.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.1 Informal resolution.
          </strong>{" "}
          Before starting arbitration or litigation, the complaining party must
          send a written notice describing the dispute, relevant facts,
          requested relief, and contact information. Notices to Beema Health
          must be sent to{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          with the subject line &quot;Legal Dispute Notice&quot; and to the
          mailing address in Section 28. The parties will attempt in good faith
          to resolve the dispute for 60 days after receipt. Any limitations
          period is tolled during this 60-day period.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.2 Binding individual arbitration.
          </strong>{" "}
          If the dispute is not resolved informally, any claim arising out of or
          relating to these Terms, the Services, a transaction, or the
          parties&apos; relationship will be resolved by final and binding
          individual arbitration administered by the American Arbitration
          Association (AAA) under its Consumer Arbitration Rules then in effect,
          except where applicable law requires otherwise.
        </LegalP>
        <LegalP>
          The Federal Arbitration Act governs the interpretation and enforcement
          of this arbitration agreement. The arbitrator may award the same
          individual remedies a court could award and will issue a reasoned
          written decision. Consumer fees will be allocated under the AAA rules
          and applicable law. The hearing may occur remotely, by documents, or
          in the county where you reside unless the parties agree otherwise.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.3 Exceptions.
          </strong>{" "}
          Either party may bring an eligible individual claim in small-claims
          court. Either party may seek temporary or preliminary injunctive
          relief in a court of competent jurisdiction to prevent actual or
          threatened misuse of intellectual property, unauthorized system
          access, or a material security threat. Claims for public injunctive
          relief that applicable law does not permit to be arbitrated may be
          brought in court.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.4 Class-action and jury-trial waiver.
          </strong>{" "}
          YOU AND BEEMA HEALTH AGREE THAT EACH MAY BRING CLAIMS ONLY IN AN
          INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF, CLASS MEMBER, OR
          REPRESENTATIVE IN A CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE
          PROCEEDING. UNLESS BOTH PARTIES AGREE, AN ARBITRATOR MAY NOT
          CONSOLIDATE CLAIMS OF MORE THAN ONE PERSON. TO THE EXTENT A CLAIM
          PROCEEDS IN COURT, EACH PARTY WAIVES A JURY TRIAL TO THE FULLEST
          EXTENT PERMITTED BY LAW.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.5 Arbitration opt-out.
          </strong>{" "}
          You may opt out of this arbitration agreement by sending written
          notice within 30 days after you first accept these Terms. The notice
          must include your full name, mailing address, account email, and a
          clear statement that you opt out of arbitration with Beema Health.
          Send the notice to{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          with the subject line &quot;Arbitration Opt-Out&quot; or to the
          mailing address in Section 28. Opting out will not affect your ability
          to use the Services.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            26.6 Severability of arbitration provisions.
          </strong>{" "}
          If a portion of this arbitration agreement is found unenforceable, it
          will be severed and the remainder will remain effective, except that
          if the class-action waiver is found unenforceable for a particular
          claim, that claim must proceed in court while enforceable individual
          claims remain subject to arbitration.
        </LegalP>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and miscellaneous terms",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.1 Governing law and venue.
          </strong>{" "}
          These Terms are governed by the laws of the State of Colorado, without
          regard to conflict-of-law principles, except that the Federal
          Arbitration Act governs Section 26. For disputes not subject to
          arbitration or small-claims court, you and Beema Health consent to
          exclusive jurisdiction and venue in the state courts located in El
          Paso County, Colorado, or the United States District Court for the
          District of Colorado, unless applicable law requires a different
          forum.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.2 Entire agreement and order of precedence.
          </strong>{" "}
          These Terms, the Privacy Policy, Telehealth Consent, checkout
          disclosures, order confirmations, and applicable supplemental terms
          constitute the entire agreement between you and Beema Health
          concerning the Services. For a direct conflict, the more specific
          transaction or service terms control for that subject; a
          Provider&apos;s informed consent or Notice of Privacy Practices
          controls clinical consent or protected health information within that
          Provider&apos;s responsibility.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.3 Assignment.
          </strong>{" "}
          You may not assign or transfer these Terms without our written
          consent. Beema Health may assign these Terms in connection with a
          merger, acquisition, financing, reorganization, sale of assets, or
          transfer of the Services, subject to applicable privacy and healthcare
          laws.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.4 Severability.
          </strong>{" "}
          Except as provided in Section 26.6, if any provision is held invalid
          or unenforceable, it will be enforced to the maximum extent permitted
          or replaced by an enforceable provision that most closely reflects its
          purpose. The remaining provisions will remain in effect.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.5 Waiver.
          </strong>{" "}
          A failure to enforce a provision is not a waiver. A waiver is
          effective only if in writing and signed by the party granting it and
          does not waive any later breach.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.6 Force majeure.
          </strong>{" "}
          Beema Health is not responsible for delay or failure caused by events
          beyond its reasonable control, including natural disasters, severe
          weather, epidemics, labor disputes, carrier failures, internet or
          utility outages, cyberattacks, government action, regulatory change,
          medication shortage, pharmacy disruption, or Provider unavailability,
          except to the extent applicable law provides otherwise.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.7 Survival.
          </strong>{" "}
          Provisions that by their nature should survive termination will
          survive, including payment obligations, intellectual-property
          provisions, disclaimers, limitations of liability, indemnification,
          dispute resolution, governing law, and record-retention provisions.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            27.8 Section headings.
          </strong>{" "}
          Section headings are for convenience only and do not limit or affect
          the meaning of these Terms.
        </LegalP>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact information",
    content: (
      <>
        <LegalP>
          Questions, cancellation requests, and other communications may be
          directed to:
        </LegalP>
        <LegalBusinessContact />
      </>
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
          title={`${LEGAL_BUSINESS_NAME} Terms of Service`}
          lastUpdated="July 29, 2026"
          description="Beema Health coordinates access to independent healthcare Providers and other Care Partners. Beema Health does not practice medicine, nursing, or pharmacy. If you are experiencing a medical emergency, call 911 or seek immediate in-person emergency care."
          callout={
            <>
              <strong className="font-semibold text-foreground">
                Important:
              </strong>{" "}
              These Terms contain a binding individual arbitration agreement and
              class-action waiver. They also contain important provisions
              concerning telehealth, recurring billing, cancellations,
              prescription products, warranty disclaimers, and limitations of
              liability.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
