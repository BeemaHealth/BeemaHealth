/**
 * Google Business Profile URLs - single source of truth for the on-site
 * review ask (footer Trust column, contact page) and Organization.sameAs.
 *
 * The listing URL is the identity profile. The /review path is the write
 * action. Never put the write-review URL in JSON-LD sameAs.
 */

export const GOOGLE_BUSINESS_LISTING_URL = "https://g.page/r/CUEUJWP1F6UjEBI";

export const GOOGLE_REVIEW_URL = `${GOOGLE_BUSINESS_LISTING_URL}/review`;

export const GOOGLE_REVIEW_LINK_LABEL = "Leave a Google review";
