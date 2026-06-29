import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/quiz/quiz-primitives";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import { AccountFieldMappingsEditor } from "@/components/questionnaire/builder/AccountFieldMappingsEditor";
import { AddressFieldMappingsEditor } from "@/components/questionnaire/builder/AddressFieldMappingsEditor";
import { ChoiceOptionsEditor } from "@/components/questionnaire/builder/ChoiceOptionsEditor";
import {
  normalizeFieldKeyInput,
  isValidFieldKey,
} from "@/components/questionnaire/builder/field-catalog";
import { isAccountField } from "@/lib/questionnaire/registration";
import {
  parseAccountMappings,
  serializeAccountMappings,
} from "@/lib/questionnaire/account-mappings";
import {
  parseAddressMappings,
  presetAddressMappings,
  serializeAddressMappings,
} from "@/lib/questionnaire/address-mappings";
import {
  parseChoiceOptions,
  serializeChoiceOptions,
  type ChoiceOptionDraft,
} from "@/lib/questionnaire/choice-options";

const CHOICE_TYPES = new Set(["single_choice", "multi_choice", "yes_no"]);
const CONFIGURABLE_CHOICE_TYPES = new Set(["single_choice", "multi_choice"]);

type Option = { value: string; label: string };

function defaultYesNoOptions(): Option[] {
  return [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
}

export function normalizeFieldOptions(
  field: QuestionnaireFieldSchema,
): Option[] {
  if (field.field_type === "yes_no") {
    const opts = (field.options ?? []) as Option[];
    return opts.length >= 2 ? opts : defaultYesNoOptions();
  }
  return (field.options ?? []) as Option[];
}

type FieldEditorBlockProps = {
  field: QuestionnaireFieldSchema;
  isDraft: boolean;
  fieldTypes: ReadonlyArray<{ value: string; label: string }>;
  belugaFields: ReadonlyArray<{ value: string; label: string }>;
  vendorLabel?: string;
  /** When true, omit outer card chrome (used inside StepFieldsEditor). */
  embedded?: boolean;
  onUpdate: (patch: Partial<QuestionnaireFieldSchema>) => void;
  onRemove: () => void;
};

export function FieldEditorBlock({
  field,
  isDraft,
  fieldTypes,
  belugaFields,
  vendorLabel = "API Mapping",
  embedded = false,
  onUpdate,
  onRemove,
}: FieldEditorBlockProps) {
  // Local state so typing doesn't trigger a save + reload on every keystroke
  // (which would steal focus). Text inputs persist on blur; discrete controls
  // (type, required, options add/remove) persist immediately.
  const [label, setLabel] = useState(field.label);
  const [fieldKey, setFieldKey] = useState(field.field_key);
  const [fieldKeyError, setFieldKeyError] = useState("");
  const [helpText, setHelpText] = useState(field.help_text ?? "");
  const [mapsToSection, setMapsToSection] = useState(
    field.maps_to_section ?? "",
  );
  const [pluginId, setPluginId] = useState(field.plugin_id ?? "");
  const [options, setOptions] = useState<Option[]>(
    normalizeFieldOptions(field),
  );
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOptionDraft[]>(
    parseChoiceOptions(field.options),
  );

  // Resync when a different field is selected (key changes) or after a reload
  // brings new server values for this same field.
  useEffect(() => {
    setLabel(field.label);
    setFieldKey(field.field_key);
    setFieldKeyError("");
    setHelpText(field.help_text ?? "");
    setMapsToSection(field.maps_to_section ?? "");
    setPluginId(field.plugin_id ?? "");
    setOptions(normalizeFieldOptions(field));
    setChoiceOptions(parseChoiceOptions(field.options));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.field_key, field.field_type]);

  const belugaValue =
    field.maps_to_section &&
    belugaFields.some((f) => f.value === field.maps_to_section)
      ? field.maps_to_section
      : "";
  const showOptions = CHOICE_TYPES.has(field.field_type);
  const showConfigurableChoiceOptions = CONFIGURABLE_CHOICE_TYPES.has(
    field.field_type,
  );
  const isYesNo = field.field_type === "yes_no";
  const isSingleChoice = field.field_type === "single_choice";
  const isAccount = isAccountField(field);
  const isAddress = field.field_type === "address_group";
  const isDob = field.field_type === "dob";
  const accountMappings = parseAccountMappings(field);
  const addressMappings = parseAddressMappings(field);

  function commitFieldKey() {
    const normalized = normalizeFieldKeyInput(fieldKey);
    setFieldKey(normalized);
    if (normalized === field.field_key) {
      setFieldKeyError("");
      return;
    }
    if (!normalized) {
      setFieldKeyError("Field ID is required.");
      setFieldKey(field.field_key);
      return;
    }
    if (!isValidFieldKey(normalized)) {
      setFieldKeyError(
        "Use lowercase letters, numbers, and underscores (start with a letter or digit).",
      );
      setFieldKey(field.field_key);
      return;
    }
    setFieldKeyError("");
    onUpdate({ field_key: normalized });
  }

  function persistOptions(next: Option[]) {
    setOptions(next);
    onUpdate({ options: next });
  }

  function setOptionLocal(index: number, patch: Partial<Option>) {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    );
  }

  function addOption() {
    // Sensible default key (editable); empty label so the input shows a real
    // placeholder instead of literal "New option" text.
    const used = new Set(options.map((o) => o.value));
    let n = options.length + 1;
    let value = `option_${n}`;
    while (used.has(value)) {
      n += 1;
      value = `option_${n}`;
    }
    persistOptions([...options, { value, label: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 1) return;
    persistOptions(options.filter((_, i) => i !== index));
  }

  return (
    <div
      className={
        embedded
          ? "space-y-2"
          : "rounded-xl border border-border p-2.5 space-y-2"
      }
    >
      {!embedded && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-foreground truncate">
              {field.field_key}
            </p>
          </div>
          {isDraft && (
            <button
              type="button"
              className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={onRemove}
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      )}

      {embedded && isDraft ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            aria-label={`Remove ${field.field_key}`}
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium">
          Field ID
        </p>
        <input
          className={`${inputCls} text-xs font-mono`}
          value={fieldKey}
          disabled={!isDraft || isAccount}
          maxLength={64}
          placeholder="medical_conditions"
          onChange={(e) => {
            setFieldKey(e.target.value);
            if (fieldKeyError) setFieldKeyError("");
          }}
          onBlur={() => commitFieldKey()}
        />
        {fieldKeyError ? (
          <p className="text-[10px] text-destructive">{fieldKeyError}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            {isAccount
              ? "Account fields keep a fixed ID."
              : "Unique across the whole questionnaire. Used in routing and patient answers."}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium">Label</p>
        <input
          className={`${inputCls} text-xs`}
          value={label}
          disabled={!isDraft}
          maxLength={256}
          placeholder="Question label"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== field.label && onUpdate({ label })}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium">
          Help text
        </p>
        <textarea
          className={`${inputCls} text-xs`}
          rows={2}
          value={helpText}
          disabled={!isDraft}
          maxLength={1024}
          placeholder="Shown as a “?” hint next to the label"
          onChange={(e) => setHelpText(e.target.value)}
          onBlur={() =>
            helpText !== (field.help_text ?? "") &&
            onUpdate({ help_text: helpText })
          }
        />
      </div>

      <div className="flex items-center gap-2">
        {isAccount ? (
          <p className="text-xs text-muted-foreground flex-1">
            Account (email &amp; password signup)
          </p>
        ) : (
          <select
            className="text-xs border border-input rounded-lg px-1.5 py-0.5 bg-background text-foreground flex-1"
            value={field.field_type}
            disabled={!isDraft}
            onChange={(e) => {
              const nextType = e.target.value;
              const patch: Partial<QuestionnaireFieldSchema> = {
                field_type: nextType,
              };
              if (nextType === "yes_no" && !field.options?.length) {
                patch.options = defaultYesNoOptions();
              }
              onUpdate(patch);
            }}
          >
            {fieldTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {isAccount ? (
        <>
          <p className="text-[10px] text-muted-foreground">
            Renders signup fields inside the step (no routing handles). Patients
            register through the same API as the legacy qualify account step.
          </p>
          <AccountFieldMappingsEditor
            mappings={accountMappings}
            disabled={!isDraft}
            backendReadOnly
            compact
            belugaFields={belugaFields}
            vendorLabel={vendorLabel}
            onChange={(next) =>
              onUpdate({ options: serializeAccountMappings(next) })
            }
          />
        </>
      ) : (
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-input"
            checked={field.required ?? false}
            disabled={!isDraft}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          Required — patient must answer before continuing
        </label>
      )}

      {showConfigurableChoiceOptions && (
        <ChoiceOptionsEditor
          options={choiceOptions}
          disabled={!isDraft}
          compact
          showBelugaColumn={field.field_type === "multi_choice"}
          belugaFields={belugaFields}
          vendorLabel={vendorLabel}
          onChange={(next) => {
            setChoiceOptions(next);
            onUpdate({
              options: serializeChoiceOptions(next, field.field_type),
            });
          }}
        />
      )}

      {showOptions && !showConfigurableChoiceOptions && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            Options
          </p>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input
                className={`${inputCls} text-[10px] font-mono flex-1 min-w-0`}
                value={opt.value}
                disabled={!isDraft || isYesNo}
                placeholder={`option_${i + 1}`}
                onChange={(e) => setOptionLocal(i, { value: e.target.value })}
                onBlur={() => persistOptions(options)}
              />
              <input
                className={`${inputCls} text-xs flex-[2] min-w-0`}
                value={opt.label}
                disabled={!isDraft}
                placeholder="Option text"
                onChange={(e) => setOptionLocal(i, { label: e.target.value })}
                onBlur={() => persistOptions(options)}
              />
              {isDraft && !isYesNo && options.length > 1 && (
                <button
                  type="button"
                  className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
          {isDraft && !isYesNo && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={addOption}
            >
              <Plus className="size-3 mr-1" />
              Add option
            </Button>
          )}
          {!isYesNo && options.length === 2 && (
            <p className="text-[10px] text-muted-foreground">
              Two options render side by side, like Yes/No.
            </p>
          )}
        </div>
      )}

      {!isAccount &&
        !isAddress &&
        !isDob &&
        !CHOICE_TYPES.has(field.field_type) && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium">
              Maps to section
            </p>
            <input
              className={`${inputCls} text-xs`}
              value={mapsToSection}
              disabled={!isDraft}
              maxLength={64}
              placeholder="identity, body_metrics, …"
              onChange={(e) => setMapsToSection(e.target.value)}
              onBlur={() =>
                mapsToSection !== (field.maps_to_section ?? "") &&
                onUpdate({ maps_to_section: mapsToSection })
              }
            />
          </div>
        )}

      {isAddress && (
        <>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium">
              Maps to intake section
            </p>
            <select
              className={`${inputCls} text-xs`}
              value={mapsToSection || "medication_preferences"}
              disabled={!isDraft}
              onChange={(e) => {
                const nextSection = e.target.value;
                setMapsToSection(nextSection);
                onUpdate({
                  maps_to_section: nextSection,
                  options: serializeAddressMappings(
                    presetAddressMappings(nextSection),
                  ),
                });
              }}
            >
              <option value="medication_preferences">
                medication_preferences (shipping)
              </option>
              <option value="identity">identity (home address)</option>
            </select>
          </div>
          <AddressFieldMappingsEditor
            mappings={addressMappings}
            disabled={!isDraft}
            backendReadOnly
            compact
            belugaFields={belugaFields}
            vendorLabel={vendorLabel}
            onChange={(next) =>
              onUpdate({ options: serializeAddressMappings(next) })
            }
          />
        </>
      )}

      {field.field_type === "plugin" && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            Plugin ID
          </p>
          <input
            className={`${inputCls} text-xs`}
            value={pluginId}
            disabled={!isDraft}
            maxLength={64}
            onChange={(e) => setPluginId(e.target.value)}
            onBlur={() =>
              pluginId !== (field.plugin_id ?? "") &&
              onUpdate({ plugin_id: pluginId })
            }
          />
        </div>
      )}

      {!isAccount && !isAddress && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            {vendorLabel} field
          </p>
          {isDob ? (
            <p className="text-[10px] text-muted-foreground mb-1">
              Patients enter month, day, and year as separate inputs (
              <span className="font-mono">MM/DD/YYYY</span>).
            </p>
          ) : isSingleChoice ? (
            <p className="text-[10px] text-muted-foreground mb-1">
              The patient's selected answer is sent to this field.
            </p>
          ) : null}
          <select
            className="w-full text-xs border border-input rounded-lg px-1.5 py-0.5 bg-background text-foreground"
            value={belugaValue}
            disabled={!isDraft}
            onChange={(e) => onUpdate({ maps_to_section: e.target.value })}
          >
            {belugaFields.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
