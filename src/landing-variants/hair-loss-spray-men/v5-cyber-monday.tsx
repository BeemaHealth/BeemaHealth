import type { LandingVariant } from "../types";
import { withPromoEvent } from "../template/BlackFriday";
import { variant as blackFriday } from "./v4-black-friday";

/**
 * Cyber Monday variant: the Black Friday variant (same layout,
 * offers and codes) with the event name and end date swapped. Edit the Black
 * Friday variant, not this file, to change layout or pricing.
 */
export const variant: LandingVariant = {
  id: "v5-cyber-monday",
  label: "Cyber Monday 2026",
  Component: withPromoEvent(blackFriday, "cyber-monday"),
};
