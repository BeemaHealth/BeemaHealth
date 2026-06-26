/** Beluga `formObj` field type expectations (see docs/vendor/BELUGA_API.md). */
export type BelugaExpectedType = {
  /** Short label for dev tables (string, enum, array, …). */
  kind: string;
  /** Human-readable constraint from the Beluga API spec. */
  description: string;
};

/**
 * Expected payload types for Beluga visit `formObj` keys.
 * Meds/allergies/conditions are dedicated string fields — not intakeResults Q/A.
 */
export const BELUGA_FORM_OBJ_FIELD_TYPES: Record<string, BelugaExpectedType> = {
  consentsSigned: {
    kind: "boolean",
    description: "Boolean — whether required consents were signed",
  },
  firstName: { kind: "string", description: "String (max 100 chars)" },
  lastName: { kind: "string", description: "String (max 100 chars)" },
  dob: { kind: "date", description: "MM/DD/YYYY" },
  phone: { kind: "string", description: "String (10 digits, no formatting)" },
  email: { kind: "string", description: "String" },
  address: { kind: "string", description: "Street address string" },
  city: { kind: "string", description: "String" },
  state: { kind: "string", description: "US state string" },
  zip: { kind: "string", description: "ZIP string" },
  sex: { kind: "enum", description: "Male | Female | Other" },
  selfReportedMeds: {
    kind: "string",
    description: "Free-text string — use this field only, not intakeResults",
  },
  allergies: {
    kind: "string",
    description: "Free-text string — use this field only, not intakeResults",
  },
  medicalConditions: {
    kind: "string",
    description: "Free-text string — use this field only, not intakeResults",
  },
  patientPreference: {
    kind: "array",
    description: "Array of { name, strength, quantity, refills, medId }",
  },
  currentDose: { kind: "string", description: "String (autoRx refill flows)" },
  nextDose: { kind: "string", description: "String (autoRx refill flows)" },
  checkinResult: {
    kind: "enum",
    description: "staythesame | increase | decrease (autoRx)",
  },
  intakeResults: {
    kind: "array",
    description:
      "Array of { question, answer } — exclude meds/allergies/conditions",
  },
};

export function getBelugaExpectedType(apiFieldId: string): BelugaExpectedType {
  return (
    BELUGA_FORM_OBJ_FIELD_TYPES[apiFieldId] ?? {
      kind: "string",
      description: "Free-text string",
    }
  );
}
