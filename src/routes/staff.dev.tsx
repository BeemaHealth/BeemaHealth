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
  fetchDevSettings,
  fireMockBelugaWebhook,
  patchDevSettings,
  type BelugaMockEventType,
  type BelugaMockMed,
  type DevSettings,
} from "@/lib/api/client";

export const Route = createFileRoute("/staff/dev")({
  component: StaffDevPage,
});

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

function BelugaMockPanel() {
  const [email, setEmail] = useState("");
  const [event, setEvent] = useState<BelugaMockEventType>("CONSULT_CONCLUDED");
  const [visitOutcome, setVisitOutcome] = useState<"prescribed" | "referred">(
    "prescribed",
  );
  const [content, setContent] = useState("");
  const [docName, setDocName] = useState("Dev Doctor");
  const [medName, setMedName] = useState(DEFAULT_MED.name);
  const [medStrength, setMedStrength] = useState(DEFAULT_MED.strength);
  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fire() {
    if (!email.trim()) {
      setError("Patient email is required.");
      return;
    }
    setFiring(true);
    setError(null);
    setResult(null);
    try {
      const payload: Parameters<typeof fireMockBelugaWebhook>[0] = {
        patient_email: email.trim(),
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
      const res = await fireMockBelugaWebhook(payload);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fire event.");
    } finally {
      setFiring(false);
    }
  }

  const needsOutcome = event === "CONSULT_CONCLUDED";
  const needsContent = event === "DOCTOR_CHAT" || event === "CS_MESSAGE";
  const needsMed = event === "RX_WRITTEN";

  return (
    <AccountSectionCard
      tone="communication"
      title="Beluga Mock Webhooks"
      description="Fire mock Beluga status events against a patient account to test the webhook handler and downstream notifications."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="beluga-email">Patient email</Label>
          <Input
            id="beluga-email"
            type="email"
            placeholder="patient@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
              {BELUGA_EVENTS.map((e) => (
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

        <Button onClick={() => void fire()} disabled={firing} size="sm">
          {firing ? "Firing…" : "Fire event"}
        </Button>

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
                verification email is sent. Existing users are unaffected — use
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
