import { redirect } from "@tanstack/react-router";

/**
 * Evergreen social-profile "bio" links.
 *
 * Profiles show a short URL (beemahealth.com/instagram) instead of the long
 * UTM query. Each short path is a client-side redirect route that sends the
 * visitor to the homepage WITH the real utm_* params, so GA4, the Bask
 * handoff (`BASK_HANDOFF_PARAM_KEYS`) and `capturePageUtms()` all see normal
 * campaign traffic. The site is static (GitHub Pages), so there is no
 * server-side redirect: the SPA shell (404.html) loads and these routes
 * redirect on the client.
 *
 * Keep in sync with `buildBioLinks()` in scripts/generate-utm-url.mjs; the
 * test in `src/lib/__tests__/bio-links.test.ts` fails if they drift.
 * No PHI - public attribution keys only.
 */
export type BioLinkKey =
  | "instagram"
  | "facebook"
  | "threads"
  | "x"
  | "reddit"
  | "linkedin"
  | "tiktok"
  | "youtube";

export type BioLinkUtms = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
};

function bioUtms(source: BioLinkKey): BioLinkUtms {
  return {
    utm_source: source,
    utm_medium: "social",
    utm_campaign: `${source}_bio`,
    utm_content: `${source}_link_in_bio`,
  };
}

/**
 * One entry per social profile in the Organization `sameAs` that can carry a
 * website link (Trustpilot is a review listing, so it has no bio link).
 */
export const BIO_LINK_KEYS: readonly BioLinkKey[] = [
  "instagram",
  "facebook",
  "threads",
  "x",
  "reddit",
  "linkedin",
  "tiktok",
  "youtube",
];

export const BIO_LINK_UTMS: Record<BioLinkKey, BioLinkUtms> = {
  instagram: bioUtms("instagram"),
  facebook: bioUtms("facebook"),
  threads: bioUtms("threads"),
  x: bioUtms("x"),
  reddit: bioUtms("reddit"),
  linkedin: bioUtms("linkedin"),
  tiktok: bioUtms("tiktok"),
  youtube: bioUtms("youtube"),
};

/** Short paths to put in profile bios. `/fb` is an alias for `/facebook`. */
export const BIO_LINK_PATHS: Record<BioLinkKey, readonly string[]> = {
  instagram: ["/instagram"],
  facebook: ["/facebook", "/fb"],
  threads: ["/threads"],
  x: ["/x"],
  reddit: ["/reddit"],
  linkedin: ["/linkedin"],
  tiktok: ["/tiktok"],
  youtube: ["/youtube"],
};

/** Homepage destination (path + query) for a bio link. */
export function bioLinkDestination(key: BioLinkKey): string {
  const params = new URLSearchParams(BIO_LINK_UTMS[key]);
  return `/?${params.toString()}`;
}

/**
 * Route `beforeLoad` for a bio short link. Replaces history so Back does not
 * bounce the visitor into the redirect again. Any extra query on the short
 * link (e.g. Facebook's `fbclid`) is carried through so click ids survive.
 */
export function redirectBioLink(key: BioLinkKey, search?: string) {
  const dest = new URL(bioLinkDestination(key), "https://placeholder.invalid");
  if (search) {
    for (const [k, v] of new URLSearchParams(search)) {
      if (!dest.searchParams.has(k)) dest.searchParams.set(k, v);
    }
  }
  return redirect({
    href: `${dest.pathname}${dest.search}`,
    replace: true,
  });
}
