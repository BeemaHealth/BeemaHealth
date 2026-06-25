import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  BarChart2,
  MousePointer2,
  Plus,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffQuestionnaireField,
  createStaffQuestionnaireStep,
  deleteStaffQuestionnaireField,
  deleteStaffQuestionnaireStep,
  fetchStaffDropoffAnalytics,
  fetchStaffQuestionnaireVersion,
  updateStaffQuestionnaireField,
  updateStaffQuestionnaireStep,
  type FunnelAnalyticsStep,
  type QuestionnaireFieldSchema,
  type QuestionnaireStepSchema,
  type QuestionnaireVersionSchema,
  type RoutingRule,
} from "@/lib/api/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingSource = {
  stepKey: string;
  fieldKey: string;
  fieldLabel: string;
  value: string;
  valueLabel: string;
};

type StepNodeData = {
  step: QuestionnaireStepSchema;
  analytics?: FunnelAnalyticsStep;
  isDraft: boolean;
  isSelected: boolean;
  isPendingTarget: boolean; // highlight as "click me" when Connect pending
  pendingSource: PendingSource | null;
  onAnswerClick: (src: PendingSource) => void;
};

type Tool = "select" | "connect";

type SelectedEdgeInfo =
  | {
      type: "route";
      edgeId: string;
      stepKey: string;
      ruleIndex: number;
      rule: RoutingRule;
    }
  | {
      type: "seq";
      edgeId: string;
      stepKey: string;
      targetStepKey: string;
      isOverride: boolean;
    };

// ── Layout constants ──────────────────────────────────────────────────────────

const NODE_WIDTH = 292;
const H_GAP = 140;
const V_GAP = 80;
const COLS = 3;

function autoLayout(
  steps: QuestionnaireStepSchema[],
): { x: number; y: number }[] {
  return steps.map((step, i) => {
    if (step.position_x != null && step.position_y != null) {
      return { x: step.position_x, y: step.position_y };
    }
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return { x: col * (NODE_WIDTH + H_GAP), y: row * (280 + V_GAP) };
  });
}

// ── Field preview (inside node) ───────────────────────────────────────────────

