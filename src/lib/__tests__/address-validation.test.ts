import { describe, expect, it, vi } from "vitest";
import {
  isAddressReadyForVerification,
  isDeliverableGeocodeResult,
  isIdentityAddressComplete,
  isValidCity,
  isValidCounty,
  isValidStreetAddress,
  isValidUsZip,
  verifyCityZip,
  verifyMailingAddress,
} from "@/lib/address-validation";
import {
  formatUsStateName,
  normalizeUsState,
  usStatesMatch,
} from "@/lib/us-states";
import {
  SQL_INJECTION,
  STRICT_FIELD_ATTACKS,
  OVERFLOW,
  XSS_PAYLOADS,
} from "./fixtures/malicious-payloads";
import {
  INVALID_STREET_INPUTS,
  VALID_STREET_INPUTS,
} from "./fixtures/address-fixtures";

describe("address-validation", () => {
  describe("isValidUsZip", () => {
    it("accepts 5-digit and ZIP+4", () => {
      expect(isValidUsZip("80202")).toBe(true);
      expect(isValidUsZip("80202-1234")).toBe(true);
    });

    it.each([...STRICT_FIELD_ATTACKS, "8020", "ABCDE", "80202-"])(
      "rejects invalid zip %j",
      (zip) => {
        expect(isValidUsZip(zip)).toBe(false);
      },
    );
  });

  describe("isValidStreetAddress", () => {
    it.each(VALID_STREET_INPUTS)("accepts valid street %j", (street) => {
      expect(isValidStreetAddress(street)).toBe(true);
    });

    it.each(INVALID_STREET_INPUTS)("rejects invalid street %j", (street) => {
      expect(isValidStreetAddress(street)).toBe(false);
    });

    it("requires length and a street number", () => {
      expect(isValidStreetAddress("Main St")).toBe(false);
      expect(isValidStreetAddress("12")).toBe(false);
    });

    it.each(STRICT_FIELD_ATTACKS)("rejects malicious street %j", (payload) => {
      expect(isValidStreetAddress(payload)).toBe(false);
    });
  });

  describe("isValidCounty", () => {
    it("accepts normal county names", () => {
      expect(isValidCounty("Denver County")).toBe(true);
      expect(isValidCounty("El Paso County")).toBe(true);
      expect(isValidCounty("St. Louis City")).toBe(true);
    });

    it.each([
      ...SQL_INJECTION.filter((c) => c !== "admin'--"),
      ...XSS_PAYLOADS,
      "A",
      "123",
    ])("rejects invalid county %j", (county) => {
      expect(isValidCounty(county)).toBe(false);
    });

    it("documents SQL probe admin'-- passes county format (DB must parameterize)", () => {
      expect(isValidCounty("admin'--")).toBe(true);
    });

    it.each(OVERFLOW)("rejects overflow county %j", (county) => {
      expect(isValidCounty(county)).toBe(false);
    });
  });

  describe("isValidCity", () => {
    it("accepts normal city names", () => {
      expect(isValidCity("Denver")).toBe(true);
      expect(isValidCity("St. Louis")).toBe(true);
    });

    it.each(STRICT_FIELD_ATTACKS)("rejects malicious city %j", (payload) => {
      if (payload === "admin'--") return;
      expect(isValidCity(payload)).toBe(false);
    });
  });

  describe("isAddressReadyForVerification", () => {
    it("returns true when street, city, and ZIP are all valid", () => {
      expect(
        isAddressReadyForVerification("123 Main St", "Denver", "80202"),
      ).toBe(true);
    });

    it("returns false when any required part is invalid", () => {
      expect(isAddressReadyForVerification("Main St", "Denver", "80202")).toBe(
        false,
      );
      expect(isAddressReadyForVerification("123 Main St", "A", "80202")).toBe(
        false,
      );
      expect(
        isAddressReadyForVerification("123 Main St", "Denver", "8020"),
      ).toBe(false);
    });
  });

  describe("isIdentityAddressComplete", () => {
    it("requires verified flag, valid parts, and county", () => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          county: "Denver County",
          address_verified: "true",
        }),
      ).toBe(true);
    });

    it("fails when county is missing or invalid", () => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          address_verified: "true",
        }),
      ).toBe(false);
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          county: "<script>alert(1)</script>",
          address_verified: "true",
        }),
      ).toBe(false);
    });

    it("fails when address_verified is missing", () => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          county: "Denver County",
          address_verified: "false",
        }),
      ).toBe(false);
    });

    it.each(STRICT_FIELD_ATTACKS)(
      "rejects malicious address field values %j",
      (payload) => {
        expect(
          isIdentityAddressComplete({
            address: payload,
            city: "Denver",
            zip: "80202",
            county: "Denver County",
            address_verified: "true",
          }),
        ).toBe(false);
        expect(
          isIdentityAddressComplete({
            address: "123 Main St",
            city: payload === "admin'--" ? "Denver" : payload,
            zip: "80202",
            county: "Denver County",
            address_verified: "true",
          }),
        ).toBe(payload === "admin'--");
        expect(
          isIdentityAddressComplete({
            address: "123 Main St",
            city: "Denver",
            zip: payload,
            county: "Denver County",
            address_verified: "true",
          }),
        ).toBe(false);
        expect(
          isIdentityAddressComplete({
            address: "123 Main St",
            city: "Denver",
            zip: "80202",
            county: payload === "admin'--" ? "Denver County" : payload,
            address_verified: "true",
          }),
        ).toBe(payload === "admin'--");
      },
    );
  });

  describe("normalizeUsState", () => {
    it("treats abbreviations and full names as the same state", () => {
      expect(normalizeUsState("CO")).toBe("colorado");
      expect(normalizeUsState("Colorado")).toBe("colorado");
      expect(normalizeUsState("COLORADO")).toBe("colorado");
      expect(usStatesMatch("CO", "Colorado")).toBe(true);
    });

    it("returns null for unknown values", () => {
      expect(normalizeUsState("ZZ")).toBeNull();
      expect(normalizeUsState("Not A State")).toBeNull();
    });

    it("formats display names from abbreviations", () => {
      expect(formatUsStateName("CO")).toBe("Colorado");
      expect(formatUsStateName("colorado")).toBe("Colorado");
    });
  });

  describe("verifyCityZip state matching", () => {
    const zippopotamDenver = {
      "post code": "80202",
      places: [{ "place name": "Denver", "state abbreviation": "CO" }],
    };

    it("accepts CO address when account state is Colorado", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => zippopotamDenver,
        }),
      );

      const result = await verifyCityZip("Denver", "80202", "Colorado");
      expect(result).toEqual({ ok: true, state: "CO" });

      vi.unstubAllGlobals();
    });

    it("rejects address in a different state than the account", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => zippopotamDenver,
        }),
      );

      const result = await verifyCityZip("Denver", "80202", "Texas");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/account state is Texas/);
      }

      vi.unstubAllGlobals();
    });
  });

  describe("isDeliverableGeocodeResult", () => {
    const deliverableResult = {
      address_components: [
        { long_name: "2510", short_name: "2510", types: ["street_number"] },
        {
          long_name: "Summit Drive",
          short_name: "Summit Dr",
          types: ["route"],
        },
      ],
      formatted_address: "2510 Summit Dr, Colorado Springs, CO 80909, USA",
      geometry: { location_type: "ROOFTOP" },
      types: ["street_address"],
    };

    it("accepts rooftop street-level matches with matching street number", () => {
      expect(
        isDeliverableGeocodeResult(deliverableResult, "2510 Summit Dr"),
      ).toBe(true);
    });

    it("rejects approximate postal-code-only matches", () => {
      expect(
        isDeliverableGeocodeResult(
          {
            address_components: [
              {
                long_name: "80909",
                short_name: "80909",
                types: ["postal_code"],
              },
            ],
            formatted_address: "Colorado Springs, CO 80909, USA",
            geometry: { location_type: "APPROXIMATE" },
            types: ["postal_code"],
          },
          "2510 sum",
        ),
      ).toBe(false);
    });

    it("rejects when geocoded street number differs from input", () => {
      expect(
        isDeliverableGeocodeResult(deliverableResult, "999 Summit Dr"),
      ).toBe(false);
    });
  });

  describe("verifyMailingAddress", () => {
    const coloradoSpringsZip = {
      "post code": "80909",
      places: [
        { "place name": "Colorado Springs", "state abbreviation": "CO" },
      ],
    };

    it("rejects non-deliverable street addresses after city/ZIP pass", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("zippopotam.us")) {
            return {
              ok: true,
              status: 200,
              json: async () => coloradoSpringsZip,
            };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "OK",
              results: [
                {
                  address_components: [
                    {
                      long_name: "80909",
                      short_name: "80909",
                      types: ["postal_code"],
                    },
                  ],
                  formatted_address: "Colorado Springs, CO 80909, USA",
                  geometry: { location_type: "APPROXIMATE" },
                  types: ["postal_code"],
                },
              ],
            }),
          };
        }),
      );

      const previousKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      import.meta.env.VITE_GOOGLE_PLACES_API_KEY = "test-key";
      vi.resetModules();
      const { verifyMailingAddress: verifyFresh } =
        await import("@/lib/address-validation");

      const result = await verifyFresh(
        "9999 Imaginary Boulevard",
        "Colorado Springs",
        "80909",
        "Colorado",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/verify that street address/i);
      }

      import.meta.env.VITE_GOOGLE_PLACES_API_KEY = previousKey;
      vi.resetModules();
      vi.unstubAllGlobals();
    });
  });
});
