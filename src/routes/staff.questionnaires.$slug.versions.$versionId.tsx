import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { QuestionnaireRenderer } from "@/components/questionnaire/QuestionnaireRenderer";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffQuestionnaireField,
  createStaffQuestionnaireStep,
  deleteStaffQuestionnaireField,
  deleteStaffQuestionnaireStep,
  fetchStaffQuestionnaireVersion,
  updateStaffQuestionnaireField,
  updateStaffQuestionnaireStep,
  type QuestionnaireFieldSchema,
  type QuestionnaireStepSchema,
  type QuestionnaireVersionSchema,
  type ValidationRule,
} from "@/lib/api/client";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute(
  "/staff/questionnaires/$slug/versions/$versionId",
)({
  component: StaffQuestionnaireBuilderPage,
});

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Single choice (dropdown)" },
  { value: "multi_choice", label: "Multi choice (checkboxes)" },
  { value: "address_group", label: "Address group" },
  { value: "plugin", label: "Plugin (custom component)" },
] as const;

const RULE_TYPES = [
  { value: "required", label: "Required" },
  { value: "min", label: "Min value" },
  { value: "max", label: "Max value" },
  { value: "min_length", label: "Min length" },
  { value: "max_length", label: "Max length" },
  { value: "pattern", label: "Pattern (regex)" },
  { value: "enum", label: "Allowed values (enum)" },
] as const;

// ── Option editor ─────────────────────────────────────────────────────────────

function OptionsEditor({
  options,
  disabled,
  onChange,
}: {
  options: { value: string; label: string }[];
  disabled: boolean;
  onChange: (opts: { value: string; label: string }[]) => void;
}) {
  function updateOption(i: number, key: "value" | "label", val: string) {
    const next = options.map((o, idx) =>
      idx === i ? { ...o, [key]: val } : o,
    );
    onChange(next);
  }

  function addOption() {
    onChange([...options, { value: "", label: "" }]);
  }

  function removeOption(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  function moveOption(i: number, dir: -1 | 1) {
    const next = [...options];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Dropdown options
      </p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              disabled={disabled || i === 0}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
              onClick={() => moveOption(i, -1)}
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              type="button"
              disabled={disabled || i === options.length - 1}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
              onClick={() => moveOption(i, 1)}
            >
              <ChevronDown className="size-3" />
            </button>
          </div>
          <input
            className={`${inputCls} flex-1 text-sm`}
            placeholder="value (machine key)"
            value={opt.value}
            disabled={disabled}
            maxLength={128}
            onChange={(e) =>
              updateOption(
                i,
                "value",
                e.target.value.toLowerCase().replace(/\s+/g, "_"),
              )
            }
          />
          <input
            className={`${inputCls} flex-1 text-sm`}
            placeholder="label (shown to patient)"
            value={opt.label}
            disabled={disabled}
            maxLength={256}
            onChange={(e) => updateOption(i, "label", e.target.value)}
          />
          {!disabled && (
            <button
              type="button"
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              onClick={() => removeOption(i)}
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={addOption}>
          <Plus className="size-3 mr-1" /> Add option
        </Button>
      )}
    </div>
  );
}

// ── Validation rules editor ───────────────────────────────────────────────────

function ValidationRulesEditor({
  rules,
  disabled,
  onChange,
}: {
  rules: ValidationRule[];
  disabled: boolean;
  onChange: (rules: ValidationRule[]) => void;
}) {
  function addRule() {
    onChange([...rules, { type: "required" }]);
  }

  function removeRule(i: number) {
    onChange(rules.filter((_, idx) => idx !== i));
  }

  function updateRule(i: number, partial: Partial<ValidationRule>) {
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...partial } : r)));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Validation rules
      </p>
      {rules.map((rule, i) => (
        <div key={i} className="rounded-lg border border-border p-2 space-y-1">
          <div className="flex items-center gap-2">
            <select
              className={`${inputCls} flex-1 text-sm`}
              value={rule.type}
              disabled={disabled}
              onChange={(e) =>
                updateRule(i, {
                  type: e.target.value as ValidationRule["type"],
                  value: undefined,
                })
              }
            >
              {RULE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {!disabled && (
              <button
                type="button"
                className="rounded p-1 text-destructive hover:bg-destructive/10"
                onClick={() => removeRule(i)}
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
          {rule.type !== "required" && (
            <input
              className={`${inputCls} text-sm`}
              placeholder={
                rule.type === "pattern"
                  ? "regex pattern, e.g. ^\\d{5}$"
                  : rule.type === "enum"
                    ? "comma-separated values, e.g. a,b,c"
                    : "numeric value"
              }
              disabled={disabled}
              value={
                rule.type === "enum" && Array.isArray(rule.value)
                  ? (rule.value as string[]).join(",")
                  : rule.value != null
                    ? String(rule.value)
                    : ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                const value =
                  rule.type === "enum"
                    ? raw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : rule.type === "pattern"
                      ? raw
                      : parseFloat(raw);
                updateRule(i, { value });
              }}
            />
          )}
          <input
            className={`${inputCls} text-sm`}
            placeholder="Error message (optional)"
            disabled={disabled}
            value={rule.message ?? ""}
            maxLength={256}
            onChange={(e) => updateRule(i, { message: e.target.value })}
          />
        </div>
      ))}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={addRule}>
          <Plus className="size-3 mr-1" /> Add rule
        </Button>
      )}
    </div>
  );
}