function FieldPreview({
  field,
  isConnectMode,
  isPendingField,
  onAnswerClick,
}: {
  field: QuestionnaireFieldSchema;
  isConnectMode: boolean;
  isPendingField: boolean;
  onAnswerClick: (value: string, valueLabel: string) => void;
}) {
  const safeLabel = stripHtml(field.label);
  const clickable = isConnectMode;

  if (field.field_type === "yes_no") {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-foreground leading-tight">
          {safeLabel}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ].map((opt) => (
            <div key={opt.value} className="relative">
              <button
                type="button"
                disabled={!clickable}
                onClick={
                  clickable
                    ? (e) => {
                        e.stopPropagation();
                        onAnswerClick(opt.value, opt.label);
                      }
                    : undefined
                }
                className={[
                  "w-full flex items-center justify-between rounded-xl border px-3 py-1.5 text-left transition-all",
                  clickable
                    ? "border-border bg-background hover:border-primary hover:bg-primary/5 cursor-crosshair"
                    : "border-border bg-background cursor-default",
                ].join(" ")}
              >
                <span className="text-xs font-medium text-foreground">
                  {opt.label}
                </span>
                <span className="size-3 rounded-full border border-muted-foreground/40 shrink-0" />
              </button>
              {/* Source handle — React Flow reads actual DOM position for edge routing */}
              <Handle
                type="source"
                position={Position.Right}
                id={`answer|${field.field_key}|${opt.value}`}
                style={{ top: "50%", right: -6, transform: "translateY(-50%)" }}
                className="!size-2.5 !bg-primary !border-2 !border-card"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (
    field.field_type === "single_choice" &&
    (field.options ?? []).length > 0
  ) {
    const options = (field.options ?? []) as { value: string; label: string }[];
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-foreground leading-tight">
          {safeLabel}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <div className="space-y-1">
          {options.map((opt) => (
            <div key={opt.value} className="relative">
              <button
                type="button"
                disabled={!clickable}
                onClick={
                  clickable
                    ? (e) => {
                        e.stopPropagation();
                        onAnswerClick(opt.value, stripHtml(opt.label));
                      }
                    : undefined
                }
                className={[
                  "w-full flex items-center justify-between rounded-xl border px-3 py-1.5 text-left transition-all",
                  clickable
                    ? "border-border bg-background hover:border-primary hover:bg-primary/5 cursor-crosshair"
                    : "border-border bg-background cursor-default",
                ].join(" ")}
              >
                <span className="text-xs text-foreground truncate">
                  {stripHtml(opt.label)}
                </span>
                <span className="size-3 rounded-full border border-muted-foreground/40 shrink-0" />
              </button>
              <Handle
                type="source"
                position={Position.Right}
                id={`answer|${field.field_key}|${opt.value}`}
                style={{ top: "50%", right: -6, transform: "translateY(-50%)" }}
                className="!size-2.5 !bg-primary !border-2 !border-card"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.field_type === "multi_choice" && (field.options ?? []).length > 0) {
    const options = (field.options ?? []) as { value: string; label: string }[];
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-foreground leading-tight">
          {safeLabel}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <div className="space-y-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5"
            >
              <span className="size-4 rounded border border-border shrink-0" />
              <span className="text-xs text-foreground truncate">
                {stripHtml(opt.label)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-foreground">
          {safeLabel}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <div className="rounded-xl border border-input bg-background px-3 py-2 min-h-[40px] text-xs text-muted-foreground/60">
          {field.help_text || "Long answer…"}
        </div>
      </div>
    );
  }

  if (field.field_type === "address_group") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        📍 Address fields
      </div>
    );
  }

  if (field.field_type === "plugin") {
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary font-medium">
        ⚡ {field.plugin_id || field.field_key}
      </div>
    );
  }

  const placeholder =
    field.field_type === "email"
      ? "email@example.com"
      : field.field_type === "phone"
        ? "(555) 555-5555"
        : field.field_type === "date"
          ? "MM/DD/YYYY"
          : field.field_type === "number"
            ? "0"
            : field.help_text || "Type here…";

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-foreground">
        {safeLabel}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </p>
      <div className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground/60">
        {placeholder}
      </div>
    </div>
  );
}

// ── Step node ─────────────────────────────────────────────────────────────────

function StepNode({ data, id }: NodeProps<Node<StepNodeData>>) {
  const {
    step,
    analytics,
    isDraft,
    isSelected,
    isPendingTarget,
    pendingSource,
    onAnswerClick,
  } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, step.fields, updateNodeInternals]);
  const dropoff = analytics?.dropoff_percent;
  const dropoffClass =
    dropoff == null
      ? ""
      : dropoff > 50
        ? "bg-destructive/15 text-destructive"
        : dropoff > 25
          ? "bg-yellow-100 text-yellow-800"
          : "bg-emerald-100 text-emerald-800";

  const isConnectMode = pendingSource !== null || false;
  // Detect if this node is the SOURCE of the pending connection
  const isPendingSourceNode = pendingSource?.stepKey === step.step_key;

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={[
        "rounded-2xl border-2 bg-card shadow-soft transition-all select-none",
        isSelected ? "border-primary shadow-lg" : "",
        isPendingTarget
          ? "border-primary/60 ring-2 ring-primary/30 shadow-md cursor-pointer"
          : !isSelected
            ? isDraft
              ? "border-border hover:border-muted-foreground/40"
              : "border-border opacity-75"
            : "",
        isPendingSourceNode ? "border-primary/40 opacity-60" : "",
      ].join(" ")}
    >
      {/* Incoming handles — top and left */}
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        className="!size-2 !bg-muted-foreground/40 !border !border-card"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        className="!size-2 !bg-muted-foreground/40 !border !border-card"
      />

      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <p className="text-[10px] font-mono text-muted-foreground truncate mb-0.5">
          {step.step_key}
        </p>
        {step.title && (
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
            {stripHtml(step.title)}
          </p>
        )}
        {step.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {stripHtml(step.subtitle)}
          </p>
        )}
      </div>

      {/* Fields */}
      {step.fields.length > 0 && (
        <div className="px-3 py-2.5 space-y-3">
          {step.fields.map((field) => (
            <FieldPreview
              key={field.field_key}
              field={field}
              isConnectMode={!!pendingSource}
              isPendingField={isPendingSourceNode}
              onAnswerClick={(value, valueLabel) => {
                onAnswerClick({
                  stepKey: step.step_key,
                  fieldKey: field.field_key,
                  fieldLabel: stripHtml(field.label),
                  value,
                  valueLabel,
                });
              }}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {step.fields.length} field{step.fields.length !== 1 ? "s" : ""}
        </span>
        {dropoff != null && (
          <span
            className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${dropoffClass}`}
          >
            {dropoff.toFixed(0)}% drop
          </span>
        )}
        {isPendingTarget && (
          <span className="text-[10px] font-semibold text-primary animate-pulse">
            Click to route here →
          </span>
        )}
      </div>

      {/* Outgoing handles — right and bottom */}
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        className="!size-2 !bg-primary/50 !border !border-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        className="!size-2 !bg-primary/50 !border !border-card"
      />
    </div>
  );
}

const nodeTypes = { step: StepNode };

// ── Edge panel (route and seq edges) ─────────────────────────────────────────

function DropoffBetween({
  sourceKey,
  targetKey,
  analyticsMap,
}: {
  sourceKey: string;
  targetKey: string;
  analyticsMap: Map<string, FunnelAnalyticsStep>;
}) {
  const src = analyticsMap.get(sourceKey);
  const tgt = analyticsMap.get(targetKey);
  if (!src && !tgt) return null;
  const srcCompletions = src?.completions ?? src?.views ?? 0;
  const tgtViews = tgt?.views ?? 0;
  const between =
    srcCompletions > 0
      ? Math.round(((srcCompletions - tgtViews) / srcCompletions) * 100)
      : null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-1.5 text-[11px]">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Analytics
      </p>
      {src && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {sourceKey} views / completions
          </span>
          <span className="font-mono font-medium text-foreground">
            {src.views.toLocaleString()} / {src.completions.toLocaleString()}
          </span>
        </div>
      )}
      {tgt && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{targetKey} views</span>
          <span className="font-mono font-medium text-foreground">
            {tgt.views.toLocaleString()}
          </span>
        </div>
      )}
      {between !== null && (
        <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
          <span className="text-muted-foreground">Drop between steps</span>
          <span
            className={`font-semibold ${between > 50 ? "text-destructive" : between > 25 ? "text-yellow-600" : "text-emerald-600"}`}
          >
            {between}%
          </span>
        </div>
      )}
    </div>
  );
}

function EdgePanel({
  info,
  allSteps,
  isDraft,
  slug,
  versionId,
  schema,
  analyticsMap,
  onClose,
  onReload,
}: {
  info: SelectedEdgeInfo;
  allSteps: QuestionnaireStepSchema[];
  isDraft: boolean;
  slug: string;
  versionId: string;
  schema: QuestionnaireVersionSchema;
  analyticsMap: Map<string, FunnelAnalyticsStep>;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Route-edge change state
  const [changeFromStep, setChangeFromStep] = useState<string | null>(null);
  const [changeFromField, setChangeFromField] = useState<string | null>(null);
  const [changeFromValue, setChangeFromValue] = useState<string | null>(null);
  const [changeTarget, setChangeTarget] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    setError("");
    try {
      await fn();
      onClose();
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setSaving(false);
    }
  }

  // ── Route edge ──────────────────────────────────────────────────────────────
  if (info.type === "route") {
    const { rule, stepKey, ruleIndex } = info;

    const effFromStep = changeFromStep ?? stepKey;
    const effFromStepObj = allSteps.find((s) => s.step_key === effFromStep);

    // Fields that support per-answer routing (yes_no or single_choice with options)
    const routingFields = (effFromStepObj?.fields ?? []).filter(
      (f) =>
        f.field_type === "yes_no" ||
        (f.field_type === "single_choice" && (f.options ?? []).length > 0),
    );

    const effFromField = changeFromField ?? rule.when_field;
    const effFieldDef = routingFields.find((f) => f.field_key === effFromField);

    const fieldOptions: { value: string; label: string }[] =
      effFieldDef?.field_type === "yes_no"
        ? [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]
        : ((effFieldDef?.options ?? []) as { value: string; label: string }[]);

    const effFromValue = changeFromValue ?? rule.when_value;
    const effTarget = changeTarget ?? rule.next_step_key;

    const isDirty =
      effFromStep !== stepKey ||
      effFromField !== rule.when_field ||
      effFromValue !== rule.when_value ||
      effTarget !== rule.next_step_key;

    function handleFromStepChange(newStep: string) {
      setChangeFromStep(newStep);
      // Reset field/value since they may not exist on the new step
      setChangeFromField(null);
      setChangeFromValue(null);
    }

    function handleFromFieldChange(newField: string) {
      setChangeFromField(newField);
      setChangeFromValue(null); // reset value when field changes
    }

    return (
      <aside className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            Conditional connection
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 text-xs">
          {error && (
            <p className="text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-2">
            {/* From step */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">
                From step
              </span>
              <select
                className={`${inputCls} text-xs flex-1`}
                value={effFromStep}
                disabled={!isDraft || saving}
                onChange={(e) => handleFromStepChange(e.target.value)}
              >
                {allSteps.map((s) => (
                  <option key={s.step_key} value={s.step_key}>
                    {s.step_key} — {stripHtml(s.title) || "(no title)"}
                  </option>
                ))}
              </select>
            </div>

            {/* From option — field */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">
                When field
              </span>
              {routingFields.length > 0 ? (
                <select
                  className={`${inputCls} text-xs flex-1`}
                  value={effFromField}
                  disabled={!isDraft || saving}
                  onChange={(e) => handleFromFieldChange(e.target.value)}
                >
                  <option value="">— field —</option>
                  {routingFields.map((f) => (
                    <option key={f.field_key} value={f.field_key}>
                      {f.field_key}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground italic">
                  No choice fields on this step
                </span>
              )}
            </div>

            {/* From option — value */}
            {effFieldDef && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0">
                  When value
                </span>
                <select
                  className={`${inputCls} text-xs flex-1`}
                  value={effFromValue}
                  disabled={!isDraft || saving}
                  onChange={(e) => setChangeFromValue(e.target.value)}
                >
                  <option value="">— value —</option>
                  {fieldOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Route to */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">
                Route to
              </span>
              <select
                className={`${inputCls} text-xs flex-1`}
                value={effTarget}
                disabled={!isDraft || saving}
                onChange={(e) => setChangeTarget(e.target.value)}
              >
                {allSteps
                  .filter((s) => s.step_key !== effFromStep)
                  .map((s) => (
                    <option key={s.step_key} value={s.step_key}>
                      {s.step_key} — {stripHtml(s.title) || "(no title)"}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DropoffBetween
            sourceKey={effFromStep}
            targetKey={effTarget}
            analyticsMap={analyticsMap}
          />

          {isDraft && isDirty && (
            <Button
              size="sm"
              disabled={saving || !effFromField || !effFromValue || !effTarget}
              className="w-full"
              onClick={() =>
                void run(async () => {
                  const newRule = {
                    when_field: effFromField,
                    when_value: effFromValue,
                    next_step_key: effTarget,
                  };
                  if (effFromStep === stepKey) {
                    // Same source step — update rule in place
                    const step = schema.steps.find(
                      (s) => s.step_key === stepKey,
                    )!;
                    const newRules = (step.routing_rules ?? []).map((r, idx) =>
                      idx === ruleIndex ? newRule : r,
                    );
                    await updateStaffQuestionnaireStep(
                      slug,
                      versionId,
                      stepKey,
                      {
                        routing_rules: newRules,
                      },
                    );
                  } else {
                    // Source step changed — remove from original, add to new step
                    const origStep = schema.steps.find(
                      (s) => s.step_key === stepKey,
                    )!;
                    const cleanedRules = (origStep.routing_rules ?? []).filter(
                      (_, idx) => idx !== ruleIndex,
                    );
                    await updateStaffQuestionnaireStep(
                      slug,
                      versionId,
                      stepKey,
                      {
                        routing_rules: cleanedRules,
                      },
                    );
                    const destStep = schema.steps.find(
                      (s) => s.step_key === effFromStep,
                    )!;
                    await updateStaffQuestionnaireStep(
                      slug,
                      versionId,
                      effFromStep,
                      {
                        routing_rules: [
                          ...(destStep.routing_rules ?? []),
                          newRule,
                        ],
                      },
                    );
                  }
                })
              }
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
          {isDraft && (
            <Button
              size="sm"
              variant="destructive"
              disabled={saving}
              className="w-full gap-1.5"
              onClick={() =>
                void run(async () => {
                  const step = schema.steps.find(
                    (s) => s.step_key === stepKey,
                  )!;
                  const newRules = (step.routing_rules ?? []).filter(
                    (_, idx) => idx !== ruleIndex,
                  );
                  await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
                    routing_rules: newRules,
                  });
                })
              }
            >
              <Trash2 className="size-3.5" />
              {saving ? "Deleting…" : "Delete connection"}
            </Button>
          )}
        </div>
      </aside>
    );
  }

  // ── Seq (default) edge ──────────────────────────────────────────────────────
  const { stepKey, targetStepKey, isOverride } = info;
  const sorted = [...allSteps].sort((a, b) => a.sort_order - b.sort_order);
  const naturalNext =
    sorted[sorted.findIndex((s) => s.step_key === stepKey) + 1];

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold text-foreground">
          Default connection
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 text-xs">
        {error && (
          <p className="text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">From</span>
            <span className="font-mono font-medium">{stepKey}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground shrink-0">Goes to</span>
            <select
              className={`${inputCls} text-xs flex-1`}
              value={changeTarget ?? targetStepKey}
              disabled={!isDraft || saving}
              onChange={(e) => setChangeTarget(e.target.value)}
            >
              {naturalNext && (
                <option value={naturalNext.step_key}>
                  {naturalNext.step_key} (automatic)
                </option>
              )}
              {allSteps
                .filter(
                  (s) =>
                    s.step_key !== stepKey &&
                    s.step_key !== naturalNext?.step_key,
                )
                .map((s) => (
                  <option key={s.step_key} value={s.step_key}>
                    {s.step_key} — {stripHtml(s.title) || "(no title)"}
                  </option>
                ))}
            </select>
          </div>
          {!isOverride && (
            <p className="text-[10px] text-muted-foreground italic">
              Automatic — no override set.
            </p>
          )}
        </div>
        <DropoffBetween
          sourceKey={stepKey}
          targetKey={changeTarget ?? targetStepKey}
          analyticsMap={analyticsMap}
        />
        {isDraft && changeTarget && changeTarget !== targetStepKey && (
          <Button
            size="sm"
            disabled={saving}
            className="w-full"
            onClick={() =>
              void run(async () => {
                const step = schema.steps.find((s) => s.step_key === stepKey)!;
                const without = (step.routing_rules ?? []).filter(
                  (r) =>
                    !(
                      r.when_field === "__default__" ||
                      (!r.when_field && !r.when_value)
                    ),
                );
                const isNatural = changeTarget === naturalNext?.step_key;
                await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
                  routing_rules: isNatural
                    ? without
                    : [
                        ...without,
                        {
                          when_field: "__default__",
                          when_value: "",
                          next_step_key: changeTarget,
                        },
                      ],
                });
              })
            }
          >
            {saving ? "Saving…" : "Save change"}
          </Button>
        )}
        {isDraft && isOverride && (
          <Button
            size="sm"
            variant="destructive"
            disabled={saving}
            className="w-full gap-1.5"
            onClick={() =>
              void run(async () => {
                const step = schema.steps.find((s) => s.step_key === stepKey)!;
                const newRules = (step.routing_rules ?? []).filter(
                  (r) =>
                    !(
                      r.when_field === "__default__" ||
                      (!r.when_field && !r.when_value)
                    ),
                );
                await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
                  routing_rules: newRules,
                });
              })
            }
          >
            <Trash2 className="size-3.5" />
            {saving ? "Removing…" : "Reset to automatic"}
          </Button>
        )}
      </div>
    </aside>
  );
}

// ── Questionnaire preview modal ───────────────────────────────────────────────

function computeNextStep(
  step: QuestionnaireStepSchema,
  answers: Record<string, string>,
  allSteps: QuestionnaireStepSchema[],
): QuestionnaireStepSchema | null {
  const sorted = [...allSteps].sort((a, b) => a.sort_order - b.sort_order);
  const rules = step.routing_rules ?? [];
  for (const rule of rules) {
    if (!rule.when_field || rule.when_field === "__default__") continue;
    if (answers[rule.when_field] === rule.when_value) {
      return allSteps.find((s) => s.step_key === rule.next_step_key) ?? null;
    }
  }
  const defaultRule = rules.find(
    (r) => r.when_field === "__default__" || (!r.when_field && !r.when_value),
  );
  if (defaultRule?.next_step_key) {
    return (
      allSteps.find((s) => s.step_key === defaultRule.next_step_key) ?? null
    );
  }
  const idx = sorted.findIndex((s) => s.step_key === step.step_key);
  return sorted[idx + 1] ?? null;
}

function PreviewField({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireFieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = stripHtml(field.label);
  const cls =
    "w-full rounded-2xl border px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  if (field.field_type === "yes_no") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "yes", l: "Yes" },
            { v: "no", l: "No" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className={`rounded-2xl border-2 px-6 py-4 text-sm font-semibold transition-all ${value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-muted-foreground/40"}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.field_type === "single_choice") {
    const opts = (field.options ?? []) as { value: string; label: string }[];
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="space-y-2">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${value === o.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-muted-foreground/40"}`}
            >
              <span
                className={`size-4 rounded-full border-2 shrink-0 transition-colors ${value === o.value ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
              />
              <span className="text-sm">{stripHtml(o.label)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.field_type === "multi_choice") {
    const opts = (field.options ?? []) as { value: string; label: string }[];
    const selected = value ? value.split(",") : [];
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="space-y-2">
          {opts.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = checked
                    ? selected.filter((v) => v !== o.value)
                    : [...selected, o.value];
                  onChange(next.join(","));
                }}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${checked ? "border-primary bg-primary/10" : "border-border bg-card hover:border-muted-foreground/40"}`}
              >
                <span
                  className={`size-4 rounded border-2 shrink-0 transition-colors flex items-center justify-center ${checked ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                >
                  {checked && (
                    <span className="text-primary-foreground text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </span>
                <span className="text-sm">{stripHtml(o.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.field_type === "textarea") {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <textarea
          className={cls}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
            : "text";
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </p>
      <input
        type={inputType}
        className={cls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Add connection panel ──────────────────────────────────────────────────────

function AddConnectionPanel({
  allSteps,
  slug,
  versionId,
  schema,
  analyticsMap,
  onClose,
  onReload,
}: {
  allSteps: QuestionnaireStepSchema[];
  slug: string;
  versionId: string;
  schema: QuestionnaireVersionSchema;
  analyticsMap: Map<string, FunnelAnalyticsStep>;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [fromStep, setFromStep] = useState(allSteps[0]?.step_key ?? "");
  const [fromField, setFromField] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toStep, setToStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fromStepObj = allSteps.find((s) => s.step_key === fromStep);
  const routingFields = (fromStepObj?.fields ?? []).filter(
    (f) =>
      f.field_type === "yes_no" ||
      (f.field_type === "single_choice" && (f.options ?? []).length > 0),
  );
  const fieldDef = routingFields.find((f) => f.field_key === fromField);
  const fieldOptions: { value: string; label: string }[] =
    fieldDef?.field_type === "yes_no"
      ? [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]
      : ((fieldDef?.options ?? []) as { value: string; label: string }[]);

  const otherSteps = allSteps.filter((s) => s.step_key !== fromStep);
  const canSave = !!fromStep && !!fromField && !!fromValue && !!toStep;

  function handleFromStepChange(key: string) {
    setFromStep(key);
    setFromField("");
    setFromValue("");
    setToStep("");
  }

  function handleFromFieldChange(key: string) {
    setFromField(key);
    setFromValue("");
  }

  async function create() {
    setSaving(true);
    setError("");
    try {
      const step = schema.steps.find((s) => s.step_key === fromStep)!;
      const newRule = {
        when_field: fromField,
        when_value: fromValue,
        next_step_key: toStep,
      };
      await updateStaffQuestionnaireStep(slug, versionId, fromStep, {
        routing_rules: [...(step.routing_rules ?? []), newRule],
      });
      onClose();
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create connection.");
      setSaving(false);
    }
  }

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold text-foreground">New connection</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 text-xs">
        {error && (
          <p className="text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16 shrink-0">
              From step
            </span>
            <select
              className={`${inputCls} text-xs flex-1`}
              value={fromStep}
              disabled={saving}
              onChange={(e) => handleFromStepChange(e.target.value)}
            >
              {allSteps.map((s) => (
                <option key={s.step_key} value={s.step_key}>
                  {s.step_key} — {stripHtml(s.title) || "(no title)"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16 shrink-0">
              When field
            </span>
            {routingFields.length > 0 ? (
              <select
                className={`${inputCls} text-xs flex-1`}
                value={fromField}
                disabled={saving}
                onChange={(e) => handleFromFieldChange(e.target.value)}
              >
                <option value="">— field —</option>
                {routingFields.map((f) => (
                  <option key={f.field_key} value={f.field_key}>
                    {f.field_key}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-muted-foreground italic">
                No choice fields on this step
              </span>
            )}
          </div>
          {fieldDef && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">
                When value
              </span>
              <select
                className={`${inputCls} text-xs flex-1`}
                value={fromValue}
                disabled={saving}
                onChange={(e) => setFromValue(e.target.value)}
              >
                <option value="">— value —</option>
                {fieldOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16 shrink-0">
              Route to
            </span>
            <select
              className={`${inputCls} text-xs flex-1`}
              value={toStep}
              disabled={saving}
              onChange={(e) => setToStep(e.target.value)}
            >
              <option value="">— step —</option>
              {otherSteps.map((s) => (
                <option key={s.step_key} value={s.step_key}>
                  {s.step_key} — {stripHtml(s.title) || "(no title)"}
                </option>
              ))}
            </select>
          </div>
        </div>
        {fromStep && toStep && (
          <DropoffBetween
            sourceKey={fromStep}
            targetKey={toStep}
            analyticsMap={analyticsMap}
          />
        )}
        <Button
          size="sm"
          disabled={!canSave || saving}
          className="w-full gap-1.5"
          onClick={() => void create()}
        >
          <Plus className="size-3.5" />
          {saving ? "Creating…" : "Create connection"}
        </Button>
      </div>
    </aside>
  );
}

function PreviewModal({
  schema,
  onClose,
}: {
  schema: QuestionnaireVersionSchema;
  onClose: () => void;
}) {
  const sorted = useMemo(
    () => [...schema.steps].sort((a, b) => a.sort_order - b.sort_order),
    [schema.steps],
  );
  const [stepKey, setStepKey] = useState(sorted[0]?.step_key ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);

  const step = sorted.find((s) => s.step_key === stepKey) ?? sorted[0];
  if (!step) return null;

  const stepIndex = sorted.findIndex((s) => s.step_key === stepKey);
  const nextStep = computeNextStep(step, answers, schema.steps);

  function goNext() {
    if (!nextStep) return;
    setHistory((h) => [...h, stepKey]);
    setStepKey(nextStep.step_key);
  }

  function goBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setStepKey(prev);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {schema.questionnaire_slug}
            </span>
            <span className="text-xs text-muted-foreground">
              Step {stepIndex + 1} / {sorted.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted shrink-0">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-r-full"
            style={{ width: `${((stepIndex + 1) / sorted.length) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {step.title && (
            <h2 className="text-xl font-bold text-foreground">
              {stripHtml(step.title)}
            </h2>
          )}
          {step.subtitle && (
            <p className="text-sm text-muted-foreground -mt-4">
              {stripHtml(step.subtitle)}
            </p>
          )}
          {step.fields.map((field) => (
            <PreviewField
              key={field.field_key}
              field={field}
              value={answers[field.field_key] ?? ""}
              onChange={(v) =>
                setAnswers((a) => ({ ...a, [field.field_key]: v }))
              }
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={history.length === 0}
            onClick={goBack}
          >
            ← Back
          </Button>
          <div className="flex items-center gap-1.5">
            {sorted.map((s, i) => (
              <span
                key={s.step_key}
                className={`size-1.5 rounded-full transition-colors ${s.step_key === stepKey ? "bg-primary" : i < stepIndex ? "bg-primary/40" : "bg-muted-foreground/20"}`}
              />
            ))}
          </div>
          {nextStep ? (
            <Button size="sm" onClick={goNext}>
              Continue →
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-muted-foreground"
            >
              End of flow
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Build nodes + edges ───────────────────────────────────────────────────────

// Pick the nicest source+target handle pair based on relative node positions.
// Outgoing: right or bottom. Incoming: left or top.
function chooseHandles(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = tx - sx;
  const dy = ty - sy;
  // Use bottom→top when target is clearly below (dy positive and dominant)
  if (dy > 0 && dy > Math.abs(dx) * 0.55) {
    return { sourceHandle: "out-bottom", targetHandle: "in-top" };
  }
  return { sourceHandle: "out-right", targetHandle: "in-left" };
}

function buildEdges(
  steps: QuestionnaireStepSchema[],
  positions: Map<string, { x: number; y: number }>,
  autoPos: { x: number; y: number }[],
  selectedEdgeId: string | null,
): Edge[] {
  const edges: Edge[] = [];

  steps.forEach((step, i) => {
    const rules = step.routing_rules ?? [];
    const nextStep = steps[i + 1];

    const posOf = (key: string, idx: number) =>
      positions.get(key) ?? autoPos[idx] ?? { x: 0, y: 0 };
    const sp = posOf(step.step_key, i);

    // Default sequential arrow
    const defaultRule = rules.find(
      (r) => !r.when_field || r.when_field === "__default__",
    );
    const defaultTarget = defaultRule
      ? steps.find((s) => s.step_key === defaultRule.next_step_key)
      : nextStep;

    if (defaultTarget) {
      const ti = steps.findIndex((s) => s.step_key === defaultTarget.step_key);
      const tp = posOf(defaultTarget.step_key, ti);
      const { sourceHandle, targetHandle } = chooseHandles(
        sp.x,
        sp.y,
        tp.x,
        tp.y,
      );
      edges.push({
        id: `seq-${step.step_key}`,
        source: step.step_key,
        sourceHandle,
        target: defaultTarget.step_key,
        targetHandle,
        animated: false,
        zIndex: 10,
        style: {
          stroke: "var(--muted-foreground)",
          strokeWidth: 1.5,
          opacity: 0.7,
        },
        type: "default",
        data: {
          type: "seq",
          edgeId: `seq-${step.step_key}`,
          stepKey: step.step_key,
          targetStepKey: defaultTarget.step_key,
          isOverride: !!defaultRule,
        },
      });
    }

    // Routing rule arrows (conditional)
    rules
      .filter(
        (r) =>
          r.next_step_key && r.when_field && r.when_field !== "__default__",
      )
      .forEach((rule, ri) => {
        if (!rule.next_step_key) return;
        const fieldDef = step.fields.find(
          (f) => f.field_key === rule.when_field,
        );
        const hasAnswerHandle =
          fieldDef?.field_type === "yes_no" ||
          (fieldDef?.field_type === "single_choice" &&
            (fieldDef.options ?? []).length > 0);
        const answerHandleId = `answer|${rule.when_field}|${rule.when_value}`;

        const ti = steps.findIndex((s) => s.step_key === rule.next_step_key);
        const tp = posOf(rule.next_step_key, ti);
        const { sourceHandle: fallbackSrc, targetHandle } = chooseHandles(
          sp.x,
          sp.y,
          tp.x,
          tp.y,
        );
        // Per-answer handles always exit from the right — pick target side based on relative Y
        const answerTargetHandle = tp.y > sp.y + 60 ? "in-top" : "in-left";

        const edgeId = `route-${step.step_key}-${ri}`;
        const isEdgeSel = edgeId === selectedEdgeId;
        edges.push({
          id: edgeId,
          source: step.step_key,
          sourceHandle: hasAnswerHandle ? answerHandleId : fallbackSrc,
          target: rule.next_step_key,
          targetHandle: hasAnswerHandle ? answerTargetHandle : targetHandle,
          animated: false,
          selected: isEdgeSel,
          zIndex: 20,
          style: {
            stroke: isEdgeSel ? "var(--destructive)" : "var(--primary)",
            strokeWidth: isEdgeSel ? 3 : 2,
          },
          label: rule.when_value
            ? `if "${rule.when_value}"`
            : rule.when_field
              ? `if ${rule.when_field}`
              : "always",
          labelStyle: {
            fontSize: 10,
            fill: isEdgeSel ? "var(--destructive)" : "var(--primary)",
            fontWeight: 600,
          },
          labelBgStyle: { fill: "var(--card)", fillOpacity: 0.92 },
          type: "default",
          data: {
            type: "route",
            edgeId,
            stepKey: step.step_key,
            ruleIndex: ri,
            rule,
          },
        });
      });
  });

  return edges;
}

function buildNodesAndEdges(
  schema: QuestionnaireVersionSchema,
  analyticsMap: Map<string, FunnelAnalyticsStep>,
  selectedKey: string | null,
  selectedEdgeId: string | null,
  positions: Map<string, { x: number; y: number }>,
  pendingSource: PendingSource | null,
  onAnswerClick: StepNodeData["onAnswerClick"],
): { nodes: Node<StepNodeData>[]; edges: Edge[] } {
  const steps = schema.steps;
  const isDraft = schema.status === "draft";
  const autoPos = autoLayout(steps);

  // Which steps are valid targets for the pending connection
  const pendingTargetKeys = pendingSource
    ? new Set(
        steps.map((s) => s.step_key).filter((k) => k !== pendingSource.stepKey),
      )
    : new Set<string>();

  const nodes: Node<StepNodeData>[] = steps.map((step, i) => ({
    id: step.step_key,
    type: "step",
    position: positions.get(step.step_key) ?? autoPos[i],
    data: {
      step,
      analytics: analyticsMap.get(step.step_key),
      isDraft,
      isSelected: step.step_key === selectedKey,
      isPendingTarget: pendingTargetKeys.has(step.step_key),
      pendingSource,
      onAnswerClick,
    },
  }));

  const edges = buildEdges(steps, positions, autoPos, selectedEdgeId);
  return { nodes, edges };
}

// ── Beluga API field mapping ──────────────────────────────────────────────────

const BELUGA_FIELDS = [
  { value: "", label: "— none —" },
  { value: "beluga:firstName", label: "First name" },
  { value: "beluga:lastName", label: "Last name" },
  { value: "beluga:dob", label: "Date of birth" },
  { value: "beluga:phone", label: "Phone" },
  { value: "beluga:email", label: "Email" },
  { value: "beluga:address", label: "Street address" },
  { value: "beluga:city", label: "City" },
  { value: "beluga:state", label: "State" },
  { value: "beluga:zip", label: "ZIP" },
  { value: "beluga:sex", label: "Sex (Male/Female/Other)" },
  { value: "beluga:selfReportedMeds", label: "Self-reported medications" },
  { value: "beluga:allergies", label: "Allergies" },
  { value: "beluga:medicalConditions", label: "Medical conditions" },
  { value: "beluga:consentsSigned", label: "Consents signed" },
];

// ── Field types ───────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Single choice" },
  { value: "multi_choice", label: "Multi choice" },
  { value: "address_group", label: "Address group" },
  { value: "plugin", label: "Plugin" },
] as const;

// ── Routing rules editor ──────────────────────────────────────────────────────

function RoutingRulesEditor({
  rules,
  fields,
  allSteps,
  currentStepKey,
  disabled,
  onChange,
}: {
  rules: RoutingRule[];
  fields: QuestionnaireFieldSchema[];
  allSteps: QuestionnaireStepSchema[];
  currentStepKey: string;
  disabled: boolean;
  onChange: (rules: RoutingRule[]) => void;
}) {
  const otherSteps = allSteps.filter((s) => s.step_key !== currentStepKey);

  function addRule() {
    onChange([
      ...rules,
      {
        when_field: fields[0]?.field_key ?? "",
        when_value: "",
        next_step_key: "",
      },
    ]);
  }

  function removeRule(i: number) {
    onChange(rules.filter((_, idx) => idx !== i));
  }

  function updateRule(i: number, patch: Partial<RoutingRule>) {
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Routing rules
      </p>
      <p className="text-[11px] text-muted-foreground">
        In Connect mode, click an answer on the canvas to create rules visually.
      </p>
      {rules.map((rule, i) => {
        const field = fields.find((f) => f.field_key === rule.when_field);
        const options =
          field?.field_type === "yes_no"
            ? [
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]
            : ((field?.options ?? []) as { value: string; label: string }[]);
        const hasOptions =
          field &&
          (field.field_type === "single_choice" ||
            field.field_type === "yes_no");

        return (
          <div
            key={i}
            className="rounded-xl border border-border p-2.5 space-y-1.5 bg-muted/20"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-6 shrink-0">
                if
              </span>
              <select
                className={`${inputCls} text-xs flex-1`}
                value={rule.when_field}
                disabled={disabled}
                onChange={(e) => updateRule(i, { when_field: e.target.value })}
              >
                <option value="">— field —</option>
                {fields.map((f) => (
                  <option key={f.field_key} value={f.field_key}>
                    {f.field_key}
                  </option>
                ))}
              </select>
              {!disabled && (
                <button
                  type="button"
                  className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeRule(i)}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-6 shrink-0">
                =
              </span>
              {hasOptions ? (
                <select
                  className={`${inputCls} text-xs flex-1`}
                  value={rule.when_value}
                  disabled={disabled}
                  onChange={(e) =>
                    updateRule(i, { when_value: e.target.value })
                  }
                >
                  <option value="">— value —</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={`${inputCls} text-xs flex-1`}
                  placeholder="value"
                  value={rule.when_value}
                  disabled={disabled}
                  maxLength={256}
                  onChange={(e) =>
                    updateRule(i, { when_value: e.target.value })
                  }
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-6 shrink-0">
                →
              </span>
              <select
                className={`${inputCls} text-xs flex-1`}
                value={rule.next_step_key}
                disabled={disabled}
                onChange={(e) =>
                  updateRule(i, { next_step_key: e.target.value })
                }
              >
                <option value="">— step —</option>
                {otherSteps.map((s) => (
                  <option key={s.step_key} value={s.step_key}>
                    {s.step_key}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={addRule}>
          <Plus className="size-3 mr-1" /> Add rule
        </Button>
      )}
    </div>
  );
}

// ── Step editor side panel ─────────────────────────────────────────────────────

function StepEditorPanel({
  step,
  allSteps,
  isDraft,
  slug,
  versionId,
  onClose,
  onReload,
  onDelete,
}: {
  step: QuestionnaireStepSchema;
  allSteps: QuestionnaireStepSchema[];
  isDraft: boolean;
  slug: string;
  versionId: string;
  onClose: () => void;
  onReload: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [localTitle, setLocalTitle] = useState(step.title);
  const [localSubtitle, setLocalSubtitle] = useState(step.subtitle ?? "");
  const [localRouting, setLocalRouting] = useState<RoutingRule[]>(
    step.routing_rules ?? [],
  );
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Derive natural next step (by sort_order) and current default override
  const sortedSteps = useMemo(
    () => [...allSteps].sort((a, b) => a.sort_order - b.sort_order),
    [allSteps],
  );
  const thisIndex = sortedSteps.findIndex((s) => s.step_key === step.step_key);
  const naturalNext = sortedSteps[thisIndex + 1] ?? null;
  const defaultOverrideRule = localRouting.find(
    (r) => r.when_field === "__default__" || (!r.when_field && !r.when_value),
  );
  const defaultNextKey =
    defaultOverrideRule?.next_step_key ?? naturalNext?.step_key ?? "";

  function setDefaultNext(nextKey: string) {
    const isNatural = nextKey === (naturalNext?.step_key ?? "");
    setLocalRouting((prev) => {
      const without = prev.filter(
        (r) =>
          !(r.when_field === "__default__" || (!r.when_field && !r.when_value)),
      );
      if (isNatural) return without;
      return [
        ...without,
        { when_field: "__default__", when_value: "", next_step_key: nextKey },
      ];
    });
  }

  useEffect(() => {
    setLocalTitle(step.title);
    setLocalSubtitle(step.subtitle ?? "");
    setLocalRouting(step.routing_rules ?? []);
  }, [step.step_key, step.title, step.subtitle, step.routing_rules]);

  async function saveStep() {
    setSaving(true);
    setError("");
    try {
      await updateStaffQuestionnaireStep(slug, versionId, step.step_key, {
        title: localTitle,
        subtitle: localSubtitle,
        routing_rules: localRouting,
      });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addField() {
    if (!newFieldKey.trim()) return;
    setError("");
    try {
      await createStaffQuestionnaireField(slug, versionId, step.step_key, {
        field_key: newFieldKey.trim(),
        field_type: newFieldType,
        label: newFieldKey.trim().replace(/_/g, " "),
        required: false,
        options: [],
        validation_rules: [],
      });
      setNewFieldKey("");
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add field.");
    }
  }

  async function removeField(fieldKey: string) {
    setError("");
    try {
      await deleteStaffQuestionnaireField(
        slug,
        versionId,
        step.step_key,
        fieldKey,
      );
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete field.");
    }
  }

  async function updateField(
    fieldKey: string,
    patch: Partial<QuestionnaireFieldSchema>,
  ) {
    setError("");
    try {
      await updateStaffQuestionnaireField(
        slug,
        versionId,
        step.step_key,
        fieldKey,
        patch,
      );
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update field.");
    }
  }

  const hasChanges =
    localTitle !== step.title ||
    localSubtitle !== (step.subtitle ?? "") ||
    JSON.stringify(localRouting) !== JSON.stringify(step.routing_rules ?? []);

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-muted-foreground">
            {step.step_key}
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {stripHtml(step.title) || "(no title)"}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {isDraft && (
            <button
              type="button"
              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
              onClick={() => void onDelete()}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {error && (
          <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Field label="Step title">
            <input
              className={inputCls}
              value={localTitle}
              disabled={!isDraft}
              maxLength={256}
              onChange={(e) => setLocalTitle(e.target.value)}
            />
          </Field>
          <Field label="Subtitle (optional)">
            <textarea
              className={`${inputCls} text-sm`}
              rows={2}
              value={localSubtitle}
              disabled={!isDraft}
              onChange={(e) => setLocalSubtitle(e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Default connection
          </p>
          <p className="text-[11px] text-muted-foreground">
            The gray line — where patients go when no routing rule matches.
          </p>
          <select
            className={`${inputCls} text-xs`}
            value={defaultNextKey}
            disabled={!isDraft}
            onChange={(e) => setDefaultNext(e.target.value)}
          >
            {naturalNext ? (
              <option value={naturalNext.step_key}>
                {naturalNext.step_key} —{" "}
                {stripHtml(naturalNext.title) || "(no title)"} (automatic)
              </option>
            ) : (
              <option value="">— end of questionnaire —</option>
            )}
            {sortedSteps
              .filter(
                (s) =>
                  s.step_key !== step.step_key &&
                  s.step_key !== naturalNext?.step_key,
              )
              .map((s) => (
                <option key={s.step_key} value={s.step_key}>
                  {s.step_key} — {stripHtml(s.title) || "(no title)"}
                </option>
              ))}
          </select>
        </div>

        <RoutingRulesEditor
          rules={localRouting.filter(
            (r) =>
              !(
                r.when_field === "__default__" ||
                (!r.when_field && !r.when_value)
              ),
          )}
          fields={step.fields}
          allSteps={allSteps}
          currentStepKey={step.step_key}
          disabled={!isDraft}
          onChange={(conditionalRules) => {
            setLocalRouting((prev) => {
              const defaults = prev.filter(
                (r) =>
                  r.when_field === "__default__" ||
                  (!r.when_field && !r.when_value),
              );
              return [...defaults, ...conditionalRules];
            });
          }}
        />

        {isDraft && hasChanges && (
          <Button
            size="sm"
            disabled={saving}
            onClick={() => void saveStep()}
            className="w-full"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Fields
          </p>
          {step.fields.map((field) => {
            const belugaValue = field.maps_to_section?.startsWith("beluga:")
              ? field.maps_to_section
              : "";
            return (
              <div
                key={field.field_key}
                className="rounded-xl border border-border p-2.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-foreground truncate">
                      {field.field_key}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {field.label}
                    </p>
                  </div>
                  {isDraft && (
                    <button
                      type="button"
                      className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => void removeField(field.field_key)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-input rounded-lg px-1.5 py-0.5 bg-background text-foreground flex-1"
                    value={field.field_type}
                    disabled={!isDraft}
                    onChange={(e) =>
                      void updateField(field.field_key, {
                        field_type: e.target.value,
                      })
                    }
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      disabled={!isDraft}
                      onChange={(e) =>
                        void updateField(field.field_key, {
                          required: e.target.checked,
                        })
                      }
                    />
                    req
                  </label>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Maps to Beluga API field
                  </p>
                  <select
                    className="w-full text-xs border border-input rounded-lg px-1.5 py-0.5 bg-background text-foreground"
                    value={belugaValue}
                    disabled={!isDraft}
                    onChange={(e) =>
                      void updateField(field.field_key, {
                        maps_to_section:
                          e.target.value || field.maps_to_section,
                      })
                    }
                  >
                    {BELUGA_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

          {isDraft && (
            <div className="flex gap-1.5 pt-1">
              <input
                className={`${inputCls} text-xs flex-1`}
                placeholder="field_key"
                value={newFieldKey}
                maxLength={64}
                onChange={(e) =>
                  setNewFieldKey(
                    e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  )
                }
                onKeyDown={(e) => e.key === "Enter" && void addField()}
              />
              <select
                className="text-xs border border-input rounded-xl px-2 py-2 bg-background text-foreground shrink-0"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => void addField()}
                className="shrink-0"
              >
                <Plus className="size-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Main FlowchartBuilder ─────────────────────────────────────────────────────

export function FlowchartBuilder({
  slug,
  versionId,
}: {
  slug: string;
  versionId: string;
}) {
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedEdgeInfo, setSelectedEdgeInfo] =
    useState<SelectedEdgeInfo | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<
    Map<string, FunnelAnalyticsStep>
  >(new Map());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [pendingSource, setPendingSource] = useState<PendingSource | null>(
    null,
  );
  const [error, setError] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);

  const positions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportKey = `flowchart_vp_${versionId}`;
  const savedVp = (() => {
    try {
      const raw = localStorage.getItem(viewportKey);
      return raw
        ? (JSON.parse(raw) as { x: number; y: number; zoom: number })
        : null;
    } catch {
      return null;
    }
  })();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const reload = useCallback(
    async (keepSelected = true) => {
      try {
        const data = await fetchStaffQuestionnaireVersion(slug, versionId);
        setSchema(data);
        if (
          !keepSelected ||
          !data.steps.find((s) => s.step_key === selectedKey)
        ) {
          setSelectedKey(null);
        }
      } catch {
        setSchema(null);
      }
    },
    [slug, versionId, selectedKey],
  );

  useEffect(() => {
    void reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, versionId]);

  const onAnswerClick = useCallback<StepNodeData["onAnswerClick"]>(
    (src) => {
      if (activeTool !== "connect") return;
      setPendingSource(src);
    },
    [activeTool],
  );

  useEffect(() => {
    if (!schema) return;
    const { nodes: n, edges: e } = buildNodesAndEdges(
      schema,
      showAnalytics ? analyticsMap : new Map(),
      selectedKey,
      selectedEdgeInfo?.edgeId ?? null,
      positions.current,
      pendingSource,
      onAnswerClick,
    );
    setNodes(n);
    setEdges(e);
  }, [
    schema,
    selectedKey,
    selectedEdgeInfo,
    analyticsMap,
    showAnalytics,
    pendingSource,
    onAnswerClick,
    setNodes,
    setEdges,
  ]);

  // ESC to cancel pending connection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingSource(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function toggleAnalytics() {
    const next = !showAnalytics;
    setShowAnalytics(next);
    if (next && analyticsMap.size === 0 && schema) {
      try {
        const result = await fetchStaffDropoffAnalytics(
          schema.questionnaire_slug,
        );
        const map = new Map<string, FunnelAnalyticsStep>();
        result.steps.forEach((s) => map.set(s.step_key, s));
        setAnalyticsMap(map);
      } catch {
        // analytics unavailable
      }
    }
  }

  function onEdgeClick(_: React.MouseEvent, edge: Edge) {
    if (
      (edge.id.startsWith("route-") || edge.id.startsWith("seq-")) &&
      edge.data
    ) {
      setSelectedKey(null);
      setShowAddConnection(false);
      setSelectedEdgeInfo(edge.data as SelectedEdgeInfo);
    } else {
      setSelectedEdgeInfo(null);
    }
  }

  function onNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedEdgeInfo(null);
    setShowAddConnection(false);
    if (pendingSource && pendingSource.stepKey !== node.id) {
      // Complete the connection — create routing rule
      void (async () => {
        const src = pendingSource;
        setPendingSource(null);
        const step = schema?.steps.find((s) => s.step_key === src.stepKey);
        if (!step || schema?.status !== "draft") return;
        const newRules: RoutingRule[] = [
          ...(step.routing_rules ?? []),
          {
            when_field: src.fieldKey,
            when_value: src.value,
            next_step_key: node.id,
          },
        ];
        try {
          await updateStaffQuestionnaireStep(slug, versionId, src.stepKey, {
            routing_rules: newRules,
          });
          await reload();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to save rule.");
        }
      })();
      return;
    }
    if (activeTool === "select") setSelectedKey(node.id);
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !schema ||
        schema.status !== "draft"
      )
        return;
      const srcHandle = connection.sourceHandle ?? "";
      if (srcHandle.startsWith("answer|")) {
        // Per-answer handle drag → conditional routing rule
        const [, fieldKey, value] = srcHandle.split("|");
        const step = schema.steps.find((s) => s.step_key === connection.source);
        if (!step || !fieldKey) return;
        const newRules: RoutingRule[] = [
          ...(step.routing_rules ?? []),
          {
            when_field: fieldKey,
            when_value: value ?? "",
            next_step_key: connection.target,
          },
        ];
        void updateStaffQuestionnaireStep(slug, versionId, connection.source, {
          routing_rules: newRules,
        })
          .then(() => reload())
          .catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Failed to save rule."),
          );
      } else if (srcHandle === "out-right" || srcHandle === "out-bottom") {
        // Step-level handle drag → set/update default connection
        const step = schema.steps.find((s) => s.step_key === connection.source);
        if (!step) return;
        const sorted = [...schema.steps].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const naturalNext =
          sorted[sorted.findIndex((s) => s.step_key === connection.source) + 1];
        const withoutDefault = (step.routing_rules ?? []).filter(
          (r) =>
            !(
              r.when_field === "__default__" ||
              (!r.when_field && !r.when_value)
            ),
        );
        const newRules =
          connection.target === naturalNext?.step_key
            ? withoutDefault
            : [
                ...withoutDefault,
                {
                  when_field: "__default__" as const,
                  when_value: "",
                  next_step_key: connection.target,
                },
              ];
        void updateStaffQuestionnaireStep(slug, versionId, connection.source, {
          routing_rules: newRules,
        })
          .then(() => reload())
          .catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Failed to save rule."),
          );
      }
    },
    [schema, slug, versionId, reload],
  );

  function onPaneClick() {
    setPendingSource(null);
    setSelectedKey(null);
    setSelectedEdgeInfo(null);
    setShowAddConnection(false);
  }

  function onNodeDragStop(_: MouseEvent | TouchEvent, node: Node) {
    if (!schema || schema.status !== "draft") return;
    const { x, y } = node.position;
    positions.current.set(node.id, { x, y });

    // Rebuild edges immediately using the current canvas positions so lines
    // snap to the shortest handle pair without waiting for a schema reload.
    const currentPositions = new Map<string, { x: number; y: number }>(
      nodes.map((n) => [n.id, n.position]),
    );
    currentPositions.set(node.id, { x, y });
    setEdges(
      buildEdges(
        schema.steps,
        currentPositions,
        autoLayout(schema.steps),
        selectedEdgeInfo?.edgeId ?? null,
      ),
    );

    // Debounced backend save
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void updateStaffQuestionnaireStep(slug, versionId, node.id, {
        position_x: x,
        position_y: y,
      }).catch(() => {
        /* silent — positions are best-effort */
      });
    }, 300);
  }

  async function addStep() {
    if (!schema) return;
    setError("");
    setAddingStep(true);
    try {
      const existing = new Set(schema.steps.map((s) => s.step_key));
      let n = schema.steps.length + 1;
      let key = `step_${n}`;
      while (existing.has(key)) {
        n += 1;
        key = `step_${n}`;
      }
      const lastStep = schema.steps[schema.steps.length - 1];
      const lastPos = lastStep
        ? (positions.current.get(lastStep.step_key) ?? {
            x: lastStep.position_x ?? 0,
            y: lastStep.position_y ?? 0,
          })
        : { x: 0, y: 0 };
      const newX = lastPos.x + NODE_WIDTH + H_GAP;
      const newY = lastPos.y;
      await createStaffQuestionnaireStep(slug, versionId, {
        step_key: key,
        sort_order: schema.steps.length,
        title: key.replace(/_/g, " "),
        subtitle: "",
        position_x: newX,
        position_y: newY,
      });
      positions.current.set(key, { x: newX, y: newY });
      await reload();
      setSelectedKey(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step.");
    } finally {
      setAddingStep(false);
    }
  }

  async function removeStep(stepKey: string) {
    setError("");
    try {
      await deleteStaffQuestionnaireStep(slug, versionId, stepKey);
      positions.current.delete(stepKey);
      if (selectedKey === stepKey) setSelectedKey(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete step.");
    }
  }

  const selectedStep = useMemo(
    () => schema?.steps.find((s) => s.step_key === selectedKey) ?? null,
    [schema, selectedKey],
  );

  const isDraft = schema?.status === "draft";

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading questionnaire…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100svh - 160px)" }}>
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-card border border-border rounded-2xl shrink-0 shadow-soft">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-foreground truncate">
            {schema.questionnaire_slug}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            v{schema.version_label}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              isDraft
                ? "bg-yellow-100 text-yellow-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {schema.status}
          </span>
        </div>

        {/* Tool selector */}
        <div className="flex items-center gap-1 mx-auto bg-muted rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTool("select");
              setPendingSource(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTool === "select"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MousePointer2 className="size-3.5" />
            Select
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("connect")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTool === "connect"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Workflow className="size-3.5" />
            Connect
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {error && (
            <p className="text-xs text-destructive max-w-[160px] truncate">
              {error}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="gap-1.5"
          >
            Preview
          </Button>
          <Button
            size="sm"
            variant={showAnalytics ? "default" : "outline"}
            onClick={() => void toggleAnalytics()}
            className="gap-1.5"
          >
            <BarChart2 className="size-3.5" />
            Analytics
          </Button>
          {isDraft && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddConnection(true);
                  setSelectedEdgeInfo(null);
                  setSelectedKey(null);
                }}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Add connection
              </Button>
              <Button
                size="sm"
                disabled={addingStep}
                onClick={() => void addStep()}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Add step
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Connect mode banner ─────────────────────────────────────────── */}
      {activeTool === "connect" && (
        <div
          className={`px-4 py-2 mb-2 rounded-xl text-xs font-medium shrink-0 transition-colors ${
            pendingSource
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {pendingSource ? (
            <>
              <strong>"{pendingSource.valueLabel}"</strong> on{" "}
              <strong>{pendingSource.stepKey}</strong> → now click the step to
              route to.{" "}
              <button
                type="button"
                className="underline opacity-75 ml-1"
                onClick={() => setPendingSource(null)}
              >
                Cancel (Esc)
              </button>
            </>
          ) : (
            "Connect mode: click any answer option (Yes/No/A/B/C…) on a step to start routing it."
          )}
        </div>
      )}

      {/* ── Canvas + side panel ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 rounded-2xl border border-border overflow-hidden">
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            nodesDraggable={isDraft && activeTool === "select"}
            nodesConnectable={isDraft && activeTool === "connect"}
            {...(savedVp
              ? { defaultViewport: savedVp }
              : { fitView: true, fitViewOptions: { padding: 0.2 } })}
            onMoveEnd={(_, viewport) => {
              try {
                localStorage.setItem(viewportKey, JSON.stringify(viewport));
              } catch {
                // storage unavailable
              }
            }}
            elevateEdgesOnSelect
            minZoom={0.2}
            maxZoom={2}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border)"
            />
            <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
            <MiniMap
              nodeColor={() => "var(--primary)"}
              maskColor="rgba(0,0,0,0.06)"
              className="!bg-card !border-border rounded-xl"
            />
          </ReactFlow>
        </div>

        {selectedStep && activeTool === "select" && (
          <StepEditorPanel
            step={selectedStep}
            allSteps={schema.steps}
            isDraft={!!isDraft}
            slug={slug}
            versionId={versionId}
            onClose={() => setSelectedKey(null)}
            onReload={() => reload()}
            onDelete={() => removeStep(selectedStep.step_key)}
          />
        )}
        {selectedEdgeInfo && !selectedStep && (
          <EdgePanel
            info={selectedEdgeInfo}
            allSteps={schema.steps}
            isDraft={!!isDraft}
            slug={slug}
            versionId={versionId}
            schema={schema}
            analyticsMap={analyticsMap}
            onClose={() => setSelectedEdgeInfo(null)}
            onReload={() => reload()}
          />
        )}
        {showAddConnection && !selectedStep && !selectedEdgeInfo && (
          <AddConnectionPanel
            allSteps={schema.steps}
            slug={slug}
            versionId={versionId}
            schema={schema}
            analyticsMap={analyticsMap}
            onClose={() => setShowAddConnection(false)}
            onReload={() => reload()}
          />
        )}
      </div>

      {showPreview && (
        <PreviewModal schema={schema} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
