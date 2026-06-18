import type {
  EligibilityResponses,
  MedicalIntake,
  SafetyFlag,
  User,
} from "@/lib/types/mvp";

function flag(
  userId: string,
  flag_type: string,
  description: string,
  severity: SafetyFlag["severity"] = "medium",
): SafetyFlag {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    flag_type,
    severity,
    description,
    created_at: new Date().toISOString(),
  };
}

export function computeBmi(
  heightFt: string,
  heightIn: string,
  weight: string,
): number | null {
  const ft = Number(heightFt);
  const inch = Number(heightIn);
  const w = Number(weight);
  const totalIn = ft * 12 + inch;
  if (!totalIn || !w) return null;
  return Math.round((w / (totalIn * totalIn)) * 703 * 10) / 10;
}

export function computeAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function computeSafetyFlags(
  user: User,
  eligibility: EligibilityResponses | null,
  intake: MedicalIntake | null,
  consentComplete: boolean,
): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const uid = user.id;

  const bmi =
    eligibility?.bmi ??
    computeBmi(
      String(eligibility?.height_ft ?? ""),
      String(eligibility?.height_in ?? 0),
      String(eligibility?.weight_lbs ?? ""),
    );
  const age = computeAge(user.dob);

  if (bmi != null && bmi < 27) {
    flags.push(flag(uid, "bmi_low", `BMI ${bmi} is under 27`, "medium"));
  }
  if (age != null && age < 18) {
    flags.push(flag(uid, "under_18", "Patient is under 18", "high"));
  }

  const safety = eligibility?.safety_screen ?? {};
  if (safety.pregnant) flags.push(flag(uid, "pregnant", "Currently pregnant", "high"));
  if (safety.trying_to_conceive) {
    flags.push(flag(uid, "trying_pregnant", "Trying to become pregnant", "high"));
  }
  if (safety.breastfeeding) {
    flags.push(flag(uid, "breastfeeding", "Currently breastfeeding", "high"));
  }
  if (safety.thyroid_cancer) {
    flags.push(flag(uid, "thyroid_cancer", "Personal/family medullary thyroid cancer history", "high"));
  }
  if (safety.men2) flags.push(flag(uid, "men2", "MEN2 history", "high"));
  if (safety.pancreatitis) {
    flags.push(flag(uid, "pancreatitis", "Pancreatitis history", "high"));
  }
  if (safety.glp1_reaction) {
    flags.push(flag(uid, "glp1_reaction", "Prior severe GLP-1 reaction", "high"));
  }

  if (!intake) return flags;

  const conditions = intake.medical_conditions ?? {};
  if (conditions.gallbladder) {
    flags.push(flag(uid, "gallbladder", "Gallbladder disease reported", "medium"));
  }
  if (conditions.kidney_severe) {
    flags.push(flag(uid, "kidney_severe", "Severe kidney disease reported", "high"));
  }
  if (conditions.gastroparesis) {
    flags.push(flag(uid, "gastroparesis", "Gastroparesis reported", "high"));
  }
  if (conditions.eating_disorder) {
    flags.push(flag(uid, "eating_disorder", "Eating disorder history", "high"));
  }
  if (conditions.suicidal) {
    flags.push(flag(uid, "suicidal", "Suicidal thoughts or self-harm history", "high"));
  }
  if (conditions.upcoming_surgery) {
    flags.push(flag(uid, "upcoming_surgery", "Upcoming surgery or anesthesia", "medium"));
  }

  const meds = intake.medications?.answers ?? {};
  if (meds.insulin) flags.push(flag(uid, "insulin", "Current insulin use", "high"));
  if (meds.sulfonylurea) {
    flags.push(flag(uid, "sulfonylurea", "Current sulfonylurea use", "high"));
  }

  const medList = intake.medications?.list ?? [];
  if (medList.length === 0 && meds.taking_prescription === true) {
    flags.push(flag(uid, "missing_meds", "Missing current medication list", "low"));
  }

  const prefs = intake.medication_preferences ?? {};
  if (!prefs.preferred_pharmacy && !prefs.shipping_preference) {
    flags.push(flag(uid, "missing_pharmacy", "Missing pharmacy preference", "low"));
  }

  if (!consentComplete) {
    flags.push(flag(uid, "missing_consent", "Missing required consent", "high"));
  }

  return flags;
}
