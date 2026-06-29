export const NO_VENDOR_FIELDS: ReadonlyArray<{ value: string; label: string }> =
  [{ value: "", label: "— no vendor assigned —" }];

/** Beluga Health API field mappings for intake questionnaire fields. */
export const BELUGA_FIELD_OPTIONS = [
  { value: "", label: "— none —" },
  { value: "beluga:firstName", label: "First name" },
  { value: "beluga:lastName", label: "Last name" },
  { value: "beluga:dob", label: "Date of birth" },
  { value: "beluga:phone", label: "Phone" },
  { value: "beluga:email", label: "Email" },
  { value: "beluga:address", label: "Street address" },
  { value: "beluga:city", label: "City" },
  { value: "beluga:state", label: "State" },
  { value: "beluga:zip", label: "ZIP" },
  { value: "beluga:sex", label: "Sex (Male/Female/Other)" },
  { value: "beluga:selfReportedMeds", label: "Self-reported medications" },
  { value: "beluga:allergies", label: "Allergies" },
  { value: "beluga:medicalConditions", label: "Medical conditions" },
  { value: "beluga:consentsSigned", label: "Consents signed" },
] as const;

const BELUGA_PREFIX = "beluga:";

/** Beluga visit payload property name (e.g. `beluga:firstName` → `firstName`). */
export function belugaMappingToApiFieldId(beluga: string): string {
  const trimmed = beluga.trim();
  if (!trimmed.startsWith(BELUGA_PREFIX)) return "";
  return trimmed.slice(BELUGA_PREFIX.length);
}

/** Snake_case field key for Aretide storage (e.g. `firstName` → `first_name`). */
export function belugaMappingToFieldKey(beluga: string): string {
  const apiId = belugaMappingToApiFieldId(beluga);
  if (!apiId) return "";
  return apiId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function uniqueAmong(base: string, used: Set<string>): string {
  if (!base || !used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

const FIELD_KEY_RE = /^[a-z0-9][a-z0-9_]*$/;

/** Normalize staff input into a snake_case field id candidate. */
export function normalizeFieldKeyInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
}

export function isValidFieldKey(value: string): boolean {
  return FIELD_KEY_RE.test(value);
}

/** Field types staff can add to a questionnaire step. */
export const QUESTION_FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dob", label: "Date of birth" },
  { value: "date", label: "Date" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Single choice" },
  { value: "multi_choice", label: "Multi choice" },
  { value: "address_group", label: "Shipping address (Nominatim)" },
  { value: "account", label: "Account (email & password)" },
  { value: "review", label: "Review & confirm answers" },
  { value: "legal_consent", label: "TOS / Privacy / Telehealth consent" },
] as const;

export type QuestionFieldType = (typeof QUESTION_FIELD_TYPES)[number]["value"];

export function defaultFieldKeyForType(
  fieldType: QuestionFieldType,
  existingKeys: Set<string>,
): string {
  const base =
    fieldType === "account"
      ? "account"
      : fieldType === "address_group"
        ? "shipping_address"
        : fieldType === "review"
          ? "review_confirm"
          : fieldType === "legal_consent"
            ? "legal_consent"
            : fieldType === "dob"
              ? "dob"
              : `field_${existingKeys.size + 1}`;
  if (!existingKeys.has(base)) return base;
  let n = 2;
  while (existingKeys.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export function defaultLabelForType(fieldType: QuestionFieldType): string {
  switch (fieldType) {
    case "account":
      return "Create your account";
    case "address_group":
      return "Shipping address";
    case "review":
      return "Review your answers";
    case "legal_consent":
      return "Legal agreements";
    case "dob":
      return "Date of birth";
    case "yes_no":
      return "Yes or no";
    case "single_choice":
      return "Choose one";
    case "multi_choice":
      return "Choose all that apply";
    default:
      return "Question";
  }
}

export function defaultMapsToForType(fieldType: QuestionFieldType): string {
  if (fieldType === "address_group") return "medication_preferences";
  if (fieldType === "dob") return "beluga:dob";
  return "";
}
