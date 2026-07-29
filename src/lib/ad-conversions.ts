/**
 * Meta Pixel + Google Ads + Google Analytics 4 + GTM helpers (frontend-only).
 *
 * Required Vite env vars (public IDs only — never put access tokens here):
 *   VITE_META_PIXEL_ID                  — Meta Pixel ID (e.g. 1234567890)
 *   VITE_GOOGLE_ADS_ID                  — Google Ads tag ID (e.g. AW-123456789)
 *   VITE_GOOGLE_ADS_CONVERSION_LABEL    — conversion label (e.g. abCDEFghijkLmNoP)
 *   VITE_GA_MEASUREMENT_ID              — GA4 measurement ID (e.g. G-XXXXXXXX)
 *   VITE_GTM_CONTAINER_ID               — GTM container ID (e.g. GTM-XXXXXXX)
 *
 * When any ID is missing, helpers no-op (safe for local/dev).
 * Do not pass email, name, or other PHI into these events.
 *
 * Without a backend, GA4 is how you see *all* visitors (including people who
 * never join the waitlist) and which UTM / social links drove them. Meta Pixel
 * and Google Ads conversion tags are for paid campaigns + Lead events.
 * GTM is the Bask questionnaire container — also loaded on the marketing site
 * for Preview / Conversion Linker cross-domain testing.
 */

/** Public GTM container IDs look like GTM-ABC123 (6–8+ alphanumerics). */
const GTM_CONTAINER_ID_RE = /^GTM-[A-Z0-9]{4,12}$/i;

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
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
  gtmContainerId: string;
};

export function readAdPixelConfig(): AdPixelConfig {
  return {
    metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "",
    googleAdsId: import.meta.env.VITE_GOOGLE_ADS_ID?.trim() ?? "",
    googleAdsConversionLabel:
      import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL?.trim() ?? "",
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "",
    gtmContainerId: import.meta.env.VITE_GTM_CONTAINER_ID?.trim() ?? "",
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

export function isGaConfigured(config = readAdPixelConfig()): boolean {
  return Boolean(config.gaMeasurementId);
}

export function isGtmConfigured(config = readAdPixelConfig()): boolean {
  return GTM_CONTAINER_ID_RE.test(config.gtmContainerId);
}

export function isAnyAdPixelConfigured(config = readAdPixelConfig()): boolean {
  return (
    isMetaPixelConfigured(config) ||
    isGoogleAdsConversionConfigured(config) ||
    isGaConfigured(config) ||
    isGtmConfigured(config)
  );
}

let metaBootstrapped = false;
let googleBootstrapped = false;
let gtmBootstrapped = false;

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
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

/** Load Meta Pixel base + PageView once when configured. */
export function ensureMetaPixel(config = readAdPixelConfig()): void {
  if (typeof window === "undefined") return;
  if (!isMetaPixelConfigured(config) || metaBootstrapped) return;
  metaBootstrapped = true;

  if (!window.fbq) {
    const fbq: NonNullable<Window["fbq"]> = function (...args: unknown[]) {
      (fbq.queue = fbq.queue || []).push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
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
 * Load gtag.js once for Google Ads and/or GA4.
 * Both share the same stub; each ID gets its own gtag('config', …).
 */
export function ensureGoogleTag(config = readAdPixelConfig()): void {
  if (typeof window === "undefined") return;
  const needsAds = isGoogleAdsConversionConfigured(config);
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
    // send_page_view: false — SPA routes fire page_view via trackGaPageView
    window.gtag!("config", config.gaMeasurementId, { send_page_view: false });
  }
  if (needsAds) {
    window.gtag!("config", config.googleAdsId);
  }
}

/** @deprecated Prefer ensureGoogleTag — kept for existing call sites/tests. */
export const ensureGoogleAdsTag = ensureGoogleTag;

/**
 * Load Google Tag Manager container (same snippet Google shows for install).
 * Used on the marketing site for GTM Preview + Conversion Linker; Bask also
 * injects this container ID on questionnaire pages via its Integrations setting.
 */
export function ensureGtmContainer(config = readAdPixelConfig()): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isGtmConfigured(config) || gtmBootstrapped) return;
  gtmBootstrapped = true;

  const containerId = config.gtmContainerId;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  if (!document.getElementById("beema-gtm")) {
    const script = document.createElement("script");
    script.id = "beema-gtm";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  // Noscript fallback (SPA still requires JS; included for install parity).
  if (document.body && !document.getElementById("beema-gtm-noscript")) {
    const noscript = document.createElement("noscript");
    noscript.id = "beema-gtm-noscript";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.setAttribute("style", "display:none;visibility:hidden");
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }
}

/** Call once on app mount so remarketing pixels / GA / GTM load when env is set. */
export function initAdPixels(): void {
  const config = readAdPixelConfig();
  if (!isAnyAdPixelConfigured(config)) return;
  ensureGtmContainer(config);
  ensureMetaPixel(config);
  ensureGoogleTag(config);
}

/**
 * SPA page view for GA4. Pass optional cta_id so on-site button attribution
 * shows up in Explorations. UTMs are attributed automatically by GA from the
 * landing URL — you do not need a backend for that.
 */
export function trackGaPageView(page: string, ctaId?: string): void {
  const config = readAdPixelConfig();
  if (!isGaConfigured(config) || typeof window === "undefined") return;
  ensureGoogleTag(config);
  if (typeof window.gtag !== "function") return;

  const path =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : `/${page}`;

  window.gtag("event", "page_view", {
    page_title: page,
    page_path: path,
    ...(ctaId ? { cta_id: ctaId } : {}),
  });
}

/**
 * Fire lead conversion events after a successful waitlist submit.
 * No PHI — event name / conversion ping only.
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
  gtmBootstrapped = false;
}
