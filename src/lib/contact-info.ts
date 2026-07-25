/**
 * Canonical support contact details — single source of truth so phone/email
 * never drift out of sync across header, footer, contact page, and schema.
 */

export const SUPPORT_EMAIL = "support@beemahealth.com";
export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`;

export const SUPPORT_PHONE_DISPLAY = "+1 303-351-4505";
/** E.164, for tel: links and schema.org telephone fields. */
export const SUPPORT_PHONE_E164 = "+13033514505";
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE_E164}`;
