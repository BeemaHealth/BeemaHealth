/**
 * Canonical support / legal contact details - single source of truth so
 * phone, email, and business address never drift across header, footer,
 * contact page, policy pages, and schema.
 */

export const LEGAL_BUSINESS_NAME = "Beema Health LLC";

export const SUPPORT_EMAIL = "support@beemahealth.com";
export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`;

export const SUPPORT_PHONE_DISPLAY = "+1 303-351-4505";
/** E.164, for tel: links and schema.org telephone fields. */
export const SUPPORT_PHONE_E164 = "+13033514505";
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE_E164}`;

export const BUSINESS_ADDRESS_LINE1 = "PO Box 15";
export const BUSINESS_ADDRESS_LINE2 = "Colorado Springs, CO 80901";
/** Single-line form for policy templates and structured data. */
export const BUSINESS_ADDRESS_SINGLE_LINE =
  "PO Box 15, Colorado Springs, CO 80901";
