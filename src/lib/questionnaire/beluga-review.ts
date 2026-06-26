import type {
  QuestionnaireFieldSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  BELUGA_FIELD_OPTIONS,
  belugaMappingToApiFieldId,
} from "@/components/questionnaire/builder/field-catalog";
import { parseAccountMappings } from "@/lib/questionnaire/account-mappings";
import { parseAddressMappings } from "@/lib/questionnaire/address-mappings";
import { formatIsoDateForBeluga } from "@/lib/questionnaire/dob-field";
import { parseAddressGroupValue } from "@/lib/questionnaire/address-group";
import { formatFieldDisplayValue } from "@/lib/questionnaire/intake-review";
import { isAccountField } from "@/lib/questionnaire/registration";
import { reachableSteps } from "@/lib/questionnaire/step-routing";
import { evaluateVisibilityRule } from "@/lib/questionnaire/validation";
import type { RegistrationFields } from "@/lib/questionnaire/registration";

const BELUGA_PREFIX = "beluga:";

/** Beluga visit `formObj` fields that must not be sent empty. */
export const BELUGA_VISIT_REQUIRED_MAPPINGS = [
  "beluga:firstName",
  "beluga:lastName",
  "beluga:dob",
  "beluga:phone",
  "beluga:email",
  "beluga:address",
  "beluga:city",
  "beluga:state",
  "beluga:zip",
  "beluga:sex",
  "beluga:selfReportedMeds",
  "beluga:allergies",
  "beluga:medicalConditions",
] as const;

export type BelugaFieldStatus = "filled" | "missing_value" | "unmapped";

export type BelugaBinding = {
  beluga: string;
  apiFieldId: string;
  fieldKey: string;
  fieldLabel: string;
  sourcePhase: "qualify" | "intake";
  bindingType: "direct" | "choice_option" | "account_sub" | "address_sub";
  optionValue?: string;
  subKey?: string;
};

export type BelugaReviewField = {
  beluga: string;
  apiFieldId: string;
  label: string;
  value: string | null;
  status: BelugaFieldStatus;
  source?: "qualify" | "intake" | "account";
  sourceLabel?: string;
};

export type BelugaQaEntry = {
  question: string;
  answer: string;
  source: "qualify" | "intake";
  fieldKey: string;
};

export type BelugaDoctorReview = {
  /** One row per Beluga API field (mapped or required-but-unmapped). */
  fields: BelugaReviewField[];
  /** Mapped questions that feed Beluga `intakeResults` Q/A pairs. */
  qaEntries: BelugaQaEntry[];
  /** Required Beluga fields with no question mapped in qualify or intake. */
  missingAssignments: BelugaReviewField[];
};

/** Profile / account values that may satisfy Beluga demographics outside responses. */
export type BelugaAccountExtras = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  state?: string;
  address?: string;
  city?: string;
  zip?: string;
  sex?: string;
};

function belugaLabel(beluga: string): string {
  return (
    BELUGA_FIELD_OPTIONS.find((o) => o.value === beluga)?.label ??
    belugaMappingToApiFieldId(beluga) ??
    beluga
  );
}

function isBelugaMapping(value: string | undefined | null): value is string {
  return Boolean(value?.trim().startsWith(BELUGA_PREFIX));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ACCOUNT_SUB_TO_EXTRA: Record<string, keyof BelugaAccountExtras> = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  email: "email",
};

const ADDRESS_SUB_TO_EXTRA: Record<string, keyof BelugaAccountExtras> = {
  address: "address",
  city: "city",
  state: "state",
  zip: "zip",
};

function formatSexForBeluga(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === "female" || lower === "f") return "Female";
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "intersex" || lower === "other") return "Other";
  return raw.trim();
}

