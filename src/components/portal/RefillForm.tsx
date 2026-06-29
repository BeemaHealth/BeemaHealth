import { useState } from "react";
import { Activity, ClipboardList, Pill, RefreshCw } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { RefillDialog } from "@/components/portal/RefillDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitSideEffectCheckIn } from "@/lib/api/client";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";
import { validateSideEffectDetail } from "@/lib/form-validation";
import {
  REFILL_COOLDOWN_SUPPORT_EMAIL,
  REFILL_REQUEST_COOLDOWN_HOURS,
  getRefillCooldownBannerMessage,
  getRefillCooldownSupportMessage,
  isRefillCooldownActive,
} from "@/lib/refill-cooldown";
import { cn } from "@/lib/utils";
import type {
  DrugRefillConfig,
  PatientPrescription,
  RefillCooldown,
  RefillRequest,
  SameDoseRefillResponse,
  SideEffectCheckIn,
  SideEffectType,
  TitrationRefillResponse,
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

function formatCheckInLabel(item: SideEffectCheckIn): string {
  if (item.side_effect === "other" && item.side_effect_detail) {
    return item.side_effect_detail;
  }
  return (
    SIDE_EFFECTS.find((option) => option.value === item.side_effect)?.label ??
    item.side_effect
  );
}

export function RefillForm({
  prescription,
  drugConfig,
  initialCheckIns,
  initialRefillRequests,
  initialCooldown,
  hasDeliveryIssue = false,
}: {
  prescription: PatientPrescription;
  drugConfig: DrugRefillConfig;
  initialCheckIns: SideEffectCheckIn[];
  initialRefillRequests: RefillRequest[];
  initialCooldown: RefillCooldown;
  hasDeliveryIssue?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sideEffect, setSideEffect] = useState<SideEffectType>("none");
  const [sideEffectDetail, setSideEffectDetail] = useState("");
  const [sideEffectDetailError, setSideEffectDetailError] = useState<
    string | null
  >(null);
  const [experiencedOn, setExperiencedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState(initialCheckIns);
  const [refillRequests, setRefillRequests] = useState(initialRefillRequests);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const refillBlocked = isRefillCooldownActive(cooldown);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sideEffect === "other") {
      const detailError = validateSideEffectDetail(sideEffectDetail);
      if (detailError) {
        setSideEffectDetailError(detailError);
        return;
      }
    }
    setSideEffectDetailError(null);
    setSubmitting(true);
    try {
      const created = await submitSideEffectCheckIn({
        side_effect: sideEffect,
        ...(sideEffect === "other"
          ? { side_effect_detail: sideEffectDetail.trim() }
          : {}),
        experienced_on: experiencedOn,
      });
      toast.success("Side effect check-in saved.");
      setRecent((items) => [created, ...items].slice(0, 5));
      if (sideEffect === "other") {
        setSideEffectDetail("");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save check-in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleRefillSuccess(
    resp: SameDoseRefillResponse | TitrationRefillResponse,
  ) {
    toast.success(resp.message);
    const partial: RefillRequest = {
      id: resp.id,
      user_id: "",
      side_effect_check_in_id: null,
      status: "pending",
      created_at: resp.created_at,
    };
    setRefillRequests((items) => [partial, ...items].slice(0, 5));
    const createdAt = new Date(resp.created_at).getTime();
    setCooldown({
      active: true,
      retry_after: new Date(
        createdAt + REFILL_REQUEST_COOLDOWN_HOURS * 60 * 60 * 1000,
      ).toISOString(),
      hours_remaining: REFILL_REQUEST_COOLDOWN_HOURS,
    });
  }

  return (
    <div className="space-y-6">
      <RefillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prescription={prescription}
        drugConfig={drugConfig}
        onSuccess={handleRefillSuccess}
      />
      {hasDeliveryIssue ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-relaxed text-foreground",
            NOTICE_BANNER_STYLES.warning,
          )}
        >
          <p className="font-medium">Delivery issue with your last order</p>
          <p className="mt-1 text-muted-foreground">
            It looks like your last package had a delivery problem. Please
            contact our support team to resolve this — do not submit a refill
            request for a missing or undelivered package.
          </p>
          <p className="mt-2 text-muted-foreground">
            Contact support:{" "}
            <a
              href={`mailto:${REFILL_COOLDOWN_SUPPORT_EMAIL}`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {REFILL_COOLDOWN_SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      ) : null}
      {refillBlocked ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-relaxed text-foreground",
            NOTICE_BANNER_STYLES.warning,
          )}
        >
          <p>{getRefillCooldownBannerMessage(cooldown)}</p>
          <p className="mt-2 text-muted-foreground">
            {getRefillCooldownSupportMessage()}{" "}
            <a
              href={`mailto:${REFILL_COOLDOWN_SUPPORT_EMAIL}`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {REFILL_COOLDOWN_SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      ) : null}
      <AccountSectionCard
        title={prescription.medication_name}
        description="Your Active Prescription"
        icon={Pill}
        tone="refills"
        headerAction={
          <Button
            type="button"
            size="sm"
            className="h-10 w-full rounded-xl px-4 text-sm sm:w-auto sm:px-5"
            disabled={refillBlocked}
            onClick={() => setDialogOpen(true)}
          >
            {refillBlocked ? "Refill unavailable" : "Request refill"}
          </Button>
        }
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

      <form onSubmit={(e) => void handleSubmit(e)}>
        <AccountSectionCard
          title="Side effect check-in"
          description="Select a side effect and when you experienced it"
          icon={Activity}
          tone="security"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Side effect</span>
                <select
                  className="rounded-xl border border-input bg-background px-3 py-2.5"
                  value={sideEffect}
                  onChange={(e) => {
                    const value = e.target.value as SideEffectType;
                    setSideEffect(value);
                    if (value !== "other") {
                      setSideEffectDetail("");
                      setSideEffectDetailError(null);
                    }
                  }}
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

            {sideEffect === "other" ? (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Describe your side effect
                </span>
                <input
                  type="text"
                  className="rounded-xl border border-input bg-background px-3 py-2.5"
                  value={sideEffectDetail}
                  maxLength={200}
                  placeholder="Tell us what you experienced"
                  onChange={(e) => {
                    setSideEffectDetail(e.target.value);
                    if (sideEffectDetailError) {
                      setSideEffectDetailError(null);
                    }
                  }}
                  required
                />
                {sideEffectDetailError ? (
                  <span className="text-sm text-destructive">
                    {sideEffectDetailError}
                  </span>
                ) : null}
              </label>
            ) : null}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="outline"
                className="h-12 min-w-44 rounded-xl text-base"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Submit check-in"}
              </Button>
            </div>
          </div>
        </AccountSectionCard>
      </form>

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
                  {formatCheckInLabel(item)}
                </span>
                <span className="shrink-0 text-muted-foreground">
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
    </div>
  );
}
