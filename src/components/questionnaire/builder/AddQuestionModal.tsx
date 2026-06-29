import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  BELUGA_FIELD_OPTIONS,
  NO_VENDOR_FIELDS,
  QUESTION_FIELD_TYPES,
  belugaMappingToFieldKey,
  defaultFieldKeyForType,
  defaultLabelForType,
  defaultMapsToForType,
  uniqueAmong,
  type QuestionFieldType,
} from "@/components/questionnaire/builder/field-catalog";
import { AccountFieldMappingsEditor } from "@/components/questionnaire/builder/AccountFieldMappingsEditor";
import { AddressFieldMappingsEditor } from "@/components/questionnaire/builder/AddressFieldMappingsEditor";
import { ChoiceOptionsEditor } from "@/components/questionnaire/builder/ChoiceOptionsEditor";
import {
  presetAccountMappings,
  type AccountSubFieldMapping,
} from "@/lib/questionnaire/account-mappings";
import {
  presetAddressMappings,
  type AddressSubFieldMapping,
} from "@/lib/questionnaire/address-mappings";
import {
  defaultChoiceOptions,
  serializeChoiceOptions,
  type ChoiceOptionDraft,
} from "@/lib/questionnaire/choice-options";

export type NewQuestionPayload = {
  field_key: string;
  field_type: QuestionFieldType;
  label: string;
  maps_to_section: string;
  required: boolean;
  account_mappings?: AccountSubFieldMapping[];
  address_mappings?: AddressSubFieldMapping[];
  choice_options?: ChoiceOptionDraft[];
};

type AddQuestionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All field keys across the whole version — keys are global to the answers map. */
  existingFieldKeys: string[];
  stepHasAccountField: boolean;
  onAdd: (payload: NewQuestionPayload) => Promise<void>;
  belugaFields?: ReadonlyArray<{ value: string; label: string }>;
  vendorLabel?: string;
};

const CHOICE_TYPES = new Set<QuestionFieldType>([
  "single_choice",
  "multi_choice",
]);

function isChoiceType(fieldType: QuestionFieldType): boolean {
  return CHOICE_TYPES.has(fieldType);
}

function isMultiChoiceType(fieldType: QuestionFieldType): boolean {
  return fieldType === "multi_choice";
}