function extraValueForBeluga(
  beluga: string,
  extras?: BelugaAccountExtras,
): string | null {
  if (!extras) return null;
  const apiId = belugaMappingToApiFieldId(beluga);
  const byApi: Record<string, string | undefined> = {
    firstName: extras.firstName,
    lastName: extras.lastName,
    email: extras.email,
    phone: extras.phone,
    dob: extras.dob,
    state: extras.state,
    address: extras.address,
    city: extras.city,
    zip: extras.zip,
    sex: extras.sex,
  };
  const raw = byApi[apiId];
  if (apiId === "sex") return formatSexForBeluga(raw);
  if (apiId === "dob") {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    return formatIsoDateForBeluga(trimmed) ?? trimmed;
  }
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function registrationValueForSubKey(
  subKey: string,
  registration?: RegistrationFields,
): string | null {
  if (!registration) return null;
  const map: Record<string, keyof RegistrationFields> = {
    first_name: "firstName",
    last_name: "lastName",
    phone: "phone",
    email: "email",
  };
  const regKey = map[subKey];
  if (!regKey) return null;
  const v = registration[regKey]?.trim();
  return v || null;
}

function fieldHasAnswer(raw: unknown): boolean {
  if (raw === null || raw === undefined || raw === "") return false;
  if (Array.isArray(raw) && raw.length === 0) return false;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const parsed = parseAddressGroupValue(raw);
    if (parsed) {
      return Boolean(
        parsed.verified || parsed.address || parsed.city || parsed.zip,
      );
    }
    return Object.keys(raw as object).length > 0;
  }
  return true;
}

/** Collect every Beluga mapping declared on a questionnaire version. */
export function collectBelugaBindings(
  schema: QuestionnaireVersionSchema,
  sourcePhase: "qualify" | "intake",
): BelugaBinding[] {
  const bindings: BelugaBinding[] = [];

  for (const step of schema.steps) {
    for (const field of step.fields) {
      if (field.field_type === "review" || field.field_type === "legal_consent")
        continue;

      if (isBelugaMapping(field.maps_to_section)) {
        bindings.push({
          beluga: field.maps_to_section!,
          apiFieldId: belugaMappingToApiFieldId(field.maps_to_section!),
          fieldKey: field.field_key,
          fieldLabel: field.label || field.field_key,
          sourcePhase,
          bindingType: "direct",
        });
      }

      if (
        field.field_type === "multi_choice" ||
        field.field_type === "yes_no" ||
        (field.field_type === "single_choice" &&
          !isBelugaMapping(field.maps_to_section))
      ) {
        for (const opt of field.options ?? []) {
          if (!isRecord(opt)) continue;
          const beluga = String(opt.beluga ?? "").trim();
          if (!isBelugaMapping(beluga)) continue;
          bindings.push({
            beluga,
            apiFieldId: belugaMappingToApiFieldId(beluga),
            fieldKey: field.field_key,
            fieldLabel: field.label || field.field_key,
            sourcePhase,
            bindingType: "choice_option",
            optionValue: String(opt.value ?? ""),
          });
        }
      }

      if (isAccountField(field)) {
        for (const row of parseAccountMappings(field)) {
          if (!isBelugaMapping(row.beluga)) continue;
          bindings.push({
            beluga: row.beluga,
            apiFieldId: belugaMappingToApiFieldId(row.beluga),
            fieldKey: field.field_key,
            fieldLabel: field.label || "Account",
            sourcePhase,
            bindingType: "account_sub",
            subKey: row.key,
          });
        }
      }

      if (field.field_type === "address_group") {
        for (const row of parseAddressMappings(field)) {
          if (!isBelugaMapping(row.beluga)) continue;
          bindings.push({
            beluga: row.beluga,
            apiFieldId: belugaMappingToApiFieldId(row.beluga),
            fieldKey: field.field_key,
            fieldLabel: field.label || field.field_key,
            sourcePhase,
            bindingType: "address_sub",
            subKey: row.key,
          });
        }
      }
    }
  }

  return bindings;
}

