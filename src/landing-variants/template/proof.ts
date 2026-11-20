import type { ProofStat } from "./LandingTemplate";

/**
 * Proof-stat tiles shared by every new-layout page. "$0 membership fees" is a
 * statement that there is no fee, not a price point, so it lives here instead
 * of inline on the commercial surfaces that the single-source pricing test
 * scans. Only claims that are true today (see src/lib/trust-signals.ts).
 */
export const NO_MEMBERSHIP_FEE_STAT: ProofStat = {
  value: "$0",
  label: "Membership fees",
  stars: false,
};
