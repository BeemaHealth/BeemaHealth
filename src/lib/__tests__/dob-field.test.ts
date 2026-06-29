import { describe, expect, it } from "vitest";
import {
  clampDayToMonth,
  finalizeDayPart,
  finalizeMonthPart,
  formatIsoDateForBeluga,
  formatIsoDateForDisplay,
  maxDayForMonthParts,
  sanitizeDayPart,
  sanitizeDobPart,
  sanitizeMonthPart,
  toIsoDateOfBirth,
  validateIsoDateOfBirth,
} from "@/lib/questionnaire/dob-field";

describe("dob-field", () => {
  it("builds ISO dates from MM/DD/YYYY parts", () => {
    expect(toIsoDateOfBirth("01", "15", "1990")).toBe("1990-01-15");
    expect(toIsoDateOfBirth("2", "5", "2000")).toBe("2000-02-05");
  });

  it("rejects invalid calendar dates", () => {
    expect(toIsoDateOfBirth("02", "31", "1990")).toBe("");
    expect(toIsoDateOfBirth("13", "01", "1990")).toBe("");
  });

  it("formats ISO dates for Beluga and display", () => {
    expect(formatIsoDateForBeluga("1990-01-15")).toBe("01/15/1990");
    expect(formatIsoDateForDisplay("1990-01-15")).toBe("01/15/1990");
  });

  it("requires adult age when validating", () => {
    expect(validateIsoDateOfBirth("2015-01-01")).toMatch(/18 or older/i);
    expect(validateIsoDateOfBirth("1990-01-15")).toBeNull();
  });

  it("strips non-digits from typed parts", () => {
    expect(sanitizeDobPart("1a2", 2)).toBe("12");
    expect(sanitizeDobPart("ab", 2)).toBe("");
    expect(sanitizeDobPart("12", 2)).toBe("12");
  });

  it("restricts month to 1-12 and pads single digits", () => {
    expect(sanitizeMonthPart("8")).toBe("8");
    expect(finalizeMonthPart("8")).toBe("08");
    expect(sanitizeMonthPart("13")).toBe("12");
    expect(finalizeMonthPart("1")).toBe("01");
  });

  it("restricts day by month and pads single digits", () => {
    expect(maxDayForMonthParts("02", "")).toBe(29);
    expect(sanitizeDayPart("32", 31)).toBe("31");
    expect(sanitizeDayPart("31", 30)).toBe("30");
    expect(finalizeDayPart("5", 31)).toBe("05");
    expect(clampDayToMonth("31", "04", "1990")).toBe("30");
  });
});
