import type {
  QuestionnaireStepSchema,
  StepAnalyticsRow,
} from "@/lib/api/client";

/** Count participants who selected a specific answer on a routed field. */
export function getAnswerCountForRoute(
  stepRow: StepAnalyticsRow | undefined,
  whenField: string,
  whenValue: string,
): number {
  if (!stepRow) return 0;
  const field = stepRow.fields.find((f) => f.field_key === whenField);
  if (!field) return 0;
  const item = field.answer_distribution.find((d) => d.value === whenValue);
  return item?.count ?? 0;
}

/**
 * Count participants whose answer on a branching field follows the default /
 * sequential edge to `targetStepKey` — i.e. values not explicitly routed
 * elsewhere.
 */
export function getAnswerCountForDefaultPath(
  sourceStep: QuestionnaireStepSchema,
  stepRow: StepAnalyticsRow | undefined,
  targetStepKey: string,
): number {
  if (!stepRow) return 0;

  const conditional = (sourceStep.routing_rules ?? []).filter(
    (r) =>
      r.when_field &&
      r.when_field !== "__default__" &&
      r.when_value &&
      r.next_step_key,
  );

  const routedElsewhere = new Set<string>();
  for (const rule of conditional) {
    if (rule.next_step_key !== targetStepKey) {
      routedElsewhere.add(rule.when_value);
    }
  }

  const routedFieldKeys = new Set(
    conditional.map((r) => r.when_field).filter(Boolean),
  );

  if (routedFieldKeys.size === 0) {
    return stepRow.fields.reduce((sum, f) => sum + f.total_answers, 0);
  }

  let total = 0;
  for (const field of stepRow.fields) {
    if (!routedFieldKeys.has(field.field_key)) continue;
    for (const item of field.answer_distribution) {
      if (!routedElsewhere.has(item.value)) {
        total += item.count;
      }
    }
  }
  return total;
}

export type EdgeDropoffInput =
  | {
      kind: "route";
      sourceStep: QuestionnaireStepSchema;
      targetStepKey: string;
      whenField: string;
      whenValue: string;
      whenLabel?: string;
    }
  | {
      kind: "seq";
      sourceStep: QuestionnaireStepSchema;
      targetStepKey: string;
    }
  | {
      kind: "generic";
      sourceStepKey: string;
      targetStepKey: string;
    }
  | {
      // Step → intake node. The intake is a separate questionnaire, so its
      // reach isn't in this version's transition map. We instead measure who
      // reached the source step (views) vs who completed it (completions),
      // which captures patients who got here but bailed before continuing.
      kind: "intake";
      sourceStepKey: string;
      intakeSlug: string;
    };

export type EdgeDropoffResult = {
  sourceLabel: string;
  sourceCount: number;
  targetLabel: string;
  targetReached: number;
  dropoffPercent: number | null;
};

