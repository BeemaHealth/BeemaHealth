/** US address helpers for intake identity step. */

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;
const STREET_NUMBER_RE = /\d/;

export type ParsedUsAddress = {
  address: string;
  city: string;
  zip: string;
  state: string;
};

export function isValidUsZip(zip: string): boolean {
  return US_ZIP_RE.test(zip.trim());
}

export function isValidStreetAddress(address: string): boolean {
  const trimmed = address.trim();
  return trimmed.length >= 5 && STREET_NUMBER_RE.test(trimmed);
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
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip5)}`);
    if (res.status === 404) {
      return { ok: false, message: "We couldn't find that ZIP code. Check it and try again." };
    }
    if (!res.ok) {
      return { ok: false, message: "Address lookup is temporarily unavailable. Try again." };
    }
    data = (await res.json()) as ZippopotamResponse;
  } catch {
    return { ok: false, message: "Address lookup is temporarily unavailable. Try again." };
  }

  const normalizedCity = normalizeCity(city);
  const place = data.places.find((p) => normalizeCity(p["place name"]) === normalizedCity);
  if (!place) {
    return {
      ok: false,
      message: "City and ZIP don't match. Select your address from suggestions or double-check both fields.",
    };
  }

  const state = place["state abbreviation"];
  if (expectedState?.trim() && state.toUpperCase() !== expectedState.trim().toUpperCase()) {
    return {
      ok: false,
      message: `This address is in ${state}, but your account state is ${expectedState.toUpperCase()}. Use your home address in ${expectedState.toUpperCase()}.`,
    };
  }

  return { ok: true, state };
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
    if (types.includes("administrative_area_level_1")) state = component.short_name;
    if (types.includes("postal_code")) zip = component.long_name;
  }

  return {
    address: `${streetNumber} ${route}`.trim(),
    city,
    zip: normalizeZip(zip),
    state,
  };
}

export function isIdentityAddressComplete(identity: Record<string, string>): boolean {
  return (
    isValidStreetAddress(identity.address ?? "") &&
    isValidCity(identity.city ?? "") &&
    isValidUsZip(identity.zip ?? "") &&
    identity.address_verified === "true"
  );
}
