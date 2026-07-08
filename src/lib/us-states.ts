/** US state names and abbreviations — shared by qualify funnel and address validation. */

export const US_STATE_ENTRIES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

export type UsStateName = (typeof US_STATE_ENTRIES)[number][1];

export const US_STATES: readonly UsStateName[] = US_STATE_ENTRIES.map(
  ([, name]) => name,
);

const BY_ABBREV = new Map<string, string>(
  US_STATE_ENTRIES.map(([abbr, name]) => [abbr, name.toLowerCase()]),
);

const BY_NAME = new Map<string, string>(
  US_STATE_ENTRIES.map(([, name]) => [name.toLowerCase(), name.toLowerCase()]),
);

const DISPLAY_BY_NORM = new Map<string, UsStateName>(
  US_STATE_ENTRIES.map(([, name]) => [name.toLowerCase(), name]),
);

/** Canonical lowercase full state name, or null if unrecognized. */
export function normalizeUsState(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2) {
    return BY_ABBREV.get(trimmed.toUpperCase()) ?? null;
  }
  return BY_NAME.get(trimmed.toLowerCase()) ?? null;
}

export function usStatesMatch(a: string, b: string): boolean {
  const left = normalizeUsState(a);
  const right = normalizeUsState(b);
  if (!left || !right) return false;
  return left === right;
}

/** Title-case display name for errors and UI (e.g. CO → Colorado). */
export function formatUsStateName(value: string): string {
  const norm = normalizeUsState(value);
  if (!norm) return value.trim();
  return DISPLAY_BY_NORM.get(norm) ?? value.trim();
}

/** States currently excluded from service eligibility. */
export const EXCLUDED_STATES = new Set([
  "kansas",
  "new mexico",
  "west virginia",
]);

/** Check if a state (by name or abbreviation) is eligible for service. */
export function isStateEligible(value: string): boolean {
  const norm = normalizeUsState(value);
  if (!norm) return false;
  return !EXCLUDED_STATES.has(norm);
}
