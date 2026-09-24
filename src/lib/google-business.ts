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

/**
 * Current Google Business Profile star rating, shown as an on-site trust
 * badge (homepage hero). Hand-maintained - not pulled live from Google -
 * so update this by hand if the rating ever moves off 5.0. Not wired into
 * AggregateRating JSON-LD: that carries its own review-count requirements
 * and is a separate decision from a visible marketing badge.
 */
export const GOOGLE_RATING_VALUE = "5.0";
