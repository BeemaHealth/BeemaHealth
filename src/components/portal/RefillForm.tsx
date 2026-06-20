import { useState } from "react";
import { Activity, ClipboardList, Pill, RefreshCw } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitRefillRequest, submitSideEffectCheckIn } from "@/lib/api/client";
import type {
  PatientPrescription,
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

const ROUTE_LABELS: Record<string, string> = {
  injection: "Injection",
  oral: "Oral",
  other: "Other",
};

export function RefillForm({
  prescription,
  initialCheckIns,
  initialRefillRequests,
}: {
  prescription: PatientPrescription;
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <AccountSectionCard
        title={prescription.medication_name}
        description="Your active prescription"
        icon={Pill}
        tone="refills"
      >
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Dosage:</span>{" "}
            {prescription.dosage} · {prescription.frequency}
            {prescription.route
              ? ` · ${ROUTE_LABELS[prescription.route] ?? prescription.route}`
              : ""}
          </p>
          {prescription.pharmacy_name ? (
            <p>
              <span className="font-medium text-foreground">Pharmacy:</span>{" "}
              {prescription.pharmacy_name}
            </p>
          ) : null}
          {prescription.instructions ? (
            <p className="leading-relaxed">{prescription.instructions}</p>
          ) : null}
          <p>
            Log how you&apos;ve been feeling since your last dose, then request
            a refill when you&apos;re ready.
          </p>
        </div>
      </AccountSectionCard>

      <AccountSectionCard
        title="Side effect check-in"
        description="Select a side effect and when you experienced it"
        icon={Activity}
        tone="security"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Side effect</span>
            <select
              className="rounded-xl border border-input bg-background px-3 py-2.5"
              value={sideEffect}
              onChange={(e) => setSideEffect(e.target.value as SideEffectType)}
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
              className="rounded-xl border border-input bg-background px-3 py-2.5"
              value={experiencedOn}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExperiencedOn(e.target.value)}
              required
            />
          </label>
        </div>
      </AccountSectionCard>

      {recent.length > 0 && (
        <AccountSectionCard
          title="Recent check-ins"
          description="Your latest side-effect reports"
          icon={RefreshCw}
          tone="contact"
        >
          <ul className="divide-y divide-border/80 text-sm">
            {recent.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-foreground">
                  {SIDE_EFFECTS.find((s) => s.value === item.side_effect)
                    ?.label ?? item.side_effect}
                </span>
                <span className="text-muted-foreground">
                  {new Date(item.experienced_on).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </AccountSectionCard>
      )}

      {refillRequests.length > 0 && (
        <AccountSectionCard
          title="Refill requests"
          description="Status of your refill submissions"
          icon={ClipboardList}
          tone="orders"
        >
          <ul className="divide-y divide-border/80 text-sm">
            {refillRequests.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-foreground">
                  {REFILL_STATUS_LABELS[item.status] ?? item.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </AccountSectionCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="submit"
          variant="outline"
          className="h-12 rounded-xl text-base"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Submit check-in"}
        </Button>
        <Button
          type="button"
          className="h-12 rounded-xl text-base"
          disabled={requestingRefill}
          onClick={() => void handleRequestRefill()}
        >
          {requestingRefill ? "Submitting…" : "Request refill"}
        </Button>
      </div>
    </form>
  );
}
