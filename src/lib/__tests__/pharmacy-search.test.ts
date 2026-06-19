import { describe, expect, it } from "vitest";
import {
  formatPharmacyLocationContext,
  isPharmacyNominatimResult,
  parsePharmacyNominatimResult,
} from "@/lib/pharmacy-search";

describe("pharmacy-search", () => {
  it("builds location context from city, state, and zip", () => {
    expect(
      formatPharmacyLocationContext({
        city: "Denver",
        state: "Colorado",
        zip: "80205",
      }),
    ).toBe("Denver Colorado 80205");
  });

  it("detects pharmacy nominatim results", () => {
    expect(
      isPharmacyNominatimResult({
        place_id: 1,
        display_name: "Safeway Pharmacy, Denver",
        class: "amenity",
        type: "pharmacy",
      }),
    ).toBe(true);
    expect(
      isPharmacyNominatimResult({
        place_id: 2,
        display_name: "Random Store",
        class: "shop",
        type: "supermarket",
      }),
    ).toBe(false);
  });

  it("parses pharmacy nominatim results into suggestions", () => {
    const parsed = parsePharmacyNominatimResult({
      place_id: 99,
      name: "Costco Pharmacy",
      display_name: "Costco Pharmacy, 123 Main St, Denver, CO",
      class: "amenity",
      type: "pharmacy",
      address: {
        house_number: "123",
        road: "Main St",
        city: "Denver",
        state: "Colorado",
        postcode: "80205",
      },
    });
    expect(parsed?.name).toBe("Costco Pharmacy");
    expect(parsed?.address).toContain("123 Main St");
    expect(parsed?.address).toContain("80205");
  });
});
