import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import {
  hydrateAddressGroupFromSection,
  parseAddressGroupValue,
} from "@/lib/questionnaire/address-group";
import {
  emptyShippingAddressValue,
  type ShippingAddressValue,
} from "@/lib/shipping-address";
import { formatUsStateName } from "@/lib/us-states";
import type {
  EligibilityResponses,
  MedicalIntake,
  PatientProfile,
  SexAssignedAtBirth,
  User,
} from "@/lib/types/mvp";

export type ResolvedAccountDemographics = {
  dob: string;
  state: string;
  sexAtBirth: "male" | "female" | "";
};

function normalizeSexValue(raw: unknown): "male" | "female" | "" {
  if (raw === null || raw === undefined || raw === "") return "";
  const text = String(raw).trim().toLowerCase();
  if (text === "female" || text === "f") return "female";
  if (text === "male" || text === "m") return "male";
  return "";
}

function sexFromChoiceField(
  field: QuestionnaireFieldSchema,
  raw: unknown,
): "male" | "female" | "" {
  const direct = normalizeSexValue(raw);
  if (direct) return direct;
  const selected = String(raw ?? "");
  for (const opt of field.options ?? []) {
    if (String(opt.value) !== selected) continue;
    const fromLabel = normalizeSexValue(opt.label);
    if (fromLabel) return fromLabel;
  }
  return "";
}

function extractFromQuestionnaireFields(
  fields: QuestionnaireFieldSchema[],
  responses: Record<string, unknown>,
): Partial<ResolvedAccountDemographics> {
  let dob = "";
  let state = "";
  let sexAtBirth: "male" | "female" | "" = "";

  for (const field of fields) {
    const raw = responses[field.field_key];
    if (raw === undefined || raw === null || raw === "") continue;
    const mapping = field.maps_to_section ?? "";

    if (field.field_type === "dob" || mapping === "beluga:dob") {
      dob = String(raw).slice(0, 10);
    }

    if (mapping === "beluga:sex" || field.field_key === "sex") {
      sexAtBirth = sexFromChoiceField(field, raw);
    }

    if (field.field_type === "address_group") {
      const parsed = parseAddressGroupValue(raw);
      if (parsed?.state) {
        state = formatUsStateName(parsed.state);
      }
    }
  }

  return { dob, state, sexAtBirth };
}

function stateFromIntakeSections(intake: MedicalIntake | null): string {
  if (!intake) return "";
  const identity = (intake.identity ?? {}) as Record<string, unknown>;
  if (identity.state) return formatUsStateName(String(identity.state));
  const prefs = (intake.medication_preferences ?? {}) as Record<
    string,
    unknown
  >;
  if (prefs.shipping_state) {
    return formatUsStateName(String(prefs.shipping_state));
  }
  return "";
}

/** Merge account demographics from user, profile, eligibility, and intake answers. */
export function resolveAccountDemographics(input: {
  user: User;
  profile: PatientProfile | null;
  eligibility: EligibilityResponses | null;
  intake: MedicalIntake | null;
  questionnaireFields?: QuestionnaireFieldSchema[];
}): ResolvedAccountDemographics {
  const responses = (input.intake?.questionnaire_responses ?? {}) as Record<
    string,
    unknown
  >;
  const fromQuestionnaire = input.questionnaireFields?.length
    ? extractFromQuestionnaireFields(input.questionnaireFields, responses)
    : extractFromQuestionnaireResponsesHeuristic(responses);

  const profileSex =
    input.profile?.sex_assigned_at_birth === "male" ||
    input.profile?.sex_assigned_at_birth === "female"
      ? input.profile.sex_assigned_at_birth
      : "";
  const eligibilitySex =
    input.eligibility?.sex_assigned_at_birth === "male" ||
    input.eligibility?.sex_assigned_at_birth === "female"
      ? input.eligibility.sex_assigned_at_birth
      : "";

  const screening = input.intake?.account_screening as
    | { dob?: string; state?: string }
    | undefined;

  return {
    dob:
      input.user.dob ||
      input.eligibility?.dob ||
      screening?.dob ||
      fromQuestionnaire.dob ||
      "",
    state:
      input.user.state ||
      input.eligibility?.state ||
      screening?.state ||
      fromQuestionnaire.state ||
      stateFromIntakeSections(input.intake) ||
      "",
    sexAtBirth:
      profileSex || eligibilitySex || fromQuestionnaire.sexAtBirth || "",
  };
}

