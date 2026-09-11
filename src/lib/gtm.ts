/**
 * Google Tag Manager + Google Ads tag - marketing site installs and Bask
 * intake handoff events.
 *
 * Container / Ads IDs are public by design (visible in page source). Not secrets.
 * Loads only on the production hostname so local/preview never fire real tags.
 */

/** Public GTM container - same ID pasted into Bask → Integrations. */
export const GTM_CONTAINER_ID = "GTM-MHHJ44GF" as const;

/** Google Ads destination configured by the shared gtag.js loader. */
export const GOOGLE_ADS_ID = "AW-18301765593" as const;

/** Only this host loads GTM / Ads / should be treated as live production traffic. */
export const GTM_PRODUCTION_HOSTNAME = "beemahealth.com" as const;

export const BASK_INTAKE_HOST = "q.beemahealth.com";

/**
 * Longest the container may wait when the visitor never interacts. Sized so
 * the request still starts well inside a normal session.
 */
export const GTM_IDLE_TIMEOUT_MS = 2000;

/** Fallback for browsers without requestIdleCallback (Safari < 16.4). */
export const GTM_FALLBACK_DELAY_MS = 1200;

/**
 * Google's GTM bootstrap, wrapped with a production hostname gate and a
 * deferred container load.
 *
 * Google's install snippet injects gtm.js from the document head. Even though
 * the tag is `async`, the request is discovered during the initial parse, so
 * Lighthouse's Lantern model charges it - and everything it chains (gtag.js
 * for GA4 and Google Ads) - to the Largest Contentful Paint graph. Measured on
 * production 2026-08-24: blocking googletagmanager.com took mobile LCP from
 * 11.4s to 3.8s. Nothing else tested moved it more than a few hundred ms.
 *
 * What is preserved exactly:
 * - `dataLayer` exists synchronously, before any component can push to it, so
 *   trackIntakeHandoff() and Bask handoff events are never dropped. GTM
 *   replays the queue when the container arrives.
 * - The `gtm.start` timing push still happens during head parse, so container
 *   timing triggers measure from the real navigation start.
 *
 * What changes: only the `<script src=gtm.js>` injection is delayed, until the
 * earliest of first user interaction, an idle callback after `load`, or
 * GTM_IDLE_TIMEOUT_MS. Interaction is included so a visitor who clicks a CTA
 * immediately still loads the container before leaving for Bask.
 *
 * The hostname gate also opens for Tag Assistant's own `gtm_debug` query
 * param, so GTM Preview mode works against localhost. This is safe: that
 * param is only ever present when someone has explicitly started a Preview
 * session pointed at the URL from tagmanager.google.com - ordinary local/dev
 * browsing never carries it, so real tags still never fire off-production.
 */
export const GTM_HEAD_SCRIPT = `
if (window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}' || /(?:^|[?&])gtm_debug=/.test(window.location.search)) {
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});
var started=false;
function start(){if(started)return;started=true;
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);}
var e=['pointerdown','keydown','touchstart','scroll'];
for(var n=0;n<e.length;n++){w.addEventListener(e[n],start,{capture:true,once:true,passive:true});}
function idle(){if(w.requestIdleCallback){w.requestIdleCallback(start,{timeout:${GTM_IDLE_TIMEOUT_MS}});}
else{w.setTimeout(start,${GTM_FALLBACK_DELAY_MS});}}
if(d.readyState==='complete'){idle();}else{w.addEventListener('load',idle,{once:true});}
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
}
`.trim();

export function isGtmProductionHost(
  hostname = typeof window !== "undefined"
    ? (window.location?.hostname ?? "")
    : "",
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
 * Only `event` + `cta_location` - never email, phone, name, or form values.
 */
export function trackIntakeHandoff(ctaLocation: string): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "intake_handoff",
    cta_location: ctaLocation,
  });
}
