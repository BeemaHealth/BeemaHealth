import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatVerifiedAddress,
  isDeliverableNominatimResult,
  parseNominatimResult,
  searchUsAddressSuggestions,
  verifyParsedUsAddress,
} from "@/lib/address-search";
import { isValidStreetAddress } from "@/lib/address-validation";
import {
  INVALID_NOMINATIM_RESULTS,
  INVALID_STREET_INPUTS,
  UNVERIFIABLE_PARSED_ADDRESSES,
  VALID_NOMINATIM_RESULTS,
  VALID_STREET_INPUTS,
  VERIFIABLE_PARSED_ADDRESSES,
} from "./fixtures/address-fixtures";

describe("address-search", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("parseNominatimResult", () => {
    it.each(VALID_NOMINATIM_RESULTS.map((item) => [item.display_name, item]))(
      "parses deliverable result %s",
      (_name, item) => {
        const parsed = parseNominatimResult(item);
        expect(parsed).not.toBeNull();
        expect(parsed!.address).toMatch(/^\d+\s+.+/);
        expect(parsed!.city.length).toBeGreaterThan(1);
        expect(parsed!.zip).toMatch(/^\d{5}$/);
        expect(parsed!.state.length).toBeGreaterThan(1);
        expect(parsed!.county.length).toBeGreaterThan(1);
      },
    );

    it.each(INVALID_NOMINATIM_RESULTS.map(({ label, item }) => [label, item]))(
      "rejects invalid nominatim result: %s",
      (_label, item) => {
        expect(parseNominatimResult(item)).toBeNull();
      },
    );

    it("uses town when city is absent and parses county", () => {
      const stLouis = VALID_NOMINATIM_RESULTS.find((r) => r.place_id === 5)!;
      expect(parseNominatimResult(stLouis)).toEqual({
        address: "88 Market St",
        city: "St. Louis",
        zip: "63101",
        state: "Missouri",
        county: "St. Louis City",
      });
    });

    it("rejects nominatim results without county", () => {
      const withoutCounty = {
        ...VALID_NOMINATIM_RESULTS[0],
        address: {
          ...VALID_NOMINATIM_RESULTS[0].address!,
          county: undefined,
        },
      };
      expect(parseNominatimResult(withoutCounty)).toBeNull();
    });
  });

  describe("isDeliverableNominatimResult", () => {
    it.each(VALID_NOMINATIM_RESULTS.map((item) => [item.type, item]))(
      "accepts deliverable type %s",
      (_type, item) => {
        expect(isDeliverableNominatimResult(item)).toBe(true);
      },
    );

    it.each(INVALID_NOMINATIM_RESULTS.map(({ label, item }) => [label, item]))(
      "rejects non-deliverable result: %s",
      (_label, item) => {
        expect(isDeliverableNominatimResult(item)).toBe(false);
      },
    );
  });

  describe("street format guardrails", () => {
    it.each(VALID_STREET_INPUTS)("accepts valid street %j", (street) => {
      expect(isValidStreetAddress(street)).toBe(true);
    });

    it.each(INVALID_STREET_INPUTS)("rejects invalid street %j", (street) => {
      expect(isValidStreetAddress(street)).toBe(false);
    });

    it("filters undeliverable nominatim rows from suggestions", async () => {
      const undeliverable = INVALID_NOMINATIM_RESULTS.find(
        (x) => x.label === "road-without-house-number",
      )!.item;
      const incomplete = INVALID_NOMINATIM_RESULTS.find(
        (x) => x.label === "incomplete-street-token",
      )!.item;
      const deliverable = VALID_NOMINATIM_RESULTS[0];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [undeliverable, incomplete, deliverable],
        }),
      );

      const items = await searchUsAddressSuggestions("summit colorado springs");
      expect(items).toHaveLength(1);
      expect(items[0]?.parsed.address).toBe("2510 Summit Drive");
    });
  });

  describe("searchUsAddressSuggestions", () => {
    it("returns only deliverable parsed suggestions", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
            ...VALID_NOMINATIM_RESULTS.slice(0, 2),
            ...INVALID_NOMINATIM_RESULTS.map((x) => x.item),
          ],
        }),
      );

      const items = await searchUsAddressSuggestions(
        "2510 summit colorado springs",
      );
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.parsed.address)).toEqual([
        "2510 Summit Drive",
        "1600 Pennsylvania Avenue NW",
      ]);
    });

    it.each(["", "   ", "251", "ab"])(
      "returns empty for query too short: %j",
      async (query) => {
        expect(await searchUsAddressSuggestions(query)).toEqual([]);
      },
    );

    it("returns empty when Nominatim responds non-OK", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 503 }),
      );
      expect(await searchUsAddressSuggestions("123 main denver")).toEqual([]);
    });

    it("returns empty when fetch throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
      expect(await searchUsAddressSuggestions("123 main denver")).toEqual([]);
    });

    it("returns empty when response is not an array", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      );
      expect(await searchUsAddressSuggestions("123 main denver")).toEqual([]);
    });

    it("sends US-only Nominatim search params", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      vi.stubGlobal("fetch", fetchMock);

      await searchUsAddressSuggestions("123 main st denver");

      const url = String(fetchMock.mock.calls[0]?.[0]);
      expect(url).toContain("nominatim.openstreetmap.org");
      expect(url).toContain("countrycodes=us");
      expect(url).toContain("addressdetails=1");
    });
  });

  describe("verifyParsedUsAddress", () => {
    it.each(VERIFIABLE_PARSED_ADDRESSES.map((c) => [c.label, c]))(
      "accepts verifiable address: %s",
      async (_label, { parsed, accountState, zippopotam }) => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => zippopotam,
          }),
        );

        const result = await verifyParsedUsAddress(parsed, accountState);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.state).toMatch(/^[A-Z]{2}$/);
        }
      },
    );

    it.each(UNVERIFIABLE_PARSED_ADDRESSES.map((c) => [c.label, c]))(
      "rejects unverifiable address: %s",
      async (_label, { parsed, accountState, zippopotam, messageMatch }) => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("zippopotam.us")) {
              if (zippopotam) {
                return {
                  ok: true,
                  status: 200,
                  json: async () => zippopotam,
                };
              }
              return { ok: false, status: 404 };
            }
            throw new Error(`unexpected fetch: ${url}`);
          }),
        );

        const result = await verifyParsedUsAddress(parsed, accountState);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toMatch(messageMatch);
        }
      },
    );
  });

  describe("formatVerifiedAddress", () => {
    it.each([
      [
        "abbreviated state",
        {
          address: "2510 Oak Drive",
          city: "Phoenix",
          zip: "85001",
          state: "AZ",
          county: "Maricopa County",
        },
        "2510 Oak Drive, Phoenix, Arizona 85001",
      ],
      [
        "full state name",
        {
          address: "123 Main Street",
          city: "Tucson",
          zip: "85013",
          state: "Arizona",
          county: "Pima County",
        },
        "123 Main Street, Tucson, Arizona 85013",
      ],
    ])("formats %s", (_label, parsed, expected) => {
      expect(formatVerifiedAddress(parsed)).toBe(expected);
    });
  });
});
