/**
 * Meta Pixel + Google Ads conversion helpers for waitlist / qualify leads.
 *
 * Required Vite env vars (public IDs only — never put access tokens here):
 *   VITE_META_PIXEL_ID                  — Meta Pixel ID (e.g. 1234567890)
 *   VITE_GOOGLE_ADS_ID                  — Google Ads tag ID (e.g. AW-123456789)
 *   VITE_GOOGLE_ADS_CONVERSION_LABEL    — conversion label (e.g. abCDEFghijkLmNoP)
 *
 * When any ID is missing, helpers no-op (safe for local/dev).
 * Do not pass email, name, or other PHI into these events.
 */

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
};

export function readAdPixelConfig(): AdPixelConfig {
  return {
    metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "",
    googleAdsId: import.meta.env.VITE_GOOGLE_ADS_ID?.trim() ?? "",
    googleAdsConversionLabel:
      import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL?.trim() ?? "",
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

export function isAnyAdPixelConfigured(config = readAdPixelConfig()): boolean {
  return (
    isMetaPixelConfigured(config) || isGoogleAdsConversionConfigured(config)
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

/** Load gtag.js once when Google Ads conversion is configured. */
export function ensureGoogleAdsTag(config = readAdPixelConfig()): void {
  if (typeof window === "undefined") return;
  if (!isGoogleAdsConversionConfigured(config) || googleBootstrapped) return;
  googleBootstrapped = true;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }

  injectScript(
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleAdsId)}`,
    "beema-google-ads",
  );
  window.gtag("js", new Date());
  window.gtag("config", config.googleAdsId);
}

/** Call once on app mount so remarketing pixels load when env is set. */
export function initAdPixels(): void {
  const config = readAdPixelConfig();
  if (!isAnyAdPixelConfigured(config)) return;
  ensureMetaPixel(config);
  ensureGoogleAdsTag(config);
}

/**
 * Fire lead conversion events after a successful waitlist/qualify submit.
 * No PHI — event name / conversion ping only.
 */
export function trackWaitlistLeadConversion(): void {
  const config = readAdPixelConfig();
  if (!isAnyAdPixelConfigured(config)) return;

  ensureMetaPixel(config);
  ensureGoogleAdsTag(config);

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
}

/** Test-only reset of bootstrap flags. */
export function __resetAdPixelBootstrapForTests(): void {
  metaBootstrapped = false;
  googleBootstrapped = false;
}
