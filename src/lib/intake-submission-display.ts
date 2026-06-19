import {
  FAMILY_HISTORY,
  INTAKE_STEP_LABELS,
  MEDICAL_CONDITIONS,
  PRIOR_MED_DETAIL_FIELDS,
} from "@/lib/intake-steps";
import {
  LIFESTYLE_FIELD_LABELS,
  lifestyleOptionLabel,
} from "@/lib/lifestyle-fields";
import type { IntakeSubmissionSnapshot } from "@/lib/types/mvp";

export type SnapshotDisplayRow = { label: string; value: string };

const MEDICATION_ANSWER_LABELS: Record<string, string> = {
  taking_prescription: "Currently taking prescription medications?",
  taking_otc: "Taking over-the-counter medications?",
  supplements: "Taking supplements?",
  insulin: "Using insulin?",
  sulfonylurea: "Taking sulfonylurea for diabetes?",
  bp_meds: "Blood pressure medications?",
  psych_meds: "Antidepressants or psychiatric medications?",
  opioids: "Currently taking opioids?",
  weight_meds: "Other weight-loss medication?",
};

const LAB_LABELS: Record<string, string> = {
  bp: "Most recent blood pressure",
  a1c: "Most recent A1C",
  glucose: "Most recent fasting glucose",
  cholesterol: "Most recent cholesterol",
  recent_labs: "Labs in last 12 months?",
  willing: "Willing to complete labs if required?",
};

const TREATMENT_LABELS: Record<string, string> = {
  zepbound: "Zepbound injection",
  wegovy_inj: "Wegovy injection",
  wegovy_pill: "Wegovy pill, if available",
  compounded_sema: "Compounded semaglutide injection, if legally available",
  provider_choice: "Not sure — provider to recommend",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((item) => displayValue(item)).join(", ");
  }
  return String(value);
}

function pushRow(
  rows: SnapshotDisplayRow[],
  label: string,
  value: unknown,
): void {
  rows.push({ label, value: displayValue(value) });
}

function pushYesNoMap(
  rows: SnapshotDisplayRow[],
  record: Record<string, unknown> | undefined,
  labels: ReadonlyArray<readonly [string, string]>,
): void {
  for (const [key, label] of labels) {
    if (record && key in record) {
      pushRow(rows, label, record[key]);
      const note = record[`${key}_note`];
      if (note) pushRow(rows, `${label} (notes)`, note);
    }
  }
}

function accountSummaryRows(
  snapshot: IntakeSubmissionSnapshot,
): SnapshotDisplayRow[] {
  const summary = snapshot.account_summary;
  if (!summary) return [];
  return [
    { label: "Name", value: summary.full_name || "—" },
    { label: "Email", value: summary.email || "—" },
    { label: "Phone", value: summary.phone || "—" },
    { label: "Date of birth", value: summary.dob || "—" },
    { label: "State", value: summary.state || "—" },
    {
      label: "Height",
      value:
        summary.height_ft != null
          ? `${summary.height_ft}' ${summary.height_in ?? 0}"`
          : "—",
    },
    {
      label: "Weight",
      value: summary.weight_lbs != null ? `${summary.weight_lbs} lb` : "—",
    },
    {
      label: "Goal weight",
      value:
        summary.goal_weight_lbs != null ? `${summary.goal_weight_lbs} lb` : "—",
    },
    {
      label: "BMI",
      value: summary.bmi != null ? String(summary.bmi) : "—",
    },
  ];
}

function identityContactRows(
  snapshot: IntakeSubmissionSnapshot,
): SnapshotDisplayRow[] {
  const contact = snapshot.identity_contact ?? {};
  const identity = ((snapshot.clinical as { identity?: Record<string, string> })
    ?.identity ?? {}) as Record<string, string>;
  const preferred =
    contact.preferred || identity.preferred || identity.preferred_name || "";
  const street = contact.address || identity.address || "";
  const city = contact.city || identity.city || "";
  const zip = contact.zip || identity.zip || "";
  const county = contact.county || identity.county || "";
  const emergencyName = contact.emergency_name || identity.emergency_name || "";
  const emergencyPhone =
    contact.emergency_phone || identity.emergency_phone || "";

  const rows: SnapshotDisplayRow[] = [];
  pushRow(rows, "Preferred first name", preferred);
  const addressParts = [street, city, zip].filter(Boolean).join(", ");
  pushRow(rows, "Home address", addressParts || street);
  pushRow(rows, "County", county);
  pushRow(rows, "Emergency contact name", emergencyName);
  pushRow(rows, "Emergency contact phone", emergencyPhone);
  return rows;
}

