import { describe, expect, it } from "vitest";
import {
  evaluateVisibilityRule,
  validateFieldValue,
} from "@/lib/questionnaire/validation";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";

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
});
