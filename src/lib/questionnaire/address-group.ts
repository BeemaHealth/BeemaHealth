import {
  isAddressReadyForVerification,
  isValidCounty,
} from "@/lib/address-validation";
import { normalizeUsState } from "@/lib/us-states";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import type { MedicalIntake } from "@/lib/types/mvp";
import {
  emptyShippingAddressValue,
  type ShippingAddressValue,
} from "@/lib/shipping-address";

export type AddressGroupValue = ShippingAddressValue;

export function emptyAddressGroupValue(): AddressGroupValue {
  return emptyShippingAddressValue();
}

export function parseAddressGroupValue(
  value: unknown,
): AddressGroupValue | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    address: String(v.address ?? ""),
    city: String(v.city ?? ""),
    state: String(v.state ?? ""),
    zip: String(v.zip ?? ""),
    county: String(v.county ?? ""),
    country: String(v.country ?? ""),
    verified: v.verified === true || v.verified === "true",
  };
}

/** Map address_group value into canonical intake section keys. */
export function flattenAddressGroupForSection(
  value: unknown,
  section: string,
): Record<string, string> {
  const parsed = parseAddressGroupValue(value);
  if (!parsed) return {};

  if (section === "medication_preferences") {
    return {
      use_different_shipping_address: "true",
      shipping_address: parsed.address,
      shipping_city: parsed.city,
      shipping_state: parsed.state,
      shipping_zip: parsed.zip,
      shipping_county: parsed.county,
      shipping_country: parsed.country || "US",
      shipping_address_verified: parsed.verified ? "true" : "",
    };
  }

  return {
    address: parsed.address,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip,
    county: parsed.county,
    country: parsed.country || "US",
    address_verified: parsed.verified ? "true" : "",
  };
}

export function hydrateAddressGroupFromSection(
  section: string,
  data: Record<string, unknown>,
): AddressGroupValue | null {
  if (section === "medication_preferences") {
    const address = String(data.shipping_address ?? "");
    if (!address && !data.shipping_city) return null;
    return {
      address,
      city: String(data.shipping_city ?? ""),
      state: String(data.shipping_state ?? ""),
      zip: String(data.shipping_zip ?? ""),
      county: String(data.shipping_county ?? ""),
      country: String(data.shipping_country ?? "US"),
      verified: data.shipping_address_verified === "true",
    };
  }

  const address = String(data.address ?? "");
  if (!address && !data.city) return null;
  return {
    address,
    city: String(data.city ?? ""),
    state: String(data.state ?? ""),
    zip: String(data.zip ?? ""),
    county: String(data.county ?? ""),
    country: String(data.country ?? "US"),
    verified: data.address_verified === "true",
  };
}

export function hydrateAddressResponsesFromIntake(
  fields: QuestionnaireFieldSchema[],
  intake: MedicalIntake,
  responses: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...responses };
  for (const field of fields) {
    if (field.field_type !== "address_group") continue;
    if (parseAddressGroupValue(next[field.field_key])) continue;
    const section = field.maps_to_section || "identity";
    const bucket = (intake[section as keyof MedicalIntake] ?? {}) as Record<
      string,
      unknown
    >;
    const hydrated = hydrateAddressGroupFromSection(section, bucket);
    if (hydrated) next[field.field_key] = hydrated;
  }
  return next;
}

export function validateAddressGroupValue(
  label: string,
  value: unknown,
  required: boolean,
): string | null {
  const parsed = parseAddressGroupValue(value);
  if (!parsed) {
    return required ? `${label} is required.` : null;
  }
  if (
    !parsed.address &&
    !parsed.city &&
    !parsed.zip &&
    !parsed.county &&
    !parsed.state &&
    !parsed.verified
  ) {
    return required ? `${label} is required.` : null;
  }
  if (!parsed.verified) {
    return "Select your address from the suggestions to verify it for delivery.";
  }
  if (
    !isAddressReadyForVerification(
      parsed.address,
      parsed.city,
      parsed.zip,
      parsed.county,
    )
  ) {
    return "Enter a complete verified street address.";
  }
  if (!isValidCounty(parsed.county)) {
    return "County is required for a verified address.";
  }
  if (parsed.state.trim() && !normalizeUsState(parsed.state)) {
    return "Enter a valid US state.";
  }
  return null;
}
