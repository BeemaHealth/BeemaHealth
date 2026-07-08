import { describe, expect, it } from "vitest";
import {
  isFilled,
  isValidEmail,
  isValidPersonName,
  isValidPreferredFirstName,
  sanitizePreferredFirstName,
  isValidPhone,
  isValidShippingPreference,
  formatPhoneInput,
  normalizePhoneDigits,
  parseNonNegativeInt,
  parsePositiveNumber,
  validateAdultWeightHistory,
  validateAllergyRow,
  validateSideEffectDetail,
  validateGoalWeightLbs,
  validateHeightFt,
  validateHeightIn,
  validateMedicationRow,
  validateOptionalInsuranceProvider,
  validateOptionalMemberId,
  validateOptionalNumericLab,
  validateOptionalBloodPressure,
  validateOptionalPharmacyAddress,
  validateOptionalPharmacyPhone,
  validateStateEligibility,
  isValidOptionalMemberId,
  validateWeightLbs,
} from "@/lib/form-validation";
import {
  KNOWN_NAME_FORMAT_PASSES,
  NULL_AND_CONTROL,
  OVERFLOW,
  SQL_INJECTION,
  STRICT_FIELD_ATTACKS,
  XSS_PAYLOADS,
  maliciousEmails,
} from "./fixtures/malicious-payloads";

