import { computeIsAdult } from "@/lib/qualify-steps";

export type DateOfBirthParts = { month: string; day: string; year: string };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function parseIsoDateOfBirth(value: string): DateOfBirthParts {
  if (!value || !ISO_DATE_RE.test(value)) {
    return { month: "", day: "", year: "" };
  }
  const [year, month, day] = value.split("-");
  return { month, day, year };
}

export function toIsoDateOfBirth(
  month: string,
  day: string,
  year: string,
): string {
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  const y = year.trim();
  if (
    !/^\d{1,2}$/.test(month) ||
    !/^\d{1,2}$/.test(day) ||
    !/^\d{4}$/.test(y)
  ) {
    return "";
  }
  const monthNum = Number(m);
  const dayNum = Number(d);
  const yearNum = Number(y);
  if (monthNum < 1 || monthNum > 12) return "";
  const maxDay = daysInMonth(yearNum, monthNum);
  if (dayNum < 1 || dayNum > maxDay) return "";
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return "";
  return `${y}-${m}-${d}`;
}

/** Beluga visit payload format (MM/DD/YYYY). */
export function formatIsoDateForBeluga(isoDate: string): string | null {
  if (!ISO_DATE_RE.test(isoDate)) return null;
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

/** Patient-facing display (MM/DD/YYYY). */
export function formatIsoDateForDisplay(isoDate: string): string {
  return formatIsoDateForBeluga(isoDate) ?? isoDate;
}

export function validateIsoDateOfBirth(
  isoDate: string,
  options: { requireAdult?: boolean; label?: string } = {},
): string | null {
  const label = options.label ?? "Date of birth";
  if (!isoDate?.trim()) {
    return `${label} is required.`;
  }
  if (!ISO_DATE_RE.test(isoDate)) {
    return `Enter a valid ${label.toLowerCase()} (MM/DD/YYYY).`;
  }
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `Enter a valid ${label.toLowerCase()} (MM/DD/YYYY).`;
  }
  if (options.requireAdult !== false && computeIsAdult(isoDate) === false) {
    return "You must be 18 or older to continue.";
  }
  return null;
}

/** Strip non-digits and cap length for MM/DD/YYYY inputs. */
export function sanitizeDobPart(raw: string, maxLength: number): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
}

/** Max calendar day for a month; uses 29 for February when year is unknown. */
export function maxDayForMonthParts(month: string, year: string): number {
  const monthNum = Number(month);
  if (!monthNum || monthNum < 1 || monthNum > 12) return 31;
  if (!/^\d{4}$/.test(year)) {
    if (monthNum === 2) return 29;
    if ([4, 6, 9, 11].includes(monthNum)) return 30;
    return 31;
  }
  return daysInMonth(Number(year), monthNum);
}

export function sanitizeMonthPart(raw: string): string {
  const digits = sanitizeDobPart(raw, 2);
  if (!digits) return "";
  if (digits.length === 1) {
    const n = Number(digits);
    if (n === 0) return "";
    return digits;
  }
  let n = Number(digits);
  if (n < 1) n = 1;
  if (n > 12) n = 12;
  return String(n).padStart(2, "0");
}

export function finalizeMonthPart(month: string): string {
  if (!month) return "";
  let n = Number(month);
  if (Number.isNaN(n) || n < 1) n = 1;
  if (n > 12) n = 12;
  return String(n).padStart(2, "0");
}

export function sanitizeDayPart(raw: string, maxDay: number): string {
  const digits = sanitizeDobPart(raw, 2);
  if (!digits) return "";
  if (digits.length === 1) {
    const n = Number(digits);
    if (n === 0) return "";
    return digits;
  }
  let n = Number(digits);
  if (n < 1) n = 1;
  if (n > maxDay) n = maxDay;
  return String(n).padStart(2, "0");
}

export function finalizeDayPart(day: string, maxDay: number): string {
  if (!day) return "";
  let n = Number(day);
  if (Number.isNaN(n) || n < 1) n = 1;
  if (n > maxDay) n = maxDay;
  return String(n).padStart(2, "0");
}

export function clampDayToMonth(
  day: string,
  month: string,
  year: string,
): string {
  if (!day) return "";
  const maxDay = maxDayForMonthParts(month, year);
  const n = Number(day);
  if (Number.isNaN(n) || n < 1) return "01";
  if (n > maxDay) return String(maxDay).padStart(2, "0");
  return day.length === 1 ? day : String(n).padStart(2, "0");
}

const CURRENT_YEAR = new Date().getFullYear();

export function sanitizeYearPart(raw: string): string {
  const digits = sanitizeDobPart(raw, 4);
  if (!digits) return "";
  if (digits.length === 4) {
    let n = Number(digits);
    if (n < 1900) n = 1900;
    if (n > CURRENT_YEAR) n = CURRENT_YEAR;
    return String(n);
  }
  return digits;
}

export function finalizeYearPart(year: string): string {
  if (!/^\d{4}$/.test(year)) return year;
  let n = Number(year);
  if (n < 1900) n = 1900;
  if (n > CURRENT_YEAR) n = CURRENT_YEAR;
  return String(n);
}

export function dobMonthOptions(): Array<{ value: string; label: string }> {
  return Array.from({ length: 12 }, (_, i) => {
    const value = String(i + 1).padStart(2, "0");
    return { value, label: value };
  });
}

export function dobDayOptions(
  month: string,
  year: string,
): Array<{ value: string; label: string }> {
  const max = maxDayForMonthParts(month, year);
  return Array.from({ length: max }, (_, i) => {
    const value = String(i + 1).padStart(2, "0");
    return { value, label: value };
  });
}

export function dobYearOptions(): Array<{ value: string; label: string }> {
  const years: Array<{ value: string; label: string }> = [];
  for (let y = CURRENT_YEAR; y >= 1900; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function formatDobPartForDisplay(
  part: "month" | "day" | "year",
  value: string,
  focused: boolean,
): string {
  if (!value) return "";
  if (focused || part === "year") return value;
  if (part === "month" || part === "day") {
    return value.length === 1 ? value.padStart(2, "0") : value;
  }
  return value;
}
