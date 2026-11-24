/**
 * Product availability switches. A page whose product is paused stays in the
 * repo (route, landing variants, pricing, CTA ids) but is unreachable: the
 * route redirects, and the sitemap, llms.txt, nav and blog links omit it.
 *
 * BPC-157 capsules: paused 2026-11-24 - no supplier. To reactivate, set to
 * true and restore the entries removed from public/sitemap.xml, public/llms.txt,
 * the Peptides nav in SiteHeader.tsx, the capsule link in the peptide
 * side-effects blog article, and the sitemap/blog test expectations.
 */
export const BPC_157_CAPSULES_AVAILABLE = false;

/** Where visitors to a paused BPC-157 capsules URL are sent. */
export const BPC_157_CAPSULES_FALLBACK_PATH = "/bpc-157/";
