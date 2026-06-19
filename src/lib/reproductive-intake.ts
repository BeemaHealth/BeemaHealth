import type { SexAssignedAtBirth } from "@/lib/types/mvp";

export const REPRODUCTIVE_SAFETY_KEYS = [
  "pregnant",
  "breastfeeding",
  "trying_to_conceive",
] as const;

export type ReproductiveSafetyKey = (typeof REPRODUCTIVE_SAFETY_KEYS)[number];

/** Intake step index for pregnancy & reproductive (see INTAKE_STEP_LABELS). */
export const PREGNANCY_INTAKE_STEP = 7;

function isConservativeSex(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return !v || v === "unknown" || v === "intersex";
}

function isFemaleSex(value: string | null | undefined): boolean {
  return (value ?? "").trim() === "female";
}

/** When identity was never stored (legacy accounts), assume same as sex at birth for gating. */
function effectiveGenderIdentity(
  sexAtBirth: string,
  genderIdentity: string,
): string {
  if (genderIdentity) return genderIdentity;
  return sexAtBirth;
}

/**
 * Whether pregnancy / reproductive intake and qualify safety questions apply.
 * Skip only when sex at birth and current gender identity are both male.
 */
export function needsReproductiveQuestions(
  sexAtBirth: SexAssignedAtBirth | "" | null | undefined,
  genderIdentity: SexAssignedAtBirth | "" | null | undefined,
): boolean {
  const birth = (sexAtBirth ?? "").trim();
  const identity = effectiveGenderIdentity(
    birth,
    (genderIdentity ?? "").trim(),
  );

  if (isConservativeSex(birth) || isConservativeSex(identity)) return true;
  if (isFemaleSex(birth) || isFemaleSex(identity)) return true;
  if (birth === "male" && identity === "male") return false;
  return true;
}

export function isPregnancyIntakeStepApplicable(
  eligibility: {
    sex_assigned_at_birth?: SexAssignedAtBirth | "" | null;
    gender_identity?: SexAssignedAtBirth | "" | null;
  } | null,
): boolean {
  if (!eligibility) return true;
  return needsReproductiveQuestions(
    eligibility.sex_assigned_at_birth,
    eligibility.gender_identity,
  );
}

/** Applicable intake step indices (0-based), skipping pregnancy when not needed. */
export function getApplicableIntakeStepIndices(
  eligibility: {
    sex_assigned_at_birth?: SexAssignedAtBirth | "" | null;
    gender_identity?: SexAssignedAtBirth | "" | null;
  } | null,
  totalSteps: number,
): number[] {
  const steps: number[] = [];
  for (let i = 0; i < totalSteps; i++) {
    if (
      i === PREGNANCY_INTAKE_STEP &&
      !isPregnancyIntakeStepApplicable(eligibility)
    ) {
      continue;
    }
    steps.push(i);
  }
  return steps;
}

export function nextApplicableIntakeStep(
  currentStep: number,
  eligibility: Parameters<typeof getApplicableIntakeStepIndices>[0],
  totalSteps: number,
): number {
  const applicable = getApplicableIntakeStepIndices(eligibility, totalSteps);
  const idx = applicable.indexOf(currentStep);
  if (idx < 0 || idx >= applicable.length - 1) {
    return Math.min(currentStep + 1, totalSteps - 1);
  }
  return applicable[idx + 1]!;
}

export function prevApplicableIntakeStep(
  currentStep: number,
  eligibility: Parameters<typeof getApplicableIntakeStepIndices>[0],
  totalSteps: number,
): number {
  const applicable = getApplicableIntakeStepIndices(eligibility, totalSteps);
  const idx = applicable.indexOf(currentStep);
  if (idx <= 0) return Math.max(currentStep - 1, 0);
  return applicable[idx - 1]!;
}
