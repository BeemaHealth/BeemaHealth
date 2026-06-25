import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
} from "@/lib/api/client";

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

export function validateFieldValue(
  field: QuestionnaireFieldSchema,
  value: unknown,
  allResponses: Record<string, unknown>,
): string | null {
  const required = field.required ?? false;
  if ((value === null || value === undefined || value === "") && !required) {
    return null;
  }
  if (required && (value === null || value === undefined || value === "")) {
    return `${field.label} is required.`;
  }
  if (field.field_type === "email" && typeof value === "string") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter a valid email address.";
    }
  }
  for (const rule of field.validation_rules ?? []) {
    if (typeof rule !== "object" || !rule) continue;
    const rtype = rule.type as string;
    if (rtype === "enum" && Array.isArray(rule.values)) {
      if (!rule.values.includes(value)) {
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
