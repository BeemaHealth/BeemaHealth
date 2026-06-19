import { describe, expect, it } from "vitest";
import {
  getApplicableIntakeStepIndices,
  isPregnancyIntakeStepApplicable,
  needsReproductiveQuestions,
  nextApplicableIntakeStep,
  PREGNANCY_INTAKE_STEP,
  prevApplicableIntakeStep,
} from "@/lib/reproductive-intake";

describe("reproductive-intake", () => {
  describe("needsReproductiveQuestions", () => {
    it("skips only when male at birth and male identity", () => {
      expect(needsReproductiveQuestions("male", "male")).toBe(false);
    });

    it("shows when male at birth and female identity", () => {
      expect(needsReproductiveQuestions("male", "female")).toBe(true);
    });

    it("shows when female at birth regardless of identity", () => {
      expect(needsReproductiveQuestions("female", "male")).toBe(true);
      expect(needsReproductiveQuestions("female", "female")).toBe(true);
    });

    it("skips when male at birth and identity missing (legacy accounts)", () => {
      expect(needsReproductiveQuestions("male", "")).toBe(false);
      expect(needsReproductiveQuestions("male", null)).toBe(false);
    });

    it("shows conservatively for intersex, unknown, or both empty", () => {
      expect(needsReproductiveQuestions("intersex", "male")).toBe(true);
      expect(needsReproductiveQuestions("male", "unknown")).toBe(true);
      expect(needsReproductiveQuestions("", "")).toBe(true);
    });
  });

  describe("intake step navigation", () => {
    const total = 12;

    it("excludes step 7 for male at birth when gender identity is missing", () => {
      const eligibility = {
        sex_assigned_at_birth: "male" as const,
        gender_identity: "" as const,
      };
      expect(isPregnancyIntakeStepApplicable(eligibility)).toBe(false);
    });

    it("excludes step 7 for male/male eligibility", () => {
      const eligibility = {
        sex_assigned_at_birth: "male" as const,
        gender_identity: "male" as const,
      };
      expect(isPregnancyIntakeStepApplicable(eligibility)).toBe(false);
      expect(getApplicableIntakeStepIndices(eligibility, total)).not.toContain(
        PREGNANCY_INTAKE_STEP,
      );
      expect(nextApplicableIntakeStep(6, eligibility, total)).toBe(8);
      expect(prevApplicableIntakeStep(8, eligibility, total)).toBe(6);
    });

    it("includes step 7 for female at birth", () => {
      const eligibility = {
        sex_assigned_at_birth: "female" as const,
        gender_identity: "female" as const,
      };
      expect(getApplicableIntakeStepIndices(eligibility, total)).toContain(
        PREGNANCY_INTAKE_STEP,
      );
    });
  });
});
