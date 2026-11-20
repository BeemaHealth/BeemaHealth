/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Meta Pixel ID (public). */
  readonly VITE_META_PIXEL_ID?: string;
  /** Google Ads tag ID, e.g. AW-123456789 (public). */
  readonly VITE_GOOGLE_ADS_ID?: string;
  /** Google Ads conversion label paired with VITE_GOOGLE_ADS_ID. */
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL?: string;
  /** GA4 measurement ID, e.g. G-XXXXXXXX - visitor analytics without a backend. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** GTM container ID, e.g. GTM-XXXXXXX - Bask questionnaire + marketing Preview. */
  readonly VITE_GTM_CONTAINER_ID?: string;
  /** "1" bundles every landing variant for ?preview_variant= (staging only). */
  readonly VITE_PREVIEW_ALL_VARIANTS?: string;
}
