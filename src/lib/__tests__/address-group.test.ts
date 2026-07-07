import { describe, expect, it } from "vitest";
import {
  flattenAddressGroupForSection,
  hydrateAddressGroupFromSection,
  parseAddressGroupValue,
  validateAddressGroupValue,
} from "@/lib/questionnaire/address-group";

describe("address-group helpers", () => {
  const verified = {
    address: "123 Main St",
    city: "Denver",
    state: "Arizona",
    zip: "80202",
    county: "Denver County",
    country: "US",
    verified: true,
  };

  it("parses address object values", () => {
    expect(parseAddressGroupValue(verified)).toEqual(verified);
  });

  it("flattens into identity section keys", () => {
    expect(flattenAddressGroupForSection(verified, "identity")).toEqual({
      address: "123 Main St",
      city: "Denver",
      state: "Arizona",
      zip: "80202",
      county: "Denver County",
      country: "US",
      address_verified: "true",
    });
  });

  it("flattens into medication_preferences shipping keys", () => {
    expect(
      flattenAddressGroupForSection(verified, "medication_preferences"),
    ).toEqual({
      use_different_shipping_address: "true",
      shipping_address: "123 Main St",
      shipping_city: "Denver",
      shipping_state: "Arizona",
      shipping_zip: "80202",
      shipping_county: "Denver County",
      shipping_country: "US",
      shipping_address_verified: "true",
    });
  });

  it("hydrates from identity section", () => {
    expect(
      hydrateAddressGroupFromSection("identity", {
        address: "123 Main St",
        city: "Denver",
        state: "Arizona",
        zip: "80202",
        county: "Denver County",
        country: "US",
        address_verified: "true",
      }),
    ).toEqual(verified);
  });

  it("requires verified selection", () => {
    expect(
      validateAddressGroupValue(
        "Home address",
        { ...verified, verified: false },
        true,
      ),
    ).toMatch(/verify/i);
  });

  it("accepts verified address", () => {
    expect(
      validateAddressGroupValue("Home address", verified, true),
    ).toBeNull();
  });
});
