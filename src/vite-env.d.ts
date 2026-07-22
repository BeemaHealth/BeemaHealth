/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Meta Pixel ID for waitlist Lead conversions (public). */
  readonly VITE_META_PIXEL_ID?: string;
  /** Google Ads tag ID, e.g. AW-123456789 (public). */
  readonly VITE_GOOGLE_ADS_ID?: string;
  /** Google Ads conversion label paired with VITE_GOOGLE_ADS_ID. */
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL?: string;
  /** GA4 measurement ID, e.g. G-XXXXXXXX — visitor analytics without a backend. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Optional override for waitlist-page social-proof count. */
  readonly VITE_WAITLIST_DISPLAY_COUNT?: string;
}
