import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import { BELUGA_FIELD_OPTIONS } from "@/components/questionnaire/builder/field-catalog";

/** Sub-fields rendered inside an account component. */
export const ACCOUNT_SUB_FIELDS = [
  { key: "first_name", label: "Legal first name" },
  { key: "last_name", label: "Legal last name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "password", label: "Password" },
  { key: "confirm_password", label: "Re-enter password" },
] as const;

export type AccountSubFieldKey = (typeof ACCOUNT_SUB_FIELDS)[number]["key"];

export type AccountSubFieldMapping = {
  key: AccountSubFieldKey;
  label: string;
  backend: string;
  beluga: string;
};

/** Aretide backend targets for account signup / user profile fields. */
export const BACKEND_FIELD_OPTIONS = [
  { value: "", label: "— none —" },
  { value: "register.first_name", label: "Register API · first name" },
  { value: "register.last_name", label: "Register API · last name" },
  { value: "register.email", label: "Register API · email" },
  { value: "register.phone", label: "Register API · phone" },
  { value: "register.password", label: "Register API · password" },
  { value: "user.first_name", label: "User profile · first name" },
  { value: "user.last_name", label: "User profile · last name" },
  { value: "user.email", label: "User profile · email" },
  { value: "user.phone", label: "User profile · phone" },
] as const;

const ACCOUNT_SUB_FIELD_KEYS = new Set<string>(
  ACCOUNT_SUB_FIELDS.map((f) => f.key),
);

/** Fixed Django register API targets — not staff-configurable. */
const ACCOUNT_BACKEND_DEFAULTS: Record<AccountSubFieldKey, string> = {
  first_name: "register.first_name",
  last_name: "register.last_name",
  phone: "register.phone",
  email: "register.email",
  password: "register.password",
  confirm_password: "",
};

/** Default Beluga mappings for new account fields (staff can override). */
const ACCOUNT_BELUGA_DEFAULTS: Record<AccountSubFieldKey, string> = {
  first_name: "beluga:firstName",
  last_name: "beluga:lastName",
  phone: "beluga:phone",
  email: "beluga:email",
  password: "",
  confirm_password: "",
};

export function presetAccountMappings(): AccountSubFieldMapping[] {
  return ACCOUNT_SUB_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    backend: ACCOUNT_BACKEND_DEFAULTS[f.key],
    beluga: ACCOUNT_BELUGA_DEFAULTS[f.key],
  }));
}

export function defaultAccountMappings(): AccountSubFieldMapping[] {
  return presetAccountMappings();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse persisted `options` on an account field into mapping rows. */
export function parseAccountMappings(
  field: Pick<QuestionnaireFieldSchema, "field_type" | "options">,
): AccountSubFieldMapping[] {
  const defaults = defaultAccountMappings();
  if (field.field_type !== "account" || !Array.isArray(field.options)) {
    return defaults;
  }
  const byKey = new Map<AccountSubFieldKey, AccountSubFieldMapping>();
  for (const row of field.options) {
    if (!isRecord(row)) continue;
    const key = String(row.value ?? "").trim();
    if (!ACCOUNT_SUB_FIELD_KEYS.has(key)) continue;
    byKey.set(key as AccountSubFieldKey, {
      key: key as AccountSubFieldKey,
      label: String(row.label ?? key).trim() || key,
      backend: String(row.backend ?? "").trim(),
      beluga: String(row.beluga ?? "").trim(),
    });
  }
  return defaults.map((d) => byKey.get(d.key) ?? d);
}

/** Serialize mapping rows for the questionnaire field `options` JSON. */
export function serializeAccountMappings(
  mappings: AccountSubFieldMapping[],
): Array<{
  value: string;
  label: string;
  backend: string;
  beluga: string;
}> {
  return mappings.map((m) => ({
    value: m.key,
    label: m.label,
    backend: m.backend,
    beluga: m.beluga,
  }));
}

export function belugaLabelForValue(value: string): string {
  const match = BELUGA_FIELD_OPTIONS.find((o) => o.value === value)?.label;
  return match ?? (value || "— none —");
}

export function backendLabelForValue(value: string): string {
  const match = BACKEND_FIELD_OPTIONS.find((o) => o.value === value)?.label;
  return match ?? (value || "— none —");
}
