/**
 * Google Tag Manager + Google Ads tag — marketing site installs and Bask
 * intake handoff events.
 *
 * Container / Ads IDs are public by design (visible in page source). Not secrets.
 * Loads only on the production hostname so local/preview never fire real tags.
 */

/** Public GTM container — same ID pasted into Bask → Integrations. */
export const GTM_CONTAINER_ID = "GTM-MHHJ44GF" as const;

/**
 * Google Ads account tag (gtag.js). From Google Ads → Tag setup.
 * Install once in the document shell — do not also set VITE_GOOGLE_ADS_ID to
 * this same ID or `ensureGoogleTag` will double-config it.
 */
export const GOOGLE_ADS_ID = "AW-18301765593" as const;

/** Only this host loads GTM / Ads / should be treated as live production traffic. */
export const GTM_PRODUCTION_HOSTNAME = "beemahealth.com" as const;

const BASK_INTAKE_HOST = "q.beemahealth.com";

/**
 * Google's standard GTM bootstrap IIFE, wrapped only with a production
 * hostname gate so local/preview builds do not load the container.
 * The IIFE body matches Google's install snippet unmodified.
 */
export const GTM_HEAD_SCRIPT = `
if (window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}') {
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
}
`.trim();

/**
 * Google Ads gtag.js install (Nikki / Google Ads tag setup).
 * Hostname-gated; async script + config match Google's standard snippet.
 */
export const GOOGLE_ADS_HEAD_SCRIPT = `
if (window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}') {
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}';document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
}
`.trim();

export function isGtmProductionHost(
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
): boolean {
  return hostname === GTM_PRODUCTION_HOSTNAME;
}

export function isBaskIntakeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://beemahealth.com");
    return parsed.hostname === BASK_INTAKE_HOST;
  } catch {
    return false;
  }
}

/**
 * Push intake_handoff to dataLayer immediately before navigating to Bask.
 * Only `event` + `cta_location` — never email, phone, name, or form values.
 */
export function trackIntakeHandoff(ctaLocation: string): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "intake_handoff",
    cta_location: ctaLocation,
  });
}
