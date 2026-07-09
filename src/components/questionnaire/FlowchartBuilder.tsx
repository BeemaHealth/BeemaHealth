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
  AlertTriangle,
  BarChart2,
  ClipboardPaste,
  Copy,
  Eye,
  GitBranch,
  Link2,
  MousePointer2,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import { StepFieldsEditor } from "@/components/questionnaire/builder/StepFieldsEditor";
import { sortQuestionnaireFields } from "@/lib/questionnaire/sort-fields";
import { IntakeRoutingPanel } from "@/components/questionnaire/builder/IntakeRoutingPanel";
import { EntryPointsPanel } from "@/components/questionnaire/builder/EntryPointsPanel";
import { AddQuestionModal } from "@/components/questionnaire/builder/AddQuestionModal";
import {
  BELUGA_FIELD_OPTIONS,
  QUESTION_FIELD_TYPES,
  uniqueAmong,
} from "@/components/questionnaire/builder/field-catalog";
import { AccountRegistrationFields } from "@/components/questionnaire/AccountRegistrationFields";
import { isTypingTarget } from "@/components/questionnaire/builder/flowchart-editor-history";
import { useFlowchartEditorActions } from "@/components/questionnaire/builder/useFlowchartEditorActions";
import {
  QuestionnaireRenderer,
  getStepValidationErrors,
} from "@/components/questionnaire/QuestionnaireRenderer";
import { getVisibleSteps } from "@/lib/questionnaire/validation";
import { resolveNextStep } from "@/lib/questionnaire/step-routing";
import {
  emptyRegistrationFields,
  isAccountField,
  isRegistrationStep,
  validateRegistrationFields,
} from "@/lib/questionnaire/registration";
import {
  createStaffQuestionnaireField,
  createStaffQuestionnaireStep,
  deleteStaffQuestionnaireField,
  deleteStaffQuestionnaireStep,
  fetchStaffQuestionnaires,
  fetchStaffQuestionnaireVersion,
  fetchStaffStepAnalytics,
  fetchStaffVendors,
  resolveIntakeQuestionnaire,
  updateStaffQuestionnaireField,
  updateStaffQuestionnaireStep,
  updateStaffQuestionnaireVersion,
  type ApiVendorSchema,
  type FunnelAnalyticsStep,
  type IntakeRoutingRule,
  type QuestionnaireFieldSchema,
  type QuestionnaireStepSchema,
  type QuestionnaireVersionSchema,
  type RoutingRule,
  type StepAnalyticsRow,
} from "@/lib/api/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  computeEdgeDropoff,
  edgeDropoffFromReactFlowEdge,
  type EdgeDropoffInput,
} from "@/lib/questionnaire/edge-analytics";

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

type EntryNodeData = {
  title: string;
  ctaIds: string[];
  isDefaultEntry: boolean;
};

type IntakeNodeData = {
  slug: string;
  isPublished: boolean;
  isDraft: boolean;
  isPendingTarget: boolean;
  onRemove: (slug: string) => void;
};

type FlowNode =
  | Node<StepNodeData, "step">
  | Node<EntryNodeData, "entry">
  | Node<IntakeNodeData, "intake">;

const ENTRY_NODE_ID = "__entry__";
const INTAKE_NODE_PREFIX = "intake:";

function intakeRuleIdentity(rule: IntakeRoutingRule): string {
  return [
    rule.when_field,
    rule.when_value,
    rule.when_step ?? "",
    rule.intake_questionnaire_slug,
  ].join("\0");
}

/** Append an intake routing rule; skip only if an identical rule already exists. */
function appendIntakeRule(
  existing: IntakeRoutingRule[],
  rule: IntakeRoutingRule,
): IntakeRoutingRule[] {
  const key = intakeRuleIdentity(rule);
  if (existing.some((r) => intakeRuleIdentity(r) === key)) return existing;
  return [...existing, rule];
}

/**
 * The intake slug a step's default (fallback) route points to, if any. A step's
 * default→intake rule is anchored to it via `when_step`; default rules with no
 * `when_step` fall back to the last step.
 */
function defaultIntakeSlugForStep(
  schema: QuestionnaireVersionSchema,
  stepKey: string,
): string | undefined {
  if (schema.questionnaire_type !== "qualify") return undefined;
  const sorted = [...schema.steps].sort((a, b) => a.sort_order - b.sort_order);
  const lastStepKey = sorted[sorted.length - 1]?.step_key;
  const match = (schema.intake_routing_rules ?? []).find((r) => {
    if (r.when_field && r.when_field !== "__default__") return false;
    if (!r.intake_questionnaire_slug) return false;
    const anchor =
      r.when_step && schema.steps.some((s) => s.step_key === r.when_step)
        ? r.when_step
        : lastStepKey;
    return anchor === stepKey;
  });
  return match?.intake_questionnaire_slug;
}

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

