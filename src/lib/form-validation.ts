/** Shared input validation for qualify and intake flows. */

import { isValidStreetAddress } from "@/lib/address-validation";

export const SHIPPING_PREFERENCE_VALUES = ["pickup", "shipping"] as const;
export type ShippingPreference = (typeof SHIPPING_PREFERENCE_VALUES)[number];

export const SHIPPING_PREFERENCE_LABELS: Record<ShippingPreference, string> = {
  pickup: "Pickup",
  shipping: "Shipping",
};

const UNSAFE_FREE_TEXT_RE =
  /[<>;|`$]|javascript:|on\w+\s*=|\.\.|%2e%2e|--|\b(drop|union|select|table)\b|script|alert\s*\(/i;
const MEMBER_ID_RE = /^[a-zA-Z0-9\- ]{1,64}$/;

export function isFilled(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

export function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseNonNegativeInt(
  value: string,
  max?: number,
): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return null;
  if (max !== undefined && n > max) return null;
  return n;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("%")) return false;
  return EMAIL_RE.test(trimmed);
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  return digits.length === 10;
}

/** Format partial or complete US phone digits for display (e.g. (303) 555-0100). */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidShippingPreference(value: string): boolean {
  return SHIPPING_PREFERENCE_VALUES.includes(value as ShippingPreference);
}

export function isValidOptionalFreeText(
  value: string,
  maxLength = 128,
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length > maxLength) return false;
  return !UNSAFE_FREE_TEXT_RE.test(trimmed);
}

export function isValidOptionalMemberId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return MEMBER_ID_RE.test(trimmed);
}

export function validateOptionalPharmacyPhone(phone: string): string | null {
  if (!isFilled(phone)) return null;
  if (!isValidPhone(phone)) return "Enter a valid pharmacy phone number.";
  return null;
}

export function validateOptionalPharmacyAddress(
  address: string,
): string | null {
  if (!isFilled(address)) return null;
  if (!isValidStreetAddress(address)) {
    return "Enter a valid pharmacy street address.";
  }
  return null;
}

export function validateOptionalInsuranceProvider(
  value: string,
): string | null {
  if (!isFilled(value)) return null;
  if (!isValidOptionalFreeText(value, 128)) {
    return "Enter a valid insurance provider name.";
  }
  return null;
}

export function validateOptionalMemberId(value: string): string | null {
  if (!isFilled(value)) return null;
  if (!isValidOptionalMemberId(value)) {
    return "Enter a valid member ID (letters, numbers, and dashes).";
  }
  return null;
}

export function isValidPersonName(name: string): boolean {
  return /^[a-zA-Z .'-]{1,60}$/.test(name.trim());
}

const PREFERRED_FIRST_NAME_RE = /^[A-Za-z]{1,40}$/;

/** Optional display first name — letters only. */
export function sanitizePreferredFirstName(value: string): string {
  return value.replace(/[^A-Za-z]/g, "").slice(0, 40);
}

export function isValidPreferredFirstName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PREFERRED_FIRST_NAME_RE.test(trimmed);
}

export function validateHeightFt(value: string): string | null {
  const ft = parseNonNegativeInt(value);
  if (ft == null) return "Enter your height in feet (3–8).";
  if (ft < 3 || ft > 8) return "Height must be between 3 and 8 feet.";
  return null;
}

export function validateHeightIn(value: string): string | null {
  const inches = parseNonNegativeInt(value, 11);
  if (inches == null) return "Enter inches (0–11).";
  return null;
}

export function validateWeightLbs(
  value: string,
  label = "Weight",
): string | null {
  const n = parsePositiveNumber(value);
  if (n == null) return `Enter a valid ${label.toLowerCase()} in pounds.`;
  if (n < 50 || n > 1000) return `${label} must be between 50 and 1,000 lb.`;
  return null;
}

export function validateGoalWeightLbs(
  currentWeight: string,
  goalWeight: string,
): string | null {
  const goalErr = validateWeightLbs(goalWeight, "Goal weight");
  if (goalErr) return goalErr;
  const current = parsePositiveNumber(currentWeight);
  const goal = parsePositiveNumber(goalWeight);
  if (current != null && goal != null && goal >= current) {
    return "Goal weight should be less than your current weight.";
  }
  return null;
}

export function validateAdultWeightHistory(
  highest: string,
  lowest: string,
  currentWeight?: string | null,
): string | null {
  const highErr = validateWeightLbs(highest, "Highest weight");
  if (highErr) return highErr;
  const lowErr = validateWeightLbs(lowest, "Lowest weight");
  if (lowErr) return lowErr;
  const high = parsePositiveNumber(highest)!;
  const low = parsePositiveNumber(lowest)!;
  if (low > high) return "Lowest weight cannot be higher than highest weight.";
  const current = currentWeight ? parsePositiveNumber(currentWeight) : null;
  if (current != null && high < current) {
    return "Highest weight should be at least your current weight.";
  }
  return null;
}

export function validateMedicationRow(row: {
  name?: string;
  dose?: string;
  frequency?: string;
  reason?: string;
}): string | null {
  if (!isFilled(row.name)) return "Enter the medication name.";
  if (!isFilled(row.dose)) return "Enter the dose.";
  if (!isFilled(row.frequency)) return "Enter how often you take it.";
  return null;
}

export function validateAllergyRow(row: {
  allergy?: string;
  reaction?: string;
  severity?: string;
}): string | null {
  if (!isFilled(row.allergy)) return "Enter the allergy.";
  if (!isFilled(row.reaction)) return "Describe your reaction.";
  return null;
}

export function validateOptionalNumericLab(
  value: string,
  label: string,
): string | null {
  if (!isFilled(value)) return null;
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return `Enter a valid number for ${label}.`;
  return null;
}

const BLOOD_PRESSURE_PATTERN = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/;

/** Optional BP reading as systolic/diastolic (e.g. 120/80). */
export function validateOptionalBloodPressure(value: string): string | null {
  if (!isFilled(value)) return null;
  const match = value.trim().match(BLOOD_PRESSURE_PATTERN);
  if (!match) {
    return "Enter blood pressure as systolic/diastolic (e.g. 120/80).";
  }
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200) {
    return "Enter a realistic blood pressure reading (e.g. 120/80).";
  }
  if (systolic <= diastolic) {
    return "Systolic (first number) should be higher than diastolic.";
  }
  return null;
}
