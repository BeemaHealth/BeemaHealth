import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Node } from "@xyflow/react";
import {
  createStaffQuestionnaireField,
  createStaffQuestionnaireStep,
  deleteStaffQuestionnaireStep,
  updateStaffQuestionnaireStep,
  updateStaffQuestionnaireVersion,
  type IntakeRoutingRule,
  type QuestionnaireStepSchema,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  pastePosition,
  stepToClipboardPayload,
  uniqueStepKey,
  type HistoryEntry,
  type StepClipboard,
  type StepClipboardPayload,
} from "@/components/questionnaire/builder/flowchart-editor-history";

type UseFlowchartEditorActionsArgs = {
  slug: string;
  versionId: string;
  schema: QuestionnaireVersionSchema | null;
  isDraft: boolean;
  selectedKey: string | null;
  positions: MutableRefObject<Map<string, { x: number; y: number }>>;
  onReload: () => Promise<void>;
  onSelectStep: (stepKey: string | null) => void;
  onPositionsChange: () => void;
  onError: (message: string) => void;
};

export function useFlowchartEditorActions({
  slug,
  versionId,
  schema,
  isDraft,
  selectedKey,
  positions,
  onReload,
  onSelectStep,
  onPositionsChange,
  onError,
}: UseFlowchartEditorActionsArgs) {
  const [clipboard, setClipboard] = useState<StepClipboard | null>(null);
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const dragStarts = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pasteCount = useRef(0);

  useEffect(() => {
    setClipboard(null);
    setUndoStack([]);
    setRedoStack([]);
    pasteCount.current = 0;
    dragStarts.current.clear();
  }, [versionId]);

  const pushUndo = useCallback((entry: HistoryEntry) => {
    setUndoStack((prev) => [...prev, entry]);
    setRedoStack([]);
  }, []);

  const applyPosition = useCallback(
    async (stepKey: string, pos: { x: number; y: number }) => {
      positions.current.set(stepKey, pos);
      onPositionsChange();
      await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
        position_x: pos.x,
        position_y: pos.y,
      });
    },
    [slug, versionId, positions, onPositionsChange],
  );

  const createStepFromPayload = useCallback(
    async (
      stepKey: string,
      payload: StepClipboardPayload,
      pos: { x: number; y: number },
      sortOrder: number,
    ) => {
      await createStaffQuestionnaireStep(slug, versionId, {
        step_key: stepKey,
        sort_order: sortOrder,
        title: payload.title,
        subtitle: payload.subtitle,
        visibility_rule: payload.visibility_rule ?? undefined,
        position_x: pos.x,
        position_y: pos.y,
      });

      for (const field of payload.fields) {
        await createStaffQuestionnaireField(slug, versionId, stepKey, {
          field_key: field.field_key,
          field_type: field.field_type,
          label: field.label,
          help_text: field.help_text,
          options: field.options,
          validation_rules: field.validation_rules,
          maps_to_section: field.maps_to_section,
          plugin_id: field.plugin_id,
          sort_order: field.sort_order,
          required: field.required ?? false,
        });
      }

      if (payload.routing_rules.length > 0) {
        await updateStaffQuestionnaireStep(slug, versionId, stepKey, {
          routing_rules: payload.routing_rules,
        });
      }

      positions.current.set(stepKey, pos);
    },
    [slug, versionId, positions],
  );

  const recordStepCreation = useCallback(
    (
      stepKey: string,
      payload: StepClipboardPayload,
      position: { x: number; y: number },
    ) => {
      pushUndo({ kind: "paste", stepKey, payload, position });
    },
    [pushUndo],
  );

  const recordIntakeRulesChange = useCallback(
    (from: IntakeRoutingRule[], to: IntakeRoutingRule[]) => {
      pushUndo({
        kind: "intake_rules",
        from: structuredClone(from),
        to: structuredClone(to),
      });
    },
    [pushUndo],
  );

  const copySelectedStep = useCallback(() => {
    if (!schema || !selectedKey) return false;
    const step = schema.steps.find((s) => s.step_key === selectedKey);
    if (!step) return false;
    const sourcePosition = positions.current.get(step.step_key) ?? {
      x: step.position_x ?? 0,
      y: step.position_y ?? 0,
    };
    setClipboard({
      step: stepToClipboardPayload(step),
      sourcePosition,
    });
    pasteCount.current = 0;
    return true;
  }, [schema, selectedKey, positions]);

  const pasteClipboardStep = useCallback(async () => {
    if (!schema || !isDraft || !clipboard) return false;
    const existing = new Set(schema.steps.map((s) => s.step_key));
    const stepKey = uniqueStepKey(existing);
    const selectedStep = selectedKey
      ? schema.steps.find((s) => s.step_key === selectedKey)
      : null;
    const anchorPos = selectedKey
      ? (positions.current.get(selectedKey) ?? {
          x: selectedStep?.position_x ?? 0,
          y: selectedStep?.position_y ?? 0,
        })
      : null;
    const pos = pastePosition(clipboard, anchorPos, pasteCount.current);
    pasteCount.current += 1;

    try {
      await createStepFromPayload(
        stepKey,
        clipboard.step,
        pos,
        schema.steps.length,
      );
      pushUndo({
        kind: "paste",
        stepKey,
        payload: clipboard.step,
        position: pos,
      });
      await onReload();
      onSelectStep(stepKey);
      onPositionsChange();
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : "Paste failed.");
      return false;
    }
  }, [
    schema,
    isDraft,
    clipboard,
    selectedKey,
    createStepFromPayload,
    pushUndo,
    onReload,
    onSelectStep,
    onPositionsChange,
    onError,
    positions,
  ]);

  const undo = useCallback(async () => {
    if (!schema || !isDraft || undoStack.length === 0) return false;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    try {
      if (entry.kind === "move") {
        await applyPosition(entry.stepKey, entry.from);
        setRedoStack((prev) => [...prev, entry]);
      } else if (entry.kind === "intake_rules") {
        await updateStaffQuestionnaireVersion(slug, versionId, {
          intake_routing_rules: entry.from,
        });
        setRedoStack((prev) => [...prev, entry]);
        await onReload();
      } else {
        await deleteStaffQuestionnaireStep(slug, versionId, entry.stepKey);
        positions.current.delete(entry.stepKey);
        if (selectedKey === entry.stepKey) onSelectStep(null);
        setRedoStack((prev) => [...prev, entry]);
        await onReload();
        onPositionsChange();
      }
      return true;
    } catch (e) {
      setUndoStack((prev) => [...prev, entry]);
      onError(e instanceof Error ? e.message : "Undo failed.");
      return false;
    }
  }, [
    schema,
    isDraft,
    undoStack,
    applyPosition,
    slug,
    versionId,
    positions,
    selectedKey,
    onSelectStep,
    onReload,
    onPositionsChange,
    onError,
  ]);

  const redo = useCallback(async () => {
    if (!schema || !isDraft || redoStack.length === 0) return false;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));

    try {
      if (entry.kind === "move") {
        await applyPosition(entry.stepKey, entry.to);
        setUndoStack((prev) => [...prev, entry]);
      } else if (entry.kind === "intake_rules") {
        await updateStaffQuestionnaireVersion(slug, versionId, {
          intake_routing_rules: entry.to,
        });
        setUndoStack((prev) => [...prev, entry]);
        await onReload();
      } else {
        await createStepFromPayload(
          entry.stepKey,
          entry.payload,
          entry.position,
          schema.steps.length,
        );
        setUndoStack((prev) => [...prev, entry]);
        await onReload();
        onSelectStep(entry.stepKey);
        onPositionsChange();
      }
      return true;
    } catch (e) {
      setRedoStack((prev) => [...prev, entry]);
      onError(e instanceof Error ? e.message : "Redo failed.");
      return false;
    }
  }, [
    schema,
    isDraft,
    redoStack,
    applyPosition,
    createStepFromPayload,
    slug,
    versionId,
    onReload,
    onSelectStep,
    onPositionsChange,
    onError,
  ]);

  const onNodeDragStart = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      if (!isDraft) return;
      const pos = positions.current.get(node.id) ?? { x: 0, y: 0 };
      dragStarts.current.set(node.id, { ...pos });
    },
    [isDraft, positions],
  );

  const onNodeDragStop = useCallback(
    async (_: MouseEvent | TouchEvent, node: Node) => {
      if (!isDraft) return;
      // Only steps persist positions; entry/intake nodes are layout-only.
      if (!schema?.steps.some((s) => s.step_key === node.id)) return;
      const start = dragStarts.current.get(node.id);
      dragStarts.current.delete(node.id);
      if (!start) return;

      const { x, y } = node.position;
      if (start.x === x && start.y === y) return;

      positions.current.set(node.id, { x, y });
      onPositionsChange();

      pushUndo({
        kind: "move",
        stepKey: node.id,
        from: start,
        to: { x, y },
      });

      try {
        await updateStaffQuestionnaireStep(slug, versionId, node.id, {
          position_x: x,
          position_y: y,
        });
      } catch {
        /* positions are best-effort */
      }
    },
    [isDraft, schema, positions, onPositionsChange, pushUndo, slug, versionId],
  );

  return {
    clipboard,
    canPaste: !!clipboard && isDraft,
    canUndo: undoStack.length > 0 && isDraft,
    canRedo: redoStack.length > 0 && isDraft,
    canCopy: !!selectedKey,
    recordStepCreation,
    recordIntakeRulesChange,
    copySelectedStep,
    pasteClipboardStep,
    undo,
    redo,
    onNodeDragStart,
    onNodeDragStop,
  };
}
