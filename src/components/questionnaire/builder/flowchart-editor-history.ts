import type {
  IntakeRoutingRule,
  QuestionnaireFieldSchema,
  QuestionnaireStepSchema,
  RoutingRule,
} from "@/lib/api/client";

/** Serializable step payload for copy/paste (no server ids or step_key). */
export type StepClipboardPayload = {
  title: string;
  subtitle: string;
  visibility_rule: QuestionnaireStepSchema["visibility_rule"];
  routing_rules: RoutingRule[];
  fields: Omit<QuestionnaireFieldSchema, "id">[];
};

export type StepClipboard = {
  step: StepClipboardPayload;
  sourcePosition: { x: number; y: number };
};

export type MoveHistoryEntry = {
  kind: "move";
  stepKey: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

export type PasteHistoryEntry = {
  kind: "paste";
  stepKey: string;
  payload: StepClipboardPayload;
  position: { x: number; y: number };
};

/** Add/remove/edit of intake routing rules (qualify → intake destinations). */
export type IntakeRulesHistoryEntry = {
  kind: "intake_rules";
  from: IntakeRoutingRule[];
  to: IntakeRoutingRule[];
};

export type HistoryEntry =
  | MoveHistoryEntry
  | PasteHistoryEntry
  | IntakeRulesHistoryEntry;

const PASTE_OFFSET = 48;

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function stepToClipboardPayload(
  step: QuestionnaireStepSchema,
): StepClipboardPayload {
  return {
    title: step.title,
    subtitle: step.subtitle ?? "",
    visibility_rule: step.visibility_rule ?? null,
    routing_rules: structuredClone(step.routing_rules ?? []),
    fields: step.fields.map((field) => ({
      field_key: field.field_key,
      field_type: field.field_type,
      label: field.label,
      help_text: field.help_text,
      options: field.options ? structuredClone(field.options) : undefined,
      validation_rules: field.validation_rules
        ? structuredClone(field.validation_rules)
        : undefined,
      maps_to_section: field.maps_to_section,
      plugin_id: field.plugin_id,
      sort_order: field.sort_order,
      required: field.required,
    })),
  };
}

export function uniqueStepKey(existing: Set<string>, base = "step"): string {
  let n = existing.size + 1;
  let key = `${base}_${n}`;
  while (existing.has(key)) {
    n += 1;
    key = `${base}_${n}`;
  }
  return key;
}

export function pastePosition(
  clipboard: StepClipboard,
  anchor: { x: number; y: number } | null,
  pasteCount: number,
): { x: number; y: number } {
  const base = anchor ?? clipboard.sourcePosition;
  const offset = PASTE_OFFSET * (pasteCount + 1);
  return { x: base.x + offset, y: base.y + offset };
}
