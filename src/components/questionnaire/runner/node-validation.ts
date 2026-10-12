/**
 * Client side validation for server-driven questionnaire nodes. It mirrors
 * `backend/apps/questionnaires/engine.py` so people get instant, friendly feedback;
 * the server remains the authority and re-validates every answer.
 */

import type {
  NodeOption,
  QuestionnaireNode,
} from "@/lib/api/portal/questionnaire";
import { isValidEmail } from "@/lib/form-validation";

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const ok = <T>(value: T): Validated<T> => ({ ok: true, value });
const bad = <T = never>(error: string): Validated<T> => ({ ok: false, error });

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const NAME = /^[\p{L}\p{N}_][\p{L}\p{N}_ .,'()/%+&-]*$/u;
const ZIP = /^\d{5}(-\d{4})?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function cleanText(
  raw: string,
  opts: { min?: number; max: number; multiline?: boolean; label?: string },
): Validated<string> {
  const label = opts.label ?? "This answer";
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!opts.multiline && /[\n\t]/.test(text))
    return bad(`${label} contains unsupported characters.`);
  if (CONTROL.test(text))
    return bad(`${label} contains unsupported characters.`);
  if (text.length < (opts.min ?? 0)) return bad(`${label} is required.`);
  if (text.length > opts.max) return bad(`${label} is too long.`);
  return ok(text);
}

export function strictName(
  raw: string,
  label: string,
  max = 100,
): Validated<string> {
  const text = cleanText(raw, { min: 1, max, label });
  if (!text.ok) return text;
  if (!NAME.test(text.value))
    return bad(`${label} contains unsupported characters.`);
  return text;
}

export function validateChoice(
  node: QuestionnaireNode,
  key: string | null,
): Validated<string> {
  if (!key) return bad("Choose one option to continue.");
  if (!(node.options ?? []).some((o) => o.key === key))
    return bad("Choose one of the listed options.");
  return ok(key);
}

export function toggleMulti(
  options: NodeOption[],
  selected: string[],
  key: string,
): string[] {
  const target = options.find((o) => o.key === key);
  if (!target) return selected;
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  if (target.exclusive) return [key];
  const exclusiveKeys = new Set(
    options.filter((o) => o.exclusive).map((o) => o.key),
  );
  return [...selected.filter((k) => !exclusiveKeys.has(k)), key];
}

export function validateMulti(
  node: QuestionnaireNode,
  selected: string[],
): Validated<string[]> {
  const options = node.options ?? [];
  const keys = options.map((o) => o.key);
  if (selected.some((k) => !keys.includes(k)))
    return bad("Choose from the listed options.");
  const minimum = node.optional ? 0 : (node.min_select ?? 1);
  if (selected.length < minimum)
    return bad("Choose at least one option to continue.");
  if (selected.length > (node.max_select ?? keys.length))
    return bad("You chose too many options.");
  return ok(keys.filter((k) => selected.includes(k)));
}

export function validateTextNode(
  node: QuestionnaireNode,
  raw: string,
): Validated<string> {
  const text = cleanText(raw, {
    min: node.min_length ?? (node.optional ? 0 : 1),
    max: node.max_length ?? 200,
  });
  if (!text.ok) return text;
  if (node.format === "email") {
    const email = text.value.toLowerCase();
    return isValidEmail(email)
      ? ok(email)
      : bad("Enter a valid email address.");
  }
  if (node.format === "zip") {
    return ZIP.test(text.value)
      ? ok(text.value.slice(0, 5))
      : bad("Enter a valid 5 digit ZIP code.");
  }
  return text;
}

export function validateTextarea(
  node: QuestionnaireNode,
  raw: string,
): Validated<string> {
  return cleanText(raw, {
    min: node.optional ? 0 : (node.min_length ?? 1),
    max: node.max_length ?? 2000,
    multiline: true,
  });
}

export function validateNumberNode(
  node: QuestionnaireNode,
  raw: string,
): Validated<number> {
  const trimmed = raw.trim();
  if (!trimmed) return bad("Enter a number to continue.");
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return bad("This answer must be a number.");
  if (node.integer && !Number.isInteger(n))
    return bad("This answer must be a whole number.");
  if (node.min !== undefined && n < node.min)
    return bad("This answer is too low.");
  if (node.max !== undefined && n > node.max)
    return bad("This answer is too high.");
  return ok(n);
}

export function ageOn(iso: string, today: Date = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (
    today.getFullYear() -
    y -
    (today.getMonth() + 1 < m ||
    (today.getMonth() + 1 === m && today.getDate() < d)
      ? 1
      : 0)
  );
}

function parseIso(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return null;
  return date;
}

export function validateDateNode(
  node: QuestionnaireNode,
  iso: string,
  today: Date = new Date(),
): Validated<string> {
  const parsed = parseIso(iso);
  if (!parsed || parsed.getFullYear() < 1900) return bad("Enter a valid date.");
  if (node.not_future && parsed > today)
    return bad("That date cannot be in the future.");
  if (node.min_age !== undefined && ageOn(iso, today) < node.min_age)
    return bad("You must be old enough to continue.");
  return ok(iso);
}

// ---- basics ----

export type BasicsInput = {
  dob: string;
  sex_at_birth: string;
  state: string;
  zip: string;
  phone: string;
};