// ── Field editor ──────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  isDraft,
  onUpdate,
  onRemove,
}: {
  field: QuestionnaireFieldSchema;
  isDraft: boolean;
  onUpdate: (patch: Partial<QuestionnaireFieldSchema>) => void;
  onRemove: () => void;
}) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    (field.options ?? []) as { value: string; label: string }[],
  );
  const [rules, setRules] = useState<ValidationRule[]>(
    (field.validation_rules ?? []) as ValidationRule[],
  );
  const [optionsDirty, setOptionsDirty] = useState(false);
  const [rulesDirty, setRulesDirty] = useState(false);

  const isChoiceType =
    field.field_type === "single_choice" || field.field_type === "multi_choice";

  async function saveOptions() {
    await onUpdate({ options });
    setOptionsDirty(false);
  }

  async function saveRules() {
    await onUpdate({ validation_rules: rules });
    setRulesDirty(false);
  }

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {field.field_key}
        </span>
        {isDraft && (
          <button
            type="button"
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <Field label="Label">
        <input
          className={inputCls}
          value={field.label}
          disabled={!isDraft}
          maxLength={256}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </Field>

      <Field label="Help text">
        <input
          className={inputCls}
          value={field.help_text ?? ""}
          disabled={!isDraft}
          maxLength={1024}
          placeholder="Optional hint shown below the field"
          onChange={(e) => onUpdate({ help_text: e.target.value })}
        />
      </Field>

      <Field label="Type">
        <select
          className={inputCls}
          value={field.field_type}
          disabled={!isDraft}
          onChange={(e) => onUpdate({ field_type: e.target.value })}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      {field.field_type === "plugin" && (
        <Field label="Plugin ID">
          <input
            className={inputCls}
            value={field.plugin_id ?? ""}
            disabled={!isDraft}
            maxLength={64}
            placeholder="e.g. account_registration"
            onChange={(e) => onUpdate({ plugin_id: e.target.value })}
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required ?? false}
          disabled={!isDraft}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Required
      </label>

      {isChoiceType && (
        <div className="space-y-2">
          <OptionsEditor
            options={options}
            disabled={!isDraft}
            onChange={(opts) => {
              setOptions(opts);
              setOptionsDirty(true);
            }}
          />
          {isDraft && optionsDirty && (
            <Button size="sm" onClick={() => void saveOptions()}>
              Save options
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <ValidationRulesEditor
          rules={rules}
          disabled={!isDraft}
          onChange={(r) => {
            setRules(r);
            setRulesDirty(true);
          }}
        />
        {isDraft && rulesDirty && (
          <Button size="sm" onClick={() => void saveRules()}>
            Save rules
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Builder page ──────────────────────────────────────────────────────────────

function StaffQuestionnaireBuilderPage() {
  const { slug, versionId } = Route.useParams();
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewResponses, setPreviewResponses] = useState<
    Record<string, unknown>
  >({});
  const [newStepKey, setNewStepKey] = useState("");
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [error, setError] = useState("");

  async function reload() {
    const data = await fetchStaffQuestionnaireVersion(slug, versionId);
    setSchema(data);
    if (!selectedStepKey && data.steps[0]) {
      setSelectedStepKey(data.steps[0].step_key);
    }
  }

  useEffect(() => {
    void reload().catch(() => setSchema(null));
  }, [slug, versionId]);

  const selectedStep = schema?.steps.find(
    (s) => s.step_key === selectedStepKey,
  );
  const isDraft = schema?.status === "draft";

  async function addStep() {
    if (!newStepKey.trim()) return;
    setError("");
    try {
      await createStaffQuestionnaireStep(slug, versionId, {
        step_key: newStepKey.trim(),
        sort_order: schema?.steps.length ?? 0,
        title: newStepTitle.trim() || newStepKey.trim(),
        subtitle: "",
      });
      setNewStepKey("");
      setNewStepTitle("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add step.");
    }
  }

  async function removeStep(stepKey: string) {
    setError("");
    try {
      await deleteStaffQuestionnaireStep(slug, versionId, stepKey);
      if (selectedStepKey === stepKey) setSelectedStepKey(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step.");
    }
  }

  async function moveStep(stepKey: string, dir: -1 | 1) {
    if (!schema) return;
    const idx = schema.steps.findIndex((s) => s.step_key === stepKey);
    const target = schema.steps[idx + dir];
    if (!target) return;
    setError("");
    try {
      await Promise.all([
        updateStaffQuestionnaireStep(slug, versionId, stepKey, {
          sort_order: idx + dir,
        }),
        updateStaffQuestionnaireStep(slug, versionId, target.step_key, {
          sort_order: idx,
        }),
      ]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder steps.");
    }
  }

  async function addField() {
    if (!selectedStepKey || !newFieldKey.trim()) return;
    setError("");
    try {
      await createStaffQuestionnaireField(slug, versionId, selectedStepKey, {
        field_key: newFieldKey.trim(),
        field_type: newFieldType,
        label: newFieldKey.trim().replace(/_/g, " "),
        required: false,
        options: [],
        validation_rules: [],
      });
      setNewFieldKey("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field.");
    }
  }

  async function removeField(fieldKey: string) {
    if (!selectedStepKey) return;
    setError("");
    try {
      await deleteStaffQuestionnaireField(
        slug,
        versionId,
        selectedStepKey,
        fieldKey,
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field.");
    }
  }

  async function updateStep(patch: Partial<QuestionnaireStepSchema>) {
    if (!selectedStepKey) return;
    setError("");
    try {
      await updateStaffQuestionnaireStep(
        slug,
        versionId,
        selectedStepKey,
        patch,
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step.");
    }
  }

  async function updateField(
    fieldKey: string,
    patch: Partial<QuestionnaireFieldSchema>,
  ) {
    if (!selectedStepKey) return;
    setError("");
    try {
      await updateStaffQuestionnaireField(
        slug,
        versionId,
        selectedStepKey,
        fieldKey,
        patch,
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update field.");
    }
  }

  if (!schema) {
    return (
      <p className="text-sm text-muted-foreground">Loading questionnaire…</p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Builder — {schema.questionnaire_slug} v{schema.version_label}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isDraft
            ? "Draft — editable"
            : `${schema.status} — read-only (duplicate to edit)`}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: steps + fields editor */}
        <div className="space-y-4">
          <AccountSectionCard tone="orders" title="Steps">
            <ul className="space-y-2">
              {schema.steps.map((step, idx) => (
                <li key={step.step_key} className="flex items-center gap-2">
                  {isDraft && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        onClick={() => void moveStep(step.step_key, -1)}
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === schema.steps.length - 1}
                        className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        onClick={() => void moveStep(step.step_key, 1)}
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={
                      selectedStepKey === step.step_key ? "default" : "outline"
                    }
                    className="flex-1 justify-start truncate"
                    onClick={() => setSelectedStepKey(step.step_key)}
                  >
                    <span className="truncate">
                      {step.step_key} — {step.title}
                    </span>
                    <span className="ml-auto text-xs opacity-60">
                      {step.fields.length} field
                      {step.fields.length !== 1 ? "s" : ""}
                    </span>
                  </Button>
                  {isDraft && (
                    <button
                      type="button"
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                      onClick={() => void removeStep(step.step_key)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {isDraft && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="step_key (e.g. body_metrics)"
                    value={newStepKey}
                    maxLength={64}
                    onChange={(e) =>
                      setNewStepKey(
                        e.target.value.toLowerCase().replace(/\s+/g, "_"),
                      )
                    }
                  />
                  <Button size="sm" onClick={() => void addStep()}>
                    Add step
                  </Button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Step title"
                  value={newStepTitle}
                  maxLength={256}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                />
              </div>
            )}
          </AccountSectionCard>

          {selectedStep && (
            <AccountSectionCard
              tone="contact"
              title={`Step: ${selectedStep.step_key}`}
            >
              <div className="space-y-3">
                <Field label="Title">
                  <input
                    className={inputCls}
                    value={selectedStep.title}
                    disabled={!isDraft}
                    maxLength={256}
                    onChange={(e) => void updateStep({ title: e.target.value })}
                  />
                </Field>
                <Field label="Subtitle">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={selectedStep.subtitle ?? ""}
                    disabled={!isDraft}
                    onChange={(e) =>
                      void updateStep({ subtitle: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="mt-6 space-y-4">
                <p className="text-sm font-medium text-foreground">Fields</p>
                {selectedStep.fields.map((field) => (
                  <FieldEditor
                    key={field.field_key}
                    field={field}
                    isDraft={isDraft}
                    onUpdate={(patch) =>
                      void updateField(field.field_key, patch)
                    }
                    onRemove={() => void removeField(field.field_key)}
                  />
                ))}

                {isDraft && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <input
                      className={inputCls}
                      placeholder="field_key"
                      value={newFieldKey}
                      maxLength={64}
                      onChange={(e) =>
                        setNewFieldKey(
                          e.target.value.toLowerCase().replace(/\s+/g, "_"),
                        )
                      }
                    />
                    <select
                      className={inputCls}
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => void addField()}>
                      Add field
                    </Button>
                  </div>
                )}
              </div>
            </AccountSectionCard>
          )}
        </div>

        {/* Right column: live preview */}
        <AccountSectionCard tone="communication" title="Live preview">
          <div className="mb-4 flex gap-2 items-center">
            <Button
              size="sm"
              variant="outline"
              disabled={previewIndex <= 0}
              onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Step {previewIndex + 1} / {schema.steps.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={previewIndex >= schema.steps.length - 1}
              onClick={() =>
                setPreviewIndex((i) => Math.min(schema.steps.length - 1, i + 1))
              }
            >
              Next
            </Button>
          </div>
          <QuestionnaireRenderer
            schema={schema}
            stepIndex={previewIndex}
            responses={previewResponses}
            onChange={(key, value) =>
              setPreviewResponses((prev) => ({ ...prev, [key]: value }))
            }
            preview
          />
        </AccountSectionCard>
      </div>
    </div>
  );
}
