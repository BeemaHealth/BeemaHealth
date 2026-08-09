/**
 * Public clinical-provider disclosure (Option A — Arora Health & Aesthetics).
 *
 * Verify changes against the provider group's materials and the official CMS
 * NPI Registry before publishing:
 * - https://www.arora-health.com/
 * - https://npiregistry.cms.hhs.gov/provider-view/1841729449
 */

export const CLINICAL_PROVIDER_GROUP = "Arora Health & Aesthetics";
export const CLINICAL_PROVIDER_LEGAL_NAME = "Arora Health & Aesthetics, LLC";
export const CLINICAL_PROVIDER_COMPLIANCE_EMAIL =
  "medicalcompliance@arorahealthgroup.com";
export const CLINICAL_PROVIDER_COMPLIANCE_EMAIL_HREF = `mailto:${CLINICAL_PROVIDER_COMPLIANCE_EMAIL}`;
export const CLINICAL_PROVIDER_ADDRESS_LINE1 = "300 Lenora Street";
export const CLINICAL_PROVIDER_ADDRESS_LINE2 = "Seattle, WA 98121";
export const CLINICAL_PROVIDER_WEBSITE = "https://www.arora-health.com";
/** Display form matching the compliance packet (no scheme). */
export const CLINICAL_PROVIDER_WEBSITE_DISPLAY = "www.arora-health.com";

export const SEAN_ARORA_PROVIDER = {
  name: "Sean Arora",
  displayName: "Dr. Sean Arora",
  credentials: "MD",
  role: "Founder and CEO of Arora Health & Aesthetics",
  specialty: "Family Medicine — Adult Medicine",
  npi: "1841729449",
  bio: "Dr. Sean Arora, MD, is a board-certified physician and the founder and CEO of Arora Health & Aesthetics. His work focuses on family medicine, wellness, weight management, and telehealth clinical oversight.",
} as const;

/** Plain-text answer for FAQ / FAQPage JSON-LD (no HTML). */
export function clinicalProviderGroupFaqAnswer(): string {
  return [
    `Beema Health's clinical provider group is ${CLINICAL_PROVIDER_LEGAL_NAME}.`,
    `Office address: ${CLINICAL_PROVIDER_ADDRESS_LINE1}, ${CLINICAL_PROVIDER_ADDRESS_LINE2}.`,
    `Compliance contact: ${CLINICAL_PROVIDER_COMPLIANCE_EMAIL}.`,
    `Provider website: ${CLINICAL_PROVIDER_WEBSITE_DISPLAY}.`,
    "Licensed clinicians make all medical decisions independently. The clinician assigned to your care may vary based on state licensure and availability.",
  ].join(" ");
}

/** Plain-text answer for FAQ / FAQPage JSON-LD (no HTML). */
export function seanAroraFaqAnswer(): string {
  return [
    SEAN_ARORA_PROVIDER.bio,
    `Dr. Sean Arora NPI#: ${SEAN_ARORA_PROVIDER.npi} (individual Type 1 National Provider Identifier).`,
  ].join(" ");
}
