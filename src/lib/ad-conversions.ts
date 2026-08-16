/**
 * Meta Pixel + Google Ads + Google Analytics 4 helpers (frontend-only).
 *
 * Required Vite env vars (public IDs only - never put access tokens here):
 *   VITE_META_PIXEL_ID - Meta Pixel ID (e.g. 1234567890)
 *   VITE_GOOGLE_ADS_ID - Google Ads tag ID (e.g. AW-123456789)
 *   VITE_GOOGLE_ADS_CONVERSION_LABEL - conversion label (e.g. abCDEFghijkLmNoP)
 *   VITE_GA_MEASUREMENT_ID - GA4 measurement ID (e.g. G-XXXXXXXX)
 *
 * GTM is installed via the document shell. GA4 and the Google Ads account
 * destination share this module's single gtag.js loader so the same Google tag
 * payload is not injected once per destination.
 *
 * When any ID is missing, helpers no-op (safe for local/dev).
 * Do not pass email, name, or other PHI into these events.
 *
 * Browser reality (cannot be "fixed" in app JS alone):
 * - Brave Shields / DuckDuckGo / Safari Private often block googletagmanager.com
 *     entirely - no page_view will appear in GA for those visits.
 * - Chrome (and Safari non-private, often) will record normally.
 * - For near-complete coverage without a backend API, put Cloudflare in front
 *     and proxy GA first-party, or add a privacy analytics tool (e.g. Plausible).
 */

import { GOOGLE_ADS_ID, isGtmProductionHost } from "@/lib/gtm";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      callMethod?: (...args: unknown[]) => void;
      push?: Window["fbq"];
      version?: string;
    };
    _fbq?: Window["fbq"];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AdPixelConfig = {
  metaPixelId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  gaMeasurementId: string;
};

export function readAdPixelConfig(): AdPixelConfig {
  const configuredAdsId = import.meta.env.VITE_GOOGLE_ADS_ID?.trim() ?? "";
  return {
    metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "",
    googleAdsId:
      configuredAdsId || (isGtmProductionHost() ? GOOGLE_ADS_ID : ""),
    googleAdsConversionLabel:
      import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL?.trim() ?? "",
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "",
  };
}

export function isMetaPixelConfigured(config = readAdPixelConfig()): boolean {
  return Boolean(config.metaPixelId);
}

export function isGoogleAdsConversionConfigured(
  config = readAdPixelConfig(),
): boolean {
  return Boolean(config.googleAdsId && config.googleAdsConversionLabel);
}

export function isGoogleAdsTagConfigured(
  config = readAdPixelConfig(),
): boolean {
  return Boolean(config.googleAdsId);
}

export function isGaConfigured(config = readAdPixelConfig()): boolean {
  return Boolean(config.gaMeasurementId);
}

export function isAnyAdPixelConfigured(config = readAdPixelConfig()): boolean {
  return (
    isMetaPixelConfigured(config) ||
    isGoogleAdsTagConfigured(config) ||
    isGaConfigured(config)
  );
}

let metaBootstrapped = false;
let googleBootstrapped = false;

function injectScript(src: string, id: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // Must push Arguments (not a rest-array) so gtag.js can replay the queue.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- Google gtag queue contract
      window.dataLayer!.push(arguments);
    };
  }
}

/** Load Meta Pixel base + PageView once when configured. */
export function ensureMetaPixel(config = readAdPixelConfig()): void {
  if (typeof window === "undefined") return;
  if (!isMetaPixelConfigured(config) || metaBootstrapped) return;
  metaBootstrapped = true;

  if (!window.fbq) {
    // Mirrors Meta's official base pixel snippet: once fbevents.js loads, it
    // sets `callMethod` on this same function object to upgrade it in place.
    // Every call must check for that upgrade and delegate to it - if it just
    // unconditionally queues (as a naive stub does), calls made after load
    // (Lead, ViewContent, etc.) get silently stuck in `queue` forever and
    // only the very first, pre-load PageView call ever actually sends.
    const fbq: NonNullable<Window["fbq"]> = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        (fbq.queue = fbq.queue || []).push(args);
      }
    };
    fbq.push = fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  injectScript(
    "https://connect.facebook.net/en_US/fbevents.js",
    "beema-meta-pixel",
  );
  window.fbq("init", config.metaPixelId);
  window.fbq("track", "PageView");
}

/**
 * Map utm_* query params into gtag campaign / event fields.
 */
export function readCampaignFromLocation(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): {
  source?: string;
  medium?: string;
  name?: string;
  content?: string;
} {
  const params = new URLSearchParams(search);
  const pick = (key: string) => {
    const val = params.get(key)?.trim();
    return val ? val.slice(0, 100) : undefined;
  };
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    name: pick("utm_campaign"),
    content: pick("utm_content"),
  };
}

