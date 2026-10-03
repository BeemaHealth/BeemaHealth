/**
 * Homepage hero offering doors. Weight loss and ED are the two primary
 * lines; hair and wellness stay in nav and lower on the page.
 * Paths match the category hubs (footer + WellnessLineupSection).
 */
import { FIRST_MONTH_PROMO_SHORT } from "@/lib/marketing-copy";

export const HOME_HERO_OFFERINGS = [
  {
    id: "weight-loss",
    label: "Weight loss",
    detail: "Semaglutide and tirzepatide, if prescribed",
    to: "/weight-loss/",
  },
  {
    id: "ed",
    label: "ED treatment",
    detail: "Tadalafil, sildenafil, and ED mints",
    to: "/sexual-health/",
  },
] as const;

export type HomeHeroOfferingId = (typeof HOME_HERO_OFFERINGS)[number]["id"];

/**
 * Other live lines, smaller than the two doors above so the hero still
 * leads with weight loss and ED without implying those are the only offerings.
 * /wellness redirects home, so these link to the live hub and money pages.
 */
export const HOME_HERO_ALSO = [
  { label: "Hair loss", to: "/hair-loss/" },
  { label: "NAD+", to: "/nad-plus/" },
  { label: "Sermorelin", to: "/sermorelin/" },
] as const;

/**
 * Plain paragraph under the headline. Names the two main lines, then the
 * rest of the catalog, then the provider-review rule for all of it.
 */
export const HOME_HERO_INTRO =
  "Weight loss and ED treatment are where most people start, along with hair loss and wellness care. A licensed provider reviews every visit, and a prescription is never guaranteed.";

/**
 * Rotating eyebrow. Lead message names the two main lines and the rest of
 * the catalog so the first paint is not GLP-1-only. Promo pricing still
 * rotates in, after the trust lines.
 */
export const HERO_BADGE_MESSAGES = [
  "Weight loss, ED, and more",
  "Licensed USA physician network",
  "USA 503A pharmacies",
  FIRST_MONTH_PROMO_SHORT,
] as const;

/** Marquee chip so the ticker is not only a GLP-1 price. */
export const HERO_MARQUEE_OFFERING_LINE = "Weight loss, ED, hair, and wellness";
