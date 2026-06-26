import { describe, expect, it } from "vitest";
import type { QuestionnaireStepSchema } from "@/lib/api/client";
import {
  countStepsForward,
  getEntryStep,
  progressPercentFromLevel,
  resolveNextStep,
} from "@/lib/questionnaire/step-routing";

function step(
  key: string,
  sortOrder: number,
  overrides: Partial<QuestionnaireStepSchema> = {},
): QuestionnaireStepSchema {
  return {
    step_key: key,
    sort_order: sortOrder,
    title: key,
    fields: [],
    ...overrides,
  };
}

// Mirrors the screenshot flow: Drugs branches by answer; pill type is default.
const drugs = step("drugs", 0, {
  routing_rules: [
    { when_field: "drug_type", when_value: "injections", next_step_key: "inj" },
    {
      when_field: "drug_type",
      when_value: "compounding",
      next_step_key: "cmp",
    },
    { when_field: "__default__", when_value: "", next_step_key: "pill" },
  ],
});
// Each branch step funnels back into the account step.
const toAccount = {
  routing_rules: [
    { when_field: "__default__", when_value: "", next_step_key: "account" },
  ],
};
const pill = step("pill", 1, toAccount);
const inj = step("inj", 2, toAccount);
const cmp = step("cmp", 3, toAccount);
const account = step("account", 4);
const STEPS = [drugs, pill, inj, cmp, account];

describe("resolveNextStep", () => {
  it("routes to the answer-specific step over the default", () => {
    const next = resolveNextStep(drugs, { drug_type: "injections" }, STEPS);
    expect(next?.step_key).toBe("inj");
  });

  it("routes a second answer to its own step", () => {
    const next = resolveNextStep(drugs, { drug_type: "compounding" }, STEPS);
    expect(next?.step_key).toBe("cmp");
  });

  it("falls back to the default edge when no answer rule matches", () => {
    const next = resolveNextStep(drugs, { drug_type: "pills" }, STEPS);
    expect(next?.step_key).toBe("pill");
  });

  it("falls back to the default edge when the field is unanswered", () => {
    const next = resolveNextStep(drugs, {}, STEPS);
    expect(next?.step_key).toBe("pill");
  });

  it("matches multi_choice answers stored as arrays", () => {
    const s = step("s", 0, {
      routing_rules: [
        { when_field: "goals", when_value: "energy", next_step_key: "inj" },
      ],
    });
    const next = resolveNextStep(s, { goals: ["weight", "energy"] }, [s, inj]);
    expect(next?.step_key).toBe("inj");
  });

  it("stops when a default rule has an empty target", () => {
    const s = step("s", 0, {
      routing_rules: [
        { when_field: "__default__", when_value: "", next_step_key: "" },
      ],
    });
    expect(resolveNextStep(s, {}, [s, pill])).toBeNull();
  });

  it("uses the next visible step when there are no routing rules", () => {
    const a = step("a", 0);
    const b = step("b", 1);
    expect(resolveNextStep(a, {}, [a, b])?.step_key).toBe("b");
  });

  it("skips steps hidden by visibility rules in natural flow", () => {
    const a = step("a", 0);
    const hidden = step("hidden", 1, {
      visibility_rule: { when: { field: "show", op: "eq", value: "yes" } },
    });
    const c = step("c", 2);
    expect(resolveNextStep(a, {}, [a, hidden, c])?.step_key).toBe("c");
  });

  it("returns null at the end of the flow", () => {
    expect(resolveNextStep(account, {}, STEPS)).toBeNull();
  });

  it("treats the account step as terminal despite a later sort_order", () => {
    // The account step is where branches converge and qualify ends; step_5 is
    // only on the compounding branch but sorts after it — account must not auto-
    // advance to it.
    const step1 = step("step_1", 0, {
      routing_rules: [
        {
          when_field: "drug_type",
          when_value: "compounding",
          next_step_key: "step_5",
        },
        { when_field: "__default__", when_value: "", next_step_key: "step_2" },
      ],
    });
    const step2 = step("step_2", 1, {
      routing_rules: [
        { when_field: "__default__", when_value: "", next_step_key: "step_4" },
      ],
    });
    const step5 = step("step_5", 4, {
      routing_rules: [
        { when_field: "__default__", when_value: "", next_step_key: "step_4" },
      ],
    });
    const step4 = step("step_4", 3, {
      fields: [
        {
          field_key: "account",
          field_type: "account",
          label: "Create your account",
        } as QuestionnaireStepSchema["fields"][number],
      ],
    });
    const flow = [step1, step2, step5, step4];
    expect(resolveNextStep(step4, { drug_type: "pills" }, flow)).toBeNull();
  });

  it("falls through to the natural next when an answer matches no rule and no default exists", () => {
    // step_1 branches only on injections; "pills" matches nothing and there is
    // no default rule — it must fall through to the natural next (step_2).
    const step1 = step("step_1", 0, {
      routing_rules: [
        {
          when_field: "drug_type",
          when_value: "injections",
          next_step_key: "inj",
        },
      ],
    });
    const step2 = step("step_2", 1);
    const inj2 = step("inj", 2);
    expect(
      resolveNextStep(step1, { drug_type: "pills" }, [step1, step2, inj2])
        ?.step_key,
    ).toBe("step_2");
  });
});

describe("getEntryStep", () => {
  it("returns the first visible step by sort order", () => {
    expect(getEntryStep(STEPS, {})?.step_key).toBe("drugs");
  });
});

describe("progressPercentFromLevel", () => {
  it("maps level tiers to patient progress", () => {
    const steps = [
      step("drugs", 0, { progress_level: 0 }),
      step("pill", 1, { progress_level: 1 }),
      step("account", 2, { progress_level: 2 }),
    ];
    expect(progressPercentFromLevel(steps, steps[0])).toBe(33);
    expect(progressPercentFromLevel(steps, steps[1])).toBe(67);
    expect(progressPercentFromLevel(steps, steps[2])).toBe(100);
  });
});

describe("countStepsForward", () => {
  it("counts the injections branch (drugs → inj → account)", () => {
    expect(countStepsForward(drugs, { drug_type: "injections" }, STEPS)).toBe(
      2,
    );
  });

  it("counts the default pill branch (drugs → pill → account)", () => {
    expect(countStepsForward(drugs, { drug_type: "pills" }, STEPS)).toBe(2);
  });
});
