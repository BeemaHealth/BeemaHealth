import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/quiz/quiz-primitives";
import {
  BELUGA_FIELD_OPTIONS,
  belugaMappingToApiFieldId,
  uniqueAmong,
} from "@/components/questionnaire/builder/field-catalog";
import {
  nextChoiceOptionValue,
  type ChoiceOptionDraft,
} from "@/lib/questionnaire/choice-options";

type ChoiceOptionsEditorProps = {
  options: ChoiceOptionDraft[];
  disabled?: boolean;
  compact?: boolean;
  minOptions?: number;
  /** When false, Beluga is mapped on the question (single choice), not per option. */
  showBelugaColumn?: boolean;
  onChange: (next: ChoiceOptionDraft[]) => void;
};

export function ChoiceOptionsEditor({
  options,
  disabled = false,
  compact = false,
  minOptions = 1,
  showBelugaColumn = true,
  onChange,
}: ChoiceOptionsEditorProps) {
  function updateOption(index: number, patch: Partial<ChoiceOptionDraft>) {
    onChange(
      options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
    );
  }

  function addOption() {
    onChange([
      ...options,
      { value: nextChoiceOptionValue(options), label: "", beluga: "" },
    ]);
  }

  function removeOption(index: number) {
    if (options.length <= minOptions) return;
    onChange(options.filter((_, i) => i !== index));
  }

  function onBelugaChange(index: number, beluga: string) {
    const patch: Partial<ChoiceOptionDraft> = { beluga };
    const apiFieldId = belugaMappingToApiFieldId(beluga);
    if (apiFieldId) {
      const used = new Set(
        options.filter((_, i) => i !== index).map((opt) => opt.value),
      );
      patch.value = uniqueAmong(apiFieldId, used);
    }
    updateOption(index, patch);
  }

  const canRemove = !disabled && options.length > minOptions;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        Answer options
      </p>
      <p className="text-[10px] text-muted-foreground">
        Each option needs a mapping ID (used for routing).
        {showBelugaColumn
          ? " Selecting a Beluga field auto-fills the mapping ID to match the API property name."
          : " The patient's selected answer is sent to the Beluga field mapped on this question."}
      </p>
      <div
        className={`rounded-xl border border-border overflow-hidden ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <div
          className={`grid gap-2 bg-muted/40 px-2.5 py-1.5 font-medium text-muted-foreground ${
            showBelugaColumn
              ? "grid-cols-[1fr_1.2fr_1fr_auto]"
              : "grid-cols-[1fr_1.2fr_auto]"
          }`}
        >
          <span>Mapping ID</span>
          <span>Option label</span>
          {showBelugaColumn ? <span>Beluga API</span> : null}
          <span className="w-8 text-center"> </span>
        </div>
        {options.map((opt, i) => (
          <div
            key={i}
            className={`grid gap-2 items-center px-2.5 py-2 border-t border-border ${
              showBelugaColumn
                ? "grid-cols-[1fr_1.2fr_1fr_auto]"
                : "grid-cols-[1fr_1.2fr_auto]"
            }`}
          >
            <input
              className={`${inputCls} font-mono ${compact ? "text-[10px] py-1" : "text-xs"}`}
              value={opt.value}
              disabled={disabled}
              placeholder={`option_${i + 1}`}
              onChange={(e) =>
                updateOption(i, {
                  value: e.target.value.trim().replace(/\s+/g, ""),
                })
              }
            />
            <input
              className={`${inputCls} ${compact ? "text-[10px] py-1" : "text-xs"}`}
              value={opt.label}
              disabled={disabled}
              placeholder="Answer text patients see"
              onChange={(e) => updateOption(i, { label: e.target.value })}
            />
            {showBelugaColumn ? (
              <select
                className={`${inputCls} ${compact ? "text-[10px] py-1" : "text-xs"}`}
                value={opt.beluga}
                disabled={disabled}
                onChange={(e) => onBelugaChange(i, e.target.value)}
              >
                {BELUGA_FIELD_OPTIONS.map((field) => (
                  <option key={field.value || "none"} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex w-8 justify-center">
              {canRemove ? (
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {!disabled ? (
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
      ) : null}
    </div>
  );
}
