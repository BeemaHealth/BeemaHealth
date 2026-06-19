import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitRefillRequest, submitSideEffectCheckIn } from "@/lib/api/client";
import type {
  RefillRequest,
  SideEffectCheckIn,
  SideEffectType,
} from "@/lib/types/mvp";

const SIDE_EFFECTS: { value: SideEffectType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "mild_nausea", label: "Mild nausea" },
  { value: "reduced_appetite", label: "Reduced appetite" },
  { value: "constipation", label: "Constipation" },
  { value: "fatigue", label: "Fatigue" },
  { value: "other", label: "Other" },
];

const REFILL_STATUS_LABELS: Record<RefillRequest["status"], string> = {
  pending: "Pending review",
  approved: "Approved",
  denied: "Denied",
};

export function RefillForm({
  medicationLabel,
  canManageRefills,
  initialCheckIns,
  initialRefillRequests,
}: {
  medicationLabel: string;
  canManageRefills: boolean;
  initialCheckIns: SideEffectCheckIn[];
  initialRefillRequests: RefillRequest[];
}) {
  const [sideEffect, setSideEffect] = useState<SideEffectType>("none");
  const [experiencedOn, setExperiencedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);
  const [requestingRefill, setRequestingRefill] = useState(false);
  const [recent, setRecent] = useState(initialCheckIns);
  const [refillRequests, setRefillRequests] = useState(initialRefillRequests);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageRefills) return;
    setSubmitting(true);
    try {
      const created = await submitSideEffectCheckIn({
        side_effect: sideEffect,
        experienced_on: experiencedOn,
      });
      toast.success("Side effect check-in saved.");
      setRecent((items) => [created, ...items].slice(0, 5));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save check-in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestRefill() {
    if (!canManageRefills) return;
    setRequestingRefill(true);
    try {
      const latestCheckIn = recent[0];
      const created = await submitRefillRequest(
        latestCheckIn
          ? { side_effect_check_in_id: latestCheckIn.id }
          : undefined,
      );
      toast.success("Refill request submitted.");
      setRefillRequests((items) => [created, ...items].slice(0, 5));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not request refill.",
      );
    } finally {
      setRequestingRefill(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="flex items-start gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <RefreshCw className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {medicationLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {canManageRefills
              ? "Log how you've been feeling since your last dose, then request a refill when you're ready."
              : "Side-effect check-ins and refill requests open after your prescription is sent to the pharmacy."}
          </p>
        </div>
      </div>

      {!canManageRefills && (
        <div className="rounded-3xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Prescription not active yet
          </p>
          <p className="mt-1">
            Once your clinician sends your prescription, you can log side
            effects and request refills here. Check your dashboard for status
            updates.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
        <h2 className="font-semibold text-foreground">Side effect check-in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a side effect and when you experienced it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Side effect</span>
            <select
              className="rounded-xl border border-input bg-background px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
              value={sideEffect}
              onChange={(e) => setSideEffect(e.target.value as SideEffectType)}
              disabled={!canManageRefills}
            >
              {SIDE_EFFECTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">
              Date experienced
            </span>
            <input
              type="date"
              className="rounded-xl border border-input bg-background px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
              value={experiencedOn}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExperiencedOn(e.target.value)}
              required
              disabled={!canManageRefills}
            />
          </label>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-foreground">
            Recent check-ins
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {recent.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {SIDE_EFFECTS.find((s) => s.value === item.side_effect)
                    ?.label ?? item.side_effect}
                </span>
                <span>
                  {new Date(item.experienced_on).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {refillRequests.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-foreground">
            Refill requests
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {refillRequests.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{REFILL_STATUS_LABELS[item.status] ?? item.status}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="submit"
          variant="outline"
          className="h-12 rounded-xl text-base"
          disabled={!canManageRefills || submitting}
        >
          {submitting ? "Saving…" : "Submit check-in"}
        </Button>
        <Button
          type="button"
          className="h-12 rounded-xl text-base"
          disabled={!canManageRefills || requestingRefill}
          onClick={() => void handleRequestRefill()}
        >
          {requestingRefill ? "Submitting…" : "Request refill"}
        </Button>
      </div>
    </form>
  );
}
