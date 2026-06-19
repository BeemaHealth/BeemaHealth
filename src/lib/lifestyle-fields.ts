import { isFilled } from "@/lib/form-validation";

export const LIFESTYLE_FIELD_LABELS = {
  exercise_days: "Days per week exercising",
  exercise_type: "Type of exercise",
  diet: "How would you describe your diet?",
  smoke: "Do you smoke or vape?",
  alcohol: "Do you drink alcohol?",
  drugs: "Recreational drug use?",
  drugs_detail: "Type of recreational drug use",
  sleep: "Hours of sleep per night",
  binge: "Binge eating episodes?",
  night_eating: "Do you frequently eat at night before bedtime?",
  struggle:
    "Struggle more with hunger, cravings, portions, or emotional eating?",
} as const;

export type LifestyleFieldKey = keyof typeof LIFESTYLE_FIELD_LABELS;

export const LIFESTYLE_STEP_FIELD_KEYS = [
  "exercise_days",
  "exercise_type",
  "diet",
  "smoke",
  "alcohol",
  "drugs",
  "sleep",
  "binge",
  "night_eating",
  "struggle",
] as const;

export type LifestyleStepFieldKey = (typeof LIFESTYLE_STEP_FIELD_KEYS)[number];

export const EXERCISE_DAYS_OPTIONS = Array.from({ length: 8 }, (_, days) => ({
  value: String(days),
  label: String(days),
}));

export const DIET_OPTIONS = [
  { value: "balanced", label: "Balanced / generally healthy" },
  { value: "high_protein", label: "High protein" },
  { value: "low_carb", label: "Low carb or keto" },
  { value: "plant_based", label: "Vegetarian or vegan" },
  { value: "mediterranean", label: "Mediterranean" },
  {
    value: "calorie_controlled",
    label: "Calorie tracking or portion-controlled",
  },
  { value: "intermittent_fasting", label: "Intermittent fasting" },
  { value: "high_carb", label: "High carb or starch-focused" },
  { value: "convenience", label: "Fast food or convenience-focused" },
  { value: "mixed", label: "Varied / no set pattern" },
] as const;

export const SMOKE_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally (less than once per week)" },
  { value: "1_3_week", label: "1–3 times per week" },
  { value: "4_6_week", label: "4–6 times per week" },
  { value: "daily", label: "Daily" },
  { value: "constant", label: "Constant / multiple times per day" },
] as const;

export const ALCOHOL_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally (less than once per week)" },
  { value: "1_3_week", label: "1–3 drinks per week" },
  { value: "4_7_week", label: "4–7 drinks per week" },
  { value: "8_14_week", label: "8–14 drinks per week" },
  { value: "more_14_week", label: "More than 14 drinks per week" },
] as const;

export const DRUG_USE_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const;

export const SLEEP_OPTIONS = [
  { value: "less_5", label: "Less than 5 hours" },
  { value: "5_6", label: "5–6 hours" },
  { value: "7_8", label: "7–8 hours" },
  { value: "9_plus", label: "9+ hours" },
] as const;

export const BINGE_OPTIONS = [
  { value: "never", label: "Never / no episodes" },
  { value: "rarely", label: "Rarely (less than monthly)" },
  { value: "1_3_month", label: "1–3 times per month" },
  { value: "weekly", label: "About once per week" },
  { value: "daily", label: "Daily" },
] as const;

export const NIGHT_EATING_OPTIONS = [
  { value: "no", label: "No" },
  {
    value: "1_2_week",
    label: "Yes, 1–2 nights per week before bedtime",
  },
  {
    value: "3_4_week",
    label: "Yes, 3–4 nights per week before bedtime",
  },
  {
    value: "5_plus_week",
    label: "Yes, 5+ nights per week before bedtime",
  },
  { value: "most_nights", label: "Yes, most nights before bedtime" },
] as const;

