import { describe, expect, it } from "vitest";
import {
  evaluateVisibilityRule,
  fieldIsRequired,
  validateFieldValue,
  validateStepFields,
} from "@/lib/questionnaire/validation";
import type {
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
} from "@/lib/api/client";

describe("questionnaire validation", () => {
  it("evaluates eq visibility rule", () => {
    const visible = evaluateVisibilityRule(
      { when: { field: "sex", op: "eq", value: "female" } },
      { sex: "female" },
    );
    expect(visible).toBe(true);
  });

  it("rejects invalid email", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "email",
      field_type: "email",
      label: "Email",
      required: true,
    };
    expect(validateFieldValue(field, "bad", {})).toMatch(/valid email/i);
  });

  it("accepts valid email", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "email",
      field_type: "email",
      label: "Email",
      required: true,
    };
    expect(validateFieldValue(field, "user@example.com", {})).toBeNull();
  });

  it("requires verified address_group", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "home_address",
      field_type: "address_group",
      label: "Home address",
      required: true,
    };
    expect(
      validateFieldValue(
        field,
        {
          address: "123 Main St",
          city: "Denver",
          state: "Arizona",
          zip: "80202",
          county: "Denver County",
          country: "US",
          verified: false,
        },
        {},
      ),
    ).toMatch(/verify/i);
  });

  it("blocks advancing when a required field is empty", () => {
    const step: QuestionnaireStepSchema = {
      step_key: "goals",
      sort_order: 0,
      title: "Goals",
      fields: [
        {
          field_key: "weight_lbs",
          field_type: "number",
          label: "Weight (lbs)",
          required: true,
        },
      ],
    };
    expect(validateStepFields(step, {})).toEqual({
      weight_lbs: "Weight (lbs) is required.",
    });
  });

  it("allows empty optional fields", () => {
    const step: QuestionnaireStepSchema = {
      step_key: "notes",
      sort_order: 0,
      title: "Notes",
      fields: [
        {
          field_key: "notes",
          field_type: "text",
          label: "Notes",
          required: false,
        },
      ],
    };
    expect(validateStepFields(step, {})).toEqual({});
  });

  it("treats validation_rules required as required", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "med",
      field_type: "text",
      label: "Medication",
      required: false,
      validation_rules: [{ type: "required" }],
    };
    expect(fieldIsRequired(field)).toBe(true);
    expect(validateFieldValue(field, "", {})).toMatch(/required/i);
  });

  it("requires at least one multi_choice selection", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "symptoms",
      field_type: "multi_choice",
      label: "Symptoms",
      required: true,
    };
    expect(validateFieldValue(field, [], {})).toMatch(/required/i);
  });

  it("requires confirmation for a required review field", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "review_confirm",
      field_type: "review",
      label: "Review your answers",
      required: true,
    };
    expect(validateFieldValue(field, undefined, {})).toMatch(/confirm/i);
    expect(validateFieldValue(field, false, {})).toMatch(/confirm/i);
    expect(validateFieldValue(field, true, {})).toBeNull();
  });

  it("treats an optional review field as always valid", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "review_confirm",
      field_type: "review",
      label: "Review your answers",
      required: false,
    };
    expect(validateFieldValue(field, undefined, {})).toBeNull();
  });

  it("treats the legacy intake_review plugin like a review field", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "intake_review",
      field_type: "plugin",
      plugin_id: "intake_review",
      label: "Review",
      required: true,
    };
    expect(validateFieldValue(field, undefined, {})).toMatch(/confirm/i);
    expect(validateFieldValue(field, true, {})).toBeNull();
  });

  it("requires agreement for a required legal_consent field", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "legal_consent",
      field_type: "legal_consent",
      label: "Legal agreements",
      required: true,
    };
    expect(validateFieldValue(field, undefined, {})).toMatch(/agree/i);
    expect(validateFieldValue(field, false, {})).toMatch(/agree/i);
    expect(validateFieldValue(field, true, {})).toBeNull();
  });

  it("validates dob fields as ISO dates and requires 18+", () => {
    const field: QuestionnaireFieldSchema = {
      field_key: "dob",
      field_type: "dob",
      label: "Date of birth",
      required: true,
    };
    expect(validateFieldValue(field, "", {})).toMatch(/required/i);
    expect(validateFieldValue(field, "2015-01-01", {})).toMatch(/18 or older/i);
    expect(validateFieldValue(field, "1990-01-15", {})).toBeNull();
    expect(validateFieldValue(field, "<script>alert(1)</script>", {})).toMatch(
      /valid/i,
    );
  });
});
