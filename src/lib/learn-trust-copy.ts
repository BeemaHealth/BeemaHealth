import type { LearnFaq } from "@/content/learn/types";
import {
  COMPOUNDED_DISCLOSURE,
  COMPOUNDED_SEMA_REQUIRED,
  COMPOUNDED_TIRZ_REQUIRED,
} from "@/lib/compounded-disclosure";

export const LEARN_FIFTY_STATE_SENTENCE =
  "Licensed providers can evaluate adults in all 50 US states through telehealth.";

export const LEARN_USA_ONLY_SENTENCE =
  "Beema Health serves patients located in the United States only. It is not an international service.";

export const LEARN_CLINICIAN_RX_SENTENCE =
  "A licensed clinician reviews each intake and decides whether any medication is appropriate. Completing an online intake does not guarantee a prescription.";

export const LEARN_LEGITSCRIPT_STATUS_SENTENCE =
  "Beema Health is a LegitScript-certified website. Certification means the certified site is monitored against LegitScript's healthcare merchant standards. It is not an endorsement of Beema Health's products, not a statement that compounded medication is safe or FDA-approved, and not a claim about competitors.";

export const LEARN_GOOGLE_ADS_CERT_SENTENCE =
  "Beema Health has obtained Google's healthcare certification for prescription-drug advertising in the United States. That certification is about advertising eligibility. It is not a Google endorsement of Beema Health, of any medication, or of any clinical outcome.";

export const LEARN_TRIAL_ATTRIBUTION_SENTENCE =
  "The percentages below come from clinical trials of FDA-approved branded products. They do not describe compounded semaglutide or compounded tirzepatide, and they are not a promise of individual results.";

export {
  COMPOUNDED_DISCLOSURE,
  COMPOUNDED_SEMA_REQUIRED,
  COMPOUNDED_TIRZ_REQUIRED,
};

export type BuyGlp1OnlineFaqOptions = {
  molecule?: "glp-1" | "tirzepatide" | "semaglutide";
};

function offeringSentence(
  molecule: NonNullable<BuyGlp1OnlineFaqOptions["molecule"]>,
): string {
  if (molecule === "tirzepatide") {
    return "If a licensed clinician decides treatment is appropriate, Beema Health may prescribe compounded tirzepatide, filled by a licensed US pharmacy.";
  }
  if (molecule === "semaglutide") {
    return "If a licensed clinician decides treatment is appropriate, Beema Health may prescribe compounded semaglutide, filled by a licensed US pharmacy.";
  }
  return "If a licensed clinician decides treatment is appropriate, Beema Health may prescribe compounded semaglutide or compounded tirzepatide, filled by a licensed US pharmacy.";
}

function brandSeparationSentence(
  molecule: NonNullable<BuyGlp1OnlineFaqOptions["molecule"]>,
): string {
  if (molecule === "tirzepatide") {
    return "Compounded tirzepatide is not Zepbound or Mounjaro. Beema Health does not sell those brands.";
  }
  if (molecule === "semaglutide") {
    return "Compounded semaglutide is not Wegovy or Ozempic. Beema Health does not sell those brands.";
  }
  return "Beema Health does not sell Wegovy, Ozempic, Mounjaro, or Zepbound.";
}

/** Shared YES answer for buy/get-online FAQs. Prescription is never guaranteed. */
export function buyGlp1OnlineFaq(options?: BuyGlp1OnlineFaqOptions): LearnFaq {
  const molecule = options?.molecule ?? "glp-1";
  const question =
    molecule === "tirzepatide"
      ? "Can I get tirzepatide online?"
      : molecule === "semaglutide"
        ? "Can I get semaglutide online?"
        : "Can I buy GLP-1 online?";

  return {
    question,
    answer: `Yes. With Beema Health you complete an online visit from home. ${LEARN_USA_ONLY_SENTENCE} ${LEARN_FIFTY_STATE_SENTENCE} ${offeringSentence(molecule)} ${COMPOUNDED_DISCLOSURE} ${LEARN_CLINICIAN_RX_SENTENCE} ${brandSeparationSentence(molecule)} What you cannot do is add a research peptide to a cart with no clinician. That is not Beema Health, and it is not lawful care.`,
  };
}

/** Hub / class-page FAQ that keeps "buy" out of the question (ranking still uses keywords). */
export function getGlp1OnlineWithBeemaFaq(): LearnFaq {
  return {
    question: "Can I get a GLP-1 online with Beema Health?",
    answer: `Yes. Beema Health is a cash-pay telehealth program for medical weight loss. ${LEARN_USA_ONLY_SENTENCE} ${LEARN_FIFTY_STATE_SENTENCE} You start a free online intake. A licensed provider reviews it. If they prescribe, a licensed pharmacy ships compounded semaglutide or compounded tirzepatide, and follow-up continues. ${COMPOUNDED_DISCLOSURE} ${LEARN_CLINICIAN_RX_SENTENCE} Beema Health does not sell Ozempic, Wegovy, Mounjaro, or Zepbound.`,
  };
}

export const LEARN_CTA_TRUST_BODY = `${LEARN_FIFTY_STATE_SENTENCE} ${LEARN_USA_ONLY_SENTENCE} ${LEARN_CLINICIAN_RX_SENTENCE} ${COMPOUNDED_DISCLOSURE}`;

export const LEARN_DISCLAIMER_BODY = `This content is for general information only. It is not medical advice, a diagnosis, or a treatment plan. Beema Health's live clinical offerings include online medical weight loss, hair loss, ED, NAD+, and sermorelin care. ${LEARN_USA_ONLY_SENTENCE} ${LEARN_FIFTY_STATE_SENTENCE} ${LEARN_CLINICIAN_RX_SENTENCE} ${COMPOUNDED_DISCLOSURE} They are not the same as FDA-approved branded products. This library does not promise weight-loss results, show before-and-after photos, or collect health information.`;
