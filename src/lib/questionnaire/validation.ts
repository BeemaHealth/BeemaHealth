import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
} from "@/lib/api/client";
import { validateAddressGroupValue } from "@/lib/questionnaire/address-group";
import { validateIsoDateOfBirth } from "@/lib/questionnaire/dob-field";
import { isPaymentField } from "@/lib/questionnaire/payment-field";

export type { QuestionnaireFieldSchema, QuestionnaireStepSchema };

export function evaluateVisibilityRule(
  rule: Record<string, unknown> | null | undefined,
  responses: Record<string, unknown>,
): boolean {
  if (!rule) return true;
  const when = rule.when as Record<string, unknown> | undefined;
  if (!when) return true;
  const field = String(when.field ?? "");
  const op = String(when.op ?? "eq");
  const expected = when.value;
  const actual = responses[field];
  if (op === "eq") return actual === expected;
  if (op === "neq") return actual !== expected;
  if (op === "in") {
    const list = Array.isArray(expected) ? expected : [expected];
    return list.includes(actual);
  }
  if (op === "truthy") return Boolean(actual);
  return true;
}

export function getVisibleSteps(
  steps: QuestionnaireStepSchema[],
  responses: Record<string, unknown>,
): QuestionnaireStepSchema[] {
  return steps.filter((step) =>
    evaluateVisibilityRule(step.visibility_rule ?? null, responses),
  );
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Whether a field must be answered before advancing (checkbox or validation rule). */
export function fieldIsRequired(field: QuestionnaireFieldSchema): boolean {
  if (field.required) return true;
  for (const rule of field.validation_rules ?? []) {
    if (typeof rule === "object" && rule && rule.type === "required") {
      return true;
    }
  }
  return false;
}

export function validateFieldValue(
  field: QuestionnaireFieldSchema,
  value: unknown,
  allResponses: Record<string, unknown>,
): string | null {
  const required = fieldIsRequired(field);
  if (field.field_type === "account") {
    return null;
  }
  const isReviewField =
    field.field_type === "review" ||
    (field.field_type === "plugin" && field.plugin_id === "intake_review");
  if (isReviewField) {
    if (required && value !== true) {
      return "Please confirm your answers are correct to continue.";
    }
    return null;
  }
  if (field.field_type === "legal_consent") {
    if (required && value !== true) {
      return "Please agree to the Terms of Service, Privacy Policy, and Telehealth Consent to continue.";
    }
    return null;
  }
  if (isPaymentField(field)) {
    const paymentStatus =
      value && typeof value === "object" && "payment_status" in value
        ? (value as { payment_status?: string }).payment_status
        : undefined;
    if (paymentStatus === "held" || paymentStatus === "captured") return null;
    return "Please complete payment to continue.";
  }
  if (field.field_type === "dob") {
    if (!required && isEmptyValue(value)) return null;
    return validateIsoDateOfBirth(String(value ?? ""), {
      requireAdult: true,
      label: field.label || "Date of birth",
    });
  }
  if (isEmptyValue(value) && !required) {
    return null;
  }
  if (required && isEmptyValue(value)) {
    return `${field.label} is required.`;
  }
  if (field.field_type === "email" && typeof value === "string") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter a valid email address.";
    }
  }
  if (field.field_type === "address_group") {
    return validateAddressGroupValue(field.label, value, required);
  }
  for (const rule of field.validation_rules ?? []) {
    if (typeof rule !== "object" || !rule) continue;
    const rtype = rule.type as string;
    if (rtype === "enum") {
      const allowed = Array.isArray(rule.values)
        ? rule.values
        : Array.isArray(rule.value)
          ? rule.value
          : rule.value != null
            ? [rule.value]
            : [];
      if (allowed.length && !allowed.includes(value)) {
        return `Select a valid option for ${field.label}.`;
      }
    }
    if (rtype === "cross_field" && typeof rule.field === "string") {
      const other = allResponses[rule.field];
      if (
        rule.op === "lt" &&
        value !== "" &&
        other !== "" &&
        value != null &&
        other != null
      ) {
        if (Number(value) >= Number(other)) {
          return (
            (rule.message as string) ||
            `${field.label} must be less than ${rule.field}.`
          );
        }
      }
    }
  }
  return null;
}

export function validateStepFields(
  step: QuestionnaireStepSchema,
  responses: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of step.fields) {
    const error = validateFieldValue(
      field,
      responses[field.field_key],
      responses,
    );
    if (error) errors[field.field_key] = error;
  }
  return errors;
}
