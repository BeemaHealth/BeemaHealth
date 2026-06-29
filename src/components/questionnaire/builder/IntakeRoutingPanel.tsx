import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  fetchStaffQuestionnaires,
  updateStaffQuestionnaireVersion,
  type IntakeRoutingRule,
  type QuestionnaireStepSchema,
} from "@/lib/api/client";
import {
  findStepForFieldKey,
  formatIntakeRuleStepLabel,
  formatIntakeRuleTrigger,
} from "@/lib/questionnaire/intake-routing";

type IntakeRoutingPanelProps = {
  slug: string;
  versionId: string;
  rules: IntakeRoutingRule[];
  steps: QuestionnaireStepSchema[];
  isDraft: boolean;
  onReload: () => Promise<void>;
  onClose: () => void;
};

export function IntakeRoutingPanel({
  slug,
  versionId,
  rules,
  steps,
  isDraft,
  onReload,
  onClose,
}: IntakeRoutingPanelProps) {
  const [localRules, setLocalRules] = useState<IntakeRoutingRule[]>(rules);
  const [intakeSlugs, setIntakeSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.sort_order - b.sort_order),
    [steps],
  );

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  useEffect(() => {
    void (async () => {
      try {
        const items = await fetchStaffQuestionnaires();
        setIntakeSlugs(
          items
            .filter((q) => q.questionnaire_type === "intake")
            .map((q) => q.slug),
        );
      } catch {
        setIntakeSlugs(["intake"]);
      }
    })();
  }, []);

  const fieldOptions = useMemo(
    () =>
      sortedSteps.flatMap((step) =>
        step.fields.map((field) => ({
          stepKey: step.step_key,
          fieldKey: field.field_key,
          label: field.label || field.field_key,
        })),
      ),
    [sortedSteps],
  );

  async function persist(rulesToSave: IntakeRoutingRule[]) {
    setSaving(true);
    setError("");
    try {
      await updateStaffQuestionnaireVersion(slug, versionId, {
        intake_routing_rules: rulesToSave,
      });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    await persist(localRules);
  }

  async function removeRule(index: number) {
    const next = localRules.filter((_, j) => j !== index);
    setLocalRules(next);
    await persist(next);
  }

  function updateRule(index: number, patch: Partial<IntakeRoutingRule>) {
    setLocalRules((prev) =>
      prev.map((r, j) => (j === index ? { ...r, ...patch } : r)),
    );
  }

  function onWhenFieldChange(index: number, whenField: string) {
    const rule = localRules[index];
    if (!rule) return;
    if (whenField === "__default__") {
      updateRule(index, {
        when_field: whenField,
        when_value: "",
        when_step:
          rule.when_step || sortedSteps[sortedSteps.length - 1]?.step_key || "",
      });
      return;
    }
    const owner = findStepForFieldKey(whenField, steps);
    updateRule(index, {
      when_field: whenField,
      when_step: owner?.step_key,
    });
  }

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Intake routing
          </p>
          <p className="text-[11px] text-muted-foreground">
            Map qualify steps and answers → intake questionnaire
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {error && (
          <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        {localRules.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No intake routes yet. Connect steps or answers to an intake node on
            the canvas, or add a rule below.
          </p>
        )}

        {localRules.map((rule, i) => {
          const isDefault = rule.when_field === "__default__";
          const stepLabel = formatIntakeRuleStepLabel(rule, steps);
          const triggerLabel = formatIntakeRuleTrigger(rule);

          return (
            <div
              key={i}
              className="rounded-xl border border-border overflow-hidden"
            >
              <div className="bg-muted/40 px-3 py-2 border-b border-border space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  From step
                </p>
                <p className="text-xs font-mono text-foreground leading-snug">
                  {stepLabel}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {triggerLabel}
                </p>
              </div>

              <div className="p-3 space-y-2">
                {isDefault && (
                  <Field label="Source step">
                    <select
                      className={inputCls}
                      disabled={!isDraft}
                      value={
                        rule.when_step ??
                        sortedSteps[sortedSteps.length - 1]?.step_key ??
                        ""
                      }
                      onChange={(e) =>
                        updateRule(i, { when_step: e.target.value })
                      }
                    >
                      {sortedSteps.map((step) => (
                        <option key={step.step_key} value={step.step_key}>
                          {step.step_key}
                          {step.title
                            ? ` · ${step.title.replace(/<[^>]+>/g, "").trim()}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="When field">
                  <select
                    className={inputCls}
                    disabled={!isDraft}
                    value={rule.when_field}
                    onChange={(e) => onWhenFieldChange(i, e.target.value)}
                  >
                    <option value="__default__">Default (fallback)</option>
                    {fieldOptions.map((opt) => (
                      <option
                        key={`${opt.stepKey}:${opt.fieldKey}`}
                        value={opt.fieldKey}
                      >
                        {opt.fieldKey} ({opt.stepKey})
                      </option>
                    ))}
                  </select>
                </Field>

                {!isDefault && (
                  <Field label="Equals value">
                    <input
                      className={inputCls}
                      disabled={!isDraft}
                      value={rule.when_value}
                      onChange={(e) =>
                        updateRule(i, { when_value: e.target.value })
                      }
                    />
                  </Field>
                )}

                <Field label="Intake questionnaire slug">
                  <select
                    className={inputCls}
                    disabled={!isDraft}
                    value={rule.intake_questionnaire_slug}
                    onChange={(e) =>
                      updateRule(i, {
                        intake_questionnaire_slug: e.target.value,
                      })
                    }
                  >
                    <option value="">Select…</option>
                    {intakeSlugs.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                {isDraft && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={saving}
                    onClick={() => void removeRule(i)}
                  >
                    Remove rule
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {isDraft && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setLocalRules([
                ...localRules,
                {
                  when_field: "__default__",
                  when_value: "",
                  intake_questionnaire_slug: intakeSlugs[0] ?? "intake",
                  when_step:
                    sortedSteps[sortedSteps.length - 1]?.step_key ?? "",
                },
              ])
            }
          >
            Add rule
          </Button>
        )}

        {isDraft && (
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void save()}
            className="w-full"
          >
            {saving ? "Saving…" : "Save routing"}
          </Button>
        )}
      </div>
    </aside>
  );
}