export function computeEdgeDropoff(
  input: EdgeDropoffInput,
  stepAnalyticsMap: Map<string, StepAnalyticsRow>,
  edgeTransitionMap: Map<string, number> = new Map(),
): EdgeDropoffResult | null {
  // Intake edges compare reached-vs-completed on the source step, since the
  // intake questionnaire's events live under a different version.
  if (input.kind === "intake") {
    const row = stepAnalyticsMap.get(input.sourceStepKey);
    const sourceCount = row?.views ?? 0;
    const completed = row?.completions ?? 0;
    if (sourceCount === 0 && completed === 0) return null;
    const dropoffPercent =
      sourceCount > 0
        ? Math.max(
            0,
            Math.round(((sourceCount - completed) / sourceCount) * 100),
          )
        : null;
    return {
      sourceLabel: `${input.sourceStepKey} reached`,
      sourceCount,
      targetLabel: "Continued to intake",
      targetReached: completed,
      dropoffPercent,
    };
  }

  let targetStepKey: string;
  let sourceStepKey: string;
  let sourceCount: number;
  let sourceLabel: string;

  if (input.kind === "route") {
    sourceStepKey = input.sourceStep.step_key;
    targetStepKey = input.targetStepKey;
    const row = stepAnalyticsMap.get(input.sourceStep.step_key);
    sourceCount = getAnswerCountForRoute(row, input.whenField, input.whenValue);
    sourceLabel = input.whenLabel
      ? `Chose "${input.whenLabel}"`
      : `Chose "${input.whenValue}"`;
  } else if (input.kind === "seq") {
    sourceStepKey = input.sourceStep.step_key;
    targetStepKey = input.targetStepKey;
    const row = stepAnalyticsMap.get(input.sourceStep.step_key);
    const totalViews = row?.views ?? 0;

    // Conditional rules that route to a DIFFERENT step than this default edge.
    // Those participants left via a branch, not the default path.
    const branchedTargets = new Set(
      (input.sourceStep.routing_rules ?? [])
        .filter(
          (r) =>
            r.when_field &&
            r.when_field !== "__default__" &&
            r.when_value &&
            r.next_step_key &&
            r.next_step_key !== input.targetStepKey,
        )
        .map((r) => r.next_step_key as string),
    );

    // Derive the default-path pool from the same view-event data as the
    // transition counts (NOT answer distributions, which come from saved
    // responses and measure a different population). The pool is everyone who
    // reached the source step minus everyone who branched away to another step.
    let branchedAway = 0;
    for (const t of branchedTargets) {
      branchedAway += edgeTransitionMap.get(`${sourceStepKey}\0${t}`) ?? 0;
    }
    // Floor the pool at the number who actually traversed this edge. Branch
    // transition counts can overlap with the default traversal when a
    // participant explores a branch and then navigates back to the default
    // answer, so the raw subtraction can otherwise dip below the people we KNOW
    // took the default path.
    const traversed =
      edgeTransitionMap.get(`${sourceStepKey}\0${targetStepKey}`) ?? 0;
    sourceCount = Math.max(0, totalViews - branchedAway, traversed);
    sourceLabel =
      branchedTargets.size > 0
        ? "Default path"
        : `${input.sourceStep.step_key} reached`;
  } else {
    sourceStepKey = input.sourceStepKey;
    targetStepKey = input.targetStepKey;
    const srcRow = stepAnalyticsMap.get(input.sourceStepKey);
    sourceCount = srcRow?.views ?? 0;
    sourceLabel = `${input.sourceStepKey} reached`;
  }

  const targetReached =
    edgeTransitionMap.get(`${sourceStepKey}\0${targetStepKey}`) ?? 0;

  if (sourceCount === 0 && targetReached === 0) return null;

  const dropoffPercent =
    sourceCount > 0
      ? Math.max(
          0,
          Math.round(((sourceCount - targetReached) / sourceCount) * 100),
        )
      : null;

  return {
    sourceLabel,
    sourceCount,
    targetLabel: `${targetStepKey} reached`,
    targetReached,
    dropoffPercent,
  };
}

export function edgeDropoffFromReactFlowEdge(
  edge: { id: string; source?: string; data?: unknown },
  steps: QuestionnaireStepSchema[],
): EdgeDropoffInput | null {
  const data = edge.data as
    | {
        type: "route";
        stepKey: string;
        rule: {
          when_field?: string;
          when_value?: string;
          next_step_key?: string;
        };
      }
    | { type: "seq"; stepKey: string; targetStepKey: string }
    | {
        type: "intake";
        rule?: { intake_questionnaire_slug?: string };
      }
    | undefined;

  if (data?.type === "intake") {
    // Intake edges originate from a step node; edge.source is its step_key.
    const sourceStepKey = edge.source ?? "";
    if (!sourceStepKey || !steps.some((s) => s.step_key === sourceStepKey)) {
      return null;
    }
    return {
      kind: "intake",
      sourceStepKey,
      intakeSlug: data.rule?.intake_questionnaire_slug ?? "intake",
    };
  }

  if (data?.type === "route") {
    const sourceStep = steps.find((s) => s.step_key === data.stepKey);
    if (!sourceStep || !data.rule?.next_step_key) return null;
    const whenField = data.rule.when_field ?? "";
    const whenValue = data.rule.when_value ?? "";
    if (!whenField || !whenValue) return null;
    const fieldDef = sourceStep.fields.find((f) => f.field_key === whenField);
    const whenLabel =
      fieldDef?.options?.find(
        (o) => typeof o === "object" && o?.value === whenValue,
      )?.label ?? whenValue;
    return {
      kind: "route",
      sourceStep,
      targetStepKey: data.rule.next_step_key,
      whenField,
      whenValue,
      whenLabel: String(whenLabel),
    };
  }

  if (data?.type === "seq") {
    const sourceStep = steps.find((s) => s.step_key === data.stepKey);
    if (!sourceStep) return null;
    return {
      kind: "seq",
      sourceStep,
      targetStepKey: data.targetStepKey,
    };
  }

  return null;
}
