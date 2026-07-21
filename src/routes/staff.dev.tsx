import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchBelugaMockTargets,
  fetchDevSettings,
  fireMockBelugaWebhook,
  patchDevSettings,
  type BelugaMockEventType,
  type BelugaMockMed,
  type BelugaMockTarget,
  type DevSettings,
} from "@/lib/api/client";

export const Route = createFileRoute("/staff/dev")({
  component: StaffDevPage,
});

const CONSULT_OUTCOME_EVENTS = new Set<BelugaMockEventType>([
  "CONSULT_CONCLUDED",
  "CONSULT_CANCELED",
  "RX_WRITTEN",
]);

const PHARMACY_EVENTS = new Set<BelugaMockEventType>([
  "PHARMACY_ORDER_IN_FULFILLMENT",
  "PHARMACY_ORDER_SHIPPED",
  "PHARMACY_ORDER_DELIVERED",
]);

const TRACKING_EVENTS = new Set<BelugaMockEventType>([
  "PACKAGE_IN_TRANSIT",
  "PACKAGE_OUT_FOR_DELIVERY",
  "PACKAGE_DELIVERED",
  "PACKAGE_DELIVERY_FAILED",
]);

const BELUGA_EVENTS: { value: BelugaMockEventType; label: string }[] = [
  { value: "CONSULT_CONCLUDED", label: "Consult concluded" },
  { value: "CONSULT_CANCELED", label: "Consult canceled" },
  { value: "RX_WRITTEN", label: "Rx written" },
  { value: "DOCTOR_CHAT", label: "Doctor chat message" },
  { value: "CS_MESSAGE", label: "Support message" },
  { value: "PHARMACY_ORDER_IN_FULFILLMENT", label: "Pharmacy: in fulfillment" },
  { value: "PHARMACY_ORDER_SHIPPED", label: "Pharmacy: shipped" },
  { value: "PHARMACY_ORDER_DELIVERED", label: "Pharmacy: delivered" },
  { value: "PACKAGE_IN_TRANSIT", label: "Package: in transit" },
  { value: "PACKAGE_OUT_FOR_DELIVERY", label: "Package: out for delivery" },
  { value: "PACKAGE_DELIVERED", label: "Package: delivered" },
  { value: "PACKAGE_DELIVERY_FAILED", label: "Package: delivery failed" },
  { value: "LAB_ORDER_RESULTS", label: "Lab: results ready" },
  { value: "BOOKING_CREATED", label: "Appointment: scheduled" },
];

const DEFAULT_MED: BelugaMockMed = {
  name: "Semaglutide 0.25mg",
  strength: "0.25mg/0.5mL",
  refills: "3",
  quantity: "1",
  pharmacyNotes: "Inject subcutaneously once weekly.",
  rxId: "rx-dev-001",
};

function targetKey(target: BelugaMockTarget): string {
  return target.kind === "initial_consult" ? "initial_consult" : target.id!;
}

function defaultOrderId(target: BelugaMockTarget): string {
  if (target.beluga_order_id) return target.beluga_order_id;
  return target.kind === "refill" ? `mock-order-${target.id!.slice(0, 8)}` : "";
}

