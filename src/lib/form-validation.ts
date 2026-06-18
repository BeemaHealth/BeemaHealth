/** Shared input validation for qualify and intake flows. */

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

export function parseNonNegativeInt(value: string, max?: number): number | null {
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

export function isValidPersonName(name: string): boolean {
  return /^[a-zA-Z .'-]{1,60}$/.test(name.trim());
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

export function validateWeightLbs(value: string, label = "Weight"): string | null {
  const n = parsePositiveNumber(value);
  if (n == null) return `Enter a valid ${label.toLowerCase()} in pounds.`;
  if (n < 50 || n > 1000) return `${label} must be between 50 and 1,000 lb.`;
  return null;
}

export function validateGoalWeightLbs(currentWeight: string, goalWeight: string): string | null {
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

export function validateOptionalNumericLab(value: string, label: string): string | null {
  if (!isFilled(value)) return null;
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return `Enter a valid number for ${label}.`;
  return null;
}
