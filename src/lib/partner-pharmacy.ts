/**
 * Partner pharmacy disclosure — single source of truth for FAQ, Terms,
 * and any other compliance surfaces that name The Pharmacy Hub.
 */

export const PARTNER_PHARMACY_NAME = "The Pharmacy Hub";
export const PARTNER_PHARMACY_ADDRESS_LINE1 = "15600 NW 15th Ave, Suite C";
export const PARTNER_PHARMACY_ADDRESS_LINE2 = "Miami, FL 33169";
export const PARTNER_PHARMACY_PHONE_DISPLAY = "(888) 958-1382";
export const PARTNER_PHARMACY_PHONE_E164 = "+18889581382";
export const PARTNER_PHARMACY_PHONE_HREF = `tel:${PARTNER_PHARMACY_PHONE_E164}`;
export const PARTNER_PHARMACY_WEBSITE = "https://thepharmacyhub.com";

/** Plain-text answer for FAQ / FAQPage JSON-LD (no HTML). */
export function partnerPharmacyFaqAnswer(): string {
  return [
    `Partner pharmacy: ${PARTNER_PHARMACY_NAME}, ${PARTNER_PHARMACY_ADDRESS_LINE1}, ${PARTNER_PHARMACY_ADDRESS_LINE2}. Phone: ${PARTNER_PHARMACY_PHONE_DISPLAY}. Website: ${PARTNER_PHARMACY_WEBSITE}.`,
    "Services are available in all 50 U.S. states through affiliated medical providers and pharmacy partners operating in accordance with applicable state licensure requirements. The Pharmacy Hub states that it is licensed by state boards of pharmacy nationwide and supports prescription fulfillment in all 50 states.",
    "Please note that certain medications, formulations, or fulfillment options may vary depending on state-specific pharmacy regulations, prescribing requirements, and dispensing restrictions.",
  ].join(" ");
}
