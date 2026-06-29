import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
} from "@/lib/api/client";

/** Plugin id for legacy account steps (prefer field_type `account`). */
export const ACCOUNT_REGISTRATION_PLUGIN = "account_registration";

export type RegistrationFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const emptyRegistrationFields = (): RegistrationFields => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
});

/** Account signup component on a step (current or legacy plugin). */
export function isAccountField(field: QuestionnaireFieldSchema): boolean {
  return (
    field.field_type === "account" ||
    (field.field_type === "plugin" &&
      field.plugin_id === ACCOUNT_REGISTRATION_PLUGIN)
  );
}

export function stepHasAccountField(
  step: QuestionnaireStepSchema | undefined | null,
): boolean {
  return (step?.fields ?? []).some(isAccountField);
}

function hasCredentialFields(step: QuestionnaireStepSchema): boolean {
  const fields = step.fields ?? [];
  const hasEmail = fields.some(
    (f) => f.field_type === "email" || f.field_key === "email",
  );
  const hasPassword = fields.some(
    (f) => f.field_type === "password" || f.field_key === "password",
  );
  return hasEmail && hasPassword;
}

/**
 * Whether a qualify step creates the patient account. Detected by an account
 * field (or legacy plugin / email+password pair), not a hardcoded step_key.
 */
export function isRegistrationStep(
  step: QuestionnaireStepSchema | undefined | null,
): boolean {
  if (!step) return false;
  if (stepHasAccountField(step)) return true;
  const hasPlugin = (step.fields ?? []).some(
    (f) =>
      f.field_type === "plugin" && f.plugin_id === ACCOUNT_REGISTRATION_PLUGIN,
  );
  return hasPlugin || hasCredentialFields(step);
}

export function validateRegistrationFields(
  r: RegistrationFields,
): string | null {
  if (!r.firstName.trim()) return "Enter your legal first name.";
  if (!r.lastName.trim()) return "Enter your legal last name.";
  if (!r.phone.trim()) return "Enter your phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
    return "Enter a valid email address.";
  }
  if (r.password.length < 10) {
    return "Password must be at least 10 characters.";
  }
  if (r.password !== r.confirmPassword) return "Passwords do not match.";
  return null;
}
