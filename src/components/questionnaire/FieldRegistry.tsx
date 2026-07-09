import type { ReactNode } from "react";
import type {
  QuestionnaireFieldSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  ChoiceCard,
  Field,
  HelpHint,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import {
  emptyAddressGroupValue,
  parseAddressGroupValue,
} from "@/lib/questionnaire/address-group";
import { AccountRegistrationFields } from "@/components/questionnaire/AccountRegistrationFields";
import { QuestionnaireAddressSection } from "@/components/questionnaire/QuestionnaireAddressSection";
import { QuestionnaireReviewField } from "@/components/questionnaire/QuestionnaireReviewField";
import type { QuestionnaireReviewVariant } from "@/components/questionnaire/QuestionnaireReviewField";
import { QuestionnaireLegalConsentField } from "@/components/questionnaire/QuestionnaireLegalConsentField";
import { QuestionnaireDateOfBirthField } from "@/components/questionnaire/QuestionnaireDateOfBirthField";
import { QuestionnairePaymentField } from "@/components/payments/QuestionnairePaymentField";
import { PAYMENT_HOLD_PLUGIN_ID } from "@/lib/questionnaire/payment-field";
import type { BelugaAccountExtras } from "@/lib/questionnaire/beluga-review";
import {
  isAccountField,
  type RegistrationFields,
} from "@/lib/questionnaire/registration";

function FieldLabel({ field }: { field: QuestionnaireFieldSchema }) {
  if (!field.label) return null;
  return (
    <p className="mb-2 text-sm font-medium text-foreground">
      {field.label}
      {field.required ? <span className="text-destructive ml-1">*</span> : null}
      {field.help_text ? <HelpHint text={field.help_text} /> : null}
    </p>
  );
}

function normalizeYesNoOptions(field: QuestionnaireFieldSchema) {
  const opts = (field.options ?? []) as { value: string; label: string }[];
  if (opts.length >= 2) return opts;
  return [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
}

export type FieldRenderContext = {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  /** Read-only display (e.g. patient portal). Inputs are disabled. */
  readOnly?: boolean;
  /** Patient account / qualify state — used to validate home addresses. */
  expectedState?: string | null;
  /** Account signup fields when the step includes an account component. */
  registration?: {
    value: RegistrationFields;
    onChange: (next: RegistrationFields) => void;
  };
  /** Patient already has a session — account field shows a short note. */
  signedIn?: boolean;
  /** Full version + answers — used by the review component to summarize. */
  schema?: QuestionnaireVersionSchema;
  allResponses?: Record<string, unknown>;
  qualifySchema?: QuestionnaireVersionSchema | null;
  qualifyResponses?: Record<string, unknown>;
  /** Explicit intake schema for review fields (builder preview passes this separately from schema). */
  intakeSchema?: QuestionnaireVersionSchema | null;
  accountExtras?: BelugaAccountExtras;
  /** Patient live flow vs staff builder preview. */
  reviewVariant?: QuestionnaireReviewVariant;
};

export function renderQuestionnaireField(
  field: QuestionnaireFieldSchema,
  ctx: FieldRenderContext,
): ReactNode {
  const {
    value,
    onChange,
    error,
    readOnly,
    expectedState,
    registration,
    signedIn,
    schema,
    allResponses,
    qualifySchema,
    qualifyResponses,
    intakeSchema,
    accountExtras,
    reviewVariant,
  } = ctx;

  const isReviewField =
    field.field_type === "review" ||
    (field.field_type === "plugin" && field.plugin_id === "intake_review");

  if (isReviewField) {
    return (
      <div>
        <FieldLabel field={field} />
        <QuestionnaireReviewField
          variant={reviewVariant ?? "patient"}
          qualifySchema={qualifySchema}
          qualifyResponses={qualifyResponses}
          intakeSchema={intakeSchema ?? schema}
          intakeResponses={allResponses ?? {}}
          registration={registration?.value}
          accountExtras={accountExtras}
          value={value === true}
          required={field.required ?? false}
          readOnly={readOnly}
          onChange={(checked) => onChange(checked)}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "legal_consent") {
    return (
      <div>
        <FieldLabel field={field} />
        <QuestionnaireLegalConsentField
          value={value === true}
          required={field.required ?? false}
          readOnly={readOnly}
          onChange={(agreed) => onChange(agreed)}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "dob") {
    return (
      <div>
        <FieldLabel field={field} />
        <QuestionnaireDateOfBirthField
          value={typeof value === "string" ? value : ""}
          required={field.required ?? false}
          readOnly={readOnly}
          onChange={onChange}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "single_choice") {
    const options = (field.options ?? []) as { value: string; label: string }[];
    const sideBySide = options.length === 2;
    return (
      <div>
        <FieldLabel field={field} />
        <div className={sideBySide ? "grid grid-cols-2 gap-3" : "space-y-3"}>
          {options.map((opt, i) => (
            <ChoiceCard
              key={`${opt.value}-${i}`}
              compact={sideBySide}
              title={opt.label}
              selected={value === opt.value}
              onClick={() => !readOnly && onChange(opt.value)}
            />
          ))}
        </div>
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "yes_no") {
    const opts = normalizeYesNoOptions(field);
    const boolValue =
      value === true || value === "yes"
        ? true
        : value === false || value === "no"
          ? false
          : null;
    const yesLabel = opts.find((o) => o.value === "yes")?.label ?? "Yes";
    const noLabel = opts.find((o) => o.value === "no")?.label ?? "No";
    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: true as const, label: yesLabel, store: "yes" },
            { v: false as const, label: noLabel, store: "no" },
          ].map((o) => (
            <ChoiceCard
              key={o.store}
              compact
              title={o.label}
              selected={boolValue === o.v}
              onClick={() => !readOnly && onChange(o.store)}
            />
          ))}
        </div>
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "multi_choice") {
    const options = (field.options ?? []) as { value: string; label: string }[];
    const selected = Array.isArray(value)
      ? value.map(String)
      : String(value ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const sideBySide = options.length === 2;
    return (
      <div>
        <FieldLabel field={field} />
        <div className={sideBySide ? "grid grid-cols-2 gap-3" : "space-y-3"}>
          {options.map((opt, i) => {
            const checked = selected.includes(opt.value);
            return (
              <ChoiceCard
                key={`${opt.value}-${i}`}
                compact={sideBySide}
                title={opt.label}
                selected={checked}
                onClick={() => {
                  if (readOnly) return;
                  const next = checked
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
              />
            );
          })}
        </div>
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "address_group") {
    const parsed = parseAddressGroupValue(value) ?? emptyAddressGroupValue();
    const addressLabel =
      field.maps_to_section === "medication_preferences"
        ? field.label || "Shipping address"
        : field.label || "Home address";

    return (
      <div>
        <FieldLabel field={field} />
        <QuestionnaireAddressSection
          label={addressLabel}
          expectedState={expectedState}
          value={parsed}
          onChange={onChange}
          readOnly={readOnly}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <div>
        <Field
          label={field.label}
          required={field.required}
          help={field.help_text || undefined}
        >
          <textarea
            className={inputCls}
            value={String(value ?? "")}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            disabled={readOnly}
            rows={4}
          />
        </Field>
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (
    field.field_type === "plugin" &&
    field.plugin_id === PAYMENT_HOLD_PLUGIN_ID
  ) {
    // Staff builder's interactive "Preview" modal renders live (non-readOnly)
    // so routing/validation can be clicked through, but must never mount a
    // real Stripe form or hit the payment-hold API under the staff's own
    // account — reviewVariant="preview" is the same signal the review field
    // already uses to detect that context.
    if (reviewVariant === "preview") {
      return (
        <p className="text-sm text-muted-foreground">
          Payment — auth hold (preview)
        </p>
      );
    }
    return (
      <div>
        <FieldLabel field={field} />
        <QuestionnairePaymentField
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "plugin") {
    return (
      <p className="text-sm text-muted-foreground">
        Plugin field: {field.plugin_id || field.field_key}
        {readOnly ? "" : " (preview)"}
      </p>
    );
  }

  if (isAccountField(field)) {
    if (readOnly || signedIn) {
      return (
        <p className="text-sm text-muted-foreground text-center py-2">
          Signed in — continue to medical intake.
        </p>
      );
    }
    if (!registration) {
      return (
        <p className="text-sm text-destructive">
          Account field is not configured for this view.
        </p>
      );
    }
    return (
      <div>
        {field.label ? <FieldLabel field={field} /> : null}
        <AccountRegistrationFields
          value={registration.value}
          onChange={registration.onChange}
          readOnly={readOnly}
          error={error}
        />
      </div>
    );
  }

  const inputType =
    field.field_type === "email"
      ? "email"
      : field.field_type === "phone"
        ? "tel"
        : field.field_type === "number"
          ? "number"
          : field.field_type === "date"
            ? "date"
            : field.field_type === "password"
              ? "password"
              : "text";

  return (
    <div>
      <Field
        label={field.label}
        required={field.required}
        help={field.help_text || undefined}
      >
        <input
          type={inputType}
          className={inputCls}
          value={String(value ?? "")}
          onChange={(e) => !readOnly && onChange(e.target.value)}
          disabled={readOnly}
        />
      </Field>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
