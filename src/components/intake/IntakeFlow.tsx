import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { EligibilityAccountEditor } from "@/components/intake/EligibilityAccountEditor";
import { DocumentTypeUpload } from "@/components/portal/DocumentTypeUpload";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AddressFields } from "@/components/quiz/AddressFields";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { toast } from "sonner";
import {
  ChoiceCard,
  Field,
  QuizNav,
  QuizShell,
  YesNoField,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import {
  createDocumentUpload,
  fetchDocuments,
  fetchEligibilityMe,
  fetchIntakeMe,
  isApiEnabled,
  syncIntake,
  uploadDocumentFile,
} from "@/lib/api/client";
import { sanitizePreferredFirstName } from "@/lib/form-validation";
import {
  FAMILY_HISTORY,
  GOAL_OPTIONS,
  IDENTITY_FIELDS,
  INTAKE_EXCLUDED_CONDITION_KEYS,
  INTAKE_STEP_LABELS,
  isIntakeStepComplete,
  getIntakeStepError,
  MEDICAL_CONDITIONS,
  PRIOR_MEDS,
  WEIGHT_METHODS,
  emptyIntakeData,
  emptyPriorMedDetails,
  normalizeIntake,
  PHARMACY_PICKUP_KEYS,
  resolveIntakeStepIndex,
  isIntakeStepApplicable,
  PRIOR_MED_DETAIL_FIELDS,
  normalizePriorDetails,
  type PriorMedDetails,
} from "@/lib/intake-steps";
import { INTAKE_ACKNOWLEDGMENT_KEY } from "@/lib/intake-acknowledgments";
import {
  getApplicableIntakeStepIndices,
  nextApplicableIntakeStep,
  prevApplicableIntakeStep,
} from "@/lib/reproductive-intake";
import { computeBmi } from "@/lib/safety-flags";
import type {
  DocumentType,
  EligibilityResponses,
  MedicalIntake,
  UploadedDocument,
} from "@/lib/types/mvp";
import { getIntake, saveIntake } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function IntakeFlow({ mode }: { mode: "funnel" | "portal" }) {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const userId = session?.user.id ?? "";
  const [step, setStep] = useState(0);
  const [data, setData] = useState<MedicalIntake>(() =>
    makeDraft(userId || "pending"),
  );
  const [eligibility, setEligibility] = useState<EligibilityResponses | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const total = INTAKE_STEP_LABELS.length;
  const intakeEligibility = useMemo(
    () =>
      eligibility
        ? {
            treatment_interest: eligibility.treatment_interest,
            weight_lbs: eligibility.weight_lbs,
            sex_assigned_at_birth: eligibility.sex_assigned_at_birth,
            gender_identity: eligibility.gender_identity,
          }
        : null,
    [eligibility],
  );
  const applicableSteps = useMemo(
    () => getApplicableIntakeStepIndices(intakeEligibility, total),
    [intakeEligibility, total],
  );
  const applicableStepIndex = applicableSteps.indexOf(step);
  const progress =
    applicableStepIndex >= 0
      ? ((applicableStepIndex + 1) / applicableSteps.length) * 100
      : ((step + 1) / total) * 100;
  const isLastApplicableStep =
    applicableStepIndex === applicableSteps.length - 1;

  const intakeConditions = useMemo(
    () =>
      MEDICAL_CONDITIONS.filter(
        ([k]) => !INTAKE_EXCLUDED_CONDITION_KEYS.has(k),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [draft, elig] = await Promise.all([
        fetchIntakeMe(),
        fetchEligibilityMe(),
      ]);
      if (cancelled) return;
      setEligibility(elig);
      const restored =
        draft ?? (!isApiEnabled() && userId ? getIntake(userId) : null);
      if (restored) {
        const normalized = normalizeIntake(restored);
        setData(normalized);
        setStep(resolveIntakeStepIndex(normalized, elig));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (loading || applicableSteps.includes(step)) return;
    setStep(resolveIntakeStepIndex(data, intakeEligibility));
  }, [loading, step, applicableSteps, data, intakeEligibility]);

  useEffect(() => {
    if (!loading) saveIntake(data);
  }, [data, loading]);

  useEffect(() => {
    if (step !== 9 || !isApiEnabled()) return;
    let cancelled = false;
    (async () => {
      try {
        const docs = await fetchDocuments();
        if (cancelled) return;
        setUploadedDocs(docs);
        if (docs.length > 0) {
          setData((d) => {
            const labsSection = d.labs as Record<string, string | boolean>;
            if (labsSection.uploads_noted === true) return d;
            return {
              ...d,
              labs: { ...labsSection, uploads_noted: true },
              updated_at: new Date().toISOString(),
            };
          });
        }
      } catch {
        // Non-blocking — user can still upload on this visit.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 10) return;
    setData((d) => {
      const current = d.medication_preferences as Record<
        string,
        string | boolean
      >;
      const hasStalePickupFields = PHARMACY_PICKUP_KEYS.some(
        (key) => current[key] != null && current[key] !== "",
      );
      if (current.shipping_preference === "shipping" && !hasStalePickupFields) {
        return d;
      }
      const next: Record<string, string | boolean> = {
        ...current,
        shipping_preference: "shipping",
      };
      for (const key of PHARMACY_PICKUP_KEYS) {
        delete next[key];
      }
      return {
        ...d,
        medication_preferences: next,
        updated_at: new Date().toISOString(),
      };
    });
  }, [step]);

  function patch<K extends keyof MedicalIntake>(
    section: K,
    value: MedicalIntake[K],
  ) {
    setData((d) => ({
      ...d,
      [section]: value,
      updated_at: new Date().toISOString(),
    }));
  }

  /** Merge identity fields without clobbering values updated elsewhere (e.g. autofill). */
  function patchIdentity(partial: Record<string, string>) {
    setData((d) => ({
      ...d,
      identity: {
        ...(d.identity as Record<string, string>),
        ...partial,
      },
      updated_at: new Date().toISOString(),
    }));
  }

  const emergencyNameRef = useRef<HTMLInputElement>(null);
  const emergencyPhoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 0) return;

    const syncEmergencyFromDom = () => {
      const name = emergencyNameRef.current?.value ?? "";
      const phone = emergencyPhoneRef.current?.value ?? "";
      setData((d) => {
        const identity = d.identity as Record<string, string>;
        if (
          identity.emergency_name === name &&
          identity.emergency_phone === phone
        ) {
          return d;
        }
        return {
          ...d,
          identity: {
            ...identity,
            emergency_name: name,
            emergency_phone: phone,
          },
          updated_at: new Date().toISOString(),
        };
      });
    };

    const id = window.setInterval(syncEmergencyFromDom, 300);
    return () => window.clearInterval(id);
  }, [step]);

  async function persistDraft() {
    const saved = await syncIntake({
      ...data,
      status: data.status,
      updated_at: new Date().toISOString(),
    });
    if (saved) {
      setData(normalizeIntake(saved));
    }
  }

  async function handleDocumentFilesSelected(
    files: FileList,
    documentType: DocumentType,
  ) {
    if (!files.length) return;
    if (!isApiEnabled()) {
      setUploadError("Document upload requires the backend API.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const newDocs: UploadedDocument[] = [];
      for (const file of Array.from(files)) {
        const response = await createDocumentUpload({
          document_type: documentType,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
        });
        await uploadDocumentFile(file, response);
        newDocs.push(response.document);
      }
      setUploadedDocs((prev) => [...prev, ...newDocs]);
      patch("labs", { ...labs, uploads_noted: true });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload file(s).",
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveAndExit() {
    await persistDraft();
    navigate({ to: "/dashboard" });
  }

  function togglePriorMed(med: string) {
    const selected = wh.prior_meds.includes(med);
    const nextMeds = selected
      ? wh.prior_meds.filter((x) => x !== med)
      : [...wh.prior_meds, med];
    patch("weight_history", {
      ...wh,
      prior_meds: nextMeds,
      prior_details: normalizePriorDetails(nextMeds, wh.prior_details),
    });
  }

  function patchPriorMedDetail(
    med: string,
    field: keyof PriorMedDetails,
    value: string,
  ) {
    patch("weight_history", {
      ...wh,
      prior_details: {
        ...wh.prior_details,
        [med]: {
          ...(wh.prior_details[med] ?? emptyPriorMedDetails()),
          [field]: value,
        },
      },
    });
  }

  const id = data.identity as Record<string, string>;
  const body = data.body_metrics as Record<string, string | string[]>;
  const wh = data.weight_history as {
    methods: string[];
    prior_meds: string[];
    prior_details: Record<string, PriorMedDetails>;
  };
  const mc = data.medical_conditions as Record<string, boolean | string>;
  const fh = data.family_history as Record<string, boolean>;
  const meds = data.medications;
  const allergies = data.allergies;
  const preg = data.pregnancy as Record<string, string | boolean>;
  const life = data.lifestyle as Record<string, string | boolean>;
  const labs = data.labs as Record<string, string | boolean>;
  const prefs = data.medication_preferences as Record<string, string | boolean>;
  const acks = data.safety_acknowledgments as Record<string, boolean>;

  const canContinue = isIntakeStepComplete(step, data, intakeEligibility);
  const stepValidationError = getIntakeStepError(step, data, intakeEligibility);

  async function handleNext() {
    if (!canContinue || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await persistDraft();
      if (!isLastApplicableStep) {
        setStep(nextApplicableIntakeStep(step, intakeEligibility, total));
      } else if (mode === "portal") {
        toast.success("Your intake has been saved.");
      } else {
        navigate({ to: "/consent" });
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your progress.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handlePortalStepSelect(index: number) {
    if (!applicableSteps.includes(index)) return;
    setError("");
    setStep(index);
  }

  const summaryBmi =
    eligibility?.bmi ??
    computeBmi(
      String(eligibility?.height_ft ?? ""),
      String(eligibility?.height_in ?? 0),
      String(eligibility?.weight_lbs ?? ""),
    );
  const currentWeightLbs =
    eligibility?.weight_lbs != null ? String(eligibility.weight_lbs) : "";
  const showTreatmentPrefs = !eligibility?.treatment_interest;

  if (!session) {
    return (
      <div className="text-center text-muted-foreground">
        Loading your session…
      </div>
    );
  }

  if (loading) {
    return mode === "portal" ? (
      <div className="mx-auto max-w-6xl text-center text-muted-foreground">
        Loading your intake…
      </div>
    ) : (
      <FlowLayout progress={0}>
        <div className="w-full max-w-xl text-center text-muted-foreground">
          Loading your intake…
        </div>
      </FlowLayout>
    );
  }

  const footerNav = (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            setStep(prevApplicableIntakeStep(step, intakeEligibility, total))
          }
          className="text-sm text-muted-foreground hover:text-foreground"
          disabled={applicableStepIndex <= 0}
        >
          ← Back
        </button>
        {mode === "funnel" && (
          <button
            type="button"
            onClick={saveAndExit}
            className="text-sm text-primary underline"
          >
            Save & continue later
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && stepValidationError && (
        <p className="text-sm text-destructive">{stepValidationError}</p>
      )}
      <QuizNav
        showBack={false}
        onNext={() => void handleNext()}
        nextDisabled={!canContinue || submitting}
        nextLoading={submitting}
        nextLabel={
          isLastApplicableStep
            ? mode === "portal"
              ? "Save changes"
              : "Continue to consent"
            : "Continue →"
        }
      />
    </div>
  );

  const stepFields = (
    <>
      {step === 0 && (
        <div className="grid gap-4">
          <EligibilityAccountEditor
            user={session.user}
            eligibility={eligibility}
            bmi={summaryBmi}
            onSaved={(user, elig) => {
              setSession({ ...session, user });
              setEligibility(elig);
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preferred first name (optional)">
              <input
                className={inputCls}
                value={id.preferred ?? ""}
                autoComplete="given-name"
                onChange={(e) =>
                  patchIdentity({
                    preferred: sanitizePreferredFirstName(e.target.value),
                  })
                }
                onInput={(e) =>
                  patchIdentity({
                    preferred: sanitizePreferredFirstName(
                      e.currentTarget.value,
                    ),
                  })
                }
              />
            </Field>
            <AddressFields
              expectedState={session.user.state || eligibility?.state}
              value={{
                address: id.address ?? "",
                city: id.city ?? "",
                zip: id.zip ?? "",
                county: id.county ?? "",
                verified: id.address_verified === "true",
              }}
              onChange={({ address, city, zip, county, verified }) =>
                patchIdentity({
                  address,
                  city,
                  zip,
                  county,
                  address_verified: verified ? "true" : "",
                })
              }
            />
            {IDENTITY_FIELDS.filter(
              ([k]) => k === "emergency_name" || k === "emergency_phone",
            ).map(([k, label]) => (
              <Field key={k} label={label} required>
                <input
                  ref={
                    k === "emergency_name"
                      ? emergencyNameRef
                      : emergencyPhoneRef
                  }
                  className={inputCls}
                  type={k === "emergency_phone" ? "tel" : "text"}
                  value={id[k] ?? ""}
                  autoComplete={k === "emergency_phone" ? "tel" : "name"}
                  onChange={(e) => patchIdentity({ [k]: e.target.value })}
                  onInput={(e) => patchIdentity({ [k]: e.currentTarget.value })}
                />
              </Field>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <p className="rounded-2xl bg-primary-soft/50 px-4 py-3 text-sm text-muted-foreground">
            Height, weight, and goal weight are already on file from your
            eligibility check
            {summaryBmi != null ? ` (BMI ${summaryBmi})` : ""}.
          </p>
          {(
            [
              {
                key: "highest_weight" as const,
                label:
                  "What is the most you've ever weighed in your adult life? (lbs)",
              },
              {
                key: "lowest_weight" as const,
                label:
                  "What is the least you've ever weighed in your adult life? (lbs)",
              },
            ] as const
          ).map(({ key, label }) => (
            <Field key={key} label={label} required>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="number"
                  className={inputCls}
                  value={(body[key] as string) ?? ""}
                  onChange={(e) =>
                    patch("body_metrics", { ...body, [key]: e.target.value })
                  }
                />
                {currentWeightLbs && (
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
                    onClick={() =>
                      patch("body_metrics", {
                        ...body,
                        [key]: currentWeightLbs,
                      })
                    }
                  >
                    Same as current weight
                  </button>
                )}
              </div>
            </Field>
          ))}
          <Field label="Main goals (select all)" required>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((g) => (
                <ChoiceCard
                  key={g}
                  compact
                  selected={(body.goals as string[]).includes(g)}
                  onClick={() => {
                    const goals = body.goals as string[];
                    patch("body_metrics", {
                      ...body,
                      goals: goals.includes(g)
                        ? goals.filter((x) => x !== g)
                        : [...goals, g],
                    });
                  }}
                  title={g}
                />
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Field label="Weight-loss methods tried" required>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEIGHT_METHODS.map((m) => (
                <ChoiceCard
                  key={m}
                  compact
                  selected={wh.methods.includes(m)}
                  onClick={() =>
                    patch("weight_history", {
                      ...wh,
                      methods: wh.methods.includes(m)
                        ? wh.methods.filter((x) => x !== m)
                        : [...wh.methods, m],
                    })
                  }
                  title={m}
                />
              ))}
            </div>
          </Field>
          <Field label="Prior GLP-1 / weight medications used">
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIOR_MEDS.map((m) => (
                <ChoiceCard
                  key={m}
                  compact
                  selected={wh.prior_meds.includes(m)}
                  onClick={() => togglePriorMed(m)}
                  title={m}
                />
              ))}
            </div>
          </Field>
          {wh.prior_meds.length > 0 && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                For each medication below, tell your clinician the dose, when
                you stopped, and why — this helps with safe prescribing. It does
                not affect eligibility.
              </p>
              {wh.prior_meds.map((med) => (
                <div
                  key={med}
                  className="grid gap-3 rounded-2xl border border-border px-4 py-4"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    {med}
                  </h3>
                  {PRIOR_MED_DETAIL_FIELDS.map(([field, label, required]) => (
                    <Field key={field} label={label} required={required}>
                      <input
                        className={inputCls}
                        value={wh.prior_details[med]?.[field] ?? ""}
                        onChange={(e) =>
                          patchPriorMedDetail(med, field, e.target.value)
                        }
                      />
                    </Field>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">
            Conditions from your eligibility screening are already on file and
            not shown again.
          </p>
          {intakeConditions.map(([k, label]) => (
            <div key={k}>
              <YesNoField
                label={label}
                value={mc[k] === true ? true : mc[k] === false ? false : null}
                onChange={(v) => patch("medical_conditions", { ...mc, [k]: v })}
              />
              {mc[k] === true && (
                <input
                  className={`${inputCls} mt-2`}
                  placeholder="Optional explanation"
                  value={(mc[`${k}_note`] as string) ?? ""}
                  onChange={(e) =>
                    patch("medical_conditions", {
                      ...mc,
                      [`${k}_note`]: e.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          {FAMILY_HISTORY.map(([k, label]) => (
            <YesNoField
              key={k}
              label={label}
              required
              value={fh[k] ?? null}
              onChange={(v) => patch("family_history", { ...fh, [k]: v })}
            />
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-4">
          {[
            [
              "taking_prescription",
              "Currently taking prescription medications?",
            ],
            ["taking_otc", "Taking over-the-counter medications?"],
            ["supplements", "Taking supplements?"],
            ["insulin", "Using insulin?"],
            ["sulfonylurea", "Taking sulfonylurea for diabetes?"],
            ["bp_meds", "Blood pressure medications?"],
            ["psych_meds", "Antidepressants or psychiatric medications?"],
            ["opioids", "Currently taking opioids?"],
            ["weight_meds", "Other weight-loss medication?"],
          ].map(([k, label]) => (
            <YesNoField
              key={k}
              label={label}
              required
              value={
                meds.answers[k] === true
                  ? true
                  : meds.answers[k] === false
                    ? false
                    : null
              }
              onChange={(v) =>
                patch("medications", {
                  ...meds,
                  answers: { ...meds.answers, [k]: v },
                })
              }
            />
          ))}
          <Field label="Medication list">
            {meds.list.map((m, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
                {(["name", "dose", "frequency", "reason"] as const).map((f) => (
                  <input
                    key={f}
                    className={inputCls}
                    placeholder={f}
                    value={m[f]}
                    onChange={(e) => {
                      const list = [...meds.list];
                      list[i] = { ...list[i], [f]: e.target.value };
                      patch("medications", { ...meds, list });
                    }}
                  />
                ))}
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() =>
                patch("medications", {
                  ...meds,
                  list: [
                    ...meds.list,
                    { name: "", dose: "", frequency: "", reason: "" },
                  ],
                })
              }
            >
              + Add medication
            </button>
          </Field>
        </div>
      )}

      {step === 6 && (
        <div className="grid gap-4">
          <YesNoField
            label="Medication allergies?"
            required
            value={
              allergies.answers.has_med === true
                ? true
                : allergies.answers.has_med === false
                  ? false
                  : null
            }
            onChange={(v) =>
              patch("allergies", {
                ...allergies,
                answers: { ...allergies.answers, has_med: v },
              })
            }
          />
          <YesNoField
            label="Food allergies?"
            required
            value={
              allergies.answers.has_food === true
                ? true
                : allergies.answers.has_food === false
                  ? false
                  : null
            }
            onChange={(v) =>
              patch("allergies", {
                ...allergies,
                answers: { ...allergies.answers, has_food: v },
              })
            }
          />
          {allergies.list.map((a, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              {(["allergy", "reaction", "severity"] as const).map((f) => (
                <input
                  key={f}
                  className={inputCls}
                  placeholder={f}
                  value={a[f]}
                  onChange={(e) => {
                    const list = [...allergies.list];
                    list[i] = { ...list[i], [f]: e.target.value };
                    patch("allergies", { ...allergies, list });
                  }}
                />
              ))}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() =>
              patch("allergies", {
                ...allergies,
                list: [
                  ...allergies.list,
                  { allergy: "", reaction: "", severity: "" },
                ],
              })
            }
          >
            + Add allergy
          </button>
        </div>
      )}

      {step === 7 && isIntakeStepApplicable(7, intakeEligibility) && (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Pregnancy and breastfeeding status were captured during your
            eligibility screening.
          </p>
          {[
            ["lmp", "Date of last menstrual period (optional)"],
            ["contraception", "Using contraception?"],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <input
                className={inputCls}
                value={(preg[k] as string) ?? ""}
                onChange={(e) =>
                  patch("pregnancy", { ...preg, [k]: e.target.value })
                }
              />
            </Field>
          ))}
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={preg.understand === true}
              onChange={(e) =>
                patch("pregnancy", { ...preg, understand: e.target.checked })
              }
            />
            <span>
              I understand weight-loss medications may not be appropriate during
              pregnancy or breastfeeding.
              <span className="text-destructive"> *</span>
            </span>
          </label>
        </div>
      )}

      {step === 8 && (
        <div className="grid gap-3">
          {[
            ["exercise_days", "Days per week exercising"],
            ["exercise_type", "Type of exercise"],
            ["diet", "How would you describe your diet?"],
            ["smoke", "Do you smoke or vape?"],
            ["alcohol", "Do you drink alcohol?"],
            ["drugs", "Recreational drug use?"],
            ["sleep", "Hours of sleep per night"],
            ["binge", "Binge eating episodes?"],
            ["night_eating", "Frequently eat at night?"],
            [
              "struggle",
              "Struggle more with hunger, cravings, portions, or emotional eating?",
            ],
          ].map(([k, label]) => (
            <Field key={k} label={label} required>
              <input
                className={inputCls}
                value={(life[k] as string) ?? ""}
                onChange={(e) =>
                  patch("lifestyle", { ...life, [k]: e.target.value })
                }
              />
            </Field>
          ))}
        </div>
      )}

      {step === 9 && (
        <div className="grid gap-4">
          {[
            ["bp", "Most recent blood pressure"],
            ["a1c", "Most recent A1C"],
            ["glucose", "Most recent fasting glucose"],
            ["cholesterol", "Most recent cholesterol"],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <input
                className={inputCls}
                value={(labs[k] as string) ?? ""}
                placeholder={k === "bp" ? "e.g. 120/80" : undefined}
                onChange={(e) =>
                  patch("labs", { ...labs, [k]: e.target.value })
                }
              />
            </Field>
          ))}
          <YesNoField
            label="Labs in last 12 months?"
            required
            value={
              labs.recent_labs === true
                ? true
                : labs.recent_labs === false
                  ? false
                  : null
            }
            onChange={(v) => patch("labs", { ...labs, recent_labs: v })}
          />
          <YesNoField
            label="Willing to complete labs if required?"
            required
            value={
              labs.willing === true
                ? true
                : labs.willing === false
                  ? false
                  : null
            }
            onChange={(v) => patch("labs", { ...labs, willing: v })}
          />
          <Field label="Upload documents">
            <DocumentTypeUpload
              uploading={uploading}
              error={uploadError}
              onFilesSelected={(files, type) =>
                void handleDocumentFilesSelected(files, type)
              }
            />
            {uploadedDocs.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {uploadedDocs.map((doc) => (
                  <li key={doc.id}>
                    {doc.original_filename || doc.document_type}
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>
      )}

      {step === 10 && (
        <div className="grid gap-4">
          {showTreatmentPrefs && (
            <Field label="Treatment option of interest" required>
              <div className="grid gap-2">
                {[
                  ["zepbound", "Zepbound injection"],
                  ["wegovy_inj", "Wegovy injection"],
                  ["wegovy_pill", "Wegovy pill, if available"],
                  [
                    "compounded_sema",
                    "Compounded semaglutide injection, if legally available",
                  ],
                  ["provider_choice", "Not sure — provider to recommend"],
                ].map(([k, label]) => (
                  <ChoiceCard
                    key={k}
                    compact
                    selected={prefs.treatment === k}
                    onClick={() =>
                      patch("medication_preferences", {
                        ...prefs,
                        treatment: k,
                      })
                    }
                    title={label}
                  />
                ))}
              </div>
            </Field>
          )}
          <YesNoField
            label="Comfortable self-injecting?"
            required
            value={
              prefs.self_inject === true
                ? true
                : prefs.self_inject === false
                  ? false
                  : null
            }
            onChange={(v) =>
              patch("medication_preferences", { ...prefs, self_inject: v })
            }
          />
          <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            If prescribed, your medication will be shipped to your home address
            from our pharmacy partner. We&apos;ll confirm details after your
            clinician review.
          </p>
          {prefs.use_different_shipping_address === true ? (
            <div className="grid gap-3">
              <AddressFields
                label="Shipping address"
                expectedState={session.user.state || eligibility?.state}
                value={{
                  address: String(prefs.shipping_address ?? ""),
                  city: String(prefs.shipping_city ?? ""),
                  zip: String(prefs.shipping_zip ?? ""),
                  county: String(prefs.shipping_county ?? ""),
                  verified: prefs.shipping_address_verified === "true",
                }}
                onChange={({ address, city, zip, county, verified }) =>
                  patch("medication_preferences", {
                    ...prefs,
                    use_different_shipping_address: true,
                    shipping_address: address,
                    shipping_city: city,
                    shipping_zip: zip,
                    shipping_county: county,
                    shipping_address_verified: verified ? "true" : "",
                  })
                }
              />
              <button
                type="button"
                className="justify-self-start text-sm text-primary underline"
                onClick={() =>
                  patch("medication_preferences", {
                    ...prefs,
                    use_different_shipping_address: false,
                    shipping_address: "",
                    shipping_city: "",
                    shipping_zip: "",
                    shipping_county: "",
                    shipping_address_verified: "",
                  })
                }
              >
                Use home address instead
              </button>
            </div>
          ) : (
            <Field label="Shipping address" required>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                  <p className="whitespace-pre-line">
                    {[
                      id.address,
                      [id.city, eligibility?.state, id.zip]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .join("\n") || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  className="justify-self-start text-sm text-primary underline"
                  onClick={() =>
                    patch("medication_preferences", {
                      ...prefs,
                      use_different_shipping_address: true,
                    })
                  }
                >
                  Use a different address
                </button>
              </div>
            </Field>
          )}
          <Field label="Insurance provider">
            <input
              className={inputCls}
              value={(prefs.insurance_provider as string) ?? ""}
              placeholder="e.g. Aetna, Blue Cross, UnitedHealthcare"
              onChange={(e) =>
                patch("medication_preferences", {
                  ...prefs,
                  insurance_provider: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Member ID">
            <input
              className={inputCls}
              value={(prefs.member_id as string) ?? ""}
              placeholder="Letters and numbers from your insurance card"
              onChange={(e) =>
                patch("medication_preferences", {
                  ...prefs,
                  member_id: e.target.value,
                })
              }
            />
          </Field>
          <YesNoField
            label="Open to cash-pay if insurance doesn't cover?"
            required
            value={
              prefs.cash_pay_ok === true
                ? true
                : prefs.cash_pay_ok === false
                  ? false
                  : null
            }
            onChange={(v) =>
              patch("medication_preferences", { ...prefs, cash_pay_ok: v })
            }
          />
        </div>
      )}

      {step === 11 && (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Please review our intake acknowledgments — including medication
            risks, emergency care, telehealth care, and how we use your
            information — then confirm below.
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={acks[INTAKE_ACKNOWLEDGMENT_KEY] === true}
              onChange={(e) =>
                patch("safety_acknowledgments", {
                  [INTAKE_ACKNOWLEDGMENT_KEY]: e.target.checked,
                })
              }
            />
            <span className="text-sm text-foreground">
              I have read and agree to the{" "}
              <Link
                to="/legal/intake-acknowledgments"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
                onClick={(e) => e.stopPropagation()}
              >
                Intake Acknowledgments &amp; Informed Consent
              </Link>
              .<span className="text-destructive"> *</span>
            </span>
          </label>
        </div>
      )}
    </>
  );

  if (mode === "portal") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PortalPageHeader
          title="Medical intake"
          subtitle={`Step ${applicableStepIndex + 1} of ${applicableSteps.length} · ${INTAKE_STEP_LABELS[step]}`}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_1fr]">
          <nav className="hidden lg:block">
            <ol className="space-y-1">
              {INTAKE_STEP_LABELS.map((label, index) => {
                const applicable = applicableSteps.includes(index);
                const active = step === index;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={!applicable || submitting}
                      onClick={() => handlePortalStepSelect(index)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        active && "bg-primary-soft font-medium text-primary",
                        !active &&
                          applicable &&
                          "text-foreground hover:bg-muted/60",
                        !applicable &&
                          "cursor-not-allowed text-muted-foreground/50",
                      )}
                    >
                      <span className="text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="lg:hidden">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Jump to step</span>
              <select
                className="rounded-xl border border-input bg-background px-3 py-2.5"
                value={step}
                onChange={(e) => handlePortalStepSelect(Number(e.target.value))}
              >
                {INTAKE_STEP_LABELS.map((label, index) =>
                  applicableSteps.includes(index) ? (
                    <option key={label} value={index}>
                      {index + 1}. {label}
                    </option>
                  ) : null,
                )}
              </select>
            </label>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-8">
            <h2 className="text-lg font-semibold text-foreground">
              {INTAKE_STEP_LABELS[step]}
            </h2>
            <div className="mt-6">{stepFields}</div>
            {footerNav}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FlowLayout progress={progress}>
      <QuizShell
        label={INTAKE_STEP_LABELS[step]}
        title={INTAKE_STEP_LABELS[step]}
        showRequiredLegend
        footer={footerNav}
      >
        {stepFields}
      </QuizShell>
    </FlowLayout>
  );
}

function makeDraft(userId: string): MedicalIntake {
  const empty = emptyIntakeData();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    status: "draft",
    ...empty,
    submitted_at: null,
    updated_at: new Date().toISOString(),
  };
}
