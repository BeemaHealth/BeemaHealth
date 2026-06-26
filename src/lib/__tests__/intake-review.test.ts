import { describe, expect, it } from "vitest";
import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  buildIntakeReviewSections,
  formatFieldDisplayValue,
} from "@/lib/questionnaire/intake-review";
import { reachableSteps } from "@/lib/questionnaire/step-routing";

function field(
  key: string,
  type: string,
  overrides: Partial<QuestionnaireFieldSchema> = {},
): QuestionnaireFieldSchema {
  return {
    field_key: key,
    field_type: type,
    label: key.replace(/_/g, " "),
    ...overrides,
  };
}

function step(
  key: string,
  sortOrder: number,
  fields: QuestionnaireFieldSchema[],
  overrides: Partial<QuestionnaireStepSchema> = {},
): QuestionnaireStepSchema {
  return {
    step_key: key,
    sort_order: sortOrder,
    title: key,
    fields,
    ...overrides,
  };
}

describe("formatFieldDisplayValue", () => {
  it("maps single_choice values to option labels", () => {
    const f = field("goal", "single_choice", {
      label: "Primary goal",
      options: [
        { value: "lose", label: "Lose weight" },
        { value: "energy", label: "More energy" },
      ],
    });
    expect(formatFieldDisplayValue(f, "energy")).toBe("More energy");
  });

  it("formats verified address groups as lines", () => {
    const f = field("ship", "address_group", { label: "Shipping address" });
    expect(
      formatFieldDisplayValue(f, {
        address: "123 Main St",
        city: "Denver",
        state: "CO",
        zip: "80202",
        county: "Denver County",
        country: "US",
        verified: true,
      }),
    ).toContain("123 Main St");
  });
});

describe("buildIntakeReviewSections", () => {
  const schema: QuestionnaireVersionSchema = {
    id: "v1",
    questionnaire_slug: "intake",
    questionnaire_type: "intake",
    medication_id: null,
    version_label: "1",
    status: "published",
    published_at: null,
    steps: [
      step("s1", 0, [
        field("meds", "yes_no", {
          label: "Taking medications?",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        }),
      ]),
      step("s2", 1, [field("notes", "textarea", { label: "Anything else?" })]),
    ],
  };

  it("includes only steps on the patient's route", () => {
    const sections = buildIntakeReviewSections(schema, {
      meds: "yes",
      notes: "None",
    });
    expect(sections.map((s) => s.stepKey)).toEqual(["s1", "s2"]);
    expect(sections[0]?.fields[0]?.value).toBe("Yes");
    expect(sections[1]?.fields[0]?.value).toBe("None");
  });

  it("omits steps with no answered fields", () => {
    const sections = buildIntakeReviewSections(schema, { meds: "no" });
    expect(sections.map((s) => s.stepKey)).toEqual(["s1"]);
  });

  it("excludes the review and account fields from the summary", () => {
    const reviewSchema: QuestionnaireVersionSchema = {
      ...schema,
      steps: [
        step("s1", 0, [field("notes", "textarea", { label: "Anything else?" })]),
        step("review", 1, [
          field("account", "account", { label: "Create account" }),
          field("review_confirm", "review", { label: "Review your answers" }),
        ]),
      ],
    };
    const sections = buildIntakeReviewSections(reviewSchema, {
      notes: "None",
      account: { email: "a@b.com" },
      review_confirm: true,
    });
    expect(sections.map((s) => s.stepKey)).toEqual(["s1"]);
  });
});

describe("reachableSteps", () => {
  it("returns steps in visit order along the resolved route", () => {
    const steps = [
      step("a", 0, [], {
        routing_rules: [
          { when_field: "branch", when_value: "b", next_step_key: "c" },
        ],
      }),
      step("b", 1, []),
      step("c", 2, []),
    ];
    expect(
      reachableSteps(steps, { branch: "b" }).map((s) => s.step_key),
    ).toEqual(["a", "c"]);
  });
});