export function normalizeUsPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!/^[0-9()+\-. ]+$/.test(raw.trim())) return null;
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (
    digits.length !== 10 ||
    "01".includes(digits[0]) ||
    "01".includes(digits[3])
  )
    return null;
  return `+1${digits}`;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateBasics(
  input: BasicsInput,
  today: Date = new Date(),
):
  | { ok: true; value: BasicsInput }
  | { ok: false; errors: FieldErrors<keyof BasicsInput> } {
  const errors: FieldErrors<keyof BasicsInput> = {};
  const dob = parseIso(input.dob);
  if (!input.dob) errors.dob = "Date of birth is required.";
  else if (!dob || dob.getFullYear() < 1900 || dob > today)
    errors.dob = "Enter a valid date of birth.";
  // Under 18 is not blocked here: the server routes it to a warm no_proceed page.
  if (input.sex_at_birth !== "female" && input.sex_at_birth !== "male")
    errors.sex_at_birth = "Choose your sex at birth.";
  if (!/^[A-Za-z]{2}$/.test(input.state)) errors.state = "Choose your state.";
  if (!ZIP.test(input.zip.trim()))
    errors.zip = "Enter a valid 5 digit ZIP code.";
  const phone = normalizeUsPhone(input.phone);
  if (!phone) errors.phone = "Enter a valid US phone number.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      dob: input.dob,
      sex_at_birth: input.sex_at_birth,
      state: input.state.toUpperCase(),
      zip: input.zip.trim().slice(0, 5),
      phone: phone as string,
    },
  };
}

// ---- bmi ----

export type BmiInput = {
  height_feet: string;
  height_inches: string;
  weight_lbs: string;
};
export type BmiValue = {
  height_feet: number;
  height_inches: number;
  weight_lbs: number;
};

export function validateBmi(
  input: BmiInput,
):
  | { ok: true; value: BmiValue }
  | { ok: false; errors: FieldErrors<keyof BmiInput> } {
  const errors: FieldErrors<keyof BmiInput> = {};
  const feet = Number(input.height_feet);
  const inches = Number(input.height_inches === "" ? 0 : input.height_inches);
  const weight = Number(input.weight_lbs);
  if (
    !input.height_feet.trim() ||
    !Number.isInteger(feet) ||
    feet < 3 ||
    feet > 8
  )
    errors.height_feet = "Enter feet between 3 and 8.";
  if (!Number.isInteger(inches) || inches < 0 || inches > 11)
    errors.height_inches = "Enter inches between 0 and 11.";
  if (
    !input.weight_lbs.trim() ||
    !Number.isFinite(weight) ||
    weight < 70 ||
    weight > 700
  )
    errors.weight_lbs = "Enter a weight between 70 and 700 lbs.";
  if (!errors.height_feet && !errors.height_inches) {
    const total = feet * 12 + inches;
    if (total < 48 || total > 96)
      errors.height_feet = "Height is outside the supported range.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { height_feet: feet, height_inches: inches, weight_lbs: weight },
  };
}

// ---- none-or-items lists ----

export type ListItemInput = Record<string, string>;
export type ListValue = { none: boolean; items: Array<Record<string, string>> };

type ItemSpec = {
  key: string;
  label: string;
  required?: boolean;
  max: number;
  kind: "name" | "text" | "date" | "severity";
};

export const LIST_SPECS: Record<
  "allergies" | "add_medication" | "med_conditions",
  { max: number; fields: ItemSpec[] }
> = {
  allergies: {
    max: 25,
    fields: [
      { key: "name", label: "Allergy", required: true, max: 100, kind: "name" },
      { key: "reaction", label: "Reaction", max: 200, kind: "name" },
      { key: "severity", label: "Severity", max: 10, kind: "severity" },
    ],
  },
  add_medication: {
    max: 40,
    fields: [
      {
        key: "name",
        label: "Medication",
        required: true,
        max: 100,
        kind: "name",
      },
      { key: "dose", label: "Dose", max: 60, kind: "name" },
      { key: "frequency", label: "Frequency", max: 60, kind: "name" },
    ],
  },
  med_conditions: {
    max: 40,
    fields: [
      {
        key: "name",
        label: "Condition",
        required: true,
        max: 100,
        kind: "name",
      },
      { key: "notes", label: "Notes", max: 500, kind: "text" },
      { key: "diagnosed_on", label: "Diagnosed on", max: 10, kind: "date" },
    ],
  },
};

export function validateListItem(
  type: keyof typeof LIST_SPECS,
  item: ListItemInput,
  today: Date = new Date(),
):
  | { ok: true; value: Record<string, string> }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const value: Record<string, string> = {};
  for (const spec of LIST_SPECS[type].fields) {
    const raw = (item[spec.key] ?? "").trim();
    if (!raw) {
      if (spec.required) errors[spec.key] = `${spec.label} is required.`;
      continue;
    }
    if (spec.kind === "severity") {
      if (["mild", "moderate", "severe"].includes(raw)) value[spec.key] = raw;
      else errors[spec.key] = "Choose a listed severity.";
    } else if (spec.kind === "date") {
      const parsed = parseIso(raw);
      if (!parsed || parsed > today || parsed.getFullYear() < 1900)
        errors[spec.key] = "Enter a valid date.";
      else value[spec.key] = raw;
    } else if (spec.kind === "text") {
      const t = cleanText(raw, {
        min: 1,
        max: spec.max,
        multiline: true,
        label: spec.label,
      });
      if (t.ok) value[spec.key] = t.value;
      else errors[spec.key] = t.error;
    } else {
      const n = strictName(raw, spec.label, spec.max);
      if (n.ok) value[spec.key] = n.value;
      else errors[spec.key] = n.error;
    }
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value };
}

// ---- files ----

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateUploadFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type))
    return "Upload a JPG, PNG, WebP, HEIC or PDF file.";
  if (file.size <= 0) return "That file looks empty.";
  if (file.size > MAX_UPLOAD_BYTES)
    return "That file is too large (10 MB maximum).";
  return null;
}