function NodeFieldLabel({ field }: { field: QuestionnaireFieldSchema }) {
  return (
    <p className="text-[11px] font-medium text-foreground leading-tight">
      {stripHtml(field.label)}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
      {field.help_text ? (
        <span
          title={stripHtml(field.help_text)}
          className="ml-1 inline-grid size-3.5 place-items-center rounded-full border border-border text-[8px] font-semibold leading-none text-muted-foreground align-middle"
        >
          ?
        </span>
      ) : null}
    </p>
  );
}

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
  const clickable = isConnectMode;

  if (field.field_type === "yes_no") {
    return (
      <div className="space-y-1.5">
        <NodeFieldLabel field={field} />
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
        <NodeFieldLabel field={field} />
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
        <NodeFieldLabel field={field} />
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
        <NodeFieldLabel field={field} />
        <div className="rounded-xl border border-input bg-background px-3 py-2 min-h-[40px] text-xs text-muted-foreground/60">
          {field.help_text || "Long answer…"}
        </div>
      </div>
    );
  }

  if (field.field_type === "address_group") {
    return (
      <div className="space-y-1">
        <NodeFieldLabel field={field} />
        <div className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
          Start typing your full address…
        </div>
        <p className="text-[10px] text-muted-foreground">
          Nominatim autocomplete · verifies street, city, ZIP, and county
        </p>
      </div>
    );
  }

  if (field.field_type === "review") {
    return (
      <div className="space-y-1">
        <NodeFieldLabel field={field} />
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          Patients confirm their answers before continuing
        </div>
      </div>
    );
  }

  if (field.field_type === "legal_consent") {
    return (
      <div className="space-y-1">
        <NodeFieldLabel field={field} />
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          Terms of Service, Privacy Policy, and Telehealth Consent agreement
        </div>
      </div>
    );
  }

  if (field.field_type === "dob") {
    return (
      <div className="space-y-1">
        <NodeFieldLabel field={field} />
        <div className="grid grid-cols-3 gap-1">
          {["MM", "DD", "YYYY"].map((placeholder) => (
            <div
              key={placeholder}
              className="rounded-xl border border-input bg-background px-2 py-1.5 text-[10px] text-muted-foreground/60 text-center"
            >
              {placeholder}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isAccountField(field)) {
    return (
      <div className="space-y-1.5">
        {field.label ? <NodeFieldLabel field={field} /> : null}
        <AccountRegistrationFields
          value={emptyRegistrationFields()}
          onChange={() => {}}
          readOnly
          embedded
        />
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
      <NodeFieldLabel field={field} />
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
          {sortQuestionnaireFields(step.fields).map((field) => (
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

      {/* Incoming handle — bottom (for backward upper-left loops) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{ left: "65%" }}
        className="!size-2 !bg-muted-foreground/40 !border !border-card"
      />

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
        style={{ left: "35%" }}
        className="!size-2 !bg-primary/50 !border !border-card"
      />
    </div>
  );
}

// ── Entry node ────────────────────────────────────────────────────────────────

function EntryNode({ data }: NodeProps<Node<EntryNodeData>>) {
  const { title, ctaIds, isDefaultEntry } = data;
  return (
    <div
      style={{ width: 220 }}
      className="rounded-2xl border-2 border-secondary bg-secondary/5 shadow-soft select-none cursor-pointer"
    >
      <div className="px-3 pt-3 pb-2 border-b border-secondary/30">
        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          Entry point
        </p>
        <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
          {title}
        </p>
        {isDefaultEntry && (
          <span className="mt-1 inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-[9px] font-semibold text-secondary-foreground">
            Default entry
          </span>
        )}
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-1">
        {ctaIds.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">
            No CTAs assigned — click to edit
          </p>
        ) : (
          ctaIds.map((c) => (
            <span
              key={c}
              className="rounded-full bg-secondary/15 px-2 py-0.5 text-[9px] font-medium text-foreground"
            >
              {c}
            </span>
          ))
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="entry-out"
        isConnectable={false}
        className="!size-2.5 !bg-secondary !border-2 !border-card"
      />
    </div>
  );
}

// ── Intake destination node ───────────────────────────────────────────────────

function IntakeNode({ data }: NodeProps<Node<IntakeNodeData>>) {
  const { slug, isPublished, isDraft, isPendingTarget, onRemove } = data;
  return (
    <div
      style={{ width: 200 }}
      className={[
        "rounded-2xl border-2 bg-emerald-50 shadow-soft select-none transition-all",
        isPendingTarget
          ? "border-primary ring-2 ring-primary/30 cursor-pointer"
          : "border-emerald-400 cursor-pointer",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        className="!size-2.5 !bg-emerald-500 !border-2 !border-card"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        className="!size-2.5 !bg-emerald-500 !border-2 !border-card"
      />
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-mono uppercase tracking-wide text-emerald-700">
          Intake →
        </p>
        <p className="text-sm font-bold text-foreground leading-tight break-all">
          {slug}
        </p>
        {!isPublished && (
          <p className="mt-1 text-[10px] font-medium text-destructive">
            No published version
          </p>
        )}
        {isPendingTarget && (
          <p className="mt-1 text-[10px] font-semibold text-primary animate-pulse">
            Click to route here →
          </p>
        )}
      </div>
      {isDraft && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(slug);
          }}
          className="w-full border-t border-emerald-200 px-3 py-1.5 text-left text-[10px] font-medium text-destructive hover:bg-destructive/5"
        >
          Remove intake
        </button>
      )}
    </div>
  );
}

const nodeTypes = { step: StepNode, entry: EntryNode, intake: IntakeNode };

// ── Edge panel (route and seq edges) ─────────────────────────────────────────

function dropoffToneClass(percent: number) {
  return percent > 50
    ? "text-destructive"
    : percent > 25
      ? "text-yellow-600"
      : "text-emerald-600";
}

function EdgeDropoffCard({
  result,
}: {
  result: NonNullable<ReturnType<typeof computeEdgeDropoff>>;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{result.sourceLabel}</span>
        <span className="font-mono font-medium text-foreground">
          {result.sourceCount.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{result.targetLabel}</span>
        <span className="font-mono font-medium text-foreground">
          {result.targetReached.toLocaleString()}
        </span>
      </div>
      {result.dropoffPercent !== null && (
        <div className="flex justify-between gap-4 border-t border-border pt-1">
          <span className="text-muted-foreground">Drop-off</span>
          <span
            className={`font-semibold ${dropoffToneClass(result.dropoffPercent)}`}
          >
            {result.dropoffPercent}%
          </span>
        </div>
      )}
    </div>
  );
}

function DropoffBetween({
  input,
  stepAnalyticsMap,
  edgeTransitionMap,
}: {
  input: EdgeDropoffInput;
  stepAnalyticsMap: Map<string, StepAnalyticsRow>;
  edgeTransitionMap: Map<string, number>;
}) {
  const result = computeEdgeDropoff(input, stepAnalyticsMap, edgeTransitionMap);
  if (!result) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-1.5 text-[11px]">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Analytics
      </p>
      <EdgeDropoffCard result={result} />
    </div>
  );
}

function EdgeDropoffTooltip({
  hovered,
  steps,
  stepAnalyticsMap,
  edgeTransitionMap,
}: {
  hovered: { edge: Edge; x: number; y: number };
  steps: QuestionnaireStepSchema[];
  stepAnalyticsMap: Map<string, StepAnalyticsRow>;
  edgeTransitionMap: Map<string, number>;
}) {
  const input = edgeDropoffFromReactFlowEdge(hovered.edge, steps);
  const result = input
    ? computeEdgeDropoff(input, stepAnalyticsMap, edgeTransitionMap)
    : null;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-card px-3 py-2 text-[11px] shadow-soft"
      style={{ left: hovered.x + 14, top: hovered.y + 14, maxWidth: 260 }}
    >
      {!result ? (
        <span className="text-muted-foreground">No drop-off data yet</span>
      ) : (
        <EdgeDropoffCard result={result} />
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
  stepAnalyticsMap,
  edgeTransitionMap,
  onClose,
  onReload,
}: {
  info: SelectedEdgeInfo;
  allSteps: QuestionnaireStepSchema[];
  isDraft: boolean;
  slug: string;
  versionId: string;
  schema: QuestionnaireVersionSchema;
  stepAnalyticsMap: Map<string, StepAnalyticsRow>;
  edgeTransitionMap: Map<string, number>;
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

          {effFromStepObj && effFromField && effFromValue && effTarget ? (
            <DropoffBetween
              input={{
                kind: "route",
                sourceStep: effFromStepObj,
                targetStepKey: effTarget,
                whenField: effFromField,
                whenValue: effFromValue,
                whenLabel:
                  fieldOptions.find((o) => o.value === effFromValue)?.label ??
                  effFromValue,
              }}
              stepAnalyticsMap={stepAnalyticsMap}
              edgeTransitionMap={edgeTransitionMap}
            />
          ) : null}

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={saving}
                  className="w-full gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  {saving ? "Deleting…" : "Delete connection"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete connection?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the routing rule from{" "}
                    <strong>{effFromStep}</strong> (when{" "}
                    <strong>{effFromField}</strong> = &ldquo;
                    {effFromValue}&rdquo;). You can recreate it by dragging from
                    the option handle.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      void run(async () => {
                        const step = schema.steps.find(
                          (s) => s.step_key === stepKey,
                        )!;
                        // Match by content, not array index — ruleIndex is from
                        // the filtered (conditional-only) array and would be
                        // misaligned if __default__ rules precede it.
                        const newRules = (step.routing_rules ?? []).filter(
                          (r) =>
                            !(
                              r.when_field === rule.when_field &&
                              r.when_value === rule.when_value &&
                              r.next_step_key === rule.next_step_key
                            ),
                        );
                        await updateStaffQuestionnaireStep(
                          slug,
                          versionId,
                          stepKey,
                          { routing_rules: newRules },
                        );
                      })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              <option value="">None — no default flow</option>
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
        {(() => {
          const sourceStep = schema.steps.find((s) => s.step_key === stepKey);
          const target = changeTarget ?? targetStepKey;
          if (!sourceStep || !target) return null;
          return (
            <DropoffBetween
              input={{
                kind: "seq",
                sourceStep,
                targetStepKey: target,
              }}
              stepAnalyticsMap={stepAnalyticsMap}
              edgeTransitionMap={edgeTransitionMap}
            />
          );
        })()}
        {isDraft && changeTarget !== null && changeTarget !== targetStepKey && (
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
                          when_field: "__default__" as const,
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
            variant="outline"
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
            {saving ? "Reverting…" : "Reset to automatic"}
          </Button>
        )}
        {isDraft && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={saving}
                className="w-full gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {saving ? "Deleting…" : "Delete connection"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete default connection?</AlertDialogTitle>
                <AlertDialogDescription>
                  Patients who reach <strong>{stepKey}</strong> will not
                  automatically advance to the next step. You can restore it by
                  clicking the step and setting a default in the right panel.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    void run(async () => {
                      const step = schema.steps.find(
                        (s) => s.step_key === stepKey,
                      )!;
                      const without = (step.routing_rules ?? []).filter(
                        (r) =>
                          !(
                            r.when_field === "__default__" ||
                            (!r.when_field && !r.when_value)
                          ),
                      );
                      await updateStaffQuestionnaireStep(
                        slug,
                        versionId,
                        stepKey,
                        {
                          routing_rules: [
                            ...without,
                            {
                              when_field: "__default__" as const,
                              when_value: "",
                              next_step_key: "",
                            },
                          ],
                        },
                      );
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </aside>
  );
}

// ── Questionnaire preview modal ───────────────────────────────────────────────

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
  stepAnalyticsMap,
  edgeTransitionMap,
  onClose,
  onReload,
}: {
  allSteps: QuestionnaireStepSchema[];
  slug: string;
  versionId: string;
  schema: QuestionnaireVersionSchema;
  stepAnalyticsMap: Map<string, StepAnalyticsRow>;
  edgeTransitionMap: Map<string, number>;
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
        {fromStep && toStep && fromStepObj && fromField && fromValue ? (
          <DropoffBetween
            input={{
              kind: "route",
              sourceStep: fromStepObj,
              targetStepKey: toStep,
              whenField: fromField,
              whenValue: fromValue,
              whenLabel:
                fieldOptions.find((o) => o.value === fromValue)?.label ??
                fromValue,
            }}
            stepAnalyticsMap={stepAnalyticsMap}
            edgeTransitionMap={edgeTransitionMap}
          />
        ) : null}
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
  // The preview walks the qualify steps, then continues into whichever intake
  // questionnaire the routing rules resolve to (the same logic used at runtime),
  // so staff see the full patient journey including the linked intake questions.
  const [intakeSchema, setIntakeSchema] =
    useState<QuestionnaireVersionSchema | null>(null);
  const [phase, setPhase] = useState<"qualify" | "intake">("qualify");
  const [stepKey, setStepKey] = useState(
    () =>
      [...schema.steps].sort((a, b) => a.sort_order - b.sort_order)[0]
        ?.step_key ?? "",
  );
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<
    { phase: "qualify" | "intake"; stepKey: string }[]
  >([]);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reg, setReg] = useState(() => emptyRegistrationFields());

  const activeSchema =
    phase === "intake" && intakeSchema ? intakeSchema : schema;

  const sorted = useMemo(
    () => [...activeSchema.steps].sort((a, b) => a.sort_order - b.sort_order),
    [activeSchema.steps],
  );
  const visibleSteps = useMemo(
    () => getVisibleSteps(activeSchema.steps, responses),
    [activeSchema.steps, responses],
  );
  const step =
    activeSchema.steps.find((s) => s.step_key === stepKey) ?? sorted[0];

  const stepIndex = step
    ? Math.max(
        0,
        visibleSteps.findIndex((s) => s.step_key === step.step_key),
      )
    : 0;
  const nextStep = step
    ? resolveNextStep(step, responses, activeSchema.steps)
    : null;

  // At the end of a qualify flow, the patient continues into the routed intake.
  const canContinueToIntake =
    phase === "qualify" && !nextStep && schema.questionnaire_type === "qualify";

  async function goNext() {
    if (!step) return;
    const stepErrors = getStepValidationErrors(
      activeSchema,
      stepIndex,
      responses,
    );
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setResolveError("");
      return;
    }
    if (phase === "qualify" && isRegistrationStep(step)) {
      const regError = validateRegistrationFields(reg);
      if (regError) {
        setResolveError(regError);
        return;
      }
    }
    setErrors({});
    setResolveError("");

    if (nextStep) {
      setHistory((h) => [...h, { phase, stepKey }]);
      setStepKey(nextStep.step_key);
      return;
    }
    if (!canContinueToIntake) return;
    setResolving(true);
    setResolveError("");
    try {
      const result = await resolveIntakeQuestionnaire({
        qualify_version_id: schema.id,
        questionnaire_responses: responses,
      });
      const first = [...result.version.steps].sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0];
      if (!first) {
        setResolveError(
          `Routed intake “${result.intake_questionnaire_slug}” has no steps.`,
        );
        return;
      }
      setIntakeSchema(result.version);
      setHistory((h) => [...h, { phase, stepKey }]);
      setPhase("intake");
      setStepKey(first.step_key);
    } catch (e) {
      setResolveError(
        e instanceof Error
          ? e.message
          : "Could not resolve the intake for these answers.",
      );
    } finally {
      setResolving(false);
    }
  }

  function goBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setPhase(prev.phase);
    setStepKey(prev.stepKey);
  }

  if (!step) return null;

  const totalVisible = visibleSteps.length || sorted.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {activeSchema.questionnaire_slug}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                phase === "intake"
                  ? "bg-success/15 text-success"
                  : "bg-secondary/20 text-secondary-foreground"
              }`}
            >
              {phase === "intake" ? "Intake" : "Qualify"}
            </span>
            <span className="text-xs text-muted-foreground">
              step {stepIndex + 1} / {totalVisible}
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

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <QuestionnaireRenderer
            schema={activeSchema}
            stepIndex={stepIndex}
            responses={responses}
            errors={errors}
            registration={{ value: reg, onChange: setReg }}
            qualifySchema={
              schema.questionnaire_type === "qualify" ? schema : null
            }
            qualifyResponses={
              schema.questionnaire_type === "qualify" ? responses : {}
            }
            intakeSchema={
              phase === "intake" && intakeSchema
                ? intakeSchema
                : schema.questionnaire_type === "intake"
                  ? schema
                  : intakeSchema
            }
            accountExtras={{
              firstName: reg.firstName.trim() || undefined,
              lastName: reg.lastName.trim() || undefined,
              email: reg.email.trim() || undefined,
              phone: reg.phone.trim() || undefined,
            }}
            reviewVariant="preview"
            onChange={(key, value) => {
              setResponses((prev) => ({ ...prev, [key]: value }));
              setErrors((prev) => {
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              });
            }}
          />
          {resolveError && (
            <p className="mt-3 px-6 text-xs text-destructive">{resolveError}</p>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={history.length === 0}
            onClick={goBack}
          >
            ← Back
          </Button>
          {nextStep ? (
            <Button size="sm" onClick={() => void goNext()}>
              Continue →
            </Button>
          ) : canContinueToIntake ? (
            <Button
              size="sm"
              disabled={resolving}
              onClick={() => void goNext()}
            >
              {resolving ? "Loading intake…" : "Continue to intake →"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-muted-foreground"
            >
              {phase === "intake" ? "End of intake" : "End of flow"}
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

  // Target is clearly below (steeper vertical than horizontal): exit bottom, enter top
  if (dy > 0 && dy > Math.abs(dx) * 0.55) {
    return { sourceHandle: "out-bottom", targetHandle: "in-top" };
  }

  // Target is a backward step sitting above-and-to-the-left: loop out the
  // source's bottom and into the target's bottom from below. Entering in-left
  // here would cut across the target node from the wrong side.
  if (dx < 0 && dy < 0) {
    return { sourceHandle: "out-bottom", targetHandle: "in-bottom" };
  }

  // Target is to the left (same row or below): exit bottom so the curve swoops
  // down-then-left instead of the ugly backward S-curve produced by right→left
  if (dx < 0) {
    return { sourceHandle: "out-bottom", targetHandle: "in-left" };
  }

  // Target is to the right (or directly above): right→left
  return { sourceHandle: "out-right", targetHandle: "in-left" };
}

function buildEdges(
  steps: QuestionnaireStepSchema[],
  positions: Map<string, { x: number; y: number }>,
  autoPos: { x: number; y: number }[],
  selectedEdgeId: string | null,
  defaultIntakeStepKeys: Set<string> = new Set(),
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

    // A step has exactly one default destination. When its default routes to an
    // intake (drawn separately as a green dashed edge), suppress the gray
    // automatic step→step edge so it never shows two competing defaults.
    if (defaultTarget && !defaultIntakeStepKeys.has(step.step_key)) {
      const ti = steps.findIndex((s) => s.step_key === defaultTarget.step_key);
      const tp = posOf(defaultTarget.step_key, ti);
      const { sourceHandle, targetHandle } = chooseHandles(
        sp.x,
        sp.y,
        tp.x,
        tp.y,
      );
      const seqEdgeId = `seq-${step.step_key}`;
      const isSeqSel = seqEdgeId === selectedEdgeId;
      edges.push({
        id: seqEdgeId,
        source: step.step_key,
        sourceHandle,
        target: defaultTarget.step_key,
        targetHandle,
        animated: false,
        selected: isSeqSel,
        zIndex: isSeqSel ? 21 : 10,
        style: {
          stroke: isSeqSel ? "var(--destructive)" : "var(--muted-foreground)",
          strokeWidth: isSeqSel ? 3 : 1.5,
          opacity: isSeqSel ? 1 : 0.7,
        },
        type: "default",
        data: {
          type: "seq",
          edgeId: seqEdgeId,
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
        // Per-answer handles exit from the right. Use the same relative-position
        // logic as chooseHandles to pick the best target handle.
        const adx = tp.x - sp.x;
        const ady = tp.y - sp.y;
        const answerTargetHandle =
          ady > 0 && ady > Math.abs(adx) * 0.55
            ? "in-top"
            : adx < 0 && ady < 0
              ? "in-bottom"
              : "in-left";

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
  extraIntakeSlugs: string[],
  publishedIntakeSlugs: Set<string>,
  onRemoveIntake: (slug: string) => void,
  auxPositions: Map<string, { x: number; y: number }>,
  auxDraggable: boolean,
): { nodes: FlowNode[]; edges: Edge[] } {
  const steps = schema.steps;
  const isDraft = schema.status === "draft";
  const isQualify = schema.questionnaire_type === "qualify";
  const autoPos = autoLayout(steps);
  const posOf = (key: string, idx: number) =>
    positions.get(key) ?? autoPos[idx] ?? { x: 0, y: 0 };

  // Which steps are valid targets for the pending connection
  const pendingTargetKeys = pendingSource
    ? new Set(
        steps.map((s) => s.step_key).filter((k) => k !== pendingSource.stepKey),
      )
    : new Set<string>();

  const nodes: FlowNode[] = steps.map((step, i) => ({
    id: step.step_key,
    type: "step",
    position: posOf(step.step_key, i),
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

  // Steps whose default (fallback) destination is an intake. Their gray
  // automatic step→step edge is suppressed so each step shows one default only.
  const sortedForAnchor = [...steps].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const lastStepKey = sortedForAnchor[sortedForAnchor.length - 1]?.step_key;
  const defaultIntakeStepKeys = new Set<string>();
  if (isQualify) {
    (schema.intake_routing_rules ?? []).forEach((r) => {
      if (r.when_field && r.when_field !== "__default__") return;
      if (!r.intake_questionnaire_slug) return;
      const anchor =
        r.when_step && steps.some((s) => s.step_key === r.when_step)
          ? r.when_step
          : lastStepKey;
      if (anchor) defaultIntakeStepKeys.add(anchor);
    });
  }

  const edges = buildEdges(
    steps,
    positions,
    autoPos,
    selectedEdgeId,
    defaultIntakeStepKeys,
  );

  if (isQualify && steps.length > 0) {
    const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);
    const firstStep = sorted[0];
    const lastStep = sorted[sorted.length - 1];

    // ── Entry node (source → first step) ──
    const fi = steps.findIndex((s) => s.step_key === firstStep.step_key);
    const fp = posOf(firstStep.step_key, fi);
    nodes.push({
      id: ENTRY_NODE_ID,
      type: "entry",
      position: auxPositions.get(ENTRY_NODE_ID) ?? { x: fp.x - 280, y: fp.y },
      draggable: auxDraggable,
      connectable: false,
      data: {
        title: schema.questionnaire_slug,
        ctaIds: schema.cta_ids ?? [],
        isDefaultEntry: !!schema.is_default_entry,
      },
    });
    edges.push({
      id: "entry-edge",
      source: ENTRY_NODE_ID,
      sourceHandle: "entry-out",
      target: firstStep.step_key,
      targetHandle: "in-left",
      type: "default",
      zIndex: 5,
      style: {
        stroke: "var(--secondary)",
        strokeWidth: 2,
        strokeDasharray: "4 3",
      },
      label: "entry",
      labelStyle: { fontSize: 10, fill: "var(--secondary-foreground)" },
      labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
    });

    // ── Intake destination nodes (terminal targets) ──
    const rules = schema.intake_routing_rules ?? [];
    const intakeSlugs = Array.from(
      new Set([
        ...rules.map((r) => r.intake_questionnaire_slug).filter(Boolean),
        ...extraIntakeSlugs,
      ]),
    );
    const maxX = Math.max(...steps.map((s, i) => posOf(s.step_key, i).x), 0);
    const minY = Math.min(...steps.map((s, i) => posOf(s.step_key, i).y), 0);
    const intakeX = maxX + NODE_WIDTH + H_GAP + 80;
    intakeSlugs.forEach((s, idx) => {
      const intakeId = `${INTAKE_NODE_PREFIX}${s}`;
      nodes.push({
        id: intakeId,
        type: "intake",
        position: auxPositions.get(intakeId) ?? {
          x: intakeX,
          y: minY + idx * 150,
        },
        draggable: auxDraggable,
        data: {
          slug: s,
          isPublished: publishedIntakeSlugs.has(s),
          isDraft,
          isPendingTarget: pendingSource !== null,
          onRemove: onRemoveIntake,
        },
      });
    });

    // ── Intake routing edges (step/answer → intake node) ──
    rules.forEach((rule, i) => {
      const slug = rule.intake_questionnaire_slug;
      if (!slug) return;
      let sourceKey: string | undefined;
      let sourceHandle: string;
      if (rule.when_field && rule.when_field !== "__default__") {
        const step = steps.find((s) =>
          s.fields.some((f) => f.field_key === rule.when_field),
        );
        if (!step) return;
        sourceKey = step.step_key;
        const fieldDef = step.fields.find(
          (f) => f.field_key === rule.when_field,
        );
        const hasAnswerHandle =
          fieldDef?.field_type === "yes_no" ||
          (fieldDef?.field_type === "single_choice" &&
            (fieldDef.options ?? []).length > 0);
        sourceHandle = hasAnswerHandle
          ? `answer|${rule.when_field}|${rule.when_value}`
          : "out-right";
      } else {
        // Default route: anchor to its recorded source step when set, else the
        // last step. This is why a step-body drag stays on the chosen step
        // instead of snapping to the last step.
        const anchorStep =
          (rule.when_step &&
            steps.find((s) => s.step_key === rule.when_step)) ||
          lastStep;
        if (!anchorStep) return;
        sourceKey = anchorStep.step_key;
        sourceHandle = "out-right";
      }
      const edgeId = `intake-${i}`;
      const sel = edgeId === selectedEdgeId;
      edges.push({
        id: edgeId,
        source: sourceKey,
        sourceHandle,
        target: `${INTAKE_NODE_PREFIX}${slug}`,
        targetHandle: "in-left",
        type: "default",
        zIndex: 15,
        selected: sel,
        style: {
          stroke: sel ? "var(--destructive)" : "var(--success)",
          strokeWidth: sel ? 3 : 2,
          strokeDasharray: "5 3",
        },
        label: rule.when_value ? `→ if "${rule.when_value}"` : "→ all",
        labelStyle: {
          fontSize: 10,
          fill: sel ? "var(--destructive)" : "var(--success)",
          fontWeight: 600,
        },
        labelBgStyle: { fill: "var(--card)", fillOpacity: 0.92 },
        data: { type: "intake", edgeId, ruleIndex: i, rule },
      });
    });
  }

  return { nodes, edges };
}

// ── Beluga API field mapping & field types (see field-catalog.ts) ─────────────

const NO_VENDOR_FIELDS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "— no vendor assigned —" },
];

function buildBelugaFields(
  vendorInfo: QuestionnaireVersionSchema["vendor_version_info"],
): ReadonlyArray<{ value: string; label: string }> {
  if (!vendorInfo?.schema?.fields?.length) return NO_VENDOR_FIELDS;
  const prefix = `${vendorInfo.vendor_slug}:`;
  return [
    { value: "", label: "— none —" },
    ...vendorInfo.schema.fields.map((f) => ({
      value: `${prefix}${f.id}`,
      label: f.label,
    })),
  ];
}
const FIELD_TYPES = QUESTION_FIELD_TYPES;

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
  defaultIntakeSlug,
  onClearDefaultIntake,
  onClose,
  onReload,
  onDelete,
  vendorVersionInfo,
  belugaFields,
  vendorLabel,
}: {
  step: QuestionnaireStepSchema;
  allSteps: QuestionnaireStepSchema[];
  isDraft: boolean;
  slug: string;
  versionId: string;
  defaultIntakeSlug?: string;
  onClearDefaultIntake?: () => Promise<void>;
  onClose: () => void;
  onReload: () => Promise<void>;
  onDelete: () => Promise<void>;
  vendorVersionInfo?: QuestionnaireVersionSchema["vendor_version_info"];
  belugaFields: ReadonlyArray<{ value: string; label: string }>;
  vendorLabel?: string;
}) {
  const [localTitle, setLocalTitle] = useState(step.title);
  const [localSubtitle, setLocalSubtitle] = useState(step.subtitle ?? "");
  const [localProgressLevel, setLocalProgressLevel] = useState(
    step.progress_level ?? 0,
  );
  const [localRouting, setLocalRouting] = useState<RoutingRule[]>(
    step.routing_rules ?? [],
  );
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicatingKey, setDuplicatingKey] = useState<string | null>(null);
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
    const isNatural = naturalNext != null && nextKey === naturalNext.step_key;
    setLocalRouting((prev) => {
      const without = prev.filter(
        (r) =>
          !(r.when_field === "__default__" || (!r.when_field && !r.when_value)),
      );
      if (isNatural) return without; // remove override, fall through to natural
      return [
        ...without,
        {
          when_field: "__default__" as const,
          when_value: "",
          next_step_key: nextKey, // "" = explicitly no default
        },
      ];
    });
  }

  useEffect(() => {
    setLocalTitle(step.title);
    setLocalSubtitle(step.subtitle ?? "");
    setLocalProgressLevel(step.progress_level ?? 0);
    setLocalRouting(step.routing_rules ?? []);
  }, [
    step.step_key,
    step.title,
    step.subtitle,
    step.progress_level,
    step.routing_rules,
  ]);

  async function saveStep() {
    setSaving(true);
    setError("");
    try {
      await updateStaffQuestionnaireStep(slug, versionId, step.step_key, {
        title: localTitle,
        subtitle: localSubtitle,
        progress_level: localProgressLevel,
        routing_rules: localRouting,
      });
      // If this step had a default→intake but the user picked a step default
      // here, clear the intake default so the step keeps exactly one default.
      const overridesIntake =
        !!defaultIntakeSlug &&
        !!localRouting.find(
          (r) =>
            (r.when_field === "__default__" ||
              (!r.when_field && !r.when_value)) &&
            !!r.next_step_key,
        );
      if (overridesIntake && onClearDefaultIntake) {
        await onClearDefaultIntake();
      } else {
        await onReload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addField(payload: {
    field_key: string;
    field_type: string;
    label: string;
    maps_to_section: string;
    required: boolean;
    account_mappings?: import("@/lib/questionnaire/account-mappings").AccountSubFieldMapping[];
    address_mappings?: import("@/lib/questionnaire/address-mappings").AddressSubFieldMapping[];
    choice_options?: import("@/lib/questionnaire/choice-options").ChoiceOptionDraft[];
  }) {
    setError("");
    // "stripe_payment_hold" is a UI-only pseudo field_type (see
    // QUESTION_FIELD_TYPES) — the API model has no dedicated payment field
    // type, it's field_type="plugin" + plugin_id="stripe_payment_hold" with
    // config (not choice options) in `options`.
    const isPaymentField = payload.field_type === "stripe_payment_hold";
    await createStaffQuestionnaireField(slug, versionId, step.step_key, {
      field_key: payload.field_key,
      field_type: isPaymentField ? "plugin" : payload.field_type,
      plugin_id: isPaymentField ? "stripe_payment_hold" : undefined,
      label: payload.label,
      maps_to_section: payload.maps_to_section,
      required: payload.required,
      options: isPaymentField
        ? ({
            payment_mode: "auth_hold",
          } as unknown as QuestionnaireFieldSchema["options"])
        : payload.field_type === "account" && payload.account_mappings
          ? payload.account_mappings.map((row) => ({
              value: row.key,
              label: row.label,
              backend: row.backend,
              beluga: row.beluga,
            }))
          : payload.field_type === "address_group" && payload.address_mappings
            ? payload.address_mappings.map((row) => ({
                value: row.key,
                label: row.label,
                backend: row.backend,
                beluga: row.beluga,
              }))
            : (payload.field_type === "single_choice" ||
                  payload.field_type === "multi_choice") &&
                payload.choice_options
              ? payload.choice_options.map((row) => ({
                  value: row.value,
                  label: row.label,
                  beluga: row.beluga,
                }))
              : payload.field_type === "yes_no"
                ? [
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]
                : [],
      validation_rules: [],
      sort_order: step.fields.length,
    });
    await onReload();
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
      const nextKey = patch.field_key?.trim();
      if (nextKey && nextKey !== fieldKey) {
        const usedKeys = new Set(
          allSteps.flatMap((s) => s.fields.map((f) => f.field_key)),
        );
        usedKeys.delete(fieldKey);
        if (usedKeys.has(nextKey)) {
          setError("Another question already uses that field ID.");
          return;
        }
        const { field_key: _ignored, ...rest } = patch;
        await updateStaffQuestionnaireField(
          slug,
          versionId,
          step.step_key,
          fieldKey,
          { field_key: nextKey, ...rest },
        );
        const stepsReferencingField = allSteps.filter((s) =>
          (s.routing_rules ?? []).some((r) => r.when_field === fieldKey),
        );
        await Promise.all(
          stepsReferencingField.map((s) =>
            updateStaffQuestionnaireStep(slug, versionId, s.step_key, {
              routing_rules: (s.routing_rules ?? []).map((r) =>
                r.when_field === fieldKey ? { ...r, when_field: nextKey } : r,
              ),
            }),
          ),
        );
        if (localRouting.some((r) => r.when_field === fieldKey)) {
          setLocalRouting((prev) =>
            prev.map((r) =>
              r.when_field === fieldKey ? { ...r, when_field: nextKey } : r,
            ),
          );
        }
      } else {
        await updateStaffQuestionnaireField(
          slug,
          versionId,
          step.step_key,
          fieldKey,
          patch,
        );
      }
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update field.");
    }
  }

  async function duplicateField(fieldKey: string) {
    const source = step.fields.find((f) => f.field_key === fieldKey);
    if (!source) return;
    if (isAccountField(source)) {
      setError("Account fields cannot be duplicated — each step allows one.");
      return;
    }
    setError("");
    setDuplicatingKey(fieldKey);
    try {
      const usedKeys = new Set(
        allSteps.flatMap((s) => s.fields.map((f) => f.field_key)),
      );
      const newKey = uniqueAmong(source.field_key, usedKeys);
      const sorted = sortQuestionnaireFields(step.fields);
      const sourceIndex = sorted.findIndex((f) => f.field_key === fieldKey);

      await createStaffQuestionnaireField(slug, versionId, step.step_key, {
        field_key: newKey,
        field_type: source.field_type,
        label: source.label?.trim()
          ? `${source.label.trim()} (copy)`
          : newKey.replace(/_/g, " "),
        help_text: source.help_text ?? "",
        maps_to_section: source.maps_to_section ?? "",
        plugin_id: source.plugin_id ?? "",
        required: source.required ?? false,
        options: source.options ?? [],
        validation_rules: source.validation_rules ?? [],
        sort_order: step.fields.length,
      });

      const orderedKeys = sorted.map((f) => f.field_key);
      orderedKeys.splice(sourceIndex + 1, 0, newKey);
      await Promise.all(
        orderedKeys.map((key, index) =>
          updateStaffQuestionnaireField(slug, versionId, step.step_key, key, {
            sort_order: index,
          }),
        ),
      );
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to duplicate field.");
    } finally {
      setDuplicatingKey(null);
    }
  }

  async function reorderFields(orderedKeys: string[]) {
    setError("");
    try {
      await Promise.all(
        orderedKeys.map((key, index) =>
          updateStaffQuestionnaireField(slug, versionId, step.step_key, key, {
            sort_order: index,
          }),
        ),
      );
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder fields.");
    }
  }

  const hasChanges =
    localTitle !== step.title ||
    localSubtitle !== (step.subtitle ?? "") ||
    localProgressLevel !== (step.progress_level ?? 0) ||
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
          <Field
            label="Progress level"
            help="Tier for the patient progress bar (0 = first). Branching alternatives at the same depth share a level — e.g. pill / injection / compounding = level 1, account = level 2."
          >
            <input
              type="number"
              min={0}
              max={20}
              className={inputCls}
              value={localProgressLevel}
              disabled={!isDraft}
              onChange={(e) =>
                setLocalProgressLevel(
                  Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                )
              }
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Default connection
          </p>
          {defaultIntakeSlug ? (
            <p className="text-[11px] text-success">
              This step’s default routes to intake “{defaultIntakeSlug}”. A step
              has one default — change it in the Intake routing panel, or set a
              step below to override it.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              The gray line — where patients go when no routing rule matches.
            </p>
          )}
          <select
            className={`${inputCls} text-xs`}
            value={defaultIntakeSlug ? "" : defaultNextKey}
            disabled={!isDraft}
            onChange={(e) => {
              // Keeping the intake default (the "" option) is a no-op; picking a
              // step overrides it (intake default cleared on save).
              if (defaultIntakeSlug && e.target.value === "") return;
              setDefaultNext(e.target.value);
            }}
          >
            <option value="">
              {defaultIntakeSlug
                ? `Intake: ${defaultIntakeSlug} (current)`
                : "None — no default flow"}
            </option>
            {naturalNext ? (
              <option value={naturalNext.step_key}>
                {naturalNext.step_key} —{" "}
                {stripHtml(naturalNext.title) || "(no title)"} (automatic)
              </option>
            ) : null}
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
          <StepFieldsEditor
            fields={step.fields}
            isDraft={isDraft}
            fieldTypes={FIELD_TYPES}
            belugaFields={buildBelugaFields(vendorVersionInfo)}
            vendorLabel={vendorLabel}
            onUpdate={(fieldKey, patch) => void updateField(fieldKey, patch)}
            onRemove={(fieldKey) => void removeField(fieldKey)}
            onReorder={(orderedKeys) => void reorderFields(orderedKeys)}
            onDuplicate={(fieldKey) => void duplicateField(fieldKey)}
            duplicatingKey={duplicatingKey}
          />

          {isDraft && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowAddQuestion(true)}
            >
              <Plus className="size-3 mr-1.5" />
              Add question to step
            </Button>
          )}
        </div>

        <AddQuestionModal
          open={showAddQuestion}
          onOpenChange={setShowAddQuestion}
          existingFieldKeys={allSteps.flatMap((s) =>
            s.fields.map((f) => f.field_key),
          )}
          stepHasAccountField={step.fields.some((f) => isAccountField(f))}
          onAdd={addField}
          belugaFields={belugaFields}
          vendorLabel={vendorLabel}
        />
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
  const [stepAnalyticsMap, setStepAnalyticsMap] = useState<
    Map<string, StepAnalyticsRow>
  >(new Map());
  const [edgeTransitionMap, setEdgeTransitionMap] = useState<
    Map<string, number>
  >(new Map());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<{
    edge: Edge;
    x: number;
    y: number;
  } | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [pendingSource, setPendingSource] = useState<PendingSource | null>(
    null,
  );
  const [error, setError] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showIntakeRouting, setShowIntakeRouting] = useState(false);
  const [showEntryPoints, setShowEntryPoints] = useState(false);
  // Incremented on every drag-stop so the buildNodesAndEdges useEffect re-runs
  // with the latest positions.current and recalculates handle pairs for all edges.
  const [positionsVersion, setPositionsVersion] = useState(0);

  const positions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const viewportKey = `flowchart_vp_${versionId}`;
  // Layout-only positions for the virtual entry/intake nodes. These have no
  // backend step rows, so we persist their canvas placement locally per version.
  const auxPositionsKey = `flowchart_aux_${versionId}`;
  const auxPositions = useRef<Map<string, { x: number; y: number }>>(
    (() => {
      try {
        const raw = localStorage.getItem(`flowchart_aux_${versionId}`);
        const parsed = raw
          ? (JSON.parse(raw) as Record<string, { x: number; y: number }>)
          : {};
        return new Map(Object.entries(parsed));
      } catch {
        return new Map();
      }
    })(),
  );
  const saveAuxPositions = useCallback(() => {
    try {
      localStorage.setItem(
        auxPositionsKey,
        JSON.stringify(Object.fromEntries(auxPositions.current)),
      );
    } catch {
      // localStorage may be unavailable (private mode / quota) — layout is
      // non-critical, so fall back to in-memory only.
    }
  }, [auxPositionsKey]);
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

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [extraIntakeSlugs, setExtraIntakeSlugs] = useState<string[]>([]);
  const [publishedIntakes, setPublishedIntakes] = useState<
    { slug: string; title: string }[]
  >([]);
  const [showAddIntake, setShowAddIntake] = useState(false);
  const [vendors, setVendors] = useState<ApiVendorSchema[]>([]);
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorMismatchSlugs, setVendorMismatchSlugs] = useState<string[]>([]);
  const [showVendorMismatchDialog, setShowVendorMismatchDialog] =
    useState(false);

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

  // Load per-step analytics (views + answer distributions) for edge drop-off.
  useEffect(() => {
    if (!versionId) return;
    let cancelled = false;
    fetchStaffStepAnalytics(versionId)
      .then((result) => {
        if (cancelled) return;
        const stepsMap = new Map<string, StepAnalyticsRow>();
        const dropMap = new Map<string, FunnelAnalyticsStep>();
        result.steps.forEach((s) => {
          stepsMap.set(s.step_key, s);
          dropMap.set(s.step_key, {
            step_key: s.step_key,
            views: s.views,
            completions: s.completions,
            dropoff_percent: s.dropoff_percent,
            stopped_sessions: s.stopped_sessions,
          });
        });
        const transitionMap = new Map<string, number>();
        result.edge_transitions.forEach((edge) => {
          transitionMap.set(
            `${edge.source_step_key}\0${edge.target_step_key}`,
            edge.count,
          );
        });
        setStepAnalyticsMap(stepsMap);
        setEdgeTransitionMap(transitionMap);
        setAnalyticsMap(dropMap);
      })
      .catch(() => {
        // analytics unavailable — edges simply won't show drop-off
      });
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const bumpPositions = useCallback(() => {
    setPositionsVersion((v) => v + 1);
  }, []);

  const isDraft = schema?.status === "draft";

  const editorActions = useFlowchartEditorActions({
    slug,
    versionId,
    schema,
    isDraft: !!isDraft,
    selectedKey,
    positions,
    onReload: () => reload(),
    onSelectStep: setSelectedKey,
    onPositionsChange: bumpPositions,
    onError: setError,
  });

  const {
    canCopy,
    canPaste,
    canUndo,
    canRedo,
    recordStepCreation,
    recordIntakeRulesChange,
    copySelectedStep,
    pasteClipboardStep,
    undo,
    redo,
    onNodeDragStart,
    onNodeDragStop,
  } = editorActions;

  // Entry/intake nodes are virtual (no backend step row). Persist their layout
  // locally instead of routing through the step-position persistence in the hook.
  const handleNodeDragStop = useCallback<typeof onNodeDragStop>(
    (event, node) => {
      if (node.id === ENTRY_NODE_ID || node.id.startsWith(INTAKE_NODE_PREFIX)) {
        auxPositions.current.set(node.id, {
          x: node.position.x,
          y: node.position.y,
        });
        saveAuxPositions();
        bumpPositions();
        return Promise.resolve();
      }
      return onNodeDragStop(event, node);
    },
    [onNodeDragStop, saveAuxPositions, bumpPositions],
  );

  useEffect(() => {
    void reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, versionId]);

  useEffect(() => {
    fetchStaffVendors()
      .then(setVendors)
      .catch(() => {
        // vendors unavailable
      });
  }, []);

  const onAnswerClick = useCallback<StepNodeData["onAnswerClick"]>(
    (src) => {
      if (activeTool !== "connect") return;
      setPendingSource(src);
    },
    [activeTool],
  );

  // Published intake questionnaires available as routing destinations.
  useEffect(() => {
    if (schema?.questionnaire_type !== "qualify") return;
    void (async () => {
      try {
        const items = await fetchStaffQuestionnaires();
        setPublishedIntakes(
          items
            .filter(
              (q) => q.questionnaire_type === "intake" && q.published_version,
            )
            .map((q) => ({ slug: q.slug, title: q.title })),
        );
      } catch {
        // intake list unavailable
      }
    })();
  }, [schema?.questionnaire_type]);

  const publishedIntakeSlugs = useMemo(
    () => new Set(publishedIntakes.map((q) => q.slug)),
    [publishedIntakes],
  );

  // Warn when this version's vendor doesn't match linked qualify/intake versions.
  useEffect(() => {
    if (!schema) return;
    let cancelled = false;

    void (async () => {
      try {
        const thisVendorSlug = schema.vendor_version_info?.vendor_slug ?? null;
        const all = await fetchStaffQuestionnaires();
        let mismatches: string[] = [];

        if (schema.questionnaire_type === "qualify") {
          const linkedSlugs = new Set(
            (schema.intake_routing_rules ?? []).map(
              (r) => r.intake_questionnaire_slug,
            ),
          );
          if (linkedSlugs.size === 0) return;
          const toFetch = all.filter(
            (q) =>
              q.questionnaire_type === "intake" &&
              linkedSlugs.has(q.slug) &&
              q.published_version,
          );
          const versions = await Promise.all(
            toFetch.map((q) =>
              fetchStaffQuestionnaireVersion(q.slug, q.published_version!.id),
            ),
          );
          mismatches = toFetch
            .filter(
              (_, i) =>
                (versions[i].vendor_version_info?.vendor_slug ?? null) !==
                thisVendorSlug,
            )
            .map((q) => q.slug);
        } else {
          const qualifyList = all.filter(
            (q) => q.questionnaire_type === "qualify" && q.published_version,
          );
          const versions = await Promise.all(
            qualifyList.map((q) =>
              fetchStaffQuestionnaireVersion(q.slug, q.published_version!.id),
            ),
          );
          mismatches = qualifyList
            .filter(
              (q, i) =>
                (versions[i].intake_routing_rules ?? []).some(
                  (r) =>
                    r.intake_questionnaire_slug === schema.questionnaire_slug,
                ) &&
                (versions[i].vendor_version_info?.vendor_slug ?? null) !==
                  thisVendorSlug,
            )
            .map((q) => q.slug);
        }

        if (cancelled) return;
        setVendorMismatchSlugs(mismatches);
        if (mismatches.length > 0) setShowVendorMismatchDialog(true);
      } catch {
        // informational only — ignore errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schema]);

  const saveIntakeRules = useCallback(
    async (rules: IntakeRoutingRule[]) => {
      const from = schema?.intake_routing_rules ?? [];
      try {
        await updateStaffQuestionnaireVersion(slug, versionId, {
          intake_routing_rules: rules,
        });
        recordIntakeRulesChange(from, rules);
        await reload();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to save intake route.",
        );
      }
    },
    [slug, versionId, reload, schema, recordIntakeRulesChange],
  );

  // A step has exactly one default (fallback) destination. Its default→step
  // route lives in step.routing_rules; its default→intake route lives in
  // intake_routing_rules. Setting one must clear the other so a step can never
  // hold two competing defaults. This applies both updates with one reload.
  const setStepDefaultDestination = useCallback(
    async (
      stepKey: string,
      destination:
        | { kind: "step"; nextStepKey: string }
        | { kind: "intake"; intakeSlug: string },
    ) => {
      if (!schema) return;
      const step = schema.steps.find((s) => s.step_key === stepKey);
      const isDefaultRule = (r: RoutingRule) =>
        r.when_field === "__default__" || (!r.when_field && !r.when_value);
      const isDefaultIntake = (r: IntakeRoutingRule) =>
        r.when_field === "__default__" && (r.when_step ?? "") === stepKey;

      const stepRulesWithoutDefault = (step?.routing_rules ?? []).filter(
        (r) => !isDefaultRule(r),
      );
      const intakeWithoutStepDefault = (
        schema.intake_routing_rules ?? []
      ).filter((r) => !isDefaultIntake(r));

      let nextStepRules: RoutingRule[];
      let nextIntakeRules: IntakeRoutingRule[];
      if (destination.kind === "intake") {
        // Default now goes to an intake → drop step default, set intake default.
        nextStepRules = stepRulesWithoutDefault;
        nextIntakeRules = [
          ...intakeWithoutStepDefault,
          {
            when_field: "__default__",
            when_value: "",
            intake_questionnaire_slug: destination.intakeSlug,
            when_step: stepKey,
          },
        ];
      } else {
        // Default now goes to a step → drop intake default, set step default.
        nextStepRules = [
          ...stepRulesWithoutDefault,
          {
            when_field: "__default__",
            when_value: "",
            next_step_key: destination.nextStepKey,
          },
        ];
        nextIntakeRules = intakeWithoutStepDefault;
      }

      const stepChanged =
        !!step &&
        JSON.stringify(nextStepRules) !==
          JSON.stringify(step.routing_rules ?? []);
      const intakeChanged =
        JSON.stringify(nextIntakeRules) !==
        JSON.stringify(schema.intake_routing_rules ?? []);
      const fromIntake = schema.intake_routing_rules ?? [];

      try {
        if (stepChanged) {
          await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
            routing_rules: nextStepRules,
          });
        }
        if (intakeChanged) {
          await updateStaffQuestionnaireVersion(slug, versionId, {
            intake_routing_rules: nextIntakeRules,
          });
          recordIntakeRulesChange(fromIntake, nextIntakeRules);
        }
        if (stepChanged || intakeChanged) await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save rule.");
      }
    },
    [slug, versionId, reload, schema, recordIntakeRulesChange],
  );

  // Remove a step's default→intake route(s) so it can fall back to a step
  // default instead. Used when overriding the default from the step panel.
  const clearStepDefaultIntake = useCallback(
    async (stepKey: string) => {
      if (!schema) return;
      const sorted = [...schema.steps].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const lastStepKey = sorted[sorted.length - 1]?.step_key;
      const remaining = (schema.intake_routing_rules ?? []).filter((r) => {
        const isDefault = !r.when_field || r.when_field === "__default__";
        if (!isDefault) return true;
        const anchor =
          r.when_step && schema.steps.some((s) => s.step_key === r.when_step)
            ? r.when_step
            : lastStepKey;
        return anchor !== stepKey;
      });
      if (remaining.length !== (schema.intake_routing_rules ?? []).length) {
        await saveIntakeRules(remaining);
      } else {
        await reload();
      }
    },
    [schema, saveIntakeRules, reload],
  );

  const removeIntakeNode = useCallback(
    (intakeSlug: string) => {
      setExtraIntakeSlugs((prev) => prev.filter((s) => s !== intakeSlug));
      const remaining = (schema?.intake_routing_rules ?? []).filter(
        (r) => r.intake_questionnaire_slug !== intakeSlug,
      );
      if (
        remaining.length !== (schema?.intake_routing_rules ?? []).length &&
        schema?.status === "draft"
      ) {
        void saveIntakeRules(remaining);
      }
    },
    [schema, saveIntakeRules],
  );

  useEffect(() => {
    if (!schema) return;
    // Seed positions.current for any steps not yet dragged this session
    // so buildEdges always has a concrete position for every node.
    const ap = autoLayout(schema.steps);
    schema.steps.forEach((step, i) => {
      if (!positions.current.has(step.step_key)) {
        positions.current.set(step.step_key, ap[i]);
      }
    });
    const { nodes: n, edges: e } = buildNodesAndEdges(
      schema,
      showAnalytics ? analyticsMap : new Map(),
      selectedKey,
      selectedEdgeInfo?.edgeId ?? null,
      positions.current,
      pendingSource,
      onAnswerClick,
      extraIntakeSlugs,
      publishedIntakeSlugs,
      removeIntakeNode,
      auxPositions.current,
      activeTool === "select",
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
    positionsVersion,
    extraIntakeSlugs,
    publishedIntakeSlugs,
    removeIntakeNode,
    activeTool,
    setNodes,
    setEdges,
  ]);

  // ESC / copy / paste / undo / redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPendingSource(null);
        return;
      }
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === "c" && canCopy) {
        e.preventDefault();
        copySelectedStep();
        return;
      }
      if (key === "v" && canPaste) {
        e.preventDefault();
        void pasteClipboardStep();
        return;
      }
      if (key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        void undo();
        return;
      }
      if ((key === "z" && e.shiftKey && canRedo) || (key === "y" && canRedo)) {
        e.preventDefault();
        void redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    canCopy,
    canPaste,
    canUndo,
    canRedo,
    copySelectedStep,
    pasteClipboardStep,
    undo,
    redo,
  ]);

  async function toggleAnalytics() {
    const next = !showAnalytics;
    setShowAnalytics(next);
    if (next && analyticsMap.size === 0 && versionId) {
      try {
        const result = await fetchStaffStepAnalytics(versionId);
        const stepsMap = new Map<string, StepAnalyticsRow>();
        const dropMap = new Map<string, FunnelAnalyticsStep>();
        result.steps.forEach((s) => {
          stepsMap.set(s.step_key, s);
          dropMap.set(s.step_key, {
            step_key: s.step_key,
            views: s.views,
            completions: s.completions,
            dropoff_percent: s.dropoff_percent,
            stopped_sessions: s.stopped_sessions,
          });
        });
        const transitionMap = new Map<string, number>();
        result.edge_transitions.forEach((edge) => {
          transitionMap.set(
            `${edge.source_step_key}\0${edge.target_step_key}`,
            edge.count,
          );
        });
        setEdgeTransitionMap(transitionMap);
        setStepAnalyticsMap(stepsMap);
        setAnalyticsMap(dropMap);
      } catch {
        // analytics unavailable
      }
    }
  }

  function onEdgeMouseEnter(event: React.MouseEvent, edge: Edge) {
    setHoveredEdge({ edge, x: event.clientX, y: event.clientY });
  }
  function onEdgeMouseMove(event: React.MouseEvent, edge: Edge) {
    setHoveredEdge({ edge, x: event.clientX, y: event.clientY });
  }
  function onEdgeMouseLeave() {
    setHoveredEdge(null);
  }

  function onEdgeClick(_: React.MouseEvent, edge: Edge) {
    if (edge.id.startsWith("intake-")) {
      // Intake routes are edited/removed in the Intake routing panel.
      setSelectedKey(null);
      setSelectedEdgeInfo(null);
      setShowAddConnection(false);
      setShowEntryPoints(false);
      setShowIntakeRouting(true);
      return;
    }
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

    // Entry node → open Entry points panel
    if (node.id === ENTRY_NODE_ID) {
      setPendingSource(null);
      setSelectedKey(null);
      setShowIntakeRouting(false);
      setShowEntryPoints(true);
      return;
    }

    const isIntakeNode = node.id.startsWith(INTAKE_NODE_PREFIX);

    // Complete a click-based connection into an intake node
    if (pendingSource && isIntakeNode) {
      const intakeSlug = node.id.slice(INTAKE_NODE_PREFIX.length);
      const src = pendingSource;
      setPendingSource(null);
      if (schema?.status !== "draft") return;
      const isDefaultRoute = src.fieldKey === "__default__";
      if (isDefaultRoute) {
        // A step has one default → setting default→intake clears default→step.
        void setStepDefaultDestination(src.stepKey, {
          kind: "intake",
          intakeSlug,
        });
      } else {
        void saveIntakeRules(
          appendIntakeRule(schema.intake_routing_rules ?? [], {
            when_field: src.fieldKey,
            when_value: src.value,
            intake_questionnaire_slug: intakeSlug,
          }),
        );
      }
      return;
    }

    // Intake node (no pending source) → open Intake routing panel
    if (isIntakeNode) {
      setSelectedKey(null);
      setShowEntryPoints(false);
      setShowIntakeRouting(true);
      return;
    }

    if (pendingSource && pendingSource.stepKey !== node.id) {
      const src = pendingSource;
      setPendingSource(null);
      if (schema?.status !== "draft") return;
      // Default route → step. A step has one default, so this also clears any
      // default→intake route anchored to this step.
      if (src.fieldKey === "__default__") {
        void setStepDefaultDestination(src.stepKey, {
          kind: "step",
          nextStepKey: node.id,
        });
        return;
      }
      // Answer-based route → create/replace the conditional routing rule.
      void (async () => {
        const step = schema?.steps.find((s) => s.step_key === src.stepKey);
        if (!step) return;
        // Upsert: replace existing rule for the same field+value, don't duplicate
        const without = (step.routing_rules ?? []).filter(
          (r) => !(r.when_field === src.fieldKey && r.when_value === src.value),
        );
        const newRules: RoutingRule[] = [
          ...without,
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

    // Connect mode: clicking a step toggles it as the pending source. This lets
    // steps without answer options (e.g. account signup) start a default route
    // to an intake or another step — same click flow as answer-based routing.
    if (activeTool === "connect") {
      if (schema?.status !== "draft") return;
      if (pendingSource?.stepKey === node.id) {
        setPendingSource(null);
        return;
      }
      setPendingSource({
        stepKey: node.id,
        fieldKey: "__default__",
        fieldLabel: "Default route",
        value: "",
        valueLabel: "all answers",
      });
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

      // Drag into an intake destination node → intake routing rule
      if (connection.target.startsWith(INTAKE_NODE_PREFIX)) {
        const intakeSlug = connection.target.slice(INTAKE_NODE_PREFIX.length);
        if (srcHandle.startsWith("answer|")) {
          const [, fieldKey, value] = srcHandle.split("|");
          void saveIntakeRules(
            appendIntakeRule(schema.intake_routing_rules ?? [], {
              when_field: fieldKey ?? "",
              when_value: value ?? "",
              intake_questionnaire_slug: intakeSlug,
            }),
          );
        } else {
          // Step-body drag → default route anchored to that step. A step has one
          // default, so this replaces any default→step route from that step.
          void setStepDefaultDestination(connection.source, {
            kind: "intake",
            intakeSlug,
          });
        }
        return;
      }

      if (srcHandle.startsWith("answer|")) {
        // Per-answer handle drag → conditional routing rule
        const [, fieldKey, value] = srcHandle.split("|");
        const step = schema.steps.find((s) => s.step_key === connection.source);
        if (!step || !fieldKey) return;
        // Upsert: replace any existing rule for this field+value, don't duplicate
        const without = (step.routing_rules ?? []).filter(
          (r) => !(r.when_field === fieldKey && r.when_value === (value ?? "")),
        );
        const newRules: RoutingRule[] = [
          ...without,
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
        if (connection.target === naturalNext?.step_key) {
          // Reverting to the natural next step → just drop the explicit default
          // step rule. (Also clear any default→intake from this step.)
          const withoutDefault = (step.routing_rules ?? []).filter(
            (r) =>
              !(
                r.when_field === "__default__" ||
                (!r.when_field && !r.when_value)
              ),
          );
          const intakeWithout = (schema.intake_routing_rules ?? []).filter(
            (r) =>
              !(
                r.when_field === "__default__" &&
                (r.when_step ?? "") === connection.source
              ),
          );
          const fromIntake = schema.intake_routing_rules ?? [];
          void updateStaffQuestionnaireStep(
            slug,
            versionId,
            connection.source,
            {
              routing_rules: withoutDefault,
            },
          )
            .then(async () => {
              if (intakeWithout.length !== fromIntake.length) {
                await updateStaffQuestionnaireVersion(slug, versionId, {
                  intake_routing_rules: intakeWithout,
                });
                recordIntakeRulesChange(fromIntake, intakeWithout);
              }
              await reload();
            })
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Failed to save rule."),
            );
        } else {
          // New default → step. A step has one default, so this also clears any
          // default→intake route anchored to this step.
          void setStepDefaultDestination(connection.source, {
            kind: "step",
            nextStepKey: connection.target,
          });
        }
      }
    },
    [
      schema,
      slug,
      versionId,
      reload,
      saveIntakeRules,
      setStepDefaultDestination,
      recordIntakeRulesChange,
    ],
  );

  function onPaneClick() {
    setPendingSource(null);
    setSelectedKey(null);
    setSelectedEdgeInfo(null);
    setShowAddConnection(false);
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
      const title = key.replace(/_/g, " ");
      await createStaffQuestionnaireStep(slug, versionId, {
        step_key: key,
        sort_order: schema.steps.length,
        title,
        subtitle: "",
        position_x: newX,
        position_y: newY,
      });
      positions.current.set(key, { x: newX, y: newY });
      recordStepCreation(
        key,
        {
          title,
          subtitle: "",
          visibility_rule: null,
          routing_rules: [],
          fields: [],
        },
        { x: newX, y: newY },
      );
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

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading questionnaire…</p>
      </div>
    );
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col"
      style={{ height: "calc(100svh - 160px)" }}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 mb-2 bg-card border border-border rounded-2xl shrink-0 shadow-soft">
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
          {/* Vendor picker */}
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l">
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              API vendor:
            </span>
            {isDraft ? (
              <select
                className="text-xs h-6 rounded border bg-background px-1.5 text-foreground cursor-pointer max-w-[160px]"
                value={schema.vendor_version_id ?? ""}
                disabled={savingVendor}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (
                    schema.vendor_version_id &&
                    val !== schema.vendor_version_id &&
                    !confirm(
                      "Switching vendors will not remap existing field mappings.\n\nTo switch safely: duplicate this version first, then select the new vendor and remap each field.\n\nSwitch vendor now anyway?",
                    )
                  )
                    return;
                  setSavingVendor(true);
                  try {
                    await updateStaffQuestionnaireVersion(slug, versionId, {
                      vendor_version_id: val || null,
                    });
                    await reload();
                  } finally {
                    setSavingVendor(false);
                  }
                }}
              >
                <option value="">— none —</option>
                {vendors.flatMap((v) =>
                  v.versions
                    .filter((ver) => ver.status === "published")
                    .map((ver) => (
                      <option key={ver.id} value={ver.id}>
                        {v.name} · {ver.display_label}
                      </option>
                    )),
                )}
              </select>
            ) : (
              <span className="text-xs font-medium">
                {schema.vendor_version_info
                  ? `${schema.vendor_version_info.vendor_name} · ${schema.vendor_version_info.display_label}`
                  : "none"}
              </span>
            )}
            {vendorMismatchSlugs.length > 0 && (
              <button
                type="button"
                title="Vendor mismatch — click for details"
                onClick={() => setShowVendorMismatchDialog(true)}
                className="ml-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
              >
                <AlertTriangle className="size-3 shrink-0" />
                vendor mismatch
              </button>
            )}
          </div>
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

        {isDraft && (
          <div className="flex items-center gap-0.5 bg-muted rounded-xl p-0.5">
            <button
              type="button"
              title="Copy step (⌘C)"
              disabled={!canCopy}
              onClick={() => copySelectedStep()}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              title="Paste step (⌘V)"
              disabled={!canPaste}
              onClick={() => void pasteClipboardStep()}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <ClipboardPaste className="size-3.5" />
            </button>
            <span className="w-px h-4 bg-border mx-0.5" />
            <button
              type="button"
              title="Undo (⌘Z)"
              disabled={!canUndo}
              onClick={() => void undo()}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              type="button"
              title="Redo (⌘⇧Z)"
              disabled={!canRedo}
              onClick={() => void redo()}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {error && (
            <p className="text-xs text-destructive max-w-[160px] truncate">
              {error}
            </p>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-7"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>

            {schema.questionnaire_type === "qualify" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={showIntakeRouting ? "default" : "outline"}
                    className="size-7"
                    onClick={() => {
                      setShowIntakeRouting((v) => !v);
                      setSelectedKey(null);
                      setSelectedEdgeInfo(null);
                      setShowAddConnection(false);
                      setShowEntryPoints(false);
                    }}
                  >
                    <GitBranch className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Routing rules</TooltipContent>
              </Tooltip>
            )}

            {schema.questionnaire_type === "qualify" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={showEntryPoints ? "default" : "outline"}
                    className="size-7"
                    onClick={() => {
                      setShowEntryPoints((v) => !v);
                      setSelectedKey(null);
                      setSelectedEdgeInfo(null);
                      setShowAddConnection(false);
                      setShowIntakeRouting(false);
                    }}
                  >
                    <Zap className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Entry points</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={showAnalytics ? "default" : "outline"}
                  className="size-7"
                  onClick={() => void toggleAnalytics()}
                >
                  <BarChart2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analytics</TooltipContent>
            </Tooltip>

            {isDraft && schema.questionnaire_type === "qualify" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => setShowAddIntake(true)}
                  >
                    <Workflow className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Intake routing</TooltipContent>
              </Tooltip>
            )}

            {isDraft && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => {
                        setShowAddConnection(true);
                        setSelectedEdgeInfo(null);
                        setSelectedKey(null);
                      }}
                    >
                      <Link2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add connection</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      disabled={addingStep}
                      className="size-7"
                      onClick={() => void addStep()}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add step</TooltipContent>
                </Tooltip>
              </>
            )}
          </TooltipProvider>
        </div>
      </div>

      {!isDraft && (
        <div
          role="status"
          className="mb-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground shrink-0"
        >
          <strong className="text-foreground">Read-only version.</strong>{" "}
          Published and archived versions cannot be edited. Use{" "}
          <strong>Duplicate</strong> from Manage versions to create a draft
          copy. Select tool still lets you inspect steps; Connect, Add step, and
          field edits require a draft.
        </div>
      )}

      {isDraft && activeTool !== "connect" && (
        <div className="mb-2 rounded-xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground shrink-0">
          <strong className="text-foreground">Draft editing:</strong> use{" "}
          <strong>Select</strong> to drag steps and edit fields ·{" "}
          <strong>Connect</strong> or <strong>Add connection</strong> for
          routing · <strong>⌘C / ⌘V</strong> copy &amp; paste steps ·{" "}
          <strong>⌘Z / ⌘⇧Z</strong> undo &amp; redo moves
        </div>
      )}

      {/* ── Analytics banner ───────────────────────────────────────────── */}
      {showAnalytics && (
        <div className="mb-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground shrink-0">
          {analyticsMap.size === 0 ? (
            <>
              <strong className="text-foreground">No funnel data yet.</strong>{" "}
              Drop-off rates appear as colored badges on each step once patients
              start moving through this questionnaire in the live funnel.
            </>
          ) : (
            <>
              <strong className="text-foreground">Drop-off view:</strong> each
              step shows the share of patients who left at that step (green =
              low, yellow = medium, red = high).
            </>
          )}
        </div>
      )}

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
              <strong>{pendingSource.stepKey}</strong> → now click a step or
              intake node to route to.{" "}
              <button
                type="button"
                className="underline opacity-75 ml-1"
                onClick={() => setPendingSource(null)}
              >
                Cancel (Esc)
              </button>
            </>
          ) : (
            "Connect mode: click an answer option (Yes/No/A/B/C…) to route that answer, or click a step to route it by default — then click a step or intake to connect."
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
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseMove={onEdgeMouseMove}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onConnect={onConnect}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
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
          {hoveredEdge && schema && (
            <EdgeDropoffTooltip
              hovered={hoveredEdge}
              steps={schema.steps}
              stepAnalyticsMap={stepAnalyticsMap}
              edgeTransitionMap={edgeTransitionMap}
            />
          )}
        </div>

        {selectedStep &&
          activeTool === "select" &&
          !showIntakeRouting &&
          !showEntryPoints && (
            <StepEditorPanel
              step={selectedStep}
              allSteps={schema.steps}
              isDraft={!!isDraft}
              slug={slug}
              versionId={versionId}
              defaultIntakeSlug={defaultIntakeSlugForStep(
                schema,
                selectedStep.step_key,
              )}
              onClearDefaultIntake={() =>
                clearStepDefaultIntake(selectedStep.step_key)
              }
              onClose={() => setSelectedKey(null)}
              onReload={() => reload()}
              onDelete={() => removeStep(selectedStep.step_key)}
              vendorVersionInfo={schema.vendor_version_info}
              belugaFields={buildBelugaFields(schema.vendor_version_info)}
              vendorLabel={schema.vendor_version_info?.vendor_name ?? undefined}
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
            stepAnalyticsMap={stepAnalyticsMap}
            edgeTransitionMap={edgeTransitionMap}
            onClose={() => setSelectedEdgeInfo(null)}
            onReload={() => reload()}
          />
        )}
        {showAddConnection &&
          !selectedStep &&
          !selectedEdgeInfo &&
          !showIntakeRouting &&
          !showEntryPoints && (
            <AddConnectionPanel
              allSteps={schema.steps}
              slug={slug}
              versionId={versionId}
              schema={schema}
              stepAnalyticsMap={stepAnalyticsMap}
              edgeTransitionMap={edgeTransitionMap}
              onClose={() => setShowAddConnection(false)}
              onReload={() => reload()}
            />
          )}
        {showIntakeRouting && schema.questionnaire_type === "qualify" && (
          <IntakeRoutingPanel
            slug={slug}
            versionId={versionId}
            rules={schema.intake_routing_rules ?? []}
            steps={schema.steps}
            isDraft={!!isDraft}
            onReload={() => reload()}
            onClose={() => setShowIntakeRouting(false)}
          />
        )}
        {showEntryPoints && schema.questionnaire_type === "qualify" && (
          <EntryPointsPanel
            slug={slug}
            versionId={versionId}
            ctaIds={schema.cta_ids ?? []}
            isDefaultEntry={!!schema.is_default_entry}
            isDraft={!!isDraft}
            onReload={() => reload()}
            onClose={() => setShowEntryPoints(false)}
          />
        )}
      </div>

      {showPreview && (
        <PreviewModal schema={schema} onClose={() => setShowPreview(false)} />
      )}

      {showAddIntake && (
        <AddIntakeModal
          publishedIntakes={publishedIntakes}
          existingSlugs={[
            ...(schema.intake_routing_rules ?? []).map(
              (r) => r.intake_questionnaire_slug,
            ),
            ...extraIntakeSlugs,
          ]}
          onAdd={(intakeSlug) => {
            setExtraIntakeSlugs((prev) =>
              prev.includes(intakeSlug) ? prev : [...prev, intakeSlug],
            );
            setShowAddIntake(false);
          }}
          onClose={() => setShowAddIntake(false)}
        />
      )}

      {/* Vendor mismatch warning dialog */}
      <AlertDialog
        open={showVendorMismatchDialog}
        onOpenChange={setShowVendorMismatchDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-5 shrink-0" />
              API vendor mismatch
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-foreground">
                <p>
                  {schema.questionnaire_type === "qualify"
                    ? "The intake questionnaire(s) this qualify routes to are using a different API vendor."
                    : "The qualify questionnaire(s) that route to this intake are using a different API vendor."}
                </p>
                <p className="text-muted-foreground">
                  Qualify and intake questionnaires in the same flow must use
                  the same API vendor so patient data maps correctly to the
                  provider. Update the vendor on the linked questionnaire(s) to
                  match before publishing.
                </p>
                {vendorMismatchSlugs.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-800 mb-1">
                      Mismatched questionnaire(s):
                    </p>
                    <ul className="space-y-0.5">
                      {vendorMismatchSlugs.map((s) => (
                        <li
                          key={s}
                          className="font-mono text-xs text-amber-900"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowVendorMismatchDialog(false)}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddIntakeModal({
  publishedIntakes,
  existingSlugs,
  onAdd,
  onClose,
}: {
  publishedIntakes: { slug: string; title: string }[];
  existingSlugs: string[];
  onAdd: (slug: string) => void;
  onClose: () => void;
}) {
  const available = publishedIntakes.filter(
    (q) => !existingSlugs.includes(q.slug),
  );
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-3xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Add intake destination
            </p>
            <p className="text-[11px] text-muted-foreground">
              Pick a published intake, then drag from a step or answer to it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {publishedIntakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published intake questionnaires yet. Publish an intake
              questionnaire first.
            </p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All published intakes are already on the canvas.
            </p>
          ) : (
            available.map((q) => (
              <button
                key={q.slug}
                type="button"
                onClick={() => onAdd(q.slug)}
                className="w-full rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <p className="text-sm font-medium text-foreground">{q.title}</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {q.slug}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