function resolveBindingValue(
  binding: BelugaBinding,
  responses: Record<string, unknown>,
  field: QuestionnaireFieldSchema | undefined,
  registration?: RegistrationFields,
  extras?: BelugaAccountExtras,
): string | null {
  if (binding.bindingType === "account_sub" && binding.subKey) {
    const fromReg = registrationValueForSubKey(binding.subKey, registration);
    if (fromReg) return fromReg;
    const extraKey = ACCOUNT_SUB_TO_EXTRA[binding.subKey];
    if (extraKey && extras?.[extraKey]) return extras[extraKey]!.trim();
    const fromExtra = extraValueForBeluga(binding.beluga, extras);
    if (fromExtra) return fromExtra;
    return null;
  }

  if (binding.bindingType === "address_sub" && binding.subKey) {
    const raw = responses[binding.fieldKey];
    const parsed = parseAddressGroupValue(raw);
    if (parsed) {
      const part = String(
        parsed[binding.subKey as keyof typeof parsed] ?? "",
      ).trim();
      if (part) return part;
    }
    const extraKey = ADDRESS_SUB_TO_EXTRA[binding.subKey];
    if (extraKey && extras?.[extraKey]) return extras[extraKey]!.trim();
    const fromExtra = extraValueForBeluga(binding.beluga, extras);
    if (fromExtra) return fromExtra;
    return null;
  }

  if (binding.bindingType === "choice_option" && binding.optionValue) {
    const raw = responses[binding.fieldKey];
    const selected = Array.isArray(raw)
      ? raw.map((v) => String(v))
      : raw != null && raw !== ""
        ? [String(raw)]
        : [];
    if (!selected.includes(binding.optionValue)) return null;
    if (!field) return binding.optionValue;
    const opt = (field.options ?? []).find(
      (o) => isRecord(o) && String(o.value) === binding.optionValue,
    );
    if (opt && isRecord(opt)) {
      return String(opt.label || opt.value || binding.optionValue);
    }
    return binding.optionValue;
  }

  const raw = responses[binding.fieldKey];
  if (!fieldHasAnswer(raw)) {
    const fromExtra = extraValueForBeluga(binding.beluga, extras);
    if (fromExtra) return fromExtra;
    return null;
  }
  if (!field) return String(raw);
  if (binding.apiFieldId === "sex") {
    return formatSexForBeluga(formatFieldDisplayValue(field, raw)) ?? null;
  }
  if (binding.apiFieldId === "dob") {
    const iso = String(raw);
    return formatIsoDateForBeluga(iso) ?? iso;
  }
  return formatFieldDisplayValue(field, raw);
}

function findFieldInSchema(
  schema: QuestionnaireVersionSchema | undefined,
  fieldKey: string,
): QuestionnaireFieldSchema | undefined {
  if (!schema) return undefined;
  for (const step of schema.steps) {
    const match = step.fields.find((f) => f.field_key === fieldKey);
    if (match) return match;
  }
  return undefined;
}

function bindingsForBeluga(
  beluga: string,
  bindings: BelugaBinding[],
): BelugaBinding[] {
  return bindings.filter((b) => b.beluga === beluga);
}

function collectQaEntries(
  schema: QuestionnaireVersionSchema,
  responses: Record<string, unknown>,
  sourcePhase: "qualify" | "intake",
  boundFieldKeys: Set<string>,
): BelugaQaEntry[] {
  const entries: BelugaQaEntry[] = [];

  for (const step of reachableSteps(schema.steps, responses)) {
    for (const field of step.fields) {
      const visibilityRule = (
        field as QuestionnaireFieldSchema & {
          visibility_rule?: Record<string, unknown> | null;
        }
      ).visibility_rule;
      if (!evaluateVisibilityRule(visibilityRule ?? null, responses)) continue;
      if (
        field.field_type === "password" ||
        field.field_type === "plugin" ||
        field.field_type === "account" ||
        field.field_type === "review" ||
        field.field_type === "legal_consent"
      ) {
        continue;
      }
      if (boundFieldKeys.has(field.field_key)) continue;
      if (isBelugaMapping(field.maps_to_section)) continue;

      const raw = responses[field.field_key];
      if (!fieldHasAnswer(raw)) continue;

      entries.push({
        question: field.label || field.field_key,
        answer: formatFieldDisplayValue(field, raw),
        source: sourcePhase,
        fieldKey: field.field_key,
      });
    }
  }

  return entries;
}

export type BuildBelugaDoctorReviewInput = {
  qualifySchema?: QuestionnaireVersionSchema | null;
  qualifyResponses?: Record<string, unknown>;
  intakeSchema?: QuestionnaireVersionSchema | null;
  intakeResponses?: Record<string, unknown>;
  registration?: RegistrationFields;
  accountExtras?: BelugaAccountExtras;
};

/**
 * Build the provider-facing review: Beluga-mapped demographics/clinical fields
 * plus unmapped Q/A pairs. Flags required Beluga fields that lack a question
 * assignment or patient answer (values may come from qualify or intake).
 */
