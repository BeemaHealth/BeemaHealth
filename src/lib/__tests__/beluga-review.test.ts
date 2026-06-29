import { describe, expect, it } from "vitest";
import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  BELUGA_VISIT_REQUIRED_MAPPINGS,
  buildBelugaDoctorReview,
  buildBelugaFormObjPreview,
  collectBelugaBindings,
} from "@/lib/questionnaire/beluga-review";

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
): QuestionnaireStepSchema {
  return { step_key: key, sort_order: sortOrder, title: key, fields };
}

function version(
  slug: string,
  type: "qualify" | "intake",
  steps: QuestionnaireStepSchema[],
): QuestionnaireVersionSchema {
  return {
    id: `${slug}-v1`,
    questionnaire_slug: slug,
    questionnaire_type: type,
    medication_id: null,
    version_label: "1",
    status: "published",
    published_at: null,
    steps,
  };
}

describe("collectBelugaBindings", () => {
  it("collects direct, choice, account, and address mappings", () => {
    const schema = version("qualify", "qualify", [
      step("s1", 0, [
        field("email", "email", { maps_to_section: "beluga:email" }),
        field("sex", "single_choice", {
          maps_to_section: "beluga:sex",
          options: [{ value: "female", label: "Female" }],
        }),
        field("account", "account", {
          options: [
            {
              value: "first_name",
              label: "First",
              backend: "register.first_name",
              beluga: "beluga:firstName",
            },
          ],
        }),
        field("ship", "address_group", {
          maps_to_section: "medication_preferences",
          options: [
            {
              value: "zip",
              label: "ZIP",
              backend: "intake.medication_preferences.shipping_zip",
              beluga: "beluga:zip",
            },
          ],
        }),
      ]),
    ]);
    const bindings = collectBelugaBindings(schema, "qualify");
    const belugaKeys = bindings.map((b) => b.beluga);
    expect(belugaKeys).toContain("beluga:email");
    expect(belugaKeys).toContain("beluga:sex");
    expect(belugaKeys).toContain("beluga:firstName");
    expect(belugaKeys).toContain("beluga:zip");
  });
});

describe("buildBelugaDoctorReview", () => {
  const qualifySchema = version("qualify", "qualify", [
    step("s1", 0, [
      field("email", "email", {
        label: "Email",
        maps_to_section: "beluga:email",
      }),
      field("goal", "text", { label: "Primary goal" }),
    ]),
  ]);

  const intakeSchema = version("intake", "intake", [
    step("s1", 0, [
      field("meds", "textarea", {
        label: "Medications",
        maps_to_section: "beluga:selfReportedMeds",
      }),
      field("review_confirm", "review", { label: "Review" }),
    ]),
  ]);

  it("merges qualify and intake values for Beluga fields", () => {
    const review = buildBelugaDoctorReview({
      qualifySchema,
      qualifyResponses: { email: "a@example.com", goal: "Lose weight" },
      intakeSchema,
      intakeResponses: { meds: "None" },
      accountExtras: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "5555555555",
        dob: "01/01/1990",
        address: "123 Main St",
        city: "Denver",
        state: "CO",
        zip: "80202",
        sex: "Female",
      },
    });
    const email = review.fields.find((f) => f.beluga === "beluga:email");
    expect(email?.value).toBe("a@example.com");
    expect(email?.source).toBe("qualify");
    const meds = review.fields.find(
      (f) => f.beluga === "beluga:selfReportedMeds",
    );
    expect(meds?.value).toBe("None");
    expect(meds?.source).toBe("intake");
    expect(review.qaEntries.some((q) => q.question === "Primary goal")).toBe(
      true,
    );
  });

  it("flags required Beluga fields with no question mapping", () => {
    const review = buildBelugaDoctorReview({
      qualifySchema,
      qualifyResponses: {},
      intakeSchema,
      intakeResponses: {},
    });
    const unmapped = review.missingAssignments.map((f) => f.beluga);
    for (const required of BELUGA_VISIT_REQUIRED_MAPPINGS) {
      if (required === "beluga:email" || required === "beluga:selfReportedMeds")
        continue;
      expect(unmapped).toContain(required);
    }
  });

  it("uses account extras when responses are empty", () => {
    const review = buildBelugaDoctorReview({
      intakeSchema: version("intake", "intake", [
        step("s1", 0, [
          field("account", "account", {
            options: [
              {
                value: "first_name",
                label: "First",
                backend: "register.first_name",
                beluga: "beluga:firstName",
              },
            ],
          }),
        ]),
      ]),
      intakeResponses: {},
      accountExtras: { firstName: "Pat", lastName: "Smith" },
    });
    const first = review.fields.find((f) => f.beluga === "beluga:firstName");
    expect(first?.value).toBe("Pat");
    expect(first?.source).toBe("account");
  });

  it("resolves single-choice field-level beluga mapping", () => {
    const schema = version("qualify", "qualify", [
      step("s1", 0, [
        field("sex", "single_choice", {
          label: "Sex",
          maps_to_section: "beluga:sex",
          options: [
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ],
        }),
      ]),
    ]);
    const review = buildBelugaDoctorReview({
      qualifySchema: schema,
      qualifyResponses: { sex: "female" },
    });
    const sex = review.fields.find((f) => f.beluga === "beluga:sex");
    expect(sex?.value).toBe("Female");
  });

  it("still supports legacy per-option beluga on single choice without field mapping", () => {
    const schema = version("qualify", "qualify", [
      step("s1", 0, [
        field("sex", "single_choice", {
          label: "Sex",
          options: [
            { value: "female", label: "Female", beluga: "beluga:sex" },
            { value: "male", label: "Male", beluga: "" },
          ],
        }),
      ]),
    ]);
    const review = buildBelugaDoctorReview({
      qualifySchema: schema,
      qualifyResponses: { sex: "female" },
    });
    const sex = review.fields.find((f) => f.beluga === "beluga:sex");
    expect(sex?.value).toBe("Female");
  });

  it("buildBelugaFormObjPreview maps apiFieldId keys to values", () => {
    const review = buildBelugaDoctorReview({
      qualifySchema: version("qualify", "qualify", [
        step("s1", 0, [
          field("email", "email", {
            label: "Email",
            maps_to_section: "beluga:email",
          }),
        ]),
      ]),
      qualifyResponses: { email: "a@example.com" },
      accountExtras: { firstName: "Jane" },
    });
    const formObj = buildBelugaFormObjPreview(review);
    expect(formObj.email).toBe("a@example.com");
    expect(formObj.firstName).toBe("Jane");
    expect(formObj.dob).toBeNull();
  });
});
