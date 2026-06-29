import { describe, expect, it } from "vitest";
import { getBelugaExpectedType } from "@/lib/questionnaire/beluga-field-types";

describe("beluga field types", () => {
  it("returns known types for visit payload fields", () => {
    expect(getBelugaExpectedType("firstName").kind).toBe("string");
    expect(getBelugaExpectedType("dob").kind).toBe("date");
    expect(getBelugaExpectedType("sex").kind).toBe("enum");
    expect(getBelugaExpectedType("consentsSigned").kind).toBe("boolean");
    expect(getBelugaExpectedType("intakeResults").kind).toBe("array");
  });

  it("defaults unknown keys to free-text string", () => {
    const unknown = getBelugaExpectedType("customField");
    expect(unknown.kind).toBe("string");
    expect(unknown.description).toMatch(/free-text/i);
  });

  it("marks meds/allergies/conditions as dedicated string fields", () => {
    for (const key of [
      "selfReportedMeds",
      "allergies",
      "medicalConditions",
    ] as const) {
      const type = getBelugaExpectedType(key);
      expect(type.kind).toBe("string");
      expect(type.description).toMatch(/not intakeResults/i);
    }
  });
});
