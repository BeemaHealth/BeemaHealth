import { describe, expect, it } from "vitest";
import {
  formatIntakeRuleStepLabel,
  formatIntakeRuleTrigger,
  resolveIntakeRuleSourceStepKey,
} from "@/lib/questionnaire/intake-routing";
import type { QuestionnaireStepSchema } from "@/lib/api/client";

const steps: QuestionnaireStepSchema[] = [
  {
    step_key: "goals",
    sort_order: 0,
    title: "Your goals",
    fields: [{ field_key: "goal", field_type: "single_choice", label: "Goal" }],
  },
  {
    step_key: "account",
    sort_order: 1,
    title: "Create account",
    fields: [{ field_key: "email", field_type: "email", label: "Email" }],
  },
];

describe("intake-routing helpers", () => {
  it("resolves step from when_step on default rules", () => {
    expect(
      resolveIntakeRuleSourceStepKey(
        {
          when_field: "__default__",
          when_value: "",
          intake_questionnaire_slug: "intake",
          when_step: "goals",
        },
        steps,
      ),
    ).toBe("goals");
  });

  it("resolves step from when_field on answer rules", () => {
    expect(
      resolveIntakeRuleSourceStepKey(
        {
          when_field: "goal",
          when_value: "yes",
          intake_questionnaire_slug: "intake",
        },
        steps,
      ),
    ).toBe("goals");
  });

  it("falls back to last step for unanchored default rules", () => {
    expect(
      resolveIntakeRuleSourceStepKey(
        {
          when_field: "__default__",
          when_value: "",
          intake_questionnaire_slug: "intake",
        },
        steps,
      ),
    ).toBe("account");
  });

  it("formats step label with title", () => {
    expect(
      formatIntakeRuleStepLabel(
        {
          when_field: "goal",
          when_value: "yes",
          intake_questionnaire_slug: "intake",
        },
        steps,
      ),
    ).toBe("goals · Your goals");
  });

  it("formats answer trigger", () => {
    expect(
      formatIntakeRuleTrigger({
        when_field: "goal",
        when_value: "weight_loss",
        intake_questionnaire_slug: "intake",
      }),
    ).toBe('goal = "weight_loss"');
  });
});
