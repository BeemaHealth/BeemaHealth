import { describe, expect, it } from "vitest";
import {
  isIdentityAddressComplete,
  isValidCity,
  isValidStreetAddress,
  isValidUsZip,
} from "@/lib/address-validation";
import { SQL_INJECTION, STRICT_FIELD_ATTACKS, XSS_PAYLOADS } from "./fixtures/malicious-payloads";

describe("address-validation", () => {
  describe("isValidUsZip", () => {
    it("accepts 5-digit and ZIP+4", () => {
      expect(isValidUsZip("80202")).toBe(true);
      expect(isValidUsZip("80202-1234")).toBe(true);
    });

    it.each([...STRICT_FIELD_ATTACKS, "8020", "ABCDE", "80202-"])("rejects invalid zip %j", (zip) => {
      expect(isValidUsZip(zip)).toBe(false);
    });
  });

  describe("isValidStreetAddress", () => {
    it("requires length and a street number", () => {
      expect(isValidStreetAddress("123 Main St")).toBe(true);
      expect(isValidStreetAddress("Main St")).toBe(false);
      expect(isValidStreetAddress("12")).toBe(false);
    });

    it.each(XSS_PAYLOADS)("rejects xss-only address %j", (payload) => {
      expect(isValidStreetAddress(payload)).toBe(false);
    });
  });

  describe("isValidCity", () => {
    it("accepts normal city names", () => {
      expect(isValidCity("Denver")).toBe(true);
      expect(isValidCity("St. Louis")).toBe(true);
    });

    it.each([...SQL_INJECTION.filter((c) => c !== "admin'--"), ...XSS_PAYLOADS, "A", "123"])(
      "rejects invalid city %j",
      (city) => {
        expect(isValidCity(city)).toBe(false);
      },
    );

    it("documents SQL probe admin'-- passes city format (DB must parameterize)", () => {
      expect(isValidCity("admin'--")).toBe(true);
    });
  });

  describe("isIdentityAddressComplete", () => {
    it("requires verified flag and valid parts", () => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          address_verified: "true",
        }),
      ).toBe(true);
    });

    it("fails when address_verified is missing", () => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          address_verified: "false",
        }),
      ).toBe(false);
    });

    it.each(SQL_INJECTION)("rejects injection in zip %j", (payload) => {
      expect(
        isIdentityAddressComplete({
          address: "123 Main St",
          city: "Denver",
          zip: payload,
          address_verified: "true",
        }),
      ).toBe(false);
    });
  });
});
