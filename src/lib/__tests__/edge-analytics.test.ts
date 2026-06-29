import { describe, expect, it } from "vitest";
import type {
  QuestionnaireStepSchema,
  StepAnalyticsRow,
} from "@/lib/api/client";
import {
  computeEdgeDropoff,
  getAnswerCountForDefaultPath,
  getAnswerCountForRoute,
} from "@/lib/questionnaire/edge-analytics";

const step1: QuestionnaireStepSchema = {
  step_key: "step_1",
  title: "Drugs",
  sort_order: 0,
  fields: [
    {
      field_key: "drug_type",
      label: "Pick your drug",
      field_type: "single_choice",
      options: [
        { value: "pills", label: "pills" },
        { value: "injections", label: "injections" },
        { value: "compounding", label: "compounding" },
      ],
    },
  ],
  routing_rules: [
    {
      when_field: "drug_type",
      when_value: "injections",
      next_step_key: "step_3",
    },
    {
      when_field: "drug_type",
      when_value: "compounding",
      next_step_key: "step_5",
    },
  ],
};

const step1Analytics: StepAnalyticsRow = {
  step_key: "step_1",
  title: "Drugs",
  views: 5,
  completions: 5,
  dropoff_percent: 0,
  stopped_sessions: 0,
  fields: [
    {
      field_key: "drug_type",
      label: "Pick your drug",
      field_type: "single_choice",
      total_answers: 5,
      answer_distribution: [
        { value: "pills", label: "pills", count: 2, pct: 40 },
        { value: "injections", label: "injections", count: 2, pct: 40 },
        { value: "compounding", label: "compounding", count: 1, pct: 20 },
      ],
    },
  ],
};

const step3Analytics: StepAnalyticsRow = {
  step_key: "step_3",
  title: "Injections",
  views: 1,
  completions: 1,
  dropoff_percent: 0,
  stopped_sessions: 0,
  fields: [],
};

const map = new Map<string, StepAnalyticsRow>([
  ["step_1", step1Analytics],
  ["step_3", step3Analytics],
]);

const transitions = new Map<string, number>([
  ["step_1\0step_3", 1],
  ["step_1\0step_2", 2],
]);

describe("edge-analytics", () => {
  it("counts a specific routed answer", () => {
    expect(
      getAnswerCountForRoute(step1Analytics, "drug_type", "injections"),
    ).toBe(2);
  });

  it("counts default-path answers not routed elsewhere", () => {
    expect(getAnswerCountForDefaultPath(step1, step1Analytics, "step_2")).toBe(
      2,
    );
  });

  it("computes route drop-off from answer picks vs next-step reach", () => {
    const result = computeEdgeDropoff(
      {
        kind: "route",
        sourceStep: step1,
        targetStepKey: "step_3",
        whenField: "drug_type",
        whenValue: "injections",
        whenLabel: "injections",
      },
      map,
      transitions,
    );
    expect(result).toEqual({
      sourceLabel: 'Chose "injections"',
      sourceCount: 2,
      targetLabel: "step_3 reached",
      targetReached: 1,
      dropoffPercent: 50,
    });
  });

  it("computes intake-edge drop-off from reached vs completed source step", () => {
    const step4Analytics: StepAnalyticsRow = {
      step_key: "step_4",
      title: "Account",
      views: 4,
      completions: 1,
      dropoff_percent: 0,
      stopped_sessions: 0,
      fields: [],
    };
    const withStep4 = new Map(map);
    withStep4.set("step_4", step4Analytics);

    // 4 reached step_4, only 1 completed it → 75% dropped before intake.
    const result = computeEdgeDropoff(
      { kind: "intake", sourceStepKey: "step_4", intakeSlug: "intake" },
      withStep4,
    );
    expect(result?.sourceLabel).toBe("step_4 reached");
    expect(result?.sourceCount).toBe(4);
    expect(result?.targetLabel).toBe("Continued to intake");
    expect(result?.targetReached).toBe(1);
    expect(result?.dropoffPercent).toBe(75);
  });

  it("derives the default-path pool from step views minus branchers", () => {
    // Default path is the only route to step_2. With the new logic the source
    // pool is view-based (step_1 views minus participants who branched away),
    // NOT answer-distribution-based — so it can never be smaller than the
    // number who actually reached step_2 via this edge.
    const result = computeEdgeDropoff(
      {
        kind: "seq",
        sourceStep: step1,
        targetStepKey: "step_2",
      },
      map,
      transitions,
    );
    // step_1 views = 5; branched to step_3 = 1, step_5 = 0 → pool = 4.
    expect(result?.sourceLabel).toBe("Default path");
    expect(result?.sourceCount).toBe(4);
    expect(result?.targetLabel).toBe("step_2 reached");
    expect(result?.targetReached).toBe(2);
    expect(result?.dropoffPercent).toBe(50);
  });

  it("default-path pool is never undercounted below step_2 reach", () => {
    // Reproduces the reported bug: step_2 reached (3) used to exceed the
    // answer-distribution-based 'Default path' (pills = 2), producing a
    // clamped, nonsensical 0%. View-based source pool keeps them consistent.
    const step1NoBranchers: StepAnalyticsRow = {
      ...step1Analytics,
      views: 3,
    };
    const m = new Map<string, StepAnalyticsRow>([["step_1", step1NoBranchers]]);
    // 3 participants went step_1 -> step_2, nobody branched away.
    const t = new Map<string, number>([["step_1\0step_2", 3]]);
    const result = computeEdgeDropoff(
      { kind: "seq", sourceStep: step1, targetStepKey: "step_2" },
      m,
      t,
    );
    expect(result?.sourceCount).toBe(3);
    expect(result?.targetReached).toBe(3);
    expect(result?.dropoffPercent).toBe(0);
  });

  it("clamps default pool above traversals when a brancher returns to default", () => {
    // Back-navigation case: views(step_1)=3, one participant explored the
    // injections branch (step_1->step_3) AND later took the default
    // (step_1->step_2), so they're counted in BOTH buckets. Raw subtraction
    // would give 3-1=2 < 3 reached, which is impossible. The pool is floored
    // at the actual default traversals (3).
    const step1ThreeViews: StepAnalyticsRow = {
      ...step1Analytics,
      views: 3,
    };
    const m = new Map<string, StepAnalyticsRow>([["step_1", step1ThreeViews]]);
    const t = new Map<string, number>([
      ["step_1\0step_3", 1],
      ["step_1\0step_2", 3],
    ]);
    const result = computeEdgeDropoff(
      { kind: "seq", sourceStep: step1, targetStepKey: "step_2" },
      m,
      t,
    );
    expect(result?.sourceCount).toBe(3);
    expect(result?.targetReached).toBe(3);
    expect(result?.dropoffPercent).toBe(0);
  });
});