export function AddQuestionModal({
  open,
  onOpenChange,
  existingFieldKeys,
  stepHasAccountField,
  onAdd,
  belugaFields = NO_VENDOR_FIELDS,
  vendorLabel = "API Mapping",
}: AddQuestionModalProps) {
  const existing = useMemo(
    () => new Set(existingFieldKeys),
    [existingFieldKeys],
  );
  const [fieldType, setFieldType] = useState<QuestionFieldType>("text");
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [mapsTo, setMapsTo] = useState("");
  const [accountMappings, setAccountMappings] = useState(presetAccountMappings);
  const [addressSection, setAddressSection] = useState(
    "medication_preferences",
  );
  const [addressMappings, setAddressMappings] = useState(() =>
    presetAddressMappings("medication_preferences"),
  );
  const [choiceOptions, setChoiceOptions] = useState(defaultChoiceOptions);
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFieldType("text");
    setFieldKey(defaultFieldKeyForType("text", existing));
    setLabel(defaultLabelForType("text"));
    setMapsTo("");
    setAccountMappings(presetAccountMappings());
    setAddressSection("medication_preferences");
    setAddressMappings(presetAddressMappings("medication_preferences"));
    setChoiceOptions(defaultChoiceOptions());
    setRequired(false);
    setError("");
  }, [open, existing]);

  function onTypeChange(next: QuestionFieldType) {
    setFieldType(next);
    setFieldKey(defaultFieldKeyForType(next, existing));
    setLabel(defaultLabelForType(next));
    setMapsTo(defaultMapsToForType(next));
    setAccountMappings(presetAccountMappings());
    setAddressSection("medication_preferences");
    setAddressMappings(presetAddressMappings("medication_preferences"));
    setChoiceOptions(defaultChoiceOptions());
    setRequired(
      next === "account" ||
        next === "address_group" ||
        next === "review" ||
        next === "legal_consent" ||
        next === "dob" ||
        isChoiceType(next),
    );
    setError("");
  }

  function onAddressSectionChange(section: string) {
    setAddressSection(section);
    setAddressMappings(presetAddressMappings(section));
  }

  function onMapsToChange(beluga: string) {
    setMapsTo(beluga);
    const suggestedKey = belugaMappingToFieldKey(beluga);
    if (suggestedKey) {
      setFieldKey(uniqueAmong(suggestedKey, existing));
    }
  }

  function validateChoiceOptions(): string | null {
    if (choiceOptions.length < 2) {
      return "Add at least two answer options.";
    }
    const seen = new Set<string>();
    for (const opt of choiceOptions) {
      const value = opt.value.trim();
      const optionLabel = opt.label.trim();
      if (!value) return "Each option needs a mapping ID.";
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
        return "Option mapping IDs must start with a letter and use only letters, numbers, and underscores.";
      }
      if (!optionLabel) return "Each option needs a label.";
      if (seen.has(value)) return `Duplicate option mapping ID "${value}".`;
      seen.add(value);
    }
    return null;
  }

  async function handleSubmit() {
    const key = fieldKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) {
      setError("Enter a field ID.");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      setError(
        "Field ID must start with a letter and use only lowercase letters, numbers, and underscores.",
      );
      return;
    }
    if (existing.has(key)) {
      setError(
        "Another question already uses that field ID. Field IDs must be unique across the whole questionnaire because answers share one map.",
      );
      return;
    }
    if (fieldType === "account" && stepHasAccountField) {
      setError("This step already has an account field.");
      return;
    }
    if (isChoiceType(fieldType)) {
      const choiceError = validateChoiceOptions();
      if (choiceError) {
        setError(choiceError);
        return;
      }
    }
    if (
      !label.trim() &&
      fieldType !== "account" &&
      fieldType !== "legal_consent"
    ) {
      setError("Enter the question text.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onAdd({
        field_key: key,
        field_type: fieldType,
        label: label.trim() || defaultLabelForType(fieldType),
        maps_to_section:
          fieldType === "account" ||
          fieldType === "review" ||
          fieldType === "legal_consent" ||
          isMultiChoiceType(fieldType)
            ? ""
            : fieldType === "address_group"
              ? addressSection
              : fieldType === "dob"
                ? "beluga:dob"
                : mapsTo,
        required:
          fieldType === "account" || fieldType === "address_group"
            ? true
            : required,
        account_mappings: fieldType === "account" ? accountMappings : undefined,
        address_mappings:
          fieldType === "address_group" ? addressMappings : undefined,
        choice_options: isChoiceType(fieldType)
          ? serializeChoiceOptions(choiceOptions, fieldType)
          : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add question.");
    } finally {
      setSaving(false);
    }
  }

  const isAccountType = fieldType === "account";
  const isAddressType = fieldType === "address_group";
  const isReviewType = fieldType === "review";
  const isLegalConsentType = fieldType === "legal_consent";
  const isDobType = fieldType === "dob";
  const isChoice = isChoiceType(fieldType);
  const isSingleChoice = fieldType === "single_choice";
  const isMultiChoice = isMultiChoiceType(fieldType);
  const showStandardMappings =
    !isAccountType &&
    !isChoice &&
    !isAddressType &&
    !isReviewType &&
    !isLegalConsentType &&
    !isDobType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add question to step</DialogTitle>
          <DialogDescription>
            Start by choosing the component type — it controls which fields and
            mappings appear below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field
            label="Component type"
            required
            help="Determines how patients answer and how answers map to Aretide and Beluga."
          >
            <select
              className={inputCls}
              value={fieldType}
              onChange={(e) =>
                onTypeChange(e.target.value as QuestionFieldType)
              }
            >
              {QUESTION_FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          {isAccountType ? (
            <>
              <Field label="Field ID" required>
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="account"
                />
              </Field>
              <Field label="Section label">
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Create your account"
                />
              </Field>
              <AccountFieldMappingsEditor
                mappings={accountMappings}
                onChange={setAccountMappings}
                backendReadOnly
                compact
                belugaFields={belugaFields}
                vendorLabel={vendorLabel}
              />
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Account fields call the existing register API (email +
                password). Backend targets are fixed; adjust vendor API mappings
                if needed.
              </p>
            </>
          ) : isAddressType ? (
            <>
              <Field label="Field ID" required>
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="shipping_address"
                />
              </Field>
              <Field label="Question label" required>
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Shipping address"
                />
              </Field>
              <Field
                label="Maps to intake section"
                required
                help="Use medication_preferences for shipping delivery, or identity for home address."
              >
                <select
                  className={inputCls}
                  value={addressSection}
                  onChange={(e) => onAddressSectionChange(e.target.value)}
                >
                  <option value="medication_preferences">
                    medication_preferences (shipping)
                  </option>
                  <option value="identity">identity (home address)</option>
                </select>
              </Field>
              <AddressFieldMappingsEditor
                mappings={addressMappings}
                onChange={setAddressMappings}
                backendReadOnly
                compact
                belugaFields={belugaFields}
                vendorLabel={vendorLabel}
              />
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Patients type an address and pick a Nominatim suggestion.
                Street, city, state, ZIP, county, and country are filled
                automatically and mapped to Aretide intake and vendor API as
                configured above.
              </p>
            </>
          ) : isChoice ? (
            <>
              <Field label="Question" required>
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    fieldType === "multi_choice"
                      ? "e.g. Which goals matter to you?"
                      : "e.g. What is your primary goal?"
                  }
                />
              </Field>
              <Field
                label="Field ID"
                required
                help="Used for routing handles and stored answers."
              >
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="e.g. primary_goal"
                />
              </Field>
              {isSingleChoice ? (
                <Field
                  label="Beluga Health API mapping"
                  help="The option the patient selects is sent to this Beluga visit field (e.g. sex)."
                >
                  <select
                    className={inputCls}
                    value={mapsTo}
                    onChange={(e) => onMapsToChange(e.target.value)}
                  >
                    {belugaFields.map((f) => (
                      <option key={f.value || "none"} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <ChoiceOptionsEditor
                options={choiceOptions}
                onChange={setChoiceOptions}
                compact
                showBelugaColumn={isMultiChoice}
                belugaFields={belugaFields}
                vendorLabel={vendorLabel}
              />
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Required — patient must answer before continuing
              </label>
              {fieldType === "multi_choice" ? (
                <p className="text-xs text-muted-foreground">
                  Patients can select more than one option.
                </p>
              ) : null}
            </>
          ) : isReviewType ? (
            <>
              <Field label="Section label" required>
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Review your answers"
                />
              </Field>
              <Field
                label="Field ID"
                required
                help="Stores the patient's confirmation. Keep it unique."
              >
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="review_confirm"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Required — patient must confirm before continuing
              </label>
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Patients see what will be sent to their doctor, any missing
                details, and an “I confirm” checkbox. Place on the last intake
                step before consent.
              </p>
            </>
          ) : isLegalConsentType ? (
            <>
              <Field
                label="Section label"
                help="Optional heading above the agreement."
              >
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Legal agreements"
                />
              </Field>
              <Field
                label="Field ID"
                required
                help="Stores whether the patient agreed. Keep it unique."
              >
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="legal_consent"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Required — patient must agree before continuing
              </label>
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Shows Terms of Service, Privacy Policy, and Telehealth Consent
                links with a single agreement checkbox. Place on the review step
                or the step immediately before submission.
              </p>
            </>
          ) : isDobType ? (
            <>
              <Field label="Question" required>
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Date of birth"
                />
              </Field>
              <Field
                label="Field ID"
                required
                help="Stores the patient's birth date. Keep it unique."
              >
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="dob"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Required — patient must enter a valid birth date
              </label>
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                Patients type month, day, and year in three fields (no
                calendar). Maps to Beluga <span className="font-mono">dob</span>{" "}
                as <span className="font-mono">MM/DD/YYYY</span>. Must be 18+.
              </p>
            </>
          ) : (
            <>
              <Field label="Question" required>
                <input
                  className={inputCls}
                  value={label}
                  maxLength={256}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Question text patients see"
                />
              </Field>
              <Field label="Field ID" required>
                <input
                  className={inputCls}
                  value={fieldKey}
                  maxLength={64}
                  onChange={(e) =>
                    setFieldKey(
                      e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    )
                  }
                  placeholder="e.g. weight_lbs"
                />
              </Field>
              {showStandardMappings ? (
                <Field
                  label="Beluga Health API mapping"
                  help="Optional — maps this answer into the Beluga visit payload."
                >
                  <select
                    className={inputCls}
                    value={mapsTo}
                    onChange={(e) => onMapsToChange(e.target.value)}
                  >
                    {belugaFields.map((f) => (
                      <option key={f.value || "none"} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Required — patient must answer before continuing
              </label>
            </>
          )}

          {error ? (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Adding…" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
