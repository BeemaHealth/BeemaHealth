/**
 * US home address search via OpenStreetMap Nominatim (free, no API key).
 * Used for intake identity — single-field autocomplete with selectable results.
 */

import {
  isAddressReadyForVerification,
  isValidStreetAddress,
  verifyCityZip,
  type ParsedUsAddress,
} from "@/lib/address-validation";
import { formatUsStateName, usStatesMatch } from "@/lib/us-states";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "AretideIntake/1.0 (https://aretide.com/)";

const DELIVERABLE_NOMINATIM_TYPES = new Set([
  "house",
  "residential",
  "building",
  "apartments",
  "terrace",
  "detached",
  "yes",
]);

export type AddressSuggestion = {
  id: string;
  label: string;
  parsed: ParsedUsAddress;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  postcode?: string;
  state?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
};

function nominatimCity(addr: NominatimAddress): string {
  return (addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? "").trim();
}

/** Parse a Nominatim search result into our address shape. */
export function parseNominatimResult(
  item: NominatimResult,
): ParsedUsAddress | null {
  const addr = item.address;
  if (!addr?.house_number || !addr.road) return null;

  const city = nominatimCity(addr);
  const zip = (addr.postcode ?? "").trim().slice(0, 5);
  const state = (addr.state ?? "").trim();
  if (!city || !zip || !state) return null;

  const streetLine = `${addr.house_number} ${addr.road}`.trim();
  if (!isValidStreetAddress(streetLine)) return null;

  return {
    address: streetLine,
    city,
    zip,
    state,
  };
}

export function isDeliverableNominatimResult(item: NominatimResult): boolean {
  if (!parseNominatimResult(item)) return false;
  const type = item.type ?? "";
  const cls = item.class ?? "";
  if (cls === "building" || cls === "place") {
    return DELIVERABLE_NOMINATIM_TYPES.has(type) || type === "house";
  }
  if (cls === "highway" && type === "residential") return true;
  return DELIVERABLE_NOMINATIM_TYPES.has(type);
}

/** Search US street addresses for autocomplete (debounce in the UI). */
export async function searchUsAddressSuggestions(
  query: string,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 4) return [];

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "6");

  let results: NominatimResult[];
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });
    if (!res.ok) return [];
    results = (await res.json()) as NominatimResult[];
  } catch {
    return [];
  }

  if (!Array.isArray(results)) return [];

  const suggestions: AddressSuggestion[] = [];
  for (const item of results) {
    if (!isDeliverableNominatimResult(item)) continue;
    const parsed = parseNominatimResult(item);
    if (!parsed || !isValidStreetAddress(parsed.address)) continue;
    suggestions.push({
      id: String(item.place_id),
      label: item.display_name,
      parsed,
    });
  }
  return suggestions;
}

/** Verify a user-selected parsed address (city/ZIP/state + street format). */
export async function verifyParsedUsAddress(
  parsed: ParsedUsAddress,
  expectedState?: string | null,
): Promise<{ ok: true; state: string } | { ok: false; message: string }> {
  if (!isAddressReadyForVerification(parsed.address, parsed.city, parsed.zip)) {
    return {
      ok: false,
      message: "Select a complete street address from the suggestions.",
    };
  }

  if (expectedState?.trim() && !usStatesMatch(parsed.state, expectedState)) {
    const accountState = formatUsStateName(expectedState);
    return {
      ok: false,
      message: `This address is in ${formatUsStateName(parsed.state)}, but your account state is ${accountState}. Use your home address in ${accountState}.`,
    };
  }

  return verifyCityZip(parsed.city, parsed.zip, expectedState);
}

export function formatVerifiedAddress(parsed: ParsedUsAddress): string {
  return `${parsed.address}, ${parsed.city}, ${formatUsStateName(parsed.state)} ${parsed.zip}`;
}
