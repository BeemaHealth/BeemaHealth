import { describe, expect, it } from "vitest";
import {
  belugaMappingToApiFieldId,
  belugaMappingToFieldKey,
  isValidFieldKey,
  normalizeFieldKeyInput,
  uniqueAmong,
} from "@/components/questionnaire/builder/field-catalog";

describe("beluga field catalog helpers", () => {
  it("extracts API property names from beluga mappings", () => {
    expect(belugaMappingToApiFieldId("beluga:firstName")).toBe("firstName");
    expect(belugaMappingToApiFieldId("beluga:selfReportedMeds")).toBe(
      "selfReportedMeds",
    );
    expect(belugaMappingToApiFieldId("")).toBe("");
  });

  it("converts beluga mappings to snake_case field keys", () => {
    expect(belugaMappingToFieldKey("beluga:firstName")).toBe("first_name");
    expect(belugaMappingToFieldKey("beluga:selfReportedMeds")).toBe(
      "self_reported_meds",
    );
  });

  it("picks a unique id when the base is taken", () => {
    const used = new Set(["firstName", "firstName_2"]);
    expect(uniqueAmong("firstName", used)).toBe("firstName_3");
    expect(uniqueAmong("email", new Set())).toBe("email");
  });

  it("defaults dob mapping to beluga:dob", async () => {
    const { defaultMapsToForType } =
      await import("@/components/questionnaire/builder/field-catalog");
    expect(defaultMapsToForType("dob")).toBe("beluga:dob");
  });

  it("normalizes field id input", () => {
    expect(normalizeFieldKeyInput("  Medical Conditions ")).toBe(
      "medical_conditions",
    );
    expect(normalizeFieldKeyInput("type-2-diabetes")).toBe("type_2_diabetes");
  });

  it("validates field id format", () => {
    expect(isValidFieldKey("medical_conditions")).toBe(true);
    expect(isValidFieldKey("medical_conditions_2")).toBe(true);
    expect(isValidFieldKey("_bad")).toBe(false);
    expect(isValidFieldKey("")).toBe(false);
  });
});
