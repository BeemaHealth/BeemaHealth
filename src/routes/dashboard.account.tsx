import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  ShippingAddressSection,
  type ShippingAddressValue,
} from "@/components/portal/ShippingAddressSection";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  confirmTwoFactor,
  fetchConsentMe,
  fetchEligibilityMe,
  fetchIntakeMe,
  fetchPatientProfile,
  fetchPatientSettings,
  isApiEnabled,
  patchAuthMe,
  patchPatientProfile,
  patchPatientSettings,
  sendTwoFactorSetupCode,
  syncEligibility,
} from "@/lib/api/client";
import { getIntake } from "@/lib/storage";
import { US_STATE_ENTRIES } from "@/lib/us-states";
import type {
  ConsentRecord,
  EligibilityResponses,
  MedicalIntake,
  PatientProfile,
  PatientSettings,
  SexAssignedAtBirth,
} from "@/lib/types/mvp";
import { useAuth } from "@/context/AuthContext";
import { inputCls } from "@/components/quiz/quiz-primitives";
import { formatPhoneInput } from "@/lib/form-validation";
import { toast } from "sonner";

const dashboardRoute = getRouteApi("/dashboard");

const SEX_AT_BIRTH_OPTIONS: { value: "male" | "female"; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const GENDER_IDENTITY_OPTIONS: { value: SexAssignedAtBirth; label: string }[] =
  [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "intersex", label: "Intersex" },
    { value: "unknown", label: "Prefer not to say" },
  ];

export const Route = createFileRoute("/dashboard/account")({
  component: DashboardAccountPage,
});

function AccountCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EditableField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function DashboardAccountPage() {
  const { user: loaderUser } = dashboardRoute.useLoaderData();
  const { session, setSession } = useAuth();
  const user = session?.user ?? loaderUser;

  const [intake, setIntake] = useState<MedicalIntake | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResponses | null>(
    null,
  );
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [settings, setSettings] = useState<PatientSettings | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [dob, setDob] = useState(user.dob ?? "");
  const [state, setState] = useState(user.state ?? "");
  const [sexAtBirth, setSexAtBirth] = useState<"male" | "female" | "">("");
  const [genderIdentity, setGenderIdentity] = useState<SexAssignedAtBirth | "">(
    "",
  );
  const [address, setAddress] = useState({
    address: "",
    city: "",
    zip: "",
    county: "",
    verified: false,
  });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [productEmails, setProductEmails] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    challengeId: string;
    code: string;
  } | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        loadedIntake,
        loadedEligibility,
        loadedConsent,
        loadedProfile,
        loadedSettings,
      ] = await Promise.all([
        fetchIntakeMe(),
        fetchEligibilityMe(),
        fetchConsentMe(),
        fetchPatientProfile(),
        fetchPatientSettings(),
      ]);
      if (cancelled) return;
      setIntake(
        loadedIntake ??
          (session && !isApiEnabled() ? getIntake(session.user.id) : null),
      );
      setEligibility(loadedEligibility);
      setConsent(loadedConsent);
      setProfile(loadedProfile);
      setSettings(loadedSettings);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setDob(user.dob ?? eligibility?.dob ?? "");
    setState(user.state ?? eligibility?.state ?? "");
    setSexAtBirth(
      (profile?.sex_assigned_at_birth === "male" ||
      profile?.sex_assigned_at_birth === "female"
        ? profile.sex_assigned_at_birth
        : eligibility?.sex_assigned_at_birth === "male" ||
            eligibility?.sex_assigned_at_birth === "female"
          ? eligibility.sex_assigned_at_birth
          : "") as "male" | "female" | "",
    );
    setGenderIdentity(
      profile?.gender_identity ?? eligibility?.gender_identity ?? "",
    );
    setAddress({
      address: profile?.address || "",
      city: profile?.city || "",
      zip: profile?.zip || "",
      county: profile?.county || "",
      verified: false,
    });
    if (settings) {
      setEmailNotifications(settings.email_notifications);
      setSmsNotifications(settings.sms_notifications);
      setProductEmails(settings.product_emails);
      setTwoFactorEnabled(settings.two_factor_enabled);
    }
  }, [user, eligibility, profile, intake, settings]);

  async function handleSave() {
    setSaving(true);
    try {
      const sessionResult = await patchAuthMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dob: dob || undefined,
        state,
      });
      setSession(sessionResult);

      const updatedEligibility = await syncEligibility({
        sex_assigned_at_birth: sexAtBirth || undefined,
        gender_identity: genderIdentity || undefined,
      });
      if (updatedEligibility) setEligibility(updatedEligibility);

      const updatedProfile = await patchPatientProfile({
        sex_assigned_at_birth: sexAtBirth || undefined,
        gender_identity: genderIdentity || undefined,
      });
      setProfile(updatedProfile);

      const updatedSettings = await patchPatientSettings({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        product_emails: productEmails,
      });
      setSettings(updatedSettings);

      toast.success("Account updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTwoFactorToggle(enabled: boolean) {
    if (!enabled) {
      setTwoFactorBusy(true);
      try {
        const updated = await patchPatientSettings({
          two_factor_enabled: false,
        });
        setSettings(updated);
        setTwoFactorEnabled(false);
        setTwoFactorSetup(null);
        toast.success("Two-factor authentication disabled.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update 2FA.",
        );
      } finally {
        setTwoFactorBusy(false);
      }
      return;
    }

    setTwoFactorBusy(true);
    try {
      const { challenge_id } = await sendTwoFactorSetupCode();
      setTwoFactorSetup({ challengeId: challenge_id, code: "" });
      toast.success("Verification code sent to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleConfirmTwoFactor() {
    if (!twoFactorSetup?.code) return;
    setTwoFactorBusy(true);
    try {
      const updated = await confirmTwoFactor(
        twoFactorSetup.challengeId,
        twoFactorSetup.code,
      );
      setSettings(updated);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      toast.success("Two-factor authentication enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  const intakeAckSigned =
    consent &&
    consent.medication_risk_acknowledgment &&
    consent.compounded_medication_acknowledgment &&
    consent.no_guarantee_acknowledgment &&
    consent.emergency_disclaimer_acknowledgment;

  const intakeUnderReview =
    intake != null &&
    intake.status !== "draft" &&
    intake.status !== "more_info_needed";

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-center text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Account"
        subtitle="Update your login, contact, and shipping details. These changes apply to your account only, not your submitted medical intake."
        action={
          <Button
            className="rounded-xl"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {intakeUnderReview && (
        <div
          role="status"
          className="rounded-2xl border-2 border-primary/25 bg-primary-soft px-5 py-4"
        >
          <p className="font-semibold text-foreground">
            Account edits do not change your submitted intake
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You can update name, email, phone, and shipping here for contact and
            delivery. Your clinician still sees the medical intake you submitted
            (version {intake?.active_submission_version ?? "—"}). Clinical
            intake information can only be changed if your clinician requests
            updates.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <AccountCard title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField label="First name">
              <input
                className={inputCls}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </EditableField>
            <EditableField label="Last name">
              <input
                className={inputCls}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </EditableField>
            <EditableField label="Date of birth">
              <input
                type="date"
                className={inputCls}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </EditableField>
            <EditableField label="State">
              <select
                className={inputCls}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Select state</option>
                {US_STATE_ENTRIES.map(([abbr, name]) => (
                  <option key={abbr} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </EditableField>
            <EditableField label="Sex at birth">
              <select
                className={inputCls}
                value={sexAtBirth}
                onChange={(e) =>
                  setSexAtBirth(e.target.value as "male" | "female" | "")
                }
              >
                <option value="">Select</option>
                {SEX_AT_BIRTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </EditableField>
            <EditableField label="Gender identity">
              <select
                className={inputCls}
                value={genderIdentity}
                onChange={(e) =>
                  setGenderIdentity(e.target.value as SexAssignedAtBirth)
                }
              >
                <option value="">Select</option>
                {GENDER_IDENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </EditableField>
          </div>
        </AccountCard>

        <AccountCard title="Contact info">
          <div className="grid gap-4">
            <EditableField label="Email">
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </EditableField>
            <EditableField label="Phone">
              <input
                type="tel"
                className={inputCls}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              />
            </EditableField>
          </div>
        </AccountCard>

        <AccountCard title="Shipping address">
          <ShippingAddressSection
            expectedState={state}
            value={address}
            onSave={async (next: ShippingAddressValue) => {
              const updatedProfile = await patchPatientProfile({
                address: next.address,
                city: next.city,
                county: next.county,
                zip: next.zip,
              });
              setProfile(updatedProfile);
              setAddress({
                address: updatedProfile.address ?? next.address,
                city: updatedProfile.city ?? next.city,
                zip: updatedProfile.zip ?? next.zip,
                county: updatedProfile.county ?? next.county,
                verified: next.verified,
              });
              toast.success("Shipping address updated.");
            }}
          />
        </AccountCard>

        <AccountCard title="Communication preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Email notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Care updates and reminders
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  SMS notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Time-sensitive alerts
                </p>
              </div>
              <Switch
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Product & education emails
                </p>
                <p className="text-xs text-muted-foreground">
                  Tips and program news
                </p>
              </div>
              <Switch
                checked={productEmails}
                onCheckedChange={setProductEmails}
              />
            </div>
          </div>
        </AccountCard>

        <AccountCard title="Consent records">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-foreground">
                Intake Acknowledgments & Informed Consent
              </span>
              <span className="text-muted-foreground">
                {intakeAckSigned && consent?.signed_at
                  ? `Signed ${new Date(consent.signed_at).toLocaleDateString()}`
                  : "Not signed"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-foreground">
                Telehealth informed consent
              </span>
              <span className="text-muted-foreground">
                {consent?.signed_at
                  ? `Signed ${new Date(consent.signed_at).toLocaleDateString()}`
                  : "Not signed"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-foreground">Privacy policy</span>
              <span className="text-muted-foreground">
                {consent?.privacy_acknowledgment ? "Accepted" : "Pending"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-foreground">Terms of service</span>
              <span className="text-muted-foreground">
                {consent?.telehealth_consent ? "Accepted" : "Pending"}
              </span>
            </li>
          </ul>
        </AccountCard>

        <AccountCard title="Security">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Two-factor authentication
                </p>
                <p className="text-xs text-muted-foreground">
                  Email code required when signing in
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                disabled={twoFactorBusy || Boolean(twoFactorSetup)}
                onCheckedChange={(checked) =>
                  void handleTwoFactorToggle(checked)
                }
              />
            </div>
            {twoFactorSetup && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email to enable 2FA.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Verification code</span>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      maxLength={6}
                      value={twoFactorSetup.code}
                      onChange={(e) =>
                        setTwoFactorSetup({
                          ...twoFactorSetup,
                          code: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={twoFactorBusy || twoFactorSetup.code.length !== 6}
                    onClick={() => void handleConfirmTwoFactor()}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => setTwoFactorSetup(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </AccountCard>
      </div>
    </div>
  );
}
