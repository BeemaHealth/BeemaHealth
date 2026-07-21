import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  FlaskConical,
  LockKeyhole,
  Mail,
  MessageSquare,
  Phone,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccountSectionCard,
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
import { emptyShippingAddressValue } from "@/lib/shipping-address";
import { Switch } from "@/components/ui/switch";
import {
  confirmTwoFactor,
  fetchActiveQuestionnaire,
  fetchAuthMe,
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
import {
  allQuestionnaireFields,
  resolveAccountDemographics,
  resolveShippingAddress,
} from "@/lib/account-profile-fields";
import { getIntake } from "@/lib/storage";
import { US_STATE_ENTRIES } from "@/lib/us-states";
import type {
  ConsentRecord,
  EligibilityResponses,
  MedicalIntake,
  PatientProfile,
  PatientSettings,
  User,
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

/* Gender identity is not collected in the funnel right now.
const GENDER_IDENTITY_OPTIONS: { value: SexAssignedAtBirth; label: string }[] =
  [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "intersex", label: "Intersex" },
    { value: "unknown", label: "Prefer not to say" },
  ];
*/

type EditingSection = "profile" | "contact" | "shipping" | null;

type CommunicationPreference = "email" | "sms" | "product";

type NotificationCategoryKey =
  | "notify_messages"
  | "notify_review"
  | "notify_prescription"
  | "notify_shipping"
  | "notify_labs"
  | "notify_appointments";

const NOTIFICATION_CATEGORIES: {
  key: NotificationCategoryKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "notify_messages",
    title: "Care team messages",
    description: "Messages from your provider or support team",
    icon: MessageSquare,
  },
  {
    key: "notify_review",
    title: "Visit decisions",
    description: "When a provider completes or cancels your visit",
    icon: Stethoscope,
  },
  {
    key: "notify_prescription",
    title: "Prescription updates",
    description: "When a prescription is written for you",
    icon: Pill,
  },
  {
    key: "notify_shipping",
    title: "Order & shipping",
    description: "Pharmacy fulfillment and delivery tracking",
    icon: Truck,
  },
  {
    key: "notify_labs",
    title: "Lab updates",
    description: "Lab kits, samples, and results",
    icon: FlaskConical,
  },
  {
    key: "notify_appointments",
    title: "Appointment updates",
    description: "Scheduling, reschedules, and reminders",
    icon: CalendarClock,
  },
];

const DEFAULT_NOTIFICATION_CATEGORIES: Record<
  NotificationCategoryKey,
  boolean
> = {
  notify_messages: true,
  notify_review: true,
  notify_prescription: true,
  notify_shipping: true,
  notify_labs: true,
  notify_appointments: true,
};

type PreferenceBusyKey = CommunicationPreference | NotificationCategoryKey;

function notificationCategoriesFromSettings(
  settings: PatientSettings,
): Record<NotificationCategoryKey, boolean> {
  return {
    notify_messages: settings.notify_messages,
    notify_review: settings.notify_review,
    notify_prescription: settings.notify_prescription,
    notify_shipping: settings.notify_shipping,
    notify_labs: settings.notify_labs,
    notify_appointments: settings.notify_appointments,
  };
}

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
  // const [genderIdentity, setGenderIdentity] = useState<SexAssignedAtBirth | "">("");
  const [address, setAddress] = useState<ShippingAddressValue>({
    ...emptyShippingAddressValue(),
  });
  const [addressDraft, setAddressDraft] = useState(address);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [productEmails, setProductEmails] = useState(false);
  const [notifyCategories, setNotifyCategories] = useState<
    Record<NotificationCategoryKey, boolean>
  >(DEFAULT_NOTIFICATION_CATEGORIES);
  const [advancedNotificationsOpen, setAdvancedNotificationsOpen] =
    useState(false);
  const [preferenceBusy, setPreferenceBusy] =
    useState<PreferenceBusyKey | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    challengeId: string;
    code: string;
  } | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [questionnaireFields, setQuestionnaireFields] = useState<
    ReturnType<typeof allQuestionnaireFields>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        loadedIntake,
        loadedEligibility,
        loadedConsent,
        loadedProfile,
        loadedSettings,
        refreshedUser,
      ] = await Promise.all([
        fetchIntakeMe(),
        fetchEligibilityMe(),
        fetchConsentMe(),
        fetchPatientProfile(),
        fetchPatientSettings(),
        isApiEnabled() ? fetchAuthMe() : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const intakeData =
        loadedIntake ??
        (session && !isApiEnabled() ? getIntake(session.user.id) : null);
      let fields: ReturnType<typeof allQuestionnaireFields> = [];
      if (intakeData?.questionnaire_version_id) {
        try {
          const schema = await fetchActiveQuestionnaire(
            "intake",
            intakeData.questionnaire_version_id,
          );
          fields = allQuestionnaireFields(schema.steps);
        } catch {
          fields = [];
        }
      }
      if (refreshedUser) {
        const refreshed =
          "user" in refreshedUser && refreshedUser.user
            ? refreshedUser
            : {
                user: refreshedUser as unknown as User,
                token: session?.token ?? "",
              };
        // Only push to context when the user actually changed. fetchAuthMe
        // returns a fresh object each call, so an unconditional setSession here
        // would loop this effect forever (and trip the auth rate limiter).
        if (JSON.stringify(refreshed.user) !== JSON.stringify(user)) {
          setSession(refreshed);
        }
      }
      setIntake(intakeData);
      setEligibility(loadedEligibility);
      setConsent(loadedConsent);
      setProfile(loadedProfile);
      setSettings(loadedSettings);
      setQuestionnaireFields(fields);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the session token (login identity) rather than the whole session
    // object so refreshing user data via setSession does not re-run this loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
    setPhone(user.phone ?? "");

    const resolved = resolveAccountDemographics({
      user,
      profile,
      eligibility,
      intake,
      questionnaireFields,
    });
    setDob(resolved.dob);
    setState(resolved.state);
    setSexAtBirth(resolved.sexAtBirth);

    const nextAddress = resolveShippingAddress({
      profile,
      intake,
      questionnaireFields,
      fallbackState: resolved.state,
    });
    setAddress(nextAddress);
    if (editingSection !== "shipping") {
      setAddressDraft(nextAddress);
    }
    if (settings) {
      setEmailNotifications(settings.email_notifications);
      setSmsNotifications(settings.sms_notifications);
      setProductEmails(settings.product_emails);
      setTwoFactorEnabled(settings.two_factor_enabled);
      setNotifyCategories(notificationCategoriesFromSettings(settings));
    }
  }, [
    user,
    eligibility,
    profile,
    intake,
    settings,
    editingSection,
    questionnaireFields,
  ]);

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
      const resolved = resolveAccountDemographics({
        user,
        profile,
        eligibility,
        intake,
        questionnaireFields,
      });
      setDob(resolved.dob);
      setState(resolved.state);
      setSexAtBirth(resolved.sexAtBirth);
    }
    if (section === "contact") {
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
    if (section === "shipping") {
      setAddressDraft(address);
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
      });
      if (updatedEligibility) setEligibility(updatedEligibility);

      const updatedProfile = await patchPatientProfile({
        sex_assigned_at_birth: sexAtBirth || undefined,
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
        state: addressDraft.state || user.state || "",
        zip: updatedProfile.zip ?? addressDraft.zip,
        county: updatedProfile.county ?? addressDraft.county,
        country: addressDraft.country || "US",
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

  async function handleCommunicationToggle(
    field: CommunicationPreference,
    enabled: boolean,
  ) {
    const labels: Record<CommunicationPreference, string> = {
      email: "Email notifications",
      sms: "SMS notifications",
      product: "Product & education emails",
    };
    const payload =
      field === "email"
        ? { email_notifications: enabled }
        : field === "sms"
          ? { sms_notifications: enabled }
          : { product_emails: enabled };

    setPreferenceBusy(field);
    try {
      const updated = await patchPatientSettings(payload);
      setSettings(updated);
      setEmailNotifications(updated.email_notifications);
      setSmsNotifications(updated.sms_notifications);
      setProductEmails(updated.product_emails);
      setNotifyCategories(notificationCategoriesFromSettings(updated));
      toast.success(`${labels[field]} ${enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update preference.",
      );
    } finally {
      setPreferenceBusy(null);
    }
  }

  async function handleNotificationCategoryToggle(
    key: NotificationCategoryKey,
    enabled: boolean,
  ) {
    const label =
      NOTIFICATION_CATEGORIES.find((category) => category.key === key)?.title ??
      "Notification";

    setPreferenceBusy(key);
    try {
      const updated = await patchPatientSettings({ [key]: enabled });
      setSettings(updated);
      setNotifyCategories(notificationCategoriesFromSettings(updated));
      toast.success(`${label} ${enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update preference.",
      );
    } finally {
      setPreferenceBusy(null);
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
            (version {intake?.active_submission_version ?? "N/A"}). Clinical
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
              {/* Gender identity is not collected in the funnel right now.
              <EditableField label="Gender identity">
                ...
              </EditableField>
              */}
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
        >
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
              disabled={preferenceBusy !== null}
              onCheckedChange={(checked) =>
                void handleCommunicationToggle("email", checked)
              }
            />
            <PreferenceRow
              icon={Smartphone}
              iconClassName={accountSectionRowIconClass("communication")}
              title="SMS notifications"
              description="Time-sensitive alerts"
              checked={smsNotifications}
              disabled={preferenceBusy !== null}
              onCheckedChange={(checked) =>
                void handleCommunicationToggle("sms", checked)
              }
            />
            <PreferenceRow
              icon={BookOpen}
              iconClassName={accountSectionRowIconClass("communication")}
              title="Product & education emails"
              description="Tips and program news"
              checked={productEmails}
              disabled={preferenceBusy !== null}
              onCheckedChange={(checked) =>
                void handleCommunicationToggle("product", checked)
              }
            />
            <div className="pt-2">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/50"
                aria-expanded={advancedNotificationsOpen}
                onClick={() => setAdvancedNotificationsOpen((open) => !open)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Advanced notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose which care events can reach you
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    advancedNotificationsOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {advancedNotificationsOpen ? (
                <div
                  className={cn(
                    "mt-1 divide-y",
                    accountSectionDividerClass("communication"),
                  )}
                >
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <PreferenceRow
                      key={category.key}
                      icon={category.icon}
                      iconClassName={accountSectionRowIconClass(
                        "communication",
                      )}
                      title={category.title}
                      description={category.description}
                      checked={notifyCategories[category.key]}
                      disabled={preferenceBusy !== null}
                      onCheckedChange={(checked) =>
                        void handleNotificationCategoryToggle(
                          category.key,
                          checked,
                        )
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
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