export function snapshotRowsForStep(
  step: number,
  snapshot: IntakeSubmissionSnapshot,
): SnapshotDisplayRow[] {
  const clinical = (snapshot.clinical ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const rows: SnapshotDisplayRow[] = [];

  switch (step) {
    case 0:
      return [
        ...accountSummaryRows(snapshot),
        ...identityContactRows(snapshot),
      ];
    case 1: {
      const body = clinical.body_metrics ?? {};
      pushRow(rows, "Highest adult weight (lb)", body.highest_weight);
      pushRow(rows, "Lowest adult weight (lb)", body.lowest_weight);
      const goals = body.goals;
      pushRow(
        rows,
        "Main goals",
        Array.isArray(goals) ? goals.join(", ") : goals,
      );
      return rows;
    }
    case 2: {
      const wh = clinical.weight_history ?? {};
      pushRow(
        rows,
        "Weight-loss methods tried",
        Array.isArray(wh.methods) ? wh.methods.join(", ") : wh.methods,
      );
      const priorMeds = Array.isArray(wh.prior_meds)
        ? (wh.prior_meds as string[])
        : [];
      pushRow(rows, "Prior GLP-1 / weight medications", priorMeds.join(", "));
      const details = (wh.prior_details ?? {}) as Record<
        string,
        Record<string, string>
      >;
      for (const med of priorMeds) {
        const detail = details[med];
        if (!detail) continue;
        for (const [field, label] of PRIOR_MED_DETAIL_FIELDS) {
          pushRow(rows, `${med} — ${label}`, detail[field]);
        }
      }
      return rows;
    }
    case 3:
      pushYesNoMap(
        rows,
        clinical.medical_conditions,
        MEDICAL_CONDITIONS as unknown as ReadonlyArray<
          readonly [string, string]
        >,
      );
      return rows;
    case 4:
      pushYesNoMap(
        rows,
        clinical.family_history,
        FAMILY_HISTORY as unknown as ReadonlyArray<readonly [string, string]>,
      );
      return rows;
    case 5: {
      const meds = clinical.medications as
        | {
            answers?: Record<string, unknown>;
            list?: Array<Record<string, string>>;
          }
        | undefined;
      for (const [key, label] of Object.entries(MEDICATION_ANSWER_LABELS)) {
        pushRow(rows, label, meds?.answers?.[key]);
      }
      const list = meds?.list ?? [];
      list.forEach((entry, index) => {
        pushRow(
          rows,
          `Medication ${index + 1}`,
          [entry.name, entry.dose, entry.frequency, entry.reason]
            .filter(Boolean)
            .join(" · "),
        );
      });
      return rows;
    }
    case 6: {
      const allergies = clinical.allergies as
        | {
            answers?: Record<string, unknown>;
            list?: Array<Record<string, string>>;
          }
        | undefined;
      pushRow(rows, "Medication allergies?", allergies?.answers?.has_med);
      pushRow(rows, "Food allergies?", allergies?.answers?.has_food);
      const list = allergies?.list ?? [];
      list.forEach((entry, index) => {
        pushRow(
          rows,
          `Allergy ${index + 1}`,
          [entry.allergy, entry.reaction, entry.severity]
            .filter(Boolean)
            .join(" · "),
        );
      });
      return rows;
    }
    case 7: {
      const preg = clinical.pregnancy ?? {};
      pushRow(rows, "Date of last menstrual period", preg.lmp);
      pushRow(rows, "Using contraception?", preg.contraception);
      pushRow(
        rows,
        "Pregnancy / breastfeeding understanding acknowledged",
        preg.understand,
      );
      return rows;
    }
    case 8: {
      const life = clinical.lifestyle ?? {};
      for (const [key, label] of Object.entries(LIFESTYLE_FIELD_LABELS)) {
        if (key === "drugs_detail" && life.drugs !== "yes") continue;
        pushRow(rows, label, lifestyleOptionLabel(key, life[key]));
      }
      return rows;
    }
    case 9: {
      const labs = clinical.labs ?? {};
      for (const [key, label] of Object.entries(LAB_LABELS)) {
        pushRow(rows, label, labs[key]);
      }
      return rows;
    }
    case 10: {
      const prefs = clinical.medication_preferences ?? {};
      const treatment = prefs.treatment;
      pushRow(
        rows,
        "Treatment option of interest",
        typeof treatment === "string"
          ? (TREATMENT_LABELS[treatment] ?? treatment)
          : treatment,
      );
      pushRow(rows, "Comfortable self-injecting?", prefs.self_inject);
      pushRow(
        rows,
        "Different shipping address for medication",
        prefs.use_different_shipping_address,
      );
      if (prefs.use_different_shipping_address) {
        const ship = [
          prefs.shipping_address,
          prefs.shipping_city,
          prefs.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ");
        pushRow(rows, "Medication shipping address", ship);
      }
      return rows;
    }
    case 11: {
      const acks = clinical.safety_acknowledgments ?? {};
      pushRow(
        rows,
        "Intake acknowledgments agreed",
        acks.agreed ?? Object.values(acks).some((v) => v === true),
      );
      const consent = snapshot.consent;
      if (consent) {
        pushRow(rows, "Signature", consent.typed_signature);
        pushRow(rows, "Signed at", consent.signed_at);
        pushRow(rows, "Telehealth consent", consent.telehealth_consent);
        pushRow(rows, "Privacy acknowledgment", consent.privacy_acknowledgment);
      }
      return rows;
    }
    default:
      return rows;
  }
}

export function snapshotStepTitle(step: number): string {
  return INTAKE_STEP_LABELS[step] ?? `Step ${step + 1}`;
}

export { INTAKE_STEP_LABELS };
