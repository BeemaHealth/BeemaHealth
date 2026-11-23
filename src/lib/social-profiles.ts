/**
 * Single source of truth for Beema Health's public social/profile URLs.
 *
 * Consumed by the header/footer icons (`src/lib/social-links.ts`), the
 * Organization JSON-LD `sameAs` (`src/lib/seo.ts`), and tests. Change a URL
 * here and nowhere else. Plain strings only (no React) so any module,
 * including SEO and test code, can import it without pulling in UI.
 */
export const FACEBOOK_URL = "https://www.facebook.com/beemahealthofficial";
export const INSTAGRAM_URL = "https://www.instagram.com/beemahealth";
export const TIKTOK_URL = "https://www.tiktok.com/@beema.health";
export const LINKEDIN_URL = "https://www.linkedin.com/company/beemahealth/";
export const X_URL = "https://x.com/beemahealth";
export const YOUTUBE_URL = "https://www.youtube.com/@Beema.Health";
export const THREADS_URL = "https://www.threads.com/@beemahealth";
export const REDDIT_URL = "https://www.reddit.com/r/beemahealth/";
export const TRUSTPILOT_URL =
  "https://www.trustpilot.com/review/beemahealth.com";

/** Every verified profile, in `sameAs` order. */
export const SOCIAL_PROFILE_URLS = [
  FACEBOOK_URL,
  INSTAGRAM_URL,
  TIKTOK_URL,
  LINKEDIN_URL,
  X_URL,
  YOUTUBE_URL,
  THREADS_URL,
  REDDIT_URL,
  TRUSTPILOT_URL,
] as const;