function campaignFieldsForGtag(search?: string) {
  const c = readCampaignFromLocation(search);
  if (!c.source && !c.medium && !c.name && !c.content) return {};
  return {
    source: c.source,
    medium: c.medium,
    campaign: c.name,
    content: c.content,
    utm_source: c.source,
    utm_medium: c.medium,
    utm_campaign: c.name,
    utm_content: c.content,
    campaign_source: c.source,
    campaign_medium: c.medium,
    campaign_name: c.name,
    campaign_content: c.content,
  };
}

function applyCampaignToGtag(): void {
  const c = readCampaignFromLocation();
  if (!c.source && !c.medium && !c.name && !c.content) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("set", "campaign", {
    ...(c.source ? { source: c.source } : {}),
    ...(c.medium ? { medium: c.medium } : {}),
    ...(c.name ? { name: c.name } : {}),
    ...(c.content ? { content: c.content } : {}),
  });
}

/**
 * Load gtag.js once for Google Ads and/or GA4.
 */
export function ensureGoogleTag(config = readAdPixelConfig()): void {
  if (typeof window === "undefined") return;
  const needsAds = isGoogleAdsTagConfigured(config);
  const needsGa = isGaConfigured(config);
  if ((!needsAds && !needsGa) || googleBootstrapped) return;
  googleBootstrapped = true;

  ensureGtagStub();

  const primaryId = needsGa ? config.gaMeasurementId : config.googleAdsId;
  injectScript(
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`,
    "beema-google-tag",
  );
  window.gtag!("js", new Date());

  if (needsGa) {
    applyCampaignToGtag();
    const campaign = campaignFieldsForGtag();
    const debugMode =
      new URLSearchParams(window.location.search).get("ga_debug") === "1";
    window.gtag!("config", config.gaMeasurementId, {
      send_page_view: false,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...(debugMode ? { debug_mode: true } : {}),
      ...campaign,
    });
  }
  if (needsAds) {
    window.gtag!("config", config.googleAdsId);
  }
}

/** @deprecated Prefer ensureGoogleTag - kept for existing call sites/tests. */
export const ensureGoogleAdsTag = ensureGoogleTag;

/** Call once on app mount so remarketing pixels / GA load when env is set. */
export function initAdPixels(): void {
  const config = readAdPixelConfig();
  if (!isAnyAdPixelConfigured(config)) return;
  ensureMetaPixel(config);
  ensureGoogleTag(config);
}

/**
 * SPA page view for GA4.
 *
 * `page_title` is the URL path (`/` or `/waitlist/`) so Realtime is readable.
 * Logical route key stays in `screen_name` (home, waitlist, …).
 * UTM fields are sent explicitly for DebugView / campaign_landing.
 */
export function trackGaPageView(page: string, ctaId?: string): void {
  const config = readAdPixelConfig();
  if (!isGaConfigured(config) || typeof window === "undefined") return;
  ensureGoogleTag(config);
  if (typeof window.gtag !== "function") return;

  applyCampaignToGtag();
  const campaign = campaignFieldsForGtag();
  const pathOnly = window.location.pathname || "/";

  window.gtag("event", "page_view", {
    page_title: pathOnly,
    page_location: window.location.href,
    page_path: pathOnly,
    page_referrer: document.referrer || undefined,
    screen_name: page,
    ...campaign,
    ...(ctaId ? { cta_id: ctaId } : {}),
  });

  // Easy to find under Realtime → Event count (all recent users, not DebugView-only).
  if (campaign.utm_source || campaign.utm_medium) {
    window.gtag("event", "campaign_landing", {
      utm_source: campaign.utm_source ?? "(none)",
      utm_medium: campaign.utm_medium ?? "(none)",
      utm_campaign: campaign.utm_campaign ?? "(none)",
      utm_content: campaign.utm_content ?? "(none)",
      landing_page: page,
      page_path: pathOnly,
    });
  }
}

/**
 * Fire lead conversion events after a successful waitlist submit.
 * No PHI - event name / conversion ping only.
 */
export function trackWaitlistLeadConversion(): void {
  const config = readAdPixelConfig();
  if (!isAnyAdPixelConfigured(config)) return;

  ensureMetaPixel(config);
  ensureGoogleTag(config);

  if (isMetaPixelConfigured(config) && typeof window.fbq === "function") {
    window.fbq("track", "Lead");
  }

  if (
    isGoogleAdsConversionConfigured(config) &&
    typeof window.gtag === "function"
  ) {
    window.gtag("event", "conversion", {
      send_to: `${config.googleAdsId}/${config.googleAdsConversionLabel}`,
    });
  }

  if (isGaConfigured(config) && typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      event_category: "waitlist",
    });
  }
}

/** Test-only reset of bootstrap flags. */
export function __resetAdPixelBootstrapForTests(): void {
  metaBootstrapped = false;
  googleBootstrapped = false;
}
