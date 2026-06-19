/** US address helpers for intake identity step. */

import { formatUsStateName, usStatesMatch } from "@/lib/us-states";

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;
const STREET_NUMBER_RE = /\d/;
const GOOGLE_GEOCODE_KEY =
  import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim() ?? "";

const DELIVERABLE_LOCATION_TYPES = new Set(["ROOFTOP", "RANGE_INTERPOLATED"]);
const DELIVERABLE_RESULT_TYPES = new Set([
  "street_address",
  "premise",
  "subpremise",
  "establishment",
]);

export type ParsedUsAddress = {
  address: string;
  city: string;
  zip: string;
  state: string;
};

export function isValidUsZip(zip: string): boolean {
  return US_ZIP_RE.test(zip.trim());
}

const UNSAFE_ADDRESS_RE = /[<>]|javascript:|on\w+\s*=|script|alert\s*\(/i;

export function isValidStreetAddress(address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 5 || !STREET_NUMBER_RE.test(trimmed)) return false;
  if (UNSAFE_ADDRESS_RE.test(trimmed)) return false;
  const streetName = trimmed.replace(/^\d+\s*/, "");
  if (streetName.length < 4 || !/[a-zA-Z]{3,}/.test(streetName)) return false;
  return true;
}

export function isValidCity(city: string): boolean {
  return /^[a-zA-Z .'-]{2,}$/.test(city.trim());
}

export function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeZip(zip: string): string {
  return zip.trim().slice(0, 5);
}

type ZippopotamResponse = {
  "post code": string;
  places: { "place name": string; "state abbreviation": string }[];
};

/** Verify city/ZIP against USPS-style reference data (free, no API key). */
export async function verifyCityZip(
  city: string,
  zip: string,
  expectedState?: string | null,
): Promise<{ ok: true; state: string } | { ok: false; message: string }> {
  const zip5 = normalizeZip(zip);
  if (!isValidUsZip(zip5)) {
    return { ok: false, message: "Enter a valid 5-digit US ZIP code." };
  }
  if (!isValidCity(city)) {
    return { ok: false, message: "Enter a valid city name." };
  }

  let data: ZippopotamResponse;
  try {
    const res = await fetch(
      `https://api.zippopotam.us/us/${encodeURIComponent(zip5)}`,
    );
    if (res.status === 404) {
      return {
        ok: false,
        message: "We couldn't find that ZIP code. Check it and try again.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: "Address lookup is temporarily unavailable. Try again.",
      };
    }
    data = (await res.json()) as ZippopotamResponse;
  } catch {
    return {
      ok: false,
      message: "Address lookup is temporarily unavailable. Try again.",
    };
  }

  const normalizedCity = normalizeCity(city);
  const place = data.places.find(
    (p) => normalizeCity(p["place name"]) === normalizedCity,
  );
  if (!place) {
    return {
      ok: false,
      message:
        "City and ZIP don't match. Select your address from suggestions or double-check both fields.",
    };
  }

  const state = place["state abbreviation"];
  if (expectedState?.trim() && !usStatesMatch(state, expectedState)) {
    const accountState = formatUsStateName(expectedState);
    return {
      ok: false,
      message: `This address is in ${state}, but your account state is ${accountState}. Use your home address in ${accountState}.`,
    };
  }

  return { ok: true, state };
}

type GeocodeAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GeocodeResult = {
  address_components: GeocodeAddressComponent[];
  formatted_address: string;
  geometry: { location_type: string };
  partial_match?: boolean;
  types: string[];
};

type GeocodeApiResponse = {
  results: GeocodeResult[];
  status: string;
};

function extractStreetNumber(address: string): string | null {
  const match = address.trim().match(/^(\d+)/);
  return match ? match[1] : null;
}

/** Whether Google Geocoder returned a shippable street-level match. */
export function isDeliverableGeocodeResult(
  result: GeocodeResult,
  inputAddress: string,
): boolean {
  const streetNumber = result.address_components.find((c) =>
    c.types.includes("street_number"),
  );
  const route = result.address_components.find((c) =>
    c.types.includes("route"),
  );
  if (!streetNumber || !route) return false;

  const inputNumber = extractStreetNumber(inputAddress);
  if (
    inputNumber &&
    streetNumber.long_name !== inputNumber &&
    streetNumber.short_name !== inputNumber
  ) {
    return false;
  }

  const locationType = result.geometry?.location_type;
  if (!locationType || !DELIVERABLE_LOCATION_TYPES.has(locationType)) {
    return false;
  }

  return (result.types ?? []).some((type) =>
    DELIVERABLE_RESULT_TYPES.has(type),
  );
}

const UNVERIFIED_STREET_MESSAGE =
  "We couldn't verify that street address for delivery. Select it from the suggestions or enter the full street address.";

/** Verify street + city/ZIP for a deliverable US mailing address. */
export async function verifyMailingAddress(
  address: string,
  city: string,
  zip: string,
  expectedState?: string | null,
): Promise<{ ok: true; state: string } | { ok: false; message: string }> {
  if (!isAddressReadyForVerification(address, city, zip)) {
    return {
      ok: false,
      message:
        "Enter a complete home address with street number, city, and ZIP.",
    };
  }

  const cityZipResult = await verifyCityZip(city, zip, expectedState);
  if (!cityZipResult.ok) return cityZipResult;

  if (!GOOGLE_GEOCODE_KEY) {
    return {
      ok: false,
      message:
        "Select your address from the suggestions so we can verify delivery.",
    };
  }

  const zip5 = normalizeZip(zip);
  const query = `${address.trim()}, ${city.trim()}, ${cityZipResult.state} ${zip5}`;

  let data: GeocodeApiResponse;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("components", `country:US|postal_code:${zip5}`);
    url.searchParams.set("key", GOOGLE_GEOCODE_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        ok: false,
        message: "Address lookup is temporarily unavailable. Try again.",
      };
    }
    data = (await res.json()) as GeocodeApiResponse;
  } catch {
    return {
      ok: false,
      message: "Address lookup is temporarily unavailable. Try again.",
    };
  }

  if (data.status === "ZERO_RESULTS" || !data.results?.length) {
    return { ok: false, message: UNVERIFIED_STREET_MESSAGE };
  }

  if (data.status !== "OK") {
    return {
      ok: false,
      message: "Address lookup is temporarily unavailable. Try again.",
    };
  }

  const deliverable = data.results.find((result) =>
    isDeliverableGeocodeResult(result, address),
  );
  if (!deliverable) {
    return { ok: false, message: UNVERIFIED_STREET_MESSAGE };
  }

  return { ok: true, state: cityZipResult.state };
}

