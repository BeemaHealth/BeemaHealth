import type {
  QuestionnaireFieldSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import { formatIsoDateForDisplay } from "@/lib/questionnaire/dob-field";
import { parseAddressGroupValue } from "@/lib/questionnaire/address-group";
import { isAccountField } from "@/lib/questionnaire/registration";
import { reachableSteps } from "@/lib/questionnaire/step-routing";
import { evaluateVisibilityRule } from "@/lib/questionnaire/validation";
import { formatShippingAddressLines } from "@/lib/shipping-address";

export type IntakeReviewField = {
  fieldKey: string;
  label: string;
  value: string;
};

export type IntakeReviewSection = {
  stepKey: string;
  title: string;
  fields: IntakeReviewField[];
};

function optionLabelMap(field: QuestionnaireFieldSchema): Map<string, string> {
  const map = new Map<string, string>();
  for (const opt of field.options ?? []) {
    const value = String(opt.value ?? "");
    if (!value) continue;
    map.set(value, String(opt.label || value));
  }
  return map;
}

/** Human-readable display string for a single questionnaire answer. */
export function formatFieldDisplayValue(
  field: QuestionnaireFieldSchema,
  raw: unknown,
): string {
  if (raw === null || raw === undefined || raw === "") return "—";

  if (field.field_type === "address_group") {
    const parsed = parseAddressGroupValue(raw);
    if (!parsed) return "—";
    const lines = formatShippingAddressLines(parsed);
    return lines.length > 0 ? lines.join("\n") : "—";
  }

  if (isAccountField(field)) {
    return "Account information on file";
  }

  if (field.field_type === "dob") {
    return formatIsoDateForDisplay(String(raw));
  }

  const labels = optionLabelMap(field);

  if (field.field_type === "single_choice" || field.field_type === "yes_no") {
    return labels.get(String(raw)) ?? String(raw);
  }

  if (field.field_type === "multi_choice") {
    const parts = Array.isArray(raw)
      ? raw.map((v) => String(v))
      : String(raw)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
    if (parts.length === 0) return "—";
    return parts.map((p) => labels.get(p) ?? p).join(", ");
  }

  if (typeof raw === "boolean") {
    return raw ? "Yes" : "No";
  }

  if (Array.isArray(raw)) {
    return raw.map((v) => String(v)).join(", ");
  }

  if (typeof raw === "object") {
    return "—";
  }

  return String(raw);
}

function fieldHasAnswer(raw: unknown): boolean {
  if (raw === null || raw === undefined || raw === "") return false;
  if (Array.isArray(raw) && raw.length === 0) return false;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const parsed = parseAddressGroupValue(raw);
    if (parsed) {
      return Boolean(
        parsed.verified || parsed.address || parsed.city || parsed.zip,
      );
    }
    return Object.keys(raw as object).length > 0;
  }
  return true;
}

/** Build review sections for the route the patient actually took. */
export function buildIntakeReviewSections(
  schema: QuestionnaireVersionSchema,
  responses: Record<string, unknown>,
): IntakeReviewSection[] {
  const sections: IntakeReviewSection[] = [];

  for (const step of reachableSteps(schema.steps, responses)) {
    const fields: IntakeReviewField[] = [];
    for (const field of step.fields) {
      const visibilityRule = (
        field as QuestionnaireFieldSchema & {
          visibility_rule?: Record<string, unknown> | null;
        }
      ).visibility_rule;
      if (!evaluateVisibilityRule(visibilityRule ?? null, responses)) {
        continue;
      }
      if (
        field.field_type === "password" ||
        field.field_type === "plugin" ||
        field.field_type === "account" ||
        field.field_type === "review" ||
        field.field_type === "legal_consent"
      ) {
        continue;
      }
      const raw = responses[field.field_key];
      if (!fieldHasAnswer(raw)) continue;

      fields.push({
        fieldKey: field.field_key,
        label: field.label || field.field_key,
        value: formatFieldDisplayValue(field, raw),
      });
    }
    if (fields.length > 0) {
      sections.push({
        stepKey: step.step_key,
        title: step.title,
        fields,
      });
    }
  }

  return sections;
}
