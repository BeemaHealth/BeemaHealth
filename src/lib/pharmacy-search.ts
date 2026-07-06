/**
 * US pharmacy search via OpenStreetMap Nominatim (free, no API key).
 * Uses patient city/state/ZIP for regional results when available.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "BeemaHealthIntake/1.0 (https://beemahealth.com/)";

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
  name?: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
};

export type PharmacySuggestion = {
  id: string;
  label: string;
  name: string;
  address: string;
};

export type PharmacySearchLocation = {
  city?: string;
  state?: string;
  zip?: string;
};

function nominatimCity(addr: NominatimAddress): string {
  return (addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? "").trim();
}

export function formatPharmacyLocationContext(
  location?: PharmacySearchLocation | null,
): string {
  if (!location) return "";
  const parts = [location.city, location.state, location.zip].filter((part) =>
    Boolean(part?.trim()),
  );
  return parts.join(" ").trim();
}

export function isPharmacyNominatimResult(item: NominatimResult): boolean {
  const cls = item.class ?? "";
  const type = item.type ?? "";
  if (cls === "amenity" && type === "pharmacy") return true;
  if (cls === "shop" && (type === "chemist" || type === "pharmacy"))
    return true;
  const haystack = `${item.name ?? ""} ${item.display_name}`.toLowerCase();
  return /\b(pharmacy|drug\s?store|chemist|cvs|walgreens|rite\s?aid|costco|safeway)\b/.test(
    haystack,
  );
}

export function parsePharmacyNominatimResult(
  item: NominatimResult,
): PharmacySuggestion | null {
  const addr = item.address;
  const name = (item.name ?? item.display_name.split(",")[0] ?? "").trim();
  if (!name) return null;

  let address = item.display_name.trim();
  if (addr) {
    const streetLine =
      addr.house_number && addr.road
        ? `${addr.house_number} ${addr.road}`.trim()
        : (addr.road ?? "").trim();
    const city = nominatimCity(addr);
    const state = (addr.state ?? "").trim();
    const zip = (addr.postcode ?? "").trim().slice(0, 5);
    const formatted = [streetLine, city, state, zip].filter(Boolean).join(", ");
    if (formatted.length >= 5) address = formatted;
  }

  return {
    id: String(item.place_id),
    label: item.display_name,
    name,
    address,
  };
}

/** Search pharmacies near the patient for autocomplete (debounce in the UI). */
export async function searchPharmacySuggestions(
  query: string,
  location?: PharmacySearchLocation | null,
): Promise<PharmacySuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const locationHint = formatPharmacyLocationContext(location);
  const q = locationHint
    ? `${trimmed} pharmacy ${locationHint}`
    : `${trimmed} pharmacy`;

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "8");

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

  const suggestions: PharmacySuggestion[] = [];
  for (const item of results) {
    if (!isPharmacyNominatimResult(item)) continue;
    const parsed = parsePharmacyNominatimResult(item);
    if (!parsed) continue;
    suggestions.push(parsed);
  }
  return suggestions;
}
