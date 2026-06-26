import { describe, expect, it } from "vitest";
import {
  emptyRegistrationFields,
  isRegistrationStep,
  validateRegistrationFields,
} from "@/lib/questionnaire/registration";
import type { QuestionnaireStepSchema } from "@/lib/api/client";

function step(
  fields: QuestionnaireStepSchema["fields"],
): QuestionnaireStepSchema {
  return { step_key: "s", sort_order: 0, title: "Step", fields };
}

describe("registration step detection", () => {
  it("detects the account field type", () => {
    const s = step([
      {
        field_key: "account",
        field_type: "account",
        label: "Create your account",
      },
    ]);
    expect(isRegistrationStep(s)).toBe(true);
  });

  it("detects the account_registration plugin", () => {
    const s = step([
      {
        field_key: "account_registration",
        field_type: "plugin",
        label: "Account",
        plugin_id: "account_registration",
      },
    ]);
    expect(isRegistrationStep(s)).toBe(true);
  });

  it("detects an email + password pair", () => {
    const s = step([
      { field_key: "email", field_type: "email", label: "Email" },
      { field_key: "password", field_type: "password", label: "Password" },
    ]);
    expect(isRegistrationStep(s)).toBe(true);
  });

  it("ignores a plain question step", () => {
    const s = step([
      { field_key: "weight", field_type: "number", label: "Weight" },
    ]);
    expect(isRegistrationStep(s)).toBe(false);
  });

  it("ignores email without password", () => {
    const s = step([
      { field_key: "email", field_type: "email", label: "Email" },
    ]);
    expect(isRegistrationStep(s)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRegistrationStep(null)).toBe(false);
  });
});

describe("registration field validation", () => {
  const valid = {
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "(555) 123-4567",
    email: "ada@example.com",
    password: "supersecret123",
    confirmPassword: "supersecret123",
  };

  it("accepts a complete set of fields", () => {
    expect(validateRegistrationFields(valid)).toBeNull();
  });

  it("rejects empty required fields", () => {
    expect(validateRegistrationFields(emptyRegistrationFields())).toMatch(
      /first name/i,
    );
  });

  it("rejects an invalid email", () => {
    expect(
      validateRegistrationFields({ ...valid, email: "not-an-email" }),
    ).toMatch(/valid email/i);
  });

  it("rejects a short password", () => {
    expect(
      validateRegistrationFields({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }),
    ).toMatch(/at least 10/i);
  });

  it("rejects mismatched passwords", () => {
    expect(
      validateRegistrationFields({ ...valid, confirmPassword: "different123" }),
    ).toMatch(/do not match/i);
  });
});
