import { useRef, useState } from "react";
import { Camera, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitSameDoseRefill, submitTitrationRefill } from "@/lib/api/client";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type {
  DrugRefillConfig,
  PatientPrescription,
  SameDoseRefillResponse,
  SideEffectType,
  TitrationDirection,
  TitrationRefillResponse,
} from "@/lib/types/mvp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "direction" | "check-in" | "photo" | "confirm-same" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: PatientPrescription;
  drugConfig: DrugRefillConfig;
  onSuccess: (
    response: SameDoseRefillResponse | TitrationRefillResponse,
  ) => void;
}

const SIDE_EFFECTS: { value: SideEffectType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "mild_nausea", label: "Mild nausea" },
  { value: "reduced_appetite", label: "Reduced appetite" },
  { value: "constipation", label: "Constipation" },
  { value: "fatigue", label: "Fatigue" },
  { value: "other", label: "Other" },
];

const DIRECTION_OPTIONS: {
  value: TitrationDirection;
  label: string;
  description: string;
}[] = [
  {
    value: "same",
    label: "Same dose",
    description: "Continue at my current dose, send to pharmacy",
  },
  {
    value: "increase",
    label: "Increase dose",
    description: "Request a higher dose, provider will review",
  },
  {
    value: "decrease",
    label: "Decrease dose",
    description: "Request a lower dose, provider will review",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RefillDialog({
  open,
  onOpenChange,
  prescription,
  drugConfig,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("direction");
  const [direction, setDirection] = useState<TitrationDirection | null>(null);
  const [sideEffect, setSideEffect] = useState<SideEffectType>("none");
  const [sideEffectDetail, setSideEffectDetail] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setStep("direction");
    setDirection(null);
    setSideEffect("none");
    setSideEffectDetail("");
    setWeightLbs("");
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitting(false);
    setError(null);
    setSuccessMessage(null);
  }

  function handleClose(open: boolean) {
    if (!open) resetState();
    onOpenChange(open);
  }

  // ---------- Step navigation ----------

  function handleDirectionSelect(d: TitrationDirection) {
    setDirection(d);
    setError(null);
    if (d === "same") {
      setStep("confirm-same");
    } else {
      setStep("check-in");
    }
  }

  function handleCheckInNext() {
    if (sideEffect === "other" && !sideEffectDetail.trim()) {
      setError("Please describe your side effect.");
      return;
    }
    setError(null);
    if (drugConfig.collects_photo) {
      setStep("photo");
    } else {
      void handleSubmitTitration();
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  // ---------- Submissions ----------

  async function handleSubmitSameDose() {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await submitSameDoseRefill();
      setSuccessMessage(resp.message);
      setStep("done");
      onSuccess(resp);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit refill request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitTitration() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("titration_direction", direction!);
      fd.append("side_effect", sideEffect);
      if (sideEffect === "other" && sideEffectDetail.trim()) {
        fd.append("side_effect_detail", sideEffectDetail.trim());
      }
      if (notes.trim()) fd.append("notes", notes.trim());
      if (weightLbs.trim()) fd.append("weight_lbs", weightLbs.trim());
      if (photoFile) fd.append("photo", photoFile);

      const resp = await submitTitrationRefill(fd);
      setSuccessMessage(resp.message);
      setStep("done");
      onSuccess(resp);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit dose change request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Render ----------

  const isTitration = direction === "increase" || direction === "decrease";
  const directionLabel =
    direction === "increase"
      ? "increase"
      : direction === "decrease"
        ? "decrease"
        : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* STEP: direction */}
        {step === "direction" && (
          <>
            <DialogHeader>
              <DialogTitle>Request a refill</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {prescription.medication_name}: how would you like to continue?
            </p>
            <div className="mt-2 space-y-3">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDirectionSelect(opt.value)}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP: confirm same dose */}
        {step === "confirm-same" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm same-dose refill</DialogTitle>
            </DialogHeader>
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                NOTICE_BANNER_STYLES.primary,
              )}
            >
              <p>
                You&apos;re requesting a refill at your{" "}
                <span className="font-semibold">current dose</span> (
                {prescription.dosage}). This will be sent directly to the
                pharmacy; no provider review needed.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStep("direction")}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={() => void handleSubmitSameDose()}
              >
                {submitting ? "Submitting…" : "Confirm refill"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: check-in (titration) */}
        {step === "check-in" && isTitration && (
          <>
            <DialogHeader>
              <DialogTitle>Dose {directionLabel}: check-in</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Your provider will review this information before adjusting your
              dose.
            </p>
            <div className="mt-2 space-y-4">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Current side effects
                </span>
                <select
                  className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                  value={sideEffect}
                  onChange={(e) => {
                    const v = e.target.value as SideEffectType;
                    setSideEffect(v);
                    if (v !== "other") setSideEffectDetail("");
                    setError(null);
                  }}
                >
                  {SIDE_EFFECTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {sideEffect === "other" && (
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Describe your side effect
                  </span>
                  <input
                    type="text"
                    className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                    value={sideEffectDetail}
                    maxLength={200}
                    placeholder="Tell us what you experienced"
                    onChange={(e) => {
                      setSideEffectDetail(e.target.value);
                      setError(null);
                    }}
                  />
                </label>
              )}

              {drugConfig.collects_weight && (
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Current weight (lbs)
                  </span>
                  <input
                    type="number"
                    className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                    value={weightLbs}
                    min="50"
                    max="999"
                    step="0.1"
                    placeholder="e.g. 185"
                    onChange={(e) => setWeightLbs(e.target.value)}
                  />
                </label>
              )}

              {drugConfig.collects_notes && (
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    Notes for your provider{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </span>
                  <Textarea
                    className="min-h-[80px] rounded-xl text-sm"
                    value={notes}
                    maxLength={1000}
                    placeholder="Any additional information for your provider…"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              )}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStep("direction")}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={handleCheckInNext}
              >
                {submitting
                  ? "Submitting…"
                  : drugConfig.collects_photo
                    ? "Next: add photo"
                    : "Submit to provider"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: photo */}
        {step === "photo" && (
          <>
            <DialogHeader>
              <DialogTitle>Add a photo</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Upload a photo of yourself standing on a scale. This helps your
              provider confirm your current weight.{" "}
              <span className="font-medium text-foreground">
                Optional, skip if not available.
              </span>
            </p>
            <div className="mt-2 space-y-3">
              {photoPreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-border">
                  <img
                    src={photoPreview}
                    alt="Scale photo preview"
                    className="max-h-64 w-full object-contain"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-xl bg-background/90 px-3 py-1 text-xs font-medium shadow-sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-8 transition-colors hover:border-primary hover:bg-primary/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tap to select a photo
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStep("check-in")}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => void handleSubmitTitration()}
              >
                {submitting ? "Submitting…" : "Skip photo"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting || !photoFile}
                onClick={() => void handleSubmitTitration()}
              >
                {submitting ? "Submitting…" : "Submit to provider"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: done */}
        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Request submitted</DialogTitle>
            </DialogHeader>
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                NOTICE_BANNER_STYLES.primary,
              )}
            >
              <p>{successMessage}</p>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                size="sm"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