describe("form-validation", () => {
  describe("isFilled", () => {
    it.each([
      ["hello", true],
      ["  x  ", true],
      ["", false],
      ["   ", false],
      [null, false],
      [undefined, false],
    ])("isFilled(%j) => %s", (value, expected) => {
      expect(isFilled(value)).toBe(expected);
    });
  });

  describe("isValidEmail", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("  user.name+tag@example.co  ")).toBe(true);
    });

    it.each([
      "",
      "not-an-email",
      "missing-at.com",
      "@no-local.com",
      ...maliciousEmails(),
      ...XSS_PAYLOADS,
    ])("rejects invalid or malicious email: %j", (email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("accepts common US formats", () => {
      expect(isValidPhone("(303) 555-0100")).toBe(true);
      expect(isValidPhone("3035550100")).toBe(true);
      expect(isValidPhone("+1 303-555-0100")).toBe(true);
    });

    it.each([
      ...STRICT_FIELD_ATTACKS,
      ...NULL_AND_CONTROL,
      "123",
      "123456789012345",
    ])("rejects invalid phone: %j", (phone) => {
      expect(isValidPhone(phone)).toBe(false);
    });
  });

  describe("normalizePhoneDigits", () => {
    it("strips country code 1", () => {
      expect(normalizePhoneDigits("13035550100")).toBe("3035550100");
    });
  });

  describe("formatPhoneInput", () => {
    it("formats partial and complete US numbers", () => {
      expect(formatPhoneInput("303")).toBe("303");
      expect(formatPhoneInput("3035550")).toBe("(303) 555-0");
      expect(formatPhoneInput("3035550100")).toBe("(303) 555-0100");
    });
  });

  describe("shipping preference", () => {
    it("accepts pickup and shipping only", () => {
      expect(isValidShippingPreference("pickup")).toBe(true);
      expect(isValidShippingPreference("shipping")).toBe(true);
      expect(isValidShippingPreference("Standard")).toBe(false);
    });
  });

  describe("pharmacy and insurance optional fields", () => {
    it("validates pharmacy phone when provided", () => {
      expect(validateOptionalPharmacyPhone("")).toBeNull();
      expect(validateOptionalPharmacyPhone("(303) 555-0100")).toBeNull();
      expect(validateOptionalPharmacyPhone("' OR 1=1--")).toMatch(/phone/);
    });

    it("validates pharmacy address when provided", () => {
      expect(validateOptionalPharmacyAddress("")).toBeNull();
      expect(validateOptionalPharmacyAddress("2510 Main Street")).toBeNull();
      expect(validateOptionalPharmacyAddress("2510")).not.toBeNull();
    });

    it("validates insurance provider when provided", () => {
      expect(validateOptionalInsuranceProvider("Aetna")).toBeNull();
      expect(validateOptionalInsuranceProvider("<script>")).not.toBeNull();
    });

    it("validates member ID when provided", () => {
      expect(isValidOptionalMemberId("ABC123-45")).toBe(true);
      expect(validateOptionalMemberId("")).toBeNull();
      expect(validateOptionalMemberId("' OR 1=1--")).not.toBeNull();
    });
  });

  describe("isValidPersonName", () => {
    it("accepts normal names", () => {
      expect(isValidPersonName("Mary-Jane O'Brien")).toBe(true);
    });

    it.each(
      [...STRICT_FIELD_ATTACKS, ...XSS_PAYLOADS, "12345", "Name@corp"].filter(
        (p) =>
          !KNOWN_NAME_FORMAT_PASSES.includes(
            p as (typeof KNOWN_NAME_FORMAT_PASSES)[number],
          ),
      ),
    )("rejects malicious or invalid names: %j", (name) => {
      expect(isValidPersonName(name)).toBe(false);
    });

    it.each(KNOWN_NAME_FORMAT_PASSES)(
      "documents format-only pass for name %j (DB must parameterize)",
      (name) => {
        expect(isValidPersonName(name)).toBe(true);
      },
    );
  });

  describe("preferred first name", () => {
    it("accepts letters only and empty optional value", () => {
      expect(isValidPreferredFirstName("")).toBe(true);
      expect(isValidPreferredFirstName("Matt")).toBe(true);
    });

    it("rejects spaces, numbers, and symbols", () => {
      expect(isValidPreferredFirstName("matt a")).toBe(false);
      expect(isValidPreferredFirstName("matt1")).toBe(false);
      expect(isValidPreferredFirstName("matt!")).toBe(false);
    });

    it("sanitizePreferredFirstName strips non-letters", () => {
      expect(sanitizePreferredFirstName("matt123")).toBe("matt");
      expect(sanitizePreferredFirstName(" Mary-Jane ")).toBe("MaryJane");
    });
  });

  describe("numeric parsers", () => {
    it.each(SQL_INJECTION)(
      "parsePositiveNumber rejects injection %j",
      (payload) => {
        expect(parsePositiveNumber(payload)).toBeNull();
      },
    );

    it.each(["190", " 210.5 "])("parsePositiveNumber accepts %j", (value) => {
      expect(parsePositiveNumber(value)).not.toBeNull();
    });

    it("parseNonNegativeInt enforces max", () => {
      expect(parseNonNegativeInt("12", 11)).toBeNull();
      expect(parseNonNegativeInt("8", 11)).toBe(8);
    });

    it.each(SQL_INJECTION)("parseNonNegativeInt rejects %j", (payload) => {
      expect(parseNonNegativeInt(payload)).toBeNull();
    });
  });

  describe("validateHeightFt / validateHeightIn", () => {
    it("accepts valid height", () => {
      expect(validateHeightFt("5")).toBeNull();
      expect(validateHeightIn("8")).toBeNull();
    });

    it.each(SQL_INJECTION)("validateHeightFt rejects %j", (payload) => {
      expect(validateHeightFt(payload)).not.toBeNull();
    });

    it.each(SQL_INJECTION)("validateHeightIn rejects %j", (payload) => {
      expect(validateHeightIn(payload)).not.toBeNull();
    });
  });

  describe("validateWeightLbs", () => {
    it("accepts in-range weights", () => {
      expect(validateWeightLbs("190")).toBeNull();
    });

    it("rejects out of range", () => {
      expect(validateWeightLbs("25")).not.toBeNull();
      expect(validateWeightLbs("5000")).not.toBeNull();
    });

    it.each(SQL_INJECTION)("rejects injection %j", (payload) => {
      expect(validateWeightLbs(payload)).not.toBeNull();
    });
  });

  describe("validateGoalWeightLbs", () => {
    it("requires goal below current", () => {
      expect(validateGoalWeightLbs("190", "200")).not.toBeNull();
      expect(validateGoalWeightLbs("190", "160")).toBeNull();
    });
  });

  describe("validateAdultWeightHistory", () => {
    it("accepts consistent history", () => {
      expect(validateAdultWeightHistory("220", "165", "190")).toBeNull();
    });

    it("rejects lowest > highest", () => {
      expect(validateAdultWeightHistory("165", "220", "190")).not.toBeNull();
    });

    it.each(SQL_INJECTION)(
      "rejects injection in highest weight %j",
      (payload) => {
        expect(
          validateAdultWeightHistory(payload, "165", "190"),
        ).not.toBeNull();
      },
    );
  });

  describe("validateMedicationRow", () => {
    it("requires name, dose, frequency", () => {
      expect(
        validateMedicationRow({
          name: "Metformin",
          dose: "500mg",
          frequency: "Daily",
        }),
      ).toBeNull();
      expect(
        validateMedicationRow({ name: "", dose: "500mg", frequency: "Daily" }),
      ).not.toBeNull();
    });

    it("allows free-text dose containing SQL (stored as literal JSON)", () => {
      const payload = SQL_INJECTION[0];
      expect(
        validateMedicationRow({
          name: "Drug",
          dose: payload,
          frequency: "Daily",
        }),
      ).toBeNull();
    });
  });

  describe("validateAllergyRow", () => {
    it("requires allergy and reaction", () => {
      expect(
        validateAllergyRow({ allergy: "Penicillin", reaction: "Hives" }),
      ).toBeNull();
      expect(
        validateAllergyRow({ allergy: "", reaction: "Hives" }),
      ).not.toBeNull();
    });
  });

  describe("validateSideEffectDetail", () => {
    it("requires a description", () => {
      expect(validateSideEffectDetail("")).not.toBeNull();
      expect(validateSideEffectDetail("Mild headache")).toBeNull();
    });

    it.each(XSS_PAYLOADS)("rejects unsafe detail %j", (payload) => {
      expect(validateSideEffectDetail(payload)).not.toBeNull();
    });
  });

  describe("validateOptionalNumericLab", () => {
    it("allows empty optional labs", () => {
      expect(validateOptionalNumericLab("", "A1C")).toBeNull();
      expect(validateOptionalNumericLab("", "glucose")).toBeNull();
      expect(validateOptionalNumericLab("", "cholesterol")).toBeNull();
    });

    it("accepts numeric values for A1C, glucose, and cholesterol", () => {
      expect(validateOptionalNumericLab("5.6", "A1C")).toBeNull();
      expect(validateOptionalNumericLab("95", "glucose")).toBeNull();
      expect(validateOptionalNumericLab("180", "cholesterol")).toBeNull();
    });

    it("rejects non-numeric lab values", () => {
      expect(validateOptionalNumericLab("not-a-number", "A1C")).not.toBeNull();
      expect(validateOptionalNumericLab("abc", "glucose")).not.toBeNull();
      expect(validateOptionalNumericLab("bad", "cholesterol")).not.toBeNull();
    });

    it.each(SQL_INJECTION)("rejects injection in lab field %j", (payload) => {
      expect(validateOptionalNumericLab(payload, "glucose")).not.toBeNull();
    });
  });

  describe("validateStateEligibility", () => {
    it("allows empty state", () => {
      expect(validateStateEligibility("")).toBeNull();
    });

    it("allows eligible states", () => {
      expect(validateStateEligibility("California")).toBeNull();
      expect(validateStateEligibility("CO")).toBeNull();
    });

    it("rejects excluded states by name or abbreviation", () => {
      expect(validateStateEligibility("Kansas")).not.toBeNull();
      expect(validateStateEligibility("KS")).not.toBeNull();
      expect(validateStateEligibility("New Mexico")).not.toBeNull();
      expect(validateStateEligibility("NM")).not.toBeNull();
      expect(validateStateEligibility("West Virginia")).not.toBeNull();
      expect(validateStateEligibility("WV")).not.toBeNull();
    });
  });

  describe("validateOptionalBloodPressure", () => {
    it("allows empty optional blood pressure", () => {
      expect(validateOptionalBloodPressure("")).toBeNull();
    });

    it("accepts systolic/diastolic format", () => {
      expect(validateOptionalBloodPressure("120/80")).toBeNull();
      expect(validateOptionalBloodPressure("157/32")).toBeNull();
      expect(validateOptionalBloodPressure("120 / 80")).toBeNull();
    });

    it("rejects plain numbers and injection strings", () => {
      expect(validateOptionalBloodPressure("120")).not.toBeNull();
      expect(validateOptionalBloodPressure(SQL_INJECTION[0])).not.toBeNull();
    });

    it("rejects when systolic is not higher than diastolic", () => {
      expect(validateOptionalBloodPressure("80/120")).not.toBeNull();
    });
  });

  describe("overflow handling", () => {
    it.each(OVERFLOW)(
      "very long numeric strings fail weight validation: %j",
      (payload) => {
        expect(validateWeightLbs(payload)).not.toBeNull();
      },
    );
  });
});