export const STRUGGLE_OPTIONS = [
  { value: "none", label: "None of the above" },
  { value: "hunger", label: "Hunger" },
  { value: "cravings", label: "Cravings" },
  { value: "portions", label: "Portions" },
  { value: "emotional", label: "Emotional eating" },
  { value: "hunger_cravings", label: "Hunger and cravings" },
  { value: "hunger_portions", label: "Hunger and portions" },
  { value: "hunger_emotional", label: "Hunger and emotional eating" },
  { value: "cravings_portions", label: "Cravings and portions" },
  { value: "cravings_emotional", label: "Cravings and emotional eating" },
  { value: "portions_emotional", label: "Portions and emotional eating" },
  {
    value: "hunger_cravings_portions",
    label: "Hunger, cravings, and portions",
  },
  {
    value: "hunger_cravings_emotional",
    label: "Hunger, cravings, and emotional eating",
  },
  {
    value: "hunger_portions_emotional",
    label: "Hunger, portions, and emotional eating",
  },
  {
    value: "cravings_portions_emotional",
    label: "Cravings, portions, and emotional eating",
  },
  { value: "all", label: "All of the above" },
] as const;

const LIFESTYLE_OPTION_LOOKUP: Record<
  string,
  readonly { value: string; label: string }[]
> = {
  exercise_days: EXERCISE_DAYS_OPTIONS,
  diet: DIET_OPTIONS,
  smoke: SMOKE_OPTIONS,
  alcohol: ALCOHOL_OPTIONS,
  drugs: DRUG_USE_OPTIONS,
  sleep: SLEEP_OPTIONS,
  binge: BINGE_OPTIONS,
  night_eating: NIGHT_EATING_OPTIONS,
  struggle: STRUGGLE_OPTIONS,
};

const LIFESTYLE_ALLOWED_VALUES: Record<string, readonly string[]> = {
  exercise_days: EXERCISE_DAYS_OPTIONS.map((o) => o.value),
  diet: DIET_OPTIONS.map((o) => o.value),
  smoke: SMOKE_OPTIONS.map((o) => o.value),
  alcohol: ALCOHOL_OPTIONS.map((o) => o.value),
  drugs: DRUG_USE_OPTIONS.map((o) => o.value),
  sleep: SLEEP_OPTIONS.map((o) => o.value),
  binge: BINGE_OPTIONS.map((o) => o.value),
  night_eating: NIGHT_EATING_OPTIONS.map((o) => o.value),
  struggle: STRUGGLE_OPTIONS.map((o) => o.value),
};

const LEGACY_LIFESTYLE_VALUE_MAP: Record<string, Record<string, string>> = {
  diet: { Balanced: "balanced" },
  smoke: { No: "no" },
  alcohol: { No: "no", Occasionally: "occasionally" },
  drugs: { No: "no", Yes: "yes" },
  sleep: { "7": "7_8", "6": "5_6", "8": "7_8" },
  binge: { No: "never", weekly_plus: "weekly" },
  night_eating: { No: "no" },
  struggle: { Cravings: "cravings", Hunger: "hunger" },
};

export function lifestyleOptionLabel(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const str = String(value);
  const options = LIFESTYLE_OPTION_LOOKUP[field];
  const match = options?.find((option) => option.value === str);
  return match?.label ?? str;
}

export function isValidLifestyleFieldValue(
  field: string,
  value: string,
): boolean {
  const allowed = LIFESTYLE_ALLOWED_VALUES[field];
  if (!allowed) return isFilled(value);
  return allowed.includes(value);
}

export function isLifestyleStepComplete(
  life: Record<string, string | boolean | undefined>,
): boolean {
  for (const key of LIFESTYLE_STEP_FIELD_KEYS) {
    const value = String(life[key] ?? "");
    if (!isFilled(value) || !isValidLifestyleFieldValue(key, value)) {
      return false;
    }
  }
  if (life.drugs === "yes" && !isFilled(life.drugs_detail)) return false;
  return true;
}

/** Map legacy free-text lifestyle drafts to structured dropdown values when possible. */
export function normalizeLifestyleFields(
  lifestyle: Record<string, string | boolean | undefined> | undefined,
): Record<string, string | boolean> {
  if (!lifestyle || typeof lifestyle !== "object") return {};
  const next: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(lifestyle)) {
    if (value !== undefined) next[key] = value;
  }
  for (const [field, legacyMap] of Object.entries(LEGACY_LIFESTYLE_VALUE_MAP)) {
    const raw = next[field];
    if (typeof raw !== "string" || !raw) continue;
    if (isValidLifestyleFieldValue(field, raw)) continue;
    const mapped = legacyMap[raw];
    if (mapped) next[field] = mapped;
  }
  if (next.drugs !== "yes") {
    delete next.drugs_detail;
  }
  return next;
}
