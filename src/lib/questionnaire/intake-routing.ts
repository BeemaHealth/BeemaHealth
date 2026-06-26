import type {
  IntakeRoutingRule,
  QuestionnaireStepSchema,
} from "@/lib/api/client";

/** Step key an intake routing edge should originate from (matches flowchart builder). */
export function resolveIntakeRuleSourceStepKey(
  rule: IntakeRoutingRule,
  steps: QuestionnaireStepSchema[],
): string | null {
  if (rule.when_step?.trim()) {
    return rule.when_step.trim();
  }
  if (rule.when_field && rule.when_field !== "__default__") {
    const step = steps.find((s) =>
      s.fields.some((f) => f.field_key === rule.when_field),
    );
    return step?.step_key ?? null;
  }
  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[sorted.length - 1]?.step_key ?? null;
}

export function findStepForFieldKey(
  fieldKey: string,
  steps: QuestionnaireStepSchema[],
): QuestionnaireStepSchema | undefined {
  return steps.find((s) => s.fields.some((f) => f.field_key === fieldKey));
}

export function formatIntakeRuleStepLabel(
  rule: IntakeRoutingRule,
  steps: QuestionnaireStepSchema[],
): string {
  const stepKey = resolveIntakeRuleSourceStepKey(rule, steps);
  if (!stepKey) return "Unknown step";
  const step = steps.find((s) => s.step_key === stepKey);
  const title = step?.title?.replace(/<[^>]+>/g, "").trim();
  return title ? `${stepKey} · ${title}` : stepKey;
}

export function formatIntakeRuleTrigger(rule: IntakeRoutingRule): string {
  if (rule.when_field === "__default__" || !rule.when_field) {
    return "Default route (all answers)";
  }
  if (rule.when_value) {
    return `${rule.when_field} = "${rule.when_value}"`;
  }
  return rule.when_field;
}