export function buildBelugaDoctorReview(
  input: BuildBelugaDoctorReviewInput,
): BelugaDoctorReview {
  const qualifyResponses = input.qualifyResponses ?? {};
  const intakeResponses = input.intakeResponses ?? {};

  const qualifyBindings = input.qualifySchema
    ? collectBelugaBindings(input.qualifySchema, "qualify")
    : [];
  const intakeBindings = input.intakeSchema
    ? collectBelugaBindings(input.intakeSchema, "intake")
    : [];
  const allBindings = [...qualifyBindings, ...intakeBindings];

  const belugaKeys = new Set<string>([
    ...allBindings.map((b) => b.beluga),
    ...BELUGA_VISIT_REQUIRED_MAPPINGS,
  ]);

  const boundFieldKeys = new Set(allBindings.map((b) => b.fieldKey));

  const fields: BelugaReviewField[] = [];
  const missingAssignments: BelugaReviewField[] = [];

  for (const beluga of belugaKeys) {
    if (!beluga.startsWith(BELUGA_PREFIX)) continue;
    const bindings = bindingsForBeluga(beluga, allBindings);
    const label = belugaLabel(beluga);

    if (bindings.length === 0) {
      const isRequired = (
        BELUGA_VISIT_REQUIRED_MAPPINGS as readonly string[]
      ).includes(beluga);
      if (!isRequired) continue;
      const fromExtra = extraValueForBeluga(beluga, input.accountExtras);
      if (fromExtra) {
        fields.push({
          beluga,
          apiFieldId: belugaMappingToApiFieldId(beluga),
          label,
          value: fromExtra,
          status: "filled",
          source: "account",
          sourceLabel: "Account on file",
        });
        continue;
      }
      const row: BelugaReviewField = {
        beluga,
        apiFieldId: belugaMappingToApiFieldId(beluga),
        label,
        value: null,
        status: "unmapped",
      };
      fields.push(row);
      missingAssignments.push(row);
      continue;
    }

    // Intake bindings override qualify for the same Beluga field.
    const ordered = [...bindings].sort((a, b) => {
      if (a.sourcePhase === b.sourcePhase) return 0;
      return a.sourcePhase === "intake" ? -1 : 1;
    });

    let value: string | null = null;
    let source: BelugaReviewField["source"];
    let sourceLabel: string | undefined;

    for (const binding of ordered) {
      const schema =
        binding.sourcePhase === "intake"
          ? input.intakeSchema
          : input.qualifySchema;
      const responses =
        binding.sourcePhase === "intake" ? intakeResponses : qualifyResponses;
      const field = findFieldInSchema(schema ?? undefined, binding.fieldKey);
      const resolved = resolveBindingValue(
        binding,
        responses,
        field,
        input.registration,
        input.accountExtras,
      );
      if (resolved) {
        value = resolved;
        source =
          binding.bindingType === "account_sub"
            ? "account"
            : binding.sourcePhase;
        sourceLabel = binding.fieldLabel;
        break;
      }
    }

    if (!value) {
      value = extraValueForBeluga(beluga, input.accountExtras);
      if (value) {
        source = "account";
        sourceLabel = "Account on file";
      }
    }

    const status: BelugaFieldStatus = value
      ? "filled"
      : bindings.length > 0
        ? "missing_value"
        : "unmapped";

    fields.push({
      beluga,
      apiFieldId: belugaMappingToApiFieldId(beluga),
      label,
      value,
      status,
      source,
      sourceLabel,
    });
  }

  fields.sort((a, b) => a.label.localeCompare(b.label));

  const qaEntries = [
    ...(input.qualifySchema
      ? collectQaEntries(
          input.qualifySchema,
          qualifyResponses,
          "qualify",
          boundFieldKeys,
        )
      : []),
    ...(input.intakeSchema
      ? collectQaEntries(
          input.intakeSchema,
          intakeResponses,
          "intake",
          boundFieldKeys,
        )
      : []),
  ];

  return {
    fields,
    qaEntries,
    missingAssignments: missingAssignments.sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  };
}

/** `formObj` keys → values for dev review (null = not ready to send). */
export function buildBelugaFormObjPreview(
  review: BelugaDoctorReview,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const row of review.fields) {
    if (!row.apiFieldId) continue;
    out[row.apiFieldId] = row.value;
  }
  return out;
}

/** Local dev only — never show Beluga payload debug UI in production builds. */
export function isBelugaReviewDebugEnabled(): boolean {
  return import.meta.env.DEV;
}
