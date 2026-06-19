import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccountSectionCard,
  accountSectionBadgeOnClass,
  accountSectionDividerClass,
  accountSectionRowIconClass,
  DisplayField,
  EditableField,
} from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  ShippingAddressSection,
  type ShippingAddressValue,
} from "@/components/portal/ShippingAddressSection";
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
import { cn } from "@/lib/utils";

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

type EditingSection =
  | "profile"
  | "contact"
  | "shipping"
  | "communication"
  | null;

function labelForOption<T extends string>(
  value: T | "",
  options: { value: T; label: string }[],
): string {
  if (!value) return "";
  return options.find((opt) => opt.value === value)?.label ?? value;
}

function formatDobDisplay(dob: string): string {
  if (!dob) return "";
  const parsed = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dob;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const Route = createFileRoute("/dashboard/account")({
  component: DashboardAccountPage,
});

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

  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [savingSection, setSavingSection] = useState<EditingSection>(null);

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
  const [address, setAddress] = useState<ShippingAddressValue>({
    address: "",
    city: "",
    zip: "",
    county: "",
    verified: false,
  });
  const [addressDraft, setAddressDraft] = useState(address);

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
    const nextAddress = {
      address: profile?.address || "",
      city: profile?.city || "",
      zip: profile?.zip || "",
      county: profile?.county || "",
      verified: false,
    };
    setAddress(nextAddress);
    if (editingSection !== "shipping") {
      setAddressDraft(nextAddress);
    }
    if (settings) {
      setEmailNotifications(settings.email_notifications);
      setSmsNotifications(settings.sms_notifications);
      setProductEmails(settings.product_emails);
      setTwoFactorEnabled(settings.two_factor_enabled);
    }
  }, [user, eligibility, profile, intake, settings, editingSection]);

  function startEditing(section: EditingSection) {
    if (editingSection && editingSection !== section) {
      cancelEditing(editingSection);
    }
    if (section === "shipping") {
      setAddressDraft(address);
    }
    setEditingSection(section);
  }

  function cancelEditing(section: EditingSection) {
    if (section === "profile") {
      setFirstName(user.first_name);
      setLastName(user.last_name);
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
    }
    if (section === "contact") {
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
    if (section === "shipping") {
      setAddressDraft(address);
    }
    if (section === "communication" && settings) {
      setEmailNotifications(settings.email_notifications);
      setSmsNotifications(settings.sms_notifications);
      setProductEmails(settings.product_emails);
    }
    setEditingSection(null);
  }

  async function handleSaveProfile() {
    setSavingSection("profile");
    try {
      const sessionResult = await patchAuthMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
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

      setEditingSection(null);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveContact() {
    setSavingSection("contact");
    try {
      const sessionResult = await patchAuthMe({
        email: email.trim(),
        phone: phone.trim(),
      });
      setSession(sessionResult);
      setEditingSection(null);
      toast.success("Contact info updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveShipping() {
    setSavingSection("shipping");
    try {
      const updatedProfile = await patchPatientProfile({
        address: addressDraft.address,
        city: addressDraft.city,
        county: addressDraft.county,
        zip: addressDraft.zip,
      });
      setProfile(updatedProfile);
      setAddress({
        address: updatedProfile.address ?? addressDraft.address,
        city: updatedProfile.city ?? addressDraft.city,
        zip: updatedProfile.zip ?? addressDraft.zip,
        county: updatedProfile.county ?? addressDraft.county,
        verified: addressDraft.verified,
      });
      setEditingSection(null);
      toast.success("Shipping address updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveCommunication() {
    setSavingSection("communication");
    try {
      const updatedSettings = await patchPatientSettings({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        product_emails: productEmails,
      });
      setSettings(updatedSettings);
      setEditingSection(null);
      toast.success("Communication preferences updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingSection(null);
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
        <AccountSectionCard
          title="Profile"
          description="Your legal name and demographic details"
          icon={UserRound}
          tone="primary"
          editable
          editing={editingSection === "profile"}
          saving={savingSection === "profile"}
          onEdit={() => startEditing("profile")}
          onSave={() => void handleSaveProfile()}
          onCancel={() => cancelEditing("profile")}
        >
          {editingSection === "profile" ? (
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
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <DisplayField label="First name" value={firstName} />
              <DisplayField label="Last name" value={lastName} />
              <DisplayField
                label="Date of birth"
                value={formatDobDisplay(dob)}
              />
              <DisplayField label="State" value={state} />
              <DisplayField
                label="Sex at birth"
                value={labelForOption(sexAtBirth, SEX_AT_BIRTH_OPTIONS)}
              />
              <DisplayField
                label="Gender identity"
                value={labelForOption(genderIdentity, GENDER_IDENTITY_OPTIONS)}
              />
            </dl>
          )}
        </AccountSectionCard>

        <AccountSectionCard
          title="Contact info"
          description="How we reach you about your care"
          icon={Mail}
          tone="contact"
          editable
          editing={editingSection === "contact"}
          saving={savingSection === "contact"}
          onEdit={() => startEditing("contact")}
          onSave={() => void handleSaveContact()}
          onCancel={() => cancelEditing("contact")}
        >
          {editingSection === "contact" ? (
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
          ) : (
            <dl className="grid gap-4">
              <ContactDisplayRow icon={Mail} label="Email" value={email} />
              <ContactDisplayRow icon={Phone} label="Phone" value={phone} />
            </dl>
          )}
        </AccountSectionCard>

        <AccountSectionCard
          title="Shipping address"
          description="Where your medication is delivered"
          icon={Truck}
          tone="shipping"
          editable
          editing={editingSection === "shipping"}
          saving={savingSection === "shipping"}
          onEdit={() => startEditing("shipping")}
          onSave={() => void handleSaveShipping()}
          onCancel={() => cancelEditing("shipping")}
        >
          <ShippingAddressSection
            expectedState={state}
            value={address}
            draft={addressDraft}
            onDraftChange={setAddressDraft}
            editing={editingSection === "shipping"}
            showActions={false}
          />
        </AccountSectionCard>

        <AccountSectionCard
          title="Communication preferences"
          description="Choose how you'd like to hear from us"
          icon={Bell}
          tone="communication"
          editable
          editing={editingSection === "communication"}
          saving={savingSection === "communication"}
          onEdit={() => startEditing("communication")}
          onSave={() => void handleSaveCommunication()}
          onCancel={() => cancelEditing("communication")}
        >
          {editingSection === "communication" ? (
            <div
              className={cn(
                "divide-y",
                accountSectionDividerClass("communication"),
              )}
            >
              <PreferenceRow
                icon={Mail}
                iconClassName={accountSectionRowIconClass("communication")}
                title="Email notifications"
                description="Care updates and reminders"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
              <PreferenceRow
                icon={Smartphone}
                iconClassName={accountSectionRowIconClass("communication")}
                title="SMS notifications"
                description="Time-sensitive alerts"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
              <PreferenceRow
                icon={BookOpen}
                iconClassName={accountSectionRowIconClass("communication")}
                title="Product & education emails"
                description="Tips and program news"
                checked={productEmails}
                onCheckedChange={setProductEmails}
              />
            </div>
          ) : (
            <dl
              className={cn(
                "divide-y",
                accountSectionDividerClass("communication"),
              )}
            >
              <PreferenceDisplay
                icon={Mail}
                iconClassName={accountSectionRowIconClass("communication")}
                title="Email notifications"
                description="Care updates and reminders"
                enabled={emailNotifications}
              />
              <PreferenceDisplay
                icon={Smartphone}
                iconClassName={accountSectionRowIconClass("communication")}
                title="SMS notifications"
                description="Time-sensitive alerts"
                enabled={smsNotifications}
              />
              <PreferenceDisplay
                icon={BookOpen}
                iconClassName={accountSectionRowIconClass("communication")}
                title="Product & education emails"
                description="Tips and program news"
                enabled={productEmails}
              />
            </dl>
          )}
        </AccountSectionCard>

        <AccountSectionCard
          title="Consent records"
          description="Agreements you've accepted"
          icon={FileCheck2}
          tone="consent"
        >
          <ul className={cn("divide-y", accountSectionDividerClass("consent"))}>
            <ConsentRow
              label="Intake Acknowledgments & Informed Consent"
              status={
                intakeAckSigned && consent?.signed_at
                  ? `Signed ${new Date(consent.signed_at).toLocaleDateString()}`
                  : "Not signed"
              }
              complete={Boolean(intakeAckSigned && consent?.signed_at)}
            />
            <ConsentRow
              label="Telehealth informed consent"
              status={
                consent?.signed_at
                  ? `Signed ${new Date(consent.signed_at).toLocaleDateString()}`
                  : "Not signed"
              }
              complete={Boolean(consent?.signed_at)}
            />
            <ConsentRow
              label="Privacy policy"
              status={consent?.privacy_acknowledgment ? "Accepted" : "Pending"}
              complete={Boolean(consent?.privacy_acknowledgment)}
            />
            <ConsentRow
              label="Terms of service"
              status={consent?.telehealth_consent ? "Accepted" : "Pending"}
              complete={Boolean(consent?.telehealth_consent)}
            />
          </ul>
        </AccountSectionCard>

        <AccountSectionCard
          title="Security"
          description="Protect your account"
          icon={ShieldCheck}
          tone="security"
        >
          <div className="space-y-4">
            <PreferenceRow
              icon={LockKeyhole}
              iconClassName={accountSectionRowIconClass("security")}
              title="Two-factor authentication"
              description="Email code required when signing in"
              checked={twoFactorEnabled}
              disabled={twoFactorBusy || Boolean(twoFactorSetup)}
              onCheckedChange={(checked) => void handleTwoFactorToggle(checked)}
            />
            {twoFactorSetup && (
              <div className="rounded-2xl border border-destructive/20 bg-card/70 p-4">
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
        </AccountSectionCard>
      </div>
    </div>
  );
}

function ContactDisplayRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          accountSectionRowIconClass("contact"),
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <DisplayField label={label} value={value} className="min-w-0 flex-1" />
    </div>
  );
}

function PreferenceRow({
  icon: Icon,
  iconClassName = "bg-secondary/15 text-secondary",
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function PreferenceDisplay({
  icon: Icon,
  iconClassName = accountSectionRowIconClass("communication"),
  title,
  description,
  enabled,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium",
          enabled
            ? accountSectionBadgeOnClass("communication")
            : "bg-muted text-muted-foreground",
        )}
      >
        {enabled ? "On" : "Off"}
      </span>
    </div>
  );
}

function ConsentRow({
  label,
  status,
  complete,
}: {
  label: string;
  status: string;
  complete: boolean;
}) {
  const StatusIcon = complete ? CheckCircle2 : Clock;

  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
      <span className="text-foreground">{label}</span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5",
          complete ? "text-success" : "text-muted-foreground",
        )}
      >
        <StatusIcon className="size-4" aria-hidden />
        {status}
      </span>
    </li>
  );
}