/** Best-effort extraction when the questionnaire schema is not loaded. */
function extractFromQuestionnaireResponsesHeuristic(
  responses: Record<string, unknown>,
): Partial<ResolvedAccountDemographics> {
  let dob = "";
  let state = "";
  let sexAtBirth: "male" | "female" | "" = "";

  for (const [key, raw] of Object.entries(responses)) {
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      dob = raw;
    }
    if (key.toLowerCase().includes("sex")) {
      sexAtBirth = normalizeSexValue(raw) || sexAtBirth;
    }
    const address = parseAddressGroupValue(raw);
    if (address?.state) {
      state = formatUsStateName(address.state);
    }
  }

  return { dob, state, sexAtBirth };
}

export function allQuestionnaireFields(
  steps: { fields: QuestionnaireFieldSchema[] }[],
): QuestionnaireFieldSchema[] {
  return steps.flatMap((step) => step.fields);
}

function addressHasContent(value: ShippingAddressValue | null): boolean {
  return Boolean(value && (value.address || value.city || value.zip));
}

/** Pull an address_group answer straight from the questionnaire responses. */
function shippingFromResponses(
  intake: MedicalIntake,
  questionnaireFields: QuestionnaireFieldSchema[],
): ShippingAddressValue | null {
  const responses = (intake.questionnaire_responses ?? {}) as Record<
    string,
    unknown
  >;
  let fallback: ShippingAddressValue | null = null;
  for (const field of questionnaireFields) {
    if (field.field_type !== "address_group") continue;
    const parsed = parseAddressGroupValue(responses[field.field_key]);
    if (!addressHasContent(parsed)) continue;
    if (parsed!.verified) return parsed;
    fallback = fallback ?? parsed;
  }
  return fallback;
}

/**
 * Reconstruct the address from the intake's flattened sections. Dynamic
 * `address_group` fields map to `medication_preferences` (shipping_*) or
 * `identity`, so check the shipping section first, then the home address.
 */
function shippingFromIntakeSections(
  intake: MedicalIntake,
): ShippingAddressValue | null {
  const shipping = hydrateAddressGroupFromSection(
    "medication_preferences",
    (intake.medication_preferences ?? {}) as Record<string, unknown>,
  );
  if (addressHasContent(shipping)) return shipping;
  const home = hydrateAddressGroupFromSection(
    "identity",
    (intake.identity ?? {}) as Record<string, unknown>,
  );
  if (addressHasContent(home)) return home;
  return null;
}

/**
 * Resolve the shipping address shown on the account page. The canonical store
 * is `PatientProfile`, but dynamic intake answers may not have synced there yet
 * (e.g. an `address_group` mapped to `medication_preferences`), so fall back to
 * the questionnaire responses and flattened intake sections.
 */
export function resolveShippingAddress(input: {
  profile: PatientProfile | null;
  intake: MedicalIntake | null;
  questionnaireFields?: QuestionnaireFieldSchema[];
  fallbackState?: string;
}): ShippingAddressValue {
  const fallbackState = input.fallbackState ?? "";

  if (
    input.profile &&
    (input.profile.address || input.profile.city || input.profile.zip)
  ) {
    return {
      address: input.profile.address || "",
      city: input.profile.city || "",
      state: fallbackState,
      zip: input.profile.zip || "",
      county: input.profile.county || "",
      country: "US",
      verified: false,
    };
  }

  if (input.intake) {
    const fromResponses = input.questionnaireFields?.length
      ? shippingFromResponses(input.intake, input.questionnaireFields)
      : null;
    const resolved = fromResponses ?? shippingFromIntakeSections(input.intake);
    if (resolved) {
      return {
        ...resolved,
        state: resolved.state || fallbackState,
        country: resolved.country || "US",
      };
    }
  }

  return {
    ...emptyShippingAddressValue(),
    state: fallbackState,
    country: "US",
  };
}

/** @deprecated Gender identity is not collected in the funnel right now. */
export function resolveGenderIdentity(
  profile: PatientProfile | null,
  eligibility: EligibilityResponses | null,
): SexAssignedAtBirth | "" {
  return profile?.gender_identity ?? eligibility?.gender_identity ?? "";
}
