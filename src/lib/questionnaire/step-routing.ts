import type { QuestionnaireStepSchema } from "@/lib/api/client";
import { getVisibleSteps } from "@/lib/questionnaire/validation";
import { stepHasAccountField } from "@/lib/questionnaire/registration";

/**
 * Step navigation honouring per-step `routing_rules`.
 *
 * A step can branch on an answer ("when answer X go to step Y") and/or define a
 * default edge. This is the single source of truth used by both the staff
 * flowchart preview and the live patient flows so they always agree.
 */

function answerMatches(actual: unknown, expected: unknown): boolean {
  const exp = String(expected ?? "");
  if (Array.isArray(actual)) {
    return actual.map((v) => String(v)).includes(exp);
  }
  return String(actual ?? "") === exp;
}

function isDefaultRule(rule: {
  when_field?: string;
  when_value?: string;
}): boolean {
  return (
    rule.when_field === "__default__" || (!rule.when_field && !rule.when_value)
  );
}

/**
 * Progress percentage from staff-assigned step levels.
 * Level 0 = first tier; max level across the version = 100%.
 */
export function progressPercentFromLevel(
  steps: QuestionnaireStepSchema[],
  currentStep: QuestionnaireStepSchema | undefined,
): number {
  if (!currentStep) return 0;
  const levels = steps.map((s) => s.progress_level ?? 0);
  const maxLevel = Math.max(...levels, 0);
  const current = currentStep.progress_level ?? 0;
  if (maxLevel <= 0) {
    return current > 0 ? 100 : 33;
  }
  return Math.min(100, Math.round(((current + 1) / (maxLevel + 1)) * 100));
}

export function getSortedSteps(
  steps: QuestionnaireStepSchema[],
): QuestionnaireStepSchema[] {
  return [...steps].sort((a, b) => a.sort_order - b.sort_order);
}

/** First visible step by sort order — where a flow begins. */
export function getEntryStep(
  steps: QuestionnaireStepSchema[],
  responses: Record<string, unknown>,
): QuestionnaireStepSchema | undefined {
  return getVisibleSteps(getSortedSteps(steps), responses)[0];
}

/**
 * Resolve the next step from the current one given the patient's answers.
 *
 * Priority: account step is terminal (qualify hands off to intake) → answer-
 * specific routing rules → explicit default edge → natural next visible step
 * (the implicit default). Returns `null` when the flow ends here (no next step,
 * an account step, or a default rule explicitly configured to stop).
 */
export function resolveNextStep(
  step: QuestionnaireStepSchema,
  responses: Record<string, unknown>,
  steps: QuestionnaireStepSchema[],
): QuestionnaireStepSchema | null {
  // The account/registration step is where every qualify branch converges and
  // the flow ends — the patient then continues into the medical intake. It is
  // terminal even though a later step may sort after it (e.g. compounding).
  if (stepHasAccountField(step)) return null;

  const rules = step.routing_rules ?? [];

  // 1. Answer-specific branch ("when answer X go to step Y").
  for (const rule of rules) {
    if (!rule.when_field || rule.when_field === "__default__") continue;
    if (!rule.next_step_key) continue;
    if (answerMatches(responses[rule.when_field], rule.when_value)) {
      return steps.find((s) => s.step_key === rule.next_step_key) ?? null;
    }
  }

  // 2. Explicit default edge. An empty next_step_key means "stop here".
  const defaultRule = rules.find(isDefaultRule);
  if (defaultRule) {
    if (!defaultRule.next_step_key) return null;
    return steps.find((s) => s.step_key === defaultRule.next_step_key) ?? null;
  }

  // 3. Implicit default — fall through to the natural next visible step. This is
  // how steps that branch only on some answers (e.g. step_1 "pills") reach the
  // next step for the unmatched answers without an explicit default edge.
  const visible = getVisibleSteps(getSortedSteps(steps), responses);
  const idx = visible.findIndex((s) => s.step_key === step.step_key);
  return idx >= 0 ? (visible[idx + 1] ?? null) : null;
}

/**
 * Best-effort count of how many steps remain after `step` along the route the
 * current answers imply. Used for the progress bar; cycle-safe and capped.
 */
export function countStepsForward(
  step: QuestionnaireStepSchema,
  responses: Record<string, unknown>,
  steps: QuestionnaireStepSchema[],
  cap = 50,
): number {
  let count = 0;
  let current: QuestionnaireStepSchema | null = step;
  const seen = new Set<string>();
  while (current && count < cap) {
    if (seen.has(current.step_key)) break;
    seen.add(current.step_key);
    const next = resolveNextStep(current, responses, steps);
    if (!next) break;
    count += 1;
    current = next;
  }
  return count;
}

/** Steps on the route the patient's answers imply, in visit order. */
export function reachableSteps(
  steps: QuestionnaireStepSchema[],
  responses: Record<string, unknown>,
): QuestionnaireStepSchema[] {
  const entry = getEntryStep(steps, responses);
  if (!entry) return [];
  const route: QuestionnaireStepSchema[] = [];
  let current: QuestionnaireStepSchema | null = entry;
  const seen = new Set<string>();
  while (current && route.length < 50) {
    if (seen.has(current.step_key)) break;
    seen.add(current.step_key);
    route.push(current);
    current = resolveNextStep(current, responses, steps);
  }
  return route;
}
