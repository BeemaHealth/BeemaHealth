import { useMemo, useState, type DragEvent } from "react";
import { ChevronDown, Copy, GripVertical } from "lucide-react";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import { FieldEditorBlock } from "@/components/questionnaire/builder/FieldEditorBlock";
import { sortQuestionnaireFields } from "@/lib/questionnaire/sort-fields";

type StepFieldsEditorProps = {
  fields: QuestionnaireFieldSchema[];
  isDraft: boolean;
  fieldTypes: ReadonlyArray<{ value: string; label: string }>;
  belugaFields: ReadonlyArray<{ value: string; label: string }>;
  onUpdate: (
    fieldKey: string,
    patch: Partial<QuestionnaireFieldSchema>,
  ) => void;
  onRemove: (fieldKey: string) => void;
  onReorder: (orderedFieldKeys: string[]) => void;
  onDuplicate?: (fieldKey: string) => void;
  duplicatingKey?: string | null;
};

function fieldTypeLabel(
  field: QuestionnaireFieldSchema,
  fieldTypes: ReadonlyArray<{ value: string; label: string }>,
): string {
  if (field.field_type === "plugin" && field.plugin_id) {
    return `plugin · ${field.plugin_id}`;
  }
  return (
    fieldTypes.find((t) => t.value === field.field_type)?.label ??
    field.field_type
  );
}

export function StepFieldsEditor({
  fields,
  isDraft,
  fieldTypes,
  belugaFields,
  onUpdate,
  onRemove,
  onReorder,
  onDuplicate,
  duplicatingKey = null,
}: StepFieldsEditorProps) {
  const sorted = useMemo(() => sortQuestionnaireFields(fields), [fields]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function isCollapsed(fieldKey: string): boolean {
    return collapsed[fieldKey] ?? false;
  }

  function toggleCollapsed(fieldKey: string) {
    setCollapsed((prev) => ({
      ...prev,
      [fieldKey]: !isCollapsed(fieldKey),
    }));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null) return;
    setDropIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const keys = sorted.map((f) => f.field_key);
    const [moved] = keys.splice(dragIndex, 1);
    keys.splice(index, 0, moved);
    onReorder(keys);
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="space-y-2">
      {sorted.map((field, index) => {
        const expanded = !isCollapsed(field.field_key);
        const isDragging = dragIndex === index;
        const isDropTarget =
          dropIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={field.field_key}
            className={[
              "rounded-xl border border-border bg-background overflow-hidden transition-shadow",
              isDragging ? "opacity-50" : "",
              isDropTarget ? "ring-2 ring-primary/40" : "",
            ].join(" ")}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
          >
            <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-1.5 py-1">
              {isDraft ? (
                <button
                  type="button"
                  draggable
                  aria-label={`Reorder ${field.field_key}`}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                className="min-w-0 flex-1 flex items-center gap-2 px-1 py-0.5 text-left"
                onClick={() => toggleCollapsed(field.field_key)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-foreground truncate">
                    {field.field_key}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {fieldTypeLabel(field, fieldTypes)}
                  </p>
                </div>
                <ChevronDown
                  className={[
                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                    expanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
              {isDraft && onDuplicate ? (
                <button
                  type="button"
                  aria-label={`Duplicate ${field.field_key}`}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 disabled:opacity-50"
                  disabled={duplicatingKey === field.field_key}
                  onClick={() => onDuplicate(field.field_key)}
                >
                  <Copy className="size-3.5" />
                </button>
              ) : null}
            </div>

            {expanded ? (
              <div className="p-2">
                <FieldEditorBlock
                  field={field}
                  isDraft={isDraft}
                  fieldTypes={fieldTypes}
                  belugaFields={belugaFields}
                  embedded
                  onUpdate={(patch) => onUpdate(field.field_key, patch)}
                  onRemove={() => onRemove(field.field_key)}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