function BelugaMockPanel() {
  const [email, setEmail] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [targets, setTargets] = useState<BelugaMockTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [event, setEvent] = useState<BelugaMockEventType>("CONSULT_CONCLUDED");
  const [visitOutcome, setVisitOutcome] = useState<"prescribed" | "referred">(
    "prescribed",
  );
  const [content, setContent] = useState("");
  const [docName, setDocName] = useState("Dev Doctor");
  const [medName, setMedName] = useState(DEFAULT_MED.name);
  const [medStrength, setMedStrength] = useState(DEFAULT_MED.strength);
  const [orderId, setOrderId] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [tracking, setTracking] = useState("1Z999AA10123456784");
  const [trackerStatus, setTrackerStatus] = useState("in_transit");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");

  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTarget =
    targets.find((t) => targetKey(t) === selectedKey) ?? null;

  const eventOptions = BELUGA_EVENTS.filter((opt) => {
    if (!CONSULT_OUTCOME_EVENTS.has(opt.value)) return true;
    if (!selectedTarget) return true;
    return (
      selectedTarget.kind === "initial_consult" ||
      selectedTarget.request_type === "titration"
    );
  });

  async function loadPatient() {
    if (!email.trim()) {
      setLoadError("Patient email is required.");
      return;
    }
    setLoadingTargets(true);
    setLoadError(null);
    setResult(null);
    setError(null);
    try {
      const res = await fetchBelugaMockTargets(email.trim());
      setPatientId(res.patient_id);
      setTargets(res.targets);
      setSelectedKey(res.targets.length > 0 ? targetKey(res.targets[0]) : "");
    } catch (e: unknown) {
      setPatientId(null);
      setTargets([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load patient.");
    } finally {
      setLoadingTargets(false);
    }
  }

  function onTargetChange(key: string) {
    setSelectedKey(key);
    const target = targets.find((t) => targetKey(t) === key);
    if (target) setOrderId(defaultOrderId(target));
  }

  async function fire() {
    if (!patientId || !selectedTarget) {
      setError("Load a patient and select a target visit first.");
      return;
    }
    setFiring(true);
    setError(null);
    setResult(null);
    try {
      const payload: Parameters<typeof fireMockBelugaWebhook>[0] = {
        patient_email: email.trim(),
        target_kind: selectedTarget.kind,
        master_id: selectedTarget.master_id || undefined,
        event,
      };
      if (event === "CONSULT_CONCLUDED") payload.visitOutcome = visitOutcome;
      if (event === "RX_WRITTEN") {
        payload.docName = docName;
        payload.medsPrescribed = [
          {
            name: medName,
            strength: medStrength,
            refills: "3",
            quantity: "1",
            rxId: "rx-dev-001",
          },
        ];
      }
      if (event === "DOCTOR_CHAT" || event === "CS_MESSAGE")
        payload.content = content;
      if (PHARMACY_EVENTS.has(event) || TRACKING_EVENTS.has(event)) {
        payload.orderId = orderId.trim() || undefined;
      }
      if (event === "PHARMACY_ORDER_SHIPPED") {
        payload.info = { carrier, tracking };
      }
      if (TRACKING_EVENTS.has(event)) {
        payload.info = {
          ...(payload.info ?? {}),
          trackerStatus,
          carrier,
          tracking,
          ...(trackingUrl ? { trackingUrl } : {}),
          ...(event === "PACKAGE_DELIVERED" && deliveredDate
            ? { deliveredDate }
            : {}),
        };
      }
      const res = await fireMockBelugaWebhook(payload);
      setResult(res);
      // Refresh targets so status/order-id changes (e.g. refill approved,
      // order_id attached) are reflected immediately.
      const refreshed = await fetchBelugaMockTargets(email.trim());
      setTargets(refreshed.targets);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fire event.");
    } finally {
      setFiring(false);
    }
  }

  const needsOutcome = event === "CONSULT_CONCLUDED";
  const needsContent = event === "DOCTOR_CHAT" || event === "CS_MESSAGE";
  const needsMed = event === "RX_WRITTEN";
  const needsOrderId = PHARMACY_EVENTS.has(event) || TRACKING_EVENTS.has(event);
  const needsShippingInfo =
    event === "PHARMACY_ORDER_SHIPPED" || TRACKING_EVENTS.has(event);

  return (
    <AccountSectionCard
      tone="communication"
      title="Beluga Mock Webhooks"
      description="Fire mock Beluga status events against a specific patient visit, routed through the same masterId lookup a real Beluga webhook would use."
    >
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="beluga-email">Patient email</Label>
            <Input
              id="beluga-email"
              type="email"
              placeholder="patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingTargets}
            onClick={() => void loadPatient()}
          >
            {loadingTargets ? "Loading…" : "Load patient"}
          </Button>
        </div>
        {loadError && <p className="text-xs text-destructive">{loadError}</p>}

        {targets.length > 0 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="beluga-target">Target visit</Label>
              <Select value={selectedKey} onValueChange={onTargetChange}>
                <SelectTrigger id="beluga-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((t) => (
                    <SelectItem key={targetKey(t)} value={targetKey(t)}>
                      {t.label}
                      {!t.master_id && t.kind === "initial_consult"
                        ? " (no masterId yet, will be assigned on fire)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="beluga-event">Event type</Label>
              <Select
                value={event}
                onValueChange={(v) => setEvent(v as BelugaMockEventType)}
              >
                <SelectTrigger id="beluga-event">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventOptions.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOutcome && (
              <div className="space-y-1.5">
                <Label htmlFor="beluga-outcome">Visit outcome</Label>
                <Select
                  value={visitOutcome}
                  onValueChange={(v) =>
                    setVisitOutcome(v as "prescribed" | "referred")
                  }
                >
                  <SelectTrigger id="beluga-outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prescribed">Prescribed</SelectItem>
                    <SelectItem value="referred">
                      Referred (not approved)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsMed && (
              <div className="rounded-lg border px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Medication (single Rx)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="med-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="med-name"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="Semaglutide 0.25mg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="med-strength" className="text-xs">
                      Strength
                    </Label>
                    <Input
                      id="med-strength"
                      value={medStrength}
                      onChange={(e) => setMedStrength(e.target.value)}
                      placeholder="0.25mg/0.5mL"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-name" className="text-xs">
                    Prescriber name
                  </Label>
                  <Input
                    id="doc-name"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              </div>
            )}

            {needsContent && (
              <div className="space-y-1.5">
                <Label htmlFor="beluga-content">Message content</Label>
                <Input
                  id="beluga-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Your provider has reviewed your case…"
                />
              </div>
            )}

            {needsOrderId && (
              <div className="rounded-lg border px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Fulfillment details
                </p>
                <div className="space-y-1">
                  <Label htmlFor="beluga-order-id" className="text-xs">
                    Order ID
                  </Label>
                  <Input
                    id="beluga-order-id"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="mock-order-..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Reuse the same Order ID across a shipment&apos;s events (in
                    fulfillment → shipped → delivered) so they group together on
                    the patient&apos;s timeline.
                  </p>
                </div>
                {needsShippingInfo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="beluga-carrier" className="text-xs">
                        Carrier
                      </Label>
                      <Input
                        id="beluga-carrier"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="beluga-tracking" className="text-xs">
                        Tracking number
                      </Label>
                      <Input
                        id="beluga-tracking"
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                      />
                    </div>
                    {TRACKING_EVENTS.has(event) && (
                      <>
                        <div className="space-y-1">
                          <Label
                            htmlFor="beluga-tracker-status"
                            className="text-xs"
                          >
                            Tracker status
                          </Label>
                          <Input
                            id="beluga-tracker-status"
                            value={trackerStatus}
                            onChange={(e) => setTrackerStatus(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor="beluga-tracking-url"
                            className="text-xs"
                          >
                            Tracking URL
                          </Label>
                          <Input
                            id="beluga-tracking-url"
                            value={trackingUrl}
                            onChange={(e) => setTrackingUrl(e.target.value)}
                            placeholder="https://…"
                          />
                        </div>
                      </>
                    )}
                    {event === "PACKAGE_DELIVERED" && (
                      <div className="space-y-1">
                        <Label
                          htmlFor="beluga-delivered-date"
                          className="text-xs"
                        >
                          Delivered date
                        </Label>
                        <Input
                          id="beluga-delivered-date"
                          type="date"
                          value={deliveredDate}
                          onChange={(e) => setDeliveredDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button onClick={() => void fire()} disabled={firing} size="sm">
              {firing ? "Firing…" : "Fire event"}
            </Button>
          </>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {result && (
          <pre className="rounded-md bg-muted px-3 py-2 text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </AccountSectionCard>
  );
}

function StaffDevPage() {
  const [settings, setSettings] = useState<DevSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await fetchDevSettings();
    setSettings(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(key: "require_email_verification", value: boolean) {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const next = await patchDevSettings({ [key]: value });
      setSettings(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AccountSectionCard tone="contact" title="Dev Settings">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AccountSectionCard>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <AccountSectionCard tone="contact" title="Dev Settings">
          <p className="text-sm text-destructive">
            Dev settings are only available when the backend is running with{" "}
            <span className="font-mono">DEBUG=true</span>. Not available in
            production.
          </p>
        </AccountSectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountSectionCard
        tone="contact"
        title="Dev Settings"
        description="Runtime toggles for local development. These settings reset when the backend server restarts. Not available in production."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Email verification required</p>
              <p className="text-xs text-muted-foreground">
                When off, new registrations are auto-verified and no
                verification email is sent. Existing users are unaffected; use
                the Django admin to verify them manually if needed.
              </p>
            </div>
            <div className="ml-6 shrink-0 flex items-center gap-2">
              <span
                className={`text-xs font-medium ${settings.require_email_verification ? "text-emerald-700" : "text-yellow-700"}`}
              >
                {settings.require_email_verification ? "On" : "Off"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  void toggle(
                    "require_email_verification",
                    !settings.require_email_verification,
                  )
                }
              >
                {settings.require_email_verification ? "Turn off" : "Turn on"}
              </Button>
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <p className="text-xs text-muted-foreground">
            You can also set{" "}
            <span className="font-mono">REQUIRE_EMAIL_VERIFICATION=false</span>{" "}
            in your <span className="font-mono">backend/.env</span> file to
            persist this across server restarts.
          </p>
        </div>
      </AccountSectionCard>

      <BelugaMockPanel />
    </div>
  );
}
