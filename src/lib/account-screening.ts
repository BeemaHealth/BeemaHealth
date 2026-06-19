import type {
  AccountScreening,
  IntakeSubmissionSnapshot,
} from "@/lib/types/mvp";

export function accountSummaryFromScreening(
  screening: AccountScreening,
): IntakeSubmissionSnapshot["account_summary"] {
  const first = screening.first_name ?? "";
  const last = screening.last_name ?? "";
  return {
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`.trim(),
    email: screening.email ?? "",
    phone: screening.phone ?? "",
    dob: screening.dob ?? "",
    state: screening.state ?? "",
    height_ft: screening.height_ft,
    height_in: screening.height_in,
    weight_lbs: screening.weight_lbs,
    goal_weight_lbs: screening.goal_weight_lbs,
    bmi: screening.bmi,
  };
}

export function hasAccountScreening(
  screening: AccountScreening | undefined | null,
): screening is AccountScreening {
  return Boolean(screening && (screening.first_name || screening.email));
}
