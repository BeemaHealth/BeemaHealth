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
  BUSINESS_ADDRESS_SINGLE_LINE,
  LEGAL_BUSINESS_NAME,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "@/lib/contact-info";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Beema Health" },
      {
        name: "description",
        content:
          "How Beema Health LLC collects, uses, shares, and protects personal and health information across its telehealth platform.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/legal/privacy") }],
  }),
  component: PrivacyPage,
});

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About Beema Health and the Services",
    content: (
      <>
        <LegalP>
          Beema Health operates a telehealth platform that connects patients
          with independently licensed healthcare professionals and other
          organizations involved in providing healthcare services.
        </LegalP>
        <LegalP>
          Beema Health is not a replacement for your primary care provider and
          does not provide emergency medical services. Clinical services are
          provided by independently licensed healthcare professionals or medical
          groups (&quot;Providers&quot;). Providers exercise independent medical
          judgment and are solely responsible for determining whether treatment
          is medically appropriate.
        </LegalP>
        <LegalP>
          We may also work with pharmacies, laboratories, payment processors,
          technology providers, fulfillment providers, and other service
          partners (&quot;Care Partners&quot;) to facilitate the Services.
        </LegalP>
        <LegalP>
          Providers, medical groups, pharmacies, laboratories, and other Care
          Partners may maintain their own privacy policies or Notices of Privacy
          Practices. Their handling of information may be governed by those
          notices in addition to this Privacy Policy.
        </LegalP>
      </>
    ),
  },
  {
    id: "scope",
    title: "Scope of This Privacy Policy",
    content: (
      <>
        <LegalP>
          This Privacy Policy applies to personal information collected through:
        </LegalP>
        <LegalList
          items={[
            <>Our public website and landing pages.</>,
            <>Our waitlist and contact forms.</>,
            <>Account-registration and identity-verification processes.</>,
            <>Medical intake questionnaires.</>,
            <>Patient portals made available through the Services.</>,
            <>Communications with our support team.</>,
            <>Email, telephone, SMS, and other electronic communications.</>,
            <>Orders, payments, subscriptions, and fulfillment activities.</>,
            <>Surveys, promotions, referrals, and social-media interactions.</>,
            <>Other online or offline interactions with Beema Health.</>,
          ]}
        />
        <LegalP>
          This Privacy Policy does not independently govern information
          controlled solely by an independent Provider, medical group, pharmacy,
          laboratory, payment processor, or other third party. Their own privacy
          notices may apply to that information.
        </LegalP>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "Information We Collect",
    content: (
      <>
        <LegalP>
          The information we collect depends on how you interact with the
          Services.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information you provide directly.
          </strong>{" "}
          We may collect:
        </LegalP>
        <LegalList
          items={[
            <>
              Your name, email address, telephone number, mailing address,
              billing address, and shipping address.
            </>,
            <>
              Your date of birth, age, sex, gender, and other demographic
              information.
            </>,
            <>
              Account credentials, authentication information, and security
              questions.
            </>,
            <>Waitlist registrations and communication preferences.</>,
            <>
              Information submitted through contact forms, surveys, promotions,
              or support requests.
            </>,
            <>
              Records of your communications with Beema Health, Providers, and
              Care Partners.
            </>,
            <>
              Photographs, identification documents, insurance information,
              laboratory records, or other documents you upload.
            </>,
            <>Any other information you voluntarily provide.</>,
          ]}
        />
        <LegalP>
          <strong className="font-semibold text-foreground">
            Health and clinical information.
          </strong>{" "}
          To determine eligibility and facilitate care, we may collect
          information such as:
        </LegalP>
        <LegalList
          items={[
            <>
              Height, weight, body mass index, weight-management goals, and
              progress information.
            </>,
            <>Symptoms, diagnoses, health conditions, and treatment history.</>,
            <>
              Current and previous medications, supplements, prescriptions, and
              refill history.
            </>,
            <>
              Allergies, sensitivities, contraindications, and adverse
              reactions.
            </>,
            <>Family, surgical, social, and medical history.</>,
            <>Laboratory results and testing information.</>,
            <>
              Pregnancy, reproductive health, or sexual-health information when
              relevant to treatment.
            </>,
            <>
              Lifestyle information, including diet, physical activity, sleep,
              alcohol use, tobacco use, and substance use.
            </>,
            <>Photographs or measurements submitted for clinical evaluation.</>,
            <>
              Provider notes, treatment decisions, prescription information, and
              follow-up responses.
            </>,
            <>Communications between you and a Provider.</>,
            <>
              Information concerning whether you requested, scheduled, received,
              or paid for healthcare services.
            </>,
          ]}
        />
        <LegalP>
          Providing inaccurate or incomplete health information may affect a
          Provider&apos;s ability to evaluate you or safely provide care.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Payment and transaction information.
          </strong>{" "}
          We may collect:
        </LegalP>
        <LegalList
          items={[
            <>Products or services requested or purchased.</>,
            <>
              Subscription status, renewal dates, promotional codes, discounts,
              and refund history.
            </>,
            <>
              Payment status, transaction amounts, billing information, and
              limited payment-card details.
            </>,
            <>Shipping and fulfillment status.</>,
            <>
              Records of chargebacks, disputes, cancellations, and
              customer-service interactions.
            </>,
          ]}
        />
        <LegalP>
          Payment information may be collected directly by a third-party payment
          processor. Beema Health may receive a payment token, transaction
          identifier, card type, expiration date, or the last digits of a
          payment card, but we may not receive or store your complete
          payment-card number.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information collected automatically.
          </strong>{" "}
          When you use the Services, we and our service providers may
          automatically collect:
        </LegalP>
        <LegalList
          items={[
            <>Internet Protocol address.</>,
            <>Browser type, device type, operating system, and language.</>,
            <>Device identifiers and advertising identifiers.</>,
            <>General location derived from an IP address.</>,
            <>Referring and exit pages.</>,
            <>Pages viewed, links clicked, and features used.</>,
            <>Dates, times, and duration of visits.</>,
            <>Website, portal, or application performance data.</>,
            <>Error reports, diagnostic information, and security logs.</>,
            <>Cookie identifiers and similar online identifiers.</>,
            <>
              Information about how you interact with emails or electronic
              communications.
            </>,
          ]}
        />
        <LegalP>
          We do not collect precise GPS location unless the feature requires it,
          you receive appropriate notice, and you provide any consent required
          by law.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Information from other sources.
          </strong>{" "}
          We may receive information from:
        </LegalP>
        <LegalList
          items={[
            <>Providers and medical groups involved in your care.</>,
            <>Pharmacies, laboratories, and fulfillment providers.</>,
            <>Payment processors and financial institutions.</>,
            <>
              Identity-verification, fraud-prevention, and security providers.
            </>,
            <>Telehealth infrastructure and patient-portal providers.</>,
            <>Customer-support and communications providers.</>,
            <>Advertising, analytics, and referral partners.</>,
            <>
              Social-media platforms when you interact with our pages or
              advertisements.
            </>,
            <>
              Other healthcare organizations when you authorize the exchange.
            </>,
            <>Publicly available sources and government records.</>,
            <>
              A family member, caregiver, or authorized representative acting on
              your behalf.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "consumer-health",
    title: "Consumer Health Data",
    content: (
      <>
        <LegalP>
          Certain information may qualify as &quot;consumer health data&quot;
          under state privacy laws even when it is not protected health
          information under HIPAA.
        </LegalP>
        <LegalP>Consumer health data we may collect includes:</LegalP>
        <LegalList
          items={[
            <>Information about your physical or mental health.</>,
            <>
              Health conditions, symptoms, diagnoses, treatments, or
              medications.
            </>,
            <>
              Weight, BMI, measurements, activity, nutrition, or wellness
              information.
            </>,
            <>
              Reproductive or sexual-health information when relevant to care.
            </>,
            <>
              Healthcare appointments, consultations, prescriptions, and
              purchases.
            </>,
            <>
              Information that identifies your attempt to obtain healthcare
              products or services.
            </>,
            <>
              Precise location information that could reasonably indicate an
              attempt to receive healthcare services, if such information is
              collected with required consent.
            </>,
            <>
              Inferences concerning your health, treatment interests, or
              eligibility derived from information you provide or your
              interactions with the Services.
            </>,
            <>
              Identifiers that can be associated with the foregoing information.
            </>,
          ]}
        />
        <LegalP>
          <strong className="font-semibold text-foreground">
            Sources of consumer health data.
          </strong>{" "}
          We may collect consumer health data:
        </LegalP>
        <LegalList
          items={[
            <>Directly from you.</>,
            <>From your authorized representative.</>,
            <>From Providers and medical groups.</>,
            <>From pharmacies, laboratories, and fulfillment partners.</>,
            <>From connected devices or services you authorize.</>,
            <>From payment and transaction records.</>,
            <>From your use of the Services.</>,
            <>From other healthcare sources you authorize.</>,
          ]}
        />
        <LegalP>
          <strong className="font-semibold text-foreground">
            Why we collect and use consumer health data.
          </strong>{" "}
          We use consumer health data to:
        </LegalP>
        <LegalList
          items={[
            <>Respond to your request for telehealth services.</>,
            <>Assess preliminary eligibility.</>,
            <>Connect you with an appropriately licensed Provider.</>,
            <>
              Facilitate diagnosis, treatment, prescribing, follow-up care, and
              care coordination.
            </>,
            <>Process payments and fulfill orders.</>,
            <>
              Communicate about appointments, prescriptions, laboratory testing,
              shipping, and support.
            </>,
            <>Maintain records required by law.</>,
            <>
              Protect patients, Providers, and the Services against fraud,
              misuse, or security incidents.
            </>,
            <>
              Improve the safety, accessibility, and operation of the Services.
            </>,
            <>Comply with legal and regulatory obligations.</>,
          ]}
        />
        <LegalP>
          <strong className="font-semibold text-foreground">
            Consumer health data we share.
          </strong>{" "}
          Depending on the Services you request, we may share the categories of
          consumer health data described above with:
        </LegalP>
        <LegalList
          items={[
            <>Independently licensed Providers and medical groups.</>,
            <>Pharmacies and pharmacy-service providers.</>,
            <>Laboratories and testing providers.</>,
            <>
              Telehealth platform, patient-portal, hosting, and data-storage
              providers.
            </>,
            <>
              Payment, billing, fraud-prevention, and identity-verification
              providers.
            </>,
            <>
              Customer-support, communications, and appointment-management
              providers.
            </>,
            <>Shipping and fulfillment providers.</>,
            <>
              Legal, compliance, auditing, and information-security
              professionals.
            </>,
            <>Government agencies or other parties when legally required.</>,
          ]}
        />
        <LegalP>
          We share consumer health data only as reasonably necessary to provide
          a product or service you requested, with your consent when required,
          or as otherwise permitted by law.
        </LegalP>
        <LegalP>
          We do not sell consumer health data. We do not use or disclose
          consumer health data for a third party&apos;s independent advertising
          purposes.
        </LegalP>
        <LegalP>
          We currently do not share consumer health data with any corporate
          affiliate for the affiliate&apos;s independent purposes. If that
          changes, we will update this Privacy Policy and obtain consent when
          required.
        </LegalP>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How We Use Personal Information",
    content: (
      <>
        <LegalP>We may use personal information to:</LegalP>
        <LegalList
          items={[
            <>Provide, administer, maintain, and improve the Services.</>,
            <>Register and authenticate accounts.</>,
            <>Manage waitlist registrations.</>,
            <>Verify identity, age, location, and treatment eligibility.</>,
            <>Connect patients with Providers licensed in their state.</>,
            <>
              Facilitate medical intake, consultations, treatment,
              prescriptions, and follow-up care.
            </>,
            <>
              Coordinate with pharmacies, laboratories, and fulfillment
              providers.
            </>,
            <>
              Process payments, subscriptions, renewals, refunds, and billing
              disputes.
            </>,
            <>Fulfill and track orders.</>,
            <>Provide technical support and customer service.</>,
            <>
              Communicate about appointments, treatments, prescriptions,
              laboratory orders, billing, shipping, account security, and
              support requests.
            </>,
            <>Send administrative and transactional messages.</>,
            <>Send marketing communications where permitted.</>,
            <>Personalize content and user experience.</>,
            <>Analyze website and Service performance.</>,
            <>
              Detect and prevent fraud, abuse, unauthorized access, and security
              incidents.
            </>,
            <>Debug, maintain, and improve our technology.</>,
            <>Conduct internal research and quality-assurance activities.</>,
            <>Enforce our agreements and policies.</>,
            <>Establish, exercise, or defend legal claims.</>,
            <>
              Comply with legal, regulatory, licensing, tax, accounting, and
              reporting obligations.
            </>,
            <>
              Protect the health, rights, property, safety, and security of
              patients, Providers, Beema Health, and others.
            </>,
            <>Create aggregated or de-identified information.</>,
          ]}
        />
        <LegalP>
          We will not use consumer health data for a materially different
          purpose without providing any notice and obtaining any consent
          required by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "automated-tools",
    title: "Automated Tools and Artificial Intelligence",
    content: (
      <>
        <LegalP>
          We may use automated systems to support administrative functions such
          as:
        </LegalP>
        <LegalList
          items={[
            <>Routing support requests.</>,
            <>Scheduling and appointment management.</>,
            <>Fraud and security detection.</>,
            <>Document organization.</>,
            <>Quality assurance.</>,
            <>Website analytics.</>,
            <>Drafting or organizing non-clinical communications.</>,
            <>Identifying incomplete information.</>,
          ]}
        />
        <LegalP>
          Automated tools do not replace the independent medical judgment of a
          licensed Provider. Diagnosis, prescribing, treatment, and other
          clinical decisions are made by Providers.
        </LegalP>
        <LegalP>
          When an automated or artificial-intelligence service processes
          protected health information on our behalf, we require appropriate
          privacy and security safeguards, including a business associate
          agreement when required by HIPAA. We do not intentionally provide
          protected health information to general-purpose
          artificial-intelligence services that are not approved for that use.
        </LegalP>
      </>
    ),
  },
  {
    id: "how-we-disclose",
    title: "How We Disclose Information",
    content: (
      <>
        <LegalP>We may disclose personal information as follows.</LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Providers and medical groups.
          </strong>{" "}
          We disclose information to Providers and medical groups to evaluate
          treatment eligibility, provide healthcare services, communicate with
          you, issue prescriptions, monitor treatment, and conduct treatment,
          payment, and healthcare operations.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Pharmacies, laboratories, and fulfillment partners.
          </strong>{" "}
          We disclose information necessary to process prescriptions, conduct
          testing, dispense medication, coordinate shipping, provide refill
          support, and resolve fulfillment issues.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Service providers.
          </strong>{" "}
          We may disclose information to vendors that perform services on our
          behalf, including:
        </LegalP>
        <LegalList
          items={[
            <>Telehealth technology and patient-portal services.</>,
            <>Cloud hosting and data storage.</>,
            <>Payment processing and billing.</>,
            <>Identity verification and fraud prevention.</>,
            <>Email, telephone, and SMS communications.</>,
            <>Customer support.</>,
            <>Analytics and website performance.</>,
            <>Security monitoring.</>,
            <>Shipping and fulfillment.</>,
            <>Legal, accounting, auditing, and compliance services.</>,
          ]}
        />
        <LegalP>
          These providers may access information only to perform services for us
          or as otherwise permitted by their agreements and applicable law.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            At your direction or with your consent.
          </strong>{" "}
          We may disclose information when you direct us to do so, authorize the
          disclosure, or ask us to coordinate with another person or
          organization.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Legal and safety disclosures.
          </strong>{" "}
          We may disclose information when we reasonably believe it is necessary
          to:
        </LegalP>
        <LegalList
          items={[
            <>
              Comply with applicable law, regulation, court order, subpoena, or
              lawful governmental request.
            </>,
            <>Respond to a public-health or safety obligation.</>,
            <>
              Prevent or investigate fraud, abuse, security threats, or illegal
              activity.
            </>,
            <>
              Protect the rights, property, health, or safety of Beema Health,
              patients, Providers, or others.
            </>,
            <>Enforce our agreements.</>,
            <>Establish, exercise, or defend legal claims.</>,
          ]}
        />
        <LegalP>
          Any disclosure of protected health information remains subject to
          HIPAA and other applicable health-information laws.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Business transactions.
          </strong>{" "}
          Information may be reviewed, disclosed, or transferred as part of a
          proposed or completed merger, financing, acquisition, reorganization,
          bankruptcy, sale of assets, or similar transaction. Any recipient will
          be required to handle consumer health data in accordance with
          applicable law. Where required, we will provide notice or obtain
          consent before transferring sensitive information.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            De-identified or aggregated information.
          </strong>{" "}
          We may create information that cannot reasonably be linked to you. We
          may use or disclose properly de-identified or aggregated information
          for lawful purposes, including analytics, research, product
          improvement, and business planning.
        </LegalP>
        <LegalP>
          Where required, we maintain de-identified information in de-identified
          form and do not attempt to reidentify it.
        </LegalP>
      </>
    ),
  },
  {
    id: "sale-sharing",
    title: "Sale, Sharing, and Targeted Advertising",
    content: (
      <>
        <LegalP>We do not sell personal information for money.</LegalP>
        <LegalP>
          We do not sell consumer health data or protected health information.
          We do not share protected health information with advertisers.
        </LegalP>
        <LegalP>
          We may use limited information collected from public website pages for
          analytics, advertising measurement, attribution, or promoting Beema
          Health on other websites. Depending on the applicable state law,
          allowing an advertising or analytics provider to collect online
          identifiers from public pages may be considered a &quot;sale,&quot;
          &quot;sharing,&quot; or processing for targeted advertising even when
          no money is exchanged.
        </LegalP>
        <LegalP>
          We do not permit advertising platforms to use the contents of medical
          intake forms, Provider communications, diagnoses, medications,
          laboratory results, prescriptions, or authenticated patient-portal
          activity for their own advertising.
        </LegalP>
        <LegalP>
          Where required by law, we will obtain consent before sharing consumer
          health data or sensitive personal information for a purpose that is
          not necessary to provide a service you requested.
        </LegalP>
        <LegalP>
          You may request to opt out of the sale or sharing of personal
          information or its use for targeted advertising by contacting{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          . Where legally required and technically supported, we also process
          recognized universal opt-out signals, such as Global Privacy Control,
          as a request to opt out for the browser or device sending the signal.
        </LegalP>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and Similar Technologies",
    content: (
      <>
        <LegalP>We and our service providers may use:</LegalP>
        <LegalList
          items={[
            <>Cookies.</>,
            <>Local storage.</>,
            <>Software development kits.</>,
            <>Tags.</>,
            <>Web beacons.</>,
            <>Tracking pixels.</>,
            <>Server logs.</>,
            <>Similar technologies.</>,
          ]}
        />
        <LegalP>These technologies may be used to:</LegalP>
        <LegalList
          items={[
            <>Keep you signed in.</>,
            <>Maintain account security.</>,
            <>Remember preferences.</>,
            <>Enable website and portal functionality.</>,
            <>Understand traffic and usage.</>,
            <>Identify errors and performance issues.</>,
            <>Measure communications and advertising.</>,
            <>Prevent fraud.</>,
            <>Improve the Services.</>,
          ]}
        />
        <LegalP>
          You may be able to control cookies through your browser settings or a
          cookie-preference tool made available on our website. Blocking cookies
          may prevent certain features from functioning properly.
        </LegalP>
        <LegalP>
          Some browsers offer &quot;Do Not Track&quot; settings. Because there
          is not one universally accepted technical standard for Do Not Track,
          we may not respond to every Do Not Track signal. We process legally
          recognized opt-out preference signals where required.
        </LegalP>
        <LegalP>
          Third-party analytics or advertising providers may collect information
          over time and across different websites or online services when you
          use public portions of the Services. We restrict the use of these
          technologies on authenticated clinical areas and do not authorize
          third parties to collect clinical information for their independent
          advertising purposes.
        </LegalP>
      </>
    ),
  },
  {
    id: "communications",
    title: "Email, Telephone, and SMS Communications",
    content: (
      <>
        <LegalP>We may use your contact information to send:</LegalP>
        <LegalList
          items={[
            <>Account and security notifications.</>,
            <>Appointment reminders.</>,
            <>Intake and follow-up reminders.</>,
            <>Prescription and refill updates.</>,
            <>Laboratory and fulfillment updates.</>,
            <>Billing and payment communications.</>,
            <>Customer-support responses.</>,
            <>Other messages necessary to provide the Services.</>,
            <>Promotional communications where permitted.</>,
          ]}
        />
        <LegalP>
          You may opt out of promotional emails by using the unsubscribe link in
          the message. You may opt out of promotional text messages by replying
          STOP. You may request help by replying HELP or contacting us.
        </LegalP>
        <LegalP>
          Opting out of promotional communications will not prevent us from
          sending non-promotional messages relating to your account, requested
          healthcare services, orders, payments, safety, or legal notices.
        </LegalP>
        <LegalP>
          Message frequency may vary. Message and data rates may apply. Consent
          to receive promotional text messages is not a condition of purchasing
          a product or service.
        </LegalP>
        <LegalP>
          We do not sell your telephone number or SMS consent information. We do
          not share SMS opt-in information with third parties for their own
          marketing. We may share it with communications providers and other
          service providers only as necessary to deliver requested messages,
          support the Services, or comply with law.
        </LegalP>
        <LegalP>
          Email and standard SMS may not always be encrypted. Do not use email
          or SMS for emergencies. If you believe you are experiencing a medical
          emergency, call 911.
        </LegalP>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Privacy Rights",
    content: (
      <>
        <LegalP>
          Depending on where you live and subject to applicable exceptions, you
          may have the right to:
        </LegalP>
        <LegalList
          items={[
            <>Confirm whether we process personal information about you.</>,
            <>Access personal information we maintain about you.</>,
            <>Obtain a portable copy of certain information.</>,
            <>Correct inaccurate information.</>,
            <>Request deletion of certain information.</>,
            <>Withdraw consent for certain processing.</>,
            <>Opt out of targeted advertising.</>,
            <>Opt out of the sale or sharing of personal information.</>,
            <>
              Limit certain uses or disclosures of sensitive personal
              information.
            </>,
            <>
              Obtain information about third parties with whom consumer health
              data was shared.
            </>,
            <>Appeal a decision concerning a privacy request.</>,
            <>
              Be free from unlawful discrimination for exercising privacy
              rights.
            </>,
          ]}
        />
        <LegalP>
          Some rights do not apply to information regulated by HIPAA or other
          healthcare privacy laws. Certain information may also be exempt from
          deletion or other requests when we or a Provider must retain it to
          comply with medical-record, prescription, billing, fraud-prevention,
          tax, legal, or licensing obligations.
        </LegalP>
        <LegalP>
          Deleting information required to provide the Services may prevent us
          or a Provider from continuing to provide care.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            How to submit a request.
          </strong>{" "}
          You may submit a privacy request by contacting:
        </LegalP>
        <LegalP>
          Email:{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          <br />
          Telephone:{" "}
          <a
            href={SUPPORT_PHONE_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>
          <br />
          Mail: {LEGAL_BUSINESS_NAME}, {BUSINESS_ADDRESS_SINGLE_LINE}
        </LegalP>
        <LegalP>
          Please identify the privacy right you wish to exercise and provide
          enough information for us to locate your records. We may verify your
          identity before completing the request. We will use personal
          information provided for verification only to verify and process the
          request.
        </LegalP>
        <LegalP>
          You may use an authorized agent where permitted by law. We may request
          proof that the agent is authorized to act for you and may ask you to
          verify your identity directly.
        </LegalP>
        <LegalP>
          If we deny your request, you may appeal by emailing{" "}
          <a
            href={SUPPORT_EMAIL_HREF}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          with the subject line &quot;Privacy Appeal.&quot; Include enough
          information for us to identify the original request and explain why
          you believe the decision should be reconsidered.
        </LegalP>
      </>
    ),
  },
  {
    id: "state-specific",
    title: "State-Specific Privacy Disclosures",
    content: (
      <>
        <LegalP>
          <strong className="font-semibold text-foreground">
            California residents.
          </strong>{" "}
          California residents may have rights under the California Consumer
          Privacy Act, as amended, including rights to know, access, correct,
          delete, opt out of sale or sharing, limit certain uses of sensitive
          personal information, and receive equal treatment.
        </LegalP>
        <LegalP>
          During the preceding 12 months, we may have collected the following
          categories of personal information:
        </LegalP>
        <LegalList
          items={[
            <>Identifiers and contact information.</>,
            <>Customer and account records.</>,
            <>Protected classifications and demographic information.</>,
            <>Commercial and transaction information.</>,
            <>Internet and electronic-network activity.</>,
            <>General geolocation information.</>,
            <>Audio, visual, or similar information.</>,
            <>Professional information if voluntarily provided.</>,
            <>
              Sensitive personal information, including health information and
              account credentials.
            </>,
            <>Inferences derived from other information.</>,
          ]}
        />
        <LegalP>
          We collect these categories from the sources and for the purposes
          described in this Privacy Policy. We may disclose them to the
          categories of recipients described in this Privacy Policy for business
          purposes.
        </LegalP>
        <LegalP>
          We do not use sensitive personal information to infer characteristics
          about you for purposes unrelated to providing or improving the
          Services, security, legal compliance, or other purposes permitted
          without a right to limit.
        </LegalP>
        <LegalP>
          You can learn more about California privacy rights from the California
          Attorney General.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Colorado and other comprehensive state privacy laws.
          </strong>{" "}
          Residents of Colorado and other states with comprehensive consumer
          privacy laws may have rights to access, correct, delete, or obtain a
          copy of personal information and to opt out of targeted advertising,
          sale, or certain profiling.
        </LegalP>
        <LegalP>
          Colorado residents may learn more from the Colorado Attorney General.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Washington consumer health data rights.
          </strong>{" "}
          To the extent the Washington My Health My Data Act applies, Washington
          consumers may:
        </LegalP>
        <LegalList
          items={[
            <>
              Confirm whether we collect, share, or sell their consumer health
              data.
            </>,
            <>Access their consumer health data.</>,
            <>
              Request a list of third parties and affiliates with whom their
              consumer health data was shared or sold.
            </>,
            <>Withdraw consent to future collection or sharing.</>,
            <>Request deletion of consumer health data.</>,
            <>Appeal a refusal to act on a request.</>,
          ]}
        />
        <LegalP>
          The categories of consumer health data, sources, purposes, and
          recipients are described in Section 4 of this Privacy Policy.
        </LegalP>
        <LegalP>
          We do not sell consumer health data. We do not implement geofences
          around healthcare facilities for the purpose of identifying, tracking,
          collecting data from, or sending health-related messages to
          individuals seeking or receiving healthcare services.
        </LegalP>
        <LegalP>
          Additional information about Washington consumer health data rights is
          available in Chapter 19.373 RCW.
        </LegalP>
        <LegalP>
          <strong className="font-semibold text-foreground">
            Nevada consumer health data rights.
          </strong>{" "}
          Nevada consumers may have rights to:
        </LegalP>
        <LegalList
          items={[
            <>
              Confirm whether we collect, share, or sell consumer health data.
            </>,
            <>
              Obtain information about third parties with whom data was shared.
            </>,
            <>
              Request that we stop collecting, sharing, or selling consumer
              health data.
            </>,
            <>Request deletion of consumer health data.</>,
            <>Appeal a refusal to act on a request.</>,
          ]}
        />
        <LegalP>
          We do not sell consumer health data. Additional information is
          available in Chapter 603A of the Nevada Revised Statutes.
        </LegalP>
        <LegalP>
          Nevada residents may also submit a verified request to opt out of any
          future sale of covered information by contacting{" "}
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
    id: "hipaa",
    title: "HIPAA and Protected Health Information",
    content: (
      <>
        <LegalP>
          HIPAA applies only to covered entities and their business associates.
          It does not apply to every organization or every type of
          health-related information.
        </LegalP>
        <LegalP>
          Providers and medical groups may be HIPAA-covered entities. Beema
          Health may act as a business associate when it handles protected
          health information on behalf of a covered entity. When acting as a
          business associate, Beema Health uses and discloses protected health
          information only as permitted by HIPAA, an applicable business
          associate agreement, and other law.
        </LegalP>
        <LegalP>
          A Provider&apos;s or medical group&apos;s Notice of Privacy Practices
          describes how that organization may use and disclose protected health
          information and explains the applicable HIPAA rights. See also our{" "}
          <Link
            to="/legal/hipaa/"
            className="text-foreground underline-offset-2 hover:underline"
          >
            HIPAA Privacy Policy
          </Link>
          . If this Privacy Policy conflicts with a Provider&apos;s Notice of
          Privacy Practices regarding protected health information controlled by
          that Provider, the Provider&apos;s Notice of Privacy Practices will
          control.
        </LegalP>
        <LegalP>
          Information maintained by Beema Health outside its role as a business
          associate may not be protected by HIPAA but may still be protected by
          other federal or state privacy laws and this Privacy Policy.
        </LegalP>
        <LegalP>
          Information properly de-identified under HIPAA is not protected health
          information. More information about HIPAA privacy rights is available
          from the U.S. Department of Health and Human Services.
        </LegalP>
      </>
    ),
  },
  {
    id: "security",
    title: "Security and Breach Notification",
    content: (
      <>
        <LegalP>
          We maintain administrative, technical, and physical safeguards
          designed to protect personal information. Depending on the system and
          information involved, these safeguards may include:
        </LegalP>
        <LegalList
          items={[
            <>Encryption in transit and at rest.</>,
            <>Role-based access controls.</>,
            <>Multi-factor authentication.</>,
            <>Logging and security monitoring.</>,
            <>Vendor security reviews.</>,
            <>Workforce privacy and security training.</>,
            <>Backup and recovery procedures.</>,
            <>Incident-response processes.</>,
            <>Access restrictions based on job responsibilities.</>,
            <>Contractual confidentiality and security obligations.</>,
          ]}
        />
        <LegalP>
          No system, transmission method, or storage method is completely
          secure. We cannot guarantee that unauthorized parties will never
          defeat our safeguards.
        </LegalP>
        <LegalP>
          You are responsible for protecting your account credentials, using a
          secure device and network, and notifying us promptly if you believe
          your account has been compromised.
        </LegalP>
        <LegalP>
          If a breach occurs, we will investigate and provide notifications as
          required by applicable law, including HIPAA breach-notification
          requirements or the FTC Health Breach Notification Rule, as
          applicable.
        </LegalP>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data Retention",
    content: (
      <>
        <LegalP>
          We retain personal information for as long as reasonably necessary to:
        </LegalP>
        <LegalList
          items={[
            <>Provide the Services.</>,
            <>Maintain your account.</>,
            <>
              Support treatment, prescriptions, refills, and care coordination.
            </>,
            <>Complete transactions and resolve disputes.</>,
            <>
              Comply with medical-record, pharmacy, tax, accounting, licensing,
              and legal obligations.
            </>,
            <>Prevent fraud and protect security.</>,
            <>Enforce our agreements.</>,
            <>Establish, exercise, or defend legal claims.</>,
          ]}
        />
        <LegalP>
          Retention periods depend on the type of information, why it was
          collected, legal requirements, the sensitivity of the information, and
          operational needs.
        </LegalP>
        <LegalP>
          Clinical, prescription, and billing records may be retained for
          periods established by the Provider, pharmacy, medical group, or
          applicable law. Beema Health may not be able to delete records
          controlled by those organizations.
        </LegalP>
        <LegalP>
          When information is no longer reasonably needed, we may delete,
          destroy, anonymize, or de-identify it using appropriate safeguards.
          Information stored in backups may remain until the backup is securely
          overwritten or deleted, subject to applicable law.
        </LegalP>
      </>
    ),
  },
  {
    id: "children",
    title: "Children's Privacy",
    content: (
      <>
        <LegalP>
          The Services are intended for adults who are at least 18 years old.
          Individuals under 18 may not create an account, complete a medical
          intake, or use the Services unless a specific Service expressly
          permits it and all required parental or legal-guardian consents are
          obtained.
        </LegalP>
        <LegalP>
          We do not knowingly collect personal information from children under
          13 through the Services. If you believe a child has provided personal
          information to us improperly, contact{" "}
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
    id: "third-party",
    title: "Third-Party Websites and Services",
    content: (
      <LegalP>
        The Services may contain links to websites, applications, social-media
        platforms, pharmacies, laboratories, or services operated by third
        parties. We do not control and are not responsible for the privacy,
        security, content, or practices of third-party services. A link does not
        mean that Beema Health endorses the third party&apos;s privacy
        practices. Review the applicable third party&apos;s privacy policy
        before providing information.
      </LegalP>
    ),
  },
  {
    id: "us-operations",
    title: "United States Operations",
    content: (
      <LegalP>
        Beema Health is based in the United States, and the Services are
        directed to individuals located in the United States. Information may be
        processed in the United States and in other locations where our service
        providers operate. When required, we use appropriate safeguards for
        transfers of personal information.
      </LegalP>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Privacy Policy",
    content: (
      <>
        <LegalP>
          We may update this Privacy Policy to reflect changes in the Services,
          technology, legal requirements, or our information practices.
        </LegalP>
        <LegalP>
          When we update the Policy, we will revise the &quot;Last updated&quot;
          date. If a change materially affects how we collect, use, or share
          sensitive personal information or consumer health data, we will
          provide additional notice and obtain consent when required.
        </LegalP>
        <LegalP>
          Your continued use of the Services after an updated Policy becomes
          effective constitutes acknowledgment of the updated Policy, but it
          does not replace any consent required by law.
        </LegalP>
      </>
    ),
  },
  {
    id: "pricing",
    title: "Pricing, Promotions, and Advertisements",
    content: (
      <>
        <LegalP>
          Prices, discounts, promotions, medication costs, consultation fees,
          subscription rates, and other offers displayed on our website or in
          advertisements are subject to change at any time, subject to
          applicable law and any express written terms governing an existing
          purchase or subscription.
        </LegalP>
        <LegalP>
          A price shown in an advertisement, social-media post, email, search
          result, landing page, or other promotional material does not guarantee
          that price for life or for any particular period. A price is
          guaranteed only when Beema Health expressly states the duration of
          that guarantee in written offer or subscription terms.
        </LegalP>
        <LegalP>
          The price, fees, renewal terms, and other conditions presented to you
          at checkout or when you authorize a purchase control over earlier
          advertising or promotional content. Promotions may be subject to
          eligibility requirements, expiration dates, quantity limits, plan
          requirements, and separate terms.
        </LegalP>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    content: (
      <>
        <LegalP>
          For questions, privacy requests, or concerns about this Privacy
          Policy, contact:
        </LegalP>
        <LegalBusinessContact />
      </>
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
          lastUpdated="July 29, 2026"
          description={`${LEGAL_BUSINESS_NAME} ("Beema Health," "we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, retain, and protect personal information when you visit beemahealth.com, join our waitlist, use a Beema Health patient portal, communicate with us, or use any website, application, product, or service that links to this Privacy Policy (collectively, the "Services").`}
          callout={
            <>
              Please read this Privacy Policy carefully. By using the Services,
              you acknowledge that you have read and understood this Privacy
              Policy. If you do not agree with our practices, please do not use
              the Services. This Privacy Policy should be read together with our{" "}
              <Link
                to="/legal/terms/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                Terms of Service
              </Link>
              ,{" "}
              <Link
                to="/legal/telehealth-consent/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                Telehealth Consent
              </Link>
              , and any Notice of Privacy Practices provided by a healthcare
              provider or medical group involved in your care.
            </>
          }
          sections={SECTIONS}
        />
      </Section>
    </MarketingLayout>
  );
}
