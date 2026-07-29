import { useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { canonicalUrl } from "@/lib/seo";
import {
  LegalDocument,
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

export const Route = createFileRoute("/legal/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping Policy | Beema Health" },
      {
        name: "description",
        content:
          "Beema Health shipping policy for prescription medication fulfilled through integrated pharmacy and fulfillment partners.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/shipping") }],
  }),
  component: ShippingPage,
});

const linkClass = "text-foreground underline-offset-2 hover:underline";

const SECTIONS: LegalSection[] = [
  {
    id: "who-fulfills",
    title: "Who fulfills and ships your order",
    content: (
      <>
        <LegalP>
          {LEGAL_BUSINESS_NAME} (&quot;Beema Health,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) operates a telehealth and
          care-coordination platform. Beema Health does not practice pharmacy
          and does not itself compound, dispense, package, or transport
          prescription medication. Those services are performed by independent
          licensed pharmacies and shipping carriers. Questions about drug
          labeling, storage, package integrity, temperature exposure, or whether
          medication is suitable to use may need to be answered by the
          dispensing pharmacy or pharmacist.
        </LegalP>
      </>
    ),
  },
  {
    id: "clinical-approval",
    title: "Clinical approval and pharmacy acceptance",
    content: (
      <>
        <LegalP>
          Submitting an intake, placing an order, or paying a fee does not
          guarantee that a prescription will be issued. Shipping can begin only
          after a licensed clinician determines that treatment is appropriate,
          issues a valid prescription, and a dispensing pharmacy accepts the
          prescription for fulfillment. Clinical review, requested laboratory
          work, identity or address verification, missing information, payment
          issues, medication availability, and pharmacy requirements may delay
          or prevent fulfillment.
        </LegalP>
      </>
    ),
  },
  {
    id: "where-we-ship",
    title: "Where we ship",
    content: (
      <>
        <LegalP>
          We currently arrange shipping only to eligible addresses in the United
          States and only where the clinical service, prescribed medication,
          dispensing pharmacy, and delivery method are available and permitted
          by law. We do not ship internationally. Service to U.S. territories,
          APO/FPO addresses, and post office boxes depends on the dispensing
          pharmacy and carrier. If an order cannot be shipped lawfully or safely
          to the address provided, the order may be delayed, transferred to
          another eligible pharmacy where permitted, or canceled.
        </LegalP>
      </>
    ),
  },
  {
    id: "processing-delivery",
    title: "Processing and estimated delivery time",
    content: (
      <>
        <LegalP>
          Unless a more specific estimate is shown at checkout or in your order
          confirmation, pharmacy processing generally takes 2-3 business days
          after the pharmacy accepts the prescription. Total delivery is
          typically 4-12 business days after pharmacy acceptance. These
          timeframes are estimates and are not guarantees.
        </LegalP>
        <LegalP>
          The estimate does not include time needed for clinical review,
          laboratory testing, requested information, payment correction, or
          other steps required before the pharmacy accepts the prescription.
          Weekends, holidays, severe weather, carrier disruptions, supply
          constraints, high order volume, and location-specific restrictions may
          extend delivery time. If an unshipped order cannot be sent within the
          applicable promised timeframe, we will provide notice and any delay,
          cancellation, or refund options required by law and our{" "}
          <Link to="/legal/refund/" className={linkClass}>
            Cancellation and Refund Policy
          </Link>
          .
        </LegalP>
      </>
    ),
  },
  {
    id: "shipping-charges",
    title: "Shipping charges",
    content: (
      <>
        <LegalP>
          Any shipping charge will be disclosed before you are charged or will
          be identified as included in the displayed price. Expedited delivery
          is available only when expressly offered. Expedited delivery, when
          available, does not accelerate clinical review, prescription approval,
          or pharmacy processing unless expressly stated.
        </LegalP>
      </>
    ),
  },
  {
    id: "confirmation-tracking",
    title: "Shipment confirmation and tracking",
    content: (
      <>
        <LegalP>
          When tracking is available, you will receive a shipment confirmation
          by email, text message, patient portal notification, or another
          contact method associated with your account. A tracking number may
          take up to 24 hours after shipment to show carrier activity. You are
          responsible for keeping your contact information current and
          monitoring shipment communications.
        </LegalP>
      </>
    ),
  },
  {
    id: "address-access",
    title: "Shipping address and delivery access",
    content: (
      <>
        <LegalP>
          Review your name, shipping address, unit number, and delivery
          instructions before submitting an order or refill. Contact us
          immediately if a correction is needed. Address changes and carrier
          redirects cannot be guaranteed after a pharmacy begins fulfillment or
          a package ships. Because medication may be time- or
          temperature-sensitive, use an address where the package can be
          delivered securely and retrieved promptly. Additional charges or
          pharmacy approval may apply to a replacement requested because the
          address supplied was inaccurate or inaccessible, to the extent
          permitted by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "temperature-sensitive",
    title: "Temperature-sensitive medication and safe receipt",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Important medication safety.
          </strong>{" "}
          Retrieve the package promptly and follow the storage instructions on
          the pharmacy label and packaging. If an injectable GLP-1 medication
          that is expected to arrive refrigerated arrives warm, appears to have
          inadequate refrigeration, or has damaged temperature-control
          packaging, do not use it unless the dispensing pharmacy confirms that
          it is safe. Contact the pharmacy and Beema Health immediately and keep
          the medication, packaging, and shipping materials until you receive
          instructions.
        </LegalP>
        <LegalP>
          Do not leave medication exposed to excessive heat, freezing
          conditions, direct sunlight, or an unsecured location. Store it
          exactly as directed and keep it out of the reach of children and pets.
          A delivery delay does not by itself establish that medication is
          unusable; the dispensing pharmacy should evaluate any possible
          temperature excursion.
        </LegalP>
      </>
    ),
  },
  {
    id: "damaged-incorrect",
    title: "Damaged, opened, tampered, or incorrect packages",
    content: (
      <>
        <LegalP>
          Do not use medication if the package is open, leaking, visibly
          damaged, appears tampered with, contains the wrong medication, has an
          incorrect patient label, or otherwise raises a safety concern.
          Photograph the package and contents, retain all packaging materials,
          and contact Beema Health and the dispensing pharmacy immediately. We
          will help coordinate the review with the pharmacy and carrier. Do not
          rely only on a carrier claim for a medication-safety concern.
        </LegalP>
      </>
    ),
  },
  {
    id: "lost-stolen",
    title: "Lost, stolen, or misdelivered packages",
    content: (
      <>
        <LegalP>
          If tracking shows a package as delivered but you cannot locate it,
          check the delivery area and with household members or building staff,
          then contact the carrier and Beema Health as soon as possible. If
          tracking has stalled or the package appears lost in transit, contact
          us so the pharmacy and carrier can investigate. Any replacement or
          refund will be determined based on the facts, applicable law, the
          dispensing pharmacy&apos;s requirements, and our{" "}
          <Link to="/legal/refund/" className={linkClass}>
            Cancellation and Refund Policy
          </Link>
          . Do not use medication recovered after suspected theft or tampering
          unless the dispensing pharmacy confirms that it is safe.
        </LegalP>
      </>
    ),
  },
  {
    id: "treatment-interruption",
    title: "Delays that may interrupt treatment",
    content: (
      <>
        <LegalP>
          If a shipping delay may cause you to miss a scheduled dose or
          interrupt treatment, contact your care team through the patient
          portal. Do not double a dose, change your dosing schedule, ration
          medication, or use another person&apos;s medication unless your
          clinician specifically directs you to do so.
        </LegalP>
      </>
    ),
  },
  {
    id: "cancellations-returns",
    title: "Cancellations, returns, replacements, and refunds",
    content: (
      <>
        <LegalP>
          Request cancellation as soon as possible. A cancellation may not be
          possible after a pharmacy begins compounding, preparing, or dispensing
          medication or after the package has shipped. For patient safety and
          legal reasons, prescription and compounded medications generally
          cannot be returned, restocked, or resold after dispensing. Do not mail
          medication back unless Beema Health or the dispensing pharmacy gives
          you written instructions.
        </LegalP>
        <LegalP>
          A damaged, incorrect, lost, misdelivered, or potentially
          temperature-compromised shipment is not treated as an ordinary return.
          Contact us promptly so we can review whether a replacement, refund, or
          other resolution is appropriate. Additional terms are provided in our{" "}
          <Link to="/legal/refund/" className={linkClass}>
            Cancellation and Refund Policy
          </Link>
          , and nothing in this Policy limits rights or remedies that cannot be
          waived under applicable law.
        </LegalP>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <>
        <LegalP>
          Email:{" "}
          <a href={SUPPORT_EMAIL_HREF} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
          <br />
          Call or text:{" "}
          <a href={SUPPORT_PHONE_HREF} className={linkClass}>
            {SUPPORT_PHONE_DISPLAY}
          </a>{" "}
          during our posted support hours.
        </LegalP>
        <LegalP>
          Medication-specific questions may be directed to the dispensing
          pharmacy using the contact information on your prescription label or
          package.
        </LegalP>
        <LegalP>
          We may update this Shipping Policy from time to time. The &quot;Last
          updated&quot; date above identifies the version currently in effect.
        </LegalP>
      </>
    ),
  },
];

function ShippingPage() {
  useEffect(() => {
    trackPageViewed("shipping");
  }, []);

  return (
    <MarketingLayout>
      <Section>
        <LegalDocument
          title="Shipping Policy"
          lastUpdated="July 29, 2026"
          description="This Shipping Policy applies when prescription medication or another product is fulfilled and shipped through a pharmacy or fulfillment partner integrated with Beema Health. It does not apply to a prescription you elect to fill independently at a pharmacy outside the Beema Health platform."
          callout={
            <>
              This Policy should be read together with our{" "}
              <Link to="/legal/terms/" className={linkClass}>
                Terms of Service
              </Link>
              ,{" "}
              <Link to="/legal/telehealth-consent/" className={linkClass}>
                Telehealth Consent
              </Link>
              ,{" "}
              <Link to="/legal/privacy/" className={linkClass}>
                Privacy Policy
              </Link>
              , and{" "}
              <Link to="/legal/refund/" className={linkClass}>
                Cancellation and Refund Policy
              </Link>
              . Applicable law, the medication label, and instructions from the
              dispensing pharmacy or your clinician control where they provide
              more specific requirements.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
