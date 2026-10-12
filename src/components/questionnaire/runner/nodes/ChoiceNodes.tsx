import { useState } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { toggleMulti, validateChoice, validateMulti } from "../node-validation";
import { ContinueButton, ErrorNote, NodeFrame } from "../ui";
import type { NodeRendererProps } from "../types";

function OptionCard({
  label,
  description,
  selected,
  multi,
  disabled,
  onSelect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  multi: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:p-5",
        selected
          ? "border-primary bg-primary-soft shadow-lift"
          : "border-border hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-lift motion-reduce:hover:translate-y-0",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background",
        )}
      >
        {selected ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-foreground sm:text-lg">
          {label}
        </span>
        {description ? (
          <span className="text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </motion.button>
  );
}

export function RadioNode({
  node,
  previous,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const [selected, setSelected] = useState<string | null>(
    typeof previous === "string" ? previous : null,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const autoAdvance = layout.node_types?.radio?.auto_advance === true;

  async function submit(key: string | null) {
    const result = validateChoice(node, key);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    await onSubmit(result.value);
  }

  function choose(key: string) {
    setSelected(key);
    setLocalError(null);
    if (autoAdvance) void submit(key);
  }

  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(selected);
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div
          role="radiogroup"
          aria-label={node.title}
          className="flex flex-col gap-3"
        >
          {(node.options ?? []).map((o) => (
            <OptionCard
              key={o.key}
              label={o.label}
              description={o.description}
              selected={selected === o.key}
              multi={false}
              disabled={busy}
              onSelect={() => choose(o.key)}
            />
          ))}
        </div>
        <ErrorNote message={localError ?? error} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
          savingLabel={layout.copy?.saving ? `${layout.copy.saving}` : "Saving"}
        />
      </form>
    </NodeFrame>
  );
}

export function MultiSelectNode({
  node,
  previous,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const options = node.options ?? [];
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(previous) ? (previous as string[]) : [],
  );
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    const result = validateMulti(node, selected);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    await onSubmit(result.value);
  }

  return (
    <NodeFrame
      title={node.title}
      body={node.body ?? "Select all that apply."}
      icon={node.icon}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div
          role="group"
          aria-label={node.title}
          className="flex flex-col gap-3"
        >
          {options.map((o) => (
            <OptionCard
              key={o.key}
              label={o.label}
              description={o.description}
              selected={selected.includes(o.key)}
              multi
              disabled={busy}
              onSelect={() => {
                setSelected((s) => toggleMulti(options, s, o.key));
                setLocalError(null);
              }}
            />
          ))}
        </div>
        <ErrorNote message={localError ?? error} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}
