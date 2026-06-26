import { formatUsStateName } from "@/lib/us-states";

/** Verified US address captured via Nominatim autocomplete. */
export type ShippingAddressValue = {
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  country: string;
  verified: boolean;
};

export function emptyShippingAddressValue(): ShippingAddressValue {
  return {
    address: "",
    city: "",
    state: "",
    zip: "",
    county: "",
    country: "",
    verified: false,
  };
}

export function formatShippingAddressLines(
  value: ShippingAddressValue,
): string[] {
  if (!value.address && !value.city && !value.zip) return [];
  const lines: string[] = [];
  if (value.address) lines.push(value.address);
  const cityLine = [
    value.city,
    value.state ? formatUsStateName(value.state) : "",
    value.zip,
  ]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (value.county) {
    lines.push(
      value.county.toLowerCase().includes("county")
        ? value.county
        : `${value.county} County`,
    );
  }
  if (
    value.country &&
    value.country !== "US" &&
    value.country !== "United States"
  ) {
    lines.push(value.country);
  }
  return lines;
}