export function parseGoogleAddressComponents(
  components: { long_name: string; short_name: string; types: string[] }[],
): ParsedUsAddress {
  let streetNumber = "";
  let route = "";
  let city = "";
  let zip = "";
  let state = "";

  for (const component of components) {
    const types = component.types;
    if (types.includes("street_number")) streetNumber = component.long_name;
    if (types.includes("route")) route = component.long_name;
    if (types.includes("locality")) city = component.long_name;
    else if (!city && types.includes("postal_town")) city = component.long_name;
    else if (!city && types.includes("sublocality")) city = component.long_name;
    if (types.includes("administrative_area_level_1"))
      state = component.short_name;
    if (types.includes("postal_code")) zip = component.long_name;
  }

  return {
    address: `${streetNumber} ${route}`.trim(),
    city,
    zip: normalizeZip(zip),
    state,
  };
}

export function isAddressReadyForVerification(
  address: string,
  city: string,
  zip: string,
): boolean {
  return (
    isValidStreetAddress(address) && isValidCity(city) && isValidUsZip(zip)
  );
}

export function isIdentityAddressComplete(
  identity: Record<string, string>,
): boolean {
  return (
    isAddressReadyForVerification(
      identity.address ?? "",
      identity.city ?? "",
      identity.zip ?? "",
    ) && identity.address_verified === "true"
  );
}
