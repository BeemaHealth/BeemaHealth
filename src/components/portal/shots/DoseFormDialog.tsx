import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createDoseLog,
  createHealthMetric,
  updateDoseLog,
  updateHealthMetric,
  type DoseLog,
  type HealthMetric,
  type HealthMetricKind,
} from "@/lib/api/portal/shots";
import { InlineError } from "../PortalStates";
import { errorMessage } from "../portal-errors";
import {
  INJECTION_SITES,
  doseYmd,
  initialDoseForm,
  metricsForDate,
  toTakenAtIso,
  validateDoseForm,
  type DoseFormErrors,
  type DoseFormValues,
} from "./shots-model";

export interface TreatmentOption {
  id: string;
  name: string;
}

export type DoseFormTarget =
  /** Log a scheduled or overdue dose as taken. */
  | { mode: "log"; dose: DoseLog }
  /** Edit a dose already in the history. */
  | { mode: "edit"; dose: DoseLog }
  /** Add a brand new dose. */
  | { mode: "new" };

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <InlineError message={error} id={`${id}-error`} />
    </div>
  );
}

/** Applies a metric value for the dose date: patch the existing row or create one. */
async function saveMetric(
  kind: HealthMetricKind,
  value: string,
  ymd: string,
  existing: HealthMetric | null,
): Promise<void> {
  if (value === "") return;
  const n = Number(value);
  if (existing) {
    if (Number(existing.value) === n) return;
    await updateHealthMetric(existing.id, { value: n });
  } else {
    await createHealthMetric({ kind, on_date: ymd, value: n });
  }
}

export function DoseFormDialog({
  target,
  treatments,
  metrics,
  onClose,
}: {
  target: DoseFormTarget | null;
  treatments: TreatmentOption[];
  metrics: HealthMetric[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dose = target && target.mode !== "new" ? target.dose : null;
  const [values, setValues] = useState<DoseFormValues | null>(null);
  const [errors, setErrors] = useState<DoseFormErrors>({});
  const [treatmentId, setTreatmentId] = useState("");

  useEffect(() => {
    if (!target) return;
    const day =
      dose && dose.status === "taken"
        ? metricsForDate(metrics, doseYmd(dose))
        : null;
    setValues(initialDoseForm(dose, day));
    setErrors({});
    setTreatmentId(dose?.treatment ?? treatments[0]?.id ?? "");
    // Reset only when the dialog opens for a new target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const save = useMutation({
    mutationFn: async (v: DoseFormValues) => {
      const body = {
        status: "taken" as const,
        taken_at: toTakenAtIso(v.takenDate, v.takenTime),
        strength_mg: v.strengthMg === "" ? null : Number(v.strengthMg),
        injection_site: v.injectionSite,
        pain_0_5: v.pain === "" ? null : Number(v.pain),
        notes: v.notes.trim(),
      };
      if (dose) await updateDoseLog(dose.id, body);
      else await createDoseLog({ ...body, treatment: treatmentId });
      const day = metricsForDate(metrics, v.takenDate);
      await saveMetric("weight", v.weight, v.takenDate, day.weight);
      await saveMetric("calories", v.calories, v.takenDate, day.calories);
      await saveMetric("exercise", v.exercise, v.takenDate, day.exercise);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["portal", "shots"] });
      void qc.invalidateQueries({ queryKey: ["portal", "home"] });
      onClose();
    },
  });

  if (!target || !values) return null;
  const set = <K extends keyof DoseFormValues>(k: K, v: DoseFormValues[K]) =>
    setValues({ ...values, [k]: v });
  const title =
    target.mode === "edit"
      ? "Edit dose"
      : target.mode === "log"
        ? "Add dose"
        : "Add a new dose";
  const needsTreatment = target.mode === "new";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    const found = validateDoseForm(values);
    setErrors(found);
    if (needsTreatment && !treatmentId) return;
    if (Object.keys(found).length === 0) save.mutate(values);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {dose?.dose_number ? `Dose ${dose.dose_number}. ` : ""}Log when you
            took it and how it went. Only you and your care team see this.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          {needsTreatment && (
            <Field
              id="dose-treatment"
              label="Treatment"
              error={!treatmentId ? "Choose a treatment." : undefined}
            >
              <select
                id="dose-treatment"
                value={treatmentId}
                onChange={(e) => setTreatmentId(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {treatments.length === 0 && (
                  <option value="">No active treatment</option>
                )}
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="dose-date" label="Date taken" error={errors.takenDate}>
              <Input
                id="dose-date"
                type="date"
                value={values.takenDate}
                onChange={(e) => set("takenDate", e.target.value)}
                aria-invalid={!!errors.takenDate}
              />
            </Field>
            <Field id="dose-time" label="Time" error={errors.takenTime}>
              <Input
                id="dose-time"
                type="time"
                value={values.takenTime}
                onChange={(e) => set("takenTime", e.target.value)}
                aria-invalid={!!errors.takenTime}
              />
            </Field>
            <Field
              id="dose-strength"
              label="Strength (mg)"
              error={errors.strengthMg}
            >
              <Input
                id="dose-strength"
                inputMode="decimal"
                value={values.strengthMg}
                onChange={(e) => set("strengthMg", e.target.value)}
                aria-invalid={!!errors.strengthMg}
              />
            </Field>
            <Field id="dose-pain" label="Pain (0 to 5)" error={errors.pain}>
              <Input
                id="dose-pain"
                inputMode="numeric"
                value={values.pain}
                onChange={(e) => set("pain", e.target.value)}
                aria-invalid={!!errors.pain}
              />
            </Field>
          </div>
          <Field
            id="dose-site"
            label="Injection site"
            error={errors.injectionSite}
          >
            <select
              id="dose-site"
              value={values.injectionSite}
              onChange={(e) => set("injectionSite", e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Not recorded</option>
              {INJECTION_SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {values.injectionSite &&
                !(INJECTION_SITES as readonly string[]).includes(
                  values.injectionSite,
                ) && (
                  <option value={values.injectionSite}>
                    {values.injectionSite}
                  </option>
                )}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="dose-weight" label="Weight (lbs)" error={errors.weight}>
              <Input
                id="dose-weight"
                inputMode="decimal"
                value={values.weight}
                onChange={(e) => set("weight", e.target.value)}
                aria-invalid={!!errors.weight}
              />
            </Field>
            <Field id="dose-calories" label="Calories" error={errors.calories}>
              <Input
                id="dose-calories"
                inputMode="numeric"
                value={values.calories}
                onChange={(e) => set("calories", e.target.value)}
                aria-invalid={!!errors.calories}
              />
            </Field>
            <Field
              id="dose-exercise"
              label="Exercise (min)"
              error={errors.exercise}
            >
              <Input
                id="dose-exercise"
                inputMode="numeric"
                value={values.exercise}
                onChange={(e) => set("exercise", e.target.value)}
                aria-invalid={!!errors.exercise}
              />
            </Field>
          </div>
          <Field
            id="dose-notes"
            label="Dose notes"
            error={errors.notes}
            hint={`${values.notes.length}/2000`}
          >
            <Textarea
              id="dose-notes"
              rows={3}
              maxLength={2000}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
          {save.isError && <InlineError message={errorMessage(save.error)} />}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending || (needsTreatment && treatments.length === 0)
              }
            >
              {save.isPending ? "Saving" : "Save dose"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
