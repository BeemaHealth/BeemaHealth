import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import { BELUGA_FIELD_OPTIONS } from "@/components/questionnaire/builder/field-catalog";
import { backendLabelForValue } from "@/lib/questionnaire/account-mappings";

/** Address parts returned by Nominatim and stored on the field value. */
export const ADDRESS_SUB_FIELDS = [
  { key: "address", label: "Street address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP code" },
  { key: "county", label: "County" },
  { key: "country", label: "Country" },
  { key: "verified", label: "Verified flag" },
] as const;

export type AddressSubFieldKey = (typeof ADDRESS_SUB_FIELDS)[number]["key"];

export type AddressSubFieldMapping = {
  key: AddressSubFieldKey;
  label: string;
  backend: string;
  beluga: string;
};

/** Aretide intake / profile targets for address sub-fields. */
export const ADDRESS_BACKEND_FIELD_OPTIONS = [
  { value: "", label: "— none —" },
  { value: "intake.identity.address", label: "Intake · identity · street" },
  { value: "intake.identity.city", label: "Intake · identity · city" },
  { value: "intake.identity.state", label: "Intake · identity · state" },
  { value: "intake.identity.zip", label: "Intake · identity · ZIP" },
  { value: "intake.identity.county", label: "Intake · identity · county" },
  { value: "intake.identity.country", label: "Intake · identity · country" },
  {
    value: "intake.identity.address_verified",
    label: "Intake · identity · verified",
  },
  {
    value: "intake.medication_preferences.shipping_address",
    label: "Intake · shipping · street",
  },
  {
    value: "intake.medication_preferences.shipping_city",
    label: "Intake · shipping · city",
  },
  {
    value: "intake.medication_preferences.shipping_state",
    label: "Intake · shipping · state",
  },
  {
    value: "intake.medication_preferences.shipping_zip",
    label: "Intake · shipping · ZIP",
  },
  {
    value: "intake.medication_preferences.shipping_county",
    label: "Intake · shipping · county",
  },
  {
    value: "intake.medication_preferences.shipping_country",
    label: "Intake · shipping · country",
  },
  {
    value: "intake.medication_preferences.shipping_address_verified",
    label: "Intake · shipping · verified",
  },
  {
    value: "intake.medication_preferences.use_different_shipping_address",
    label: "Intake · shipping · use different address",
  },
  { value: "user.state", label: "User profile · state" },
] as const;

const ADDRESS_SUB_FIELD_KEYS = new Set<string>(
  ADDRESS_SUB_FIELDS.map((f) => f.key),
);

const IDENTITY_BACKEND_DEFAULTS: Record<AddressSubFieldKey, string> = {
  address: "intake.identity.address",
  city: "intake.identity.city",
  state: "intake.identity.state",
  zip: "intake.identity.zip",
  county: "intake.identity.county",
  country: "intake.identity.country",
  verified: "intake.identity.address_verified",
};

const SHIPPING_BACKEND_DEFAULTS: Record<AddressSubFieldKey, string> = {
  address: "intake.medication_preferences.shipping_address",
  city: "intake.medication_preferences.shipping_city",
  state: "intake.medication_preferences.shipping_state",
  zip: "intake.medication_preferences.shipping_zip",
  county: "intake.medication_preferences.shipping_county",
  country: "intake.medication_preferences.shipping_country",
  verified: "intake.medication_preferences.shipping_address_verified",
};

const ADDRESS_BELUGA_DEFAULTS: Record<AddressSubFieldKey, string> = {
  address: "beluga:address",
  city: "beluga:city",
  state: "beluga:state",
  zip: "beluga:zip",
  county: "",
  country: "",
  verified: "",
};

export function isShippingAddressSection(mapsToSection: string): boolean {
  return mapsToSection.trim() === "medication_preferences";
}

export function presetAddressMappings(
  mapsToSection = "medication_preferences",
): AddressSubFieldMapping[] {
  const backendDefaults = isShippingAddressSection(mapsToSection)
    ? SHIPPING_BACKEND_DEFAULTS
    : IDENTITY_BACKEND_DEFAULTS;
  return ADDRESS_SUB_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    backend: backendDefaults[f.key],
    beluga: ADDRESS_BELUGA_DEFAULTS[f.key],
  }));
}

export function defaultAddressMappings(
  mapsToSection = "medication_preferences",
): AddressSubFieldMapping[] {
  return presetAddressMappings(mapsToSection);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAddressMappings(
  field: Pick<
    QuestionnaireFieldSchema,
    "field_type" | "options" | "maps_to_section"
  >,
): AddressSubFieldMapping[] {
  const section = field.maps_to_section ?? "medication_preferences";
  const defaults = defaultAddressMappings(section);
  if (field.field_type !== "address_group" || !Array.isArray(field.options)) {
    return defaults;
  }
  const byKey = new Map<AddressSubFieldKey, AddressSubFieldMapping>();
  for (const row of field.options) {
    if (!isRecord(row)) continue;
    const key = String(row.value ?? "").trim();
    if (!ADDRESS_SUB_FIELD_KEYS.has(key)) continue;
    byKey.set(key as AddressSubFieldKey, {
      key: key as AddressSubFieldKey,
      label: String(row.label ?? key).trim() || key,
      backend: String(row.backend ?? "").trim(),
      beluga: String(row.beluga ?? "").trim(),
    });
  }
  return defaults.map((d) => byKey.get(d.key) ?? d);
}

export function serializeAddressMappings(
  mappings: AddressSubFieldMapping[],
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

export function addressBackendLabelForValue(value: string): string {
  const match = ADDRESS_BACKEND_FIELD_OPTIONS.find(
    (o) => o.value === value,
  )?.label;
  return match ?? backendLabelForValue(value);
}

export function belugaLabelForValue(value: string): string {
  const match = BELUGA_FIELD_OPTIONS.find((o) => o.value === value)?.label;
  return match ?? (value || "— none —");
}
