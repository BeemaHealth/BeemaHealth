import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  sanitizeDobPart,
  toIsoDateOfBirth,
  parseIsoDateOfBirth,
} from "@/lib/questionnaire/dob-field";
import {
  validateDateNode,
  validateNumberNode,
  validateTextNode,
  validateTextarea,
} from "../node-validation";
import { ContinueButton, ErrorNote, FIELD_CLASS, NodeFrame } from "../ui";
import type { NodeRendererProps } from "../types";

function useSubmit<T>(
  validate: () => { ok: true; value: T } | { ok: false; error: string },
  props: NodeRendererProps,
) {
  const [localError, setLocalError] = useState<string | null>(null);
  async function submit() {
    const result = validate();
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    await props.onSubmit(result.value);
  }
  return {
    submit,
    shownError: localError ?? props.error,
    clear: () => setLocalError(null),
  };
}

export function TextNode(props: NodeRendererProps) {
  const { node, previous, layout, busy } = props;
  const [value, setValue] = useState(
    typeof previous === "string" ? previous : "",
  );
  const { submit, shownError, clear } = useSubmit(
    () => validateTextNode(node, value),
    props,
  );
  const inputId = `node-${node.id}`;
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <input
          id={inputId}
          aria-label={node.title}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${inputId}-error` : undefined}
          className={FIELD_CLASS}
          type={node.format === "email" ? "email" : "text"}
          inputMode={
            node.format === "zip"
              ? "numeric"
              : node.format === "email"
                ? "email"
                : "text"
          }
          autoComplete={
            node.format === "email"
              ? "email"
              : node.format === "zip"
                ? "postal-code"
                : "off"
          }
          maxLength={node.max_length ?? 200}
          placeholder={node.placeholder}
          value={value}
          disabled={busy}
          onChange={(e) => {
            setValue(e.target.value);
            clear();
          }}
        />
        <ErrorNote message={shownError} id={`${inputId}-error`} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

export function TextareaNode(props: NodeRendererProps) {
  const { node, previous, layout, busy } = props;
  const [value, setValue] = useState(
    typeof previous === "string" ? previous : "",
  );
  const { submit, shownError, clear } = useSubmit(
    () => validateTextarea(node, value),
    props,
  );
  const max = node.max_length ?? 2000;
  const inputId = `node-${node.id}`;
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <textarea
            id={inputId}
            aria-label={node.title}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? `${inputId}-error` : undefined}
            className={cn(
              FIELD_CLASS,
              "h-auto min-h-40 resize-y py-4 leading-relaxed",
            )}
            maxLength={max}
            value={value}
            disabled={busy}
            onChange={(e) => {
              setValue(e.target.value);
              clear();
            }}
          />
          <p
            className="text-right text-xs text-muted-foreground"
            aria-hidden="true"
          >
            {value.length} / {max}
          </p>
        </div>
        <ErrorNote message={shownError} id={`${inputId}-error`} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

export function NumberNode(props: NodeRendererProps) {
  const { node, previous, layout, busy } = props;
  const [value, setValue] = useState(
    typeof previous === "number" ? String(previous) : "",
  );
  const { submit, shownError, clear } = useSubmit(
    () => validateNumberNode(node, value),
    props,
  );
  const inputId = `node-${node.id}`;
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex items-center gap-3">
          <input
            id={inputId}
            aria-label={node.title}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? `${inputId}-error` : undefined}
            className={cn(FIELD_CLASS, "max-w-48")}
            type="text"
            inputMode={node.integer ? "numeric" : "decimal"}
            value={value}
            disabled={busy}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9.-]/g, "").slice(0, 12));
              clear();
            }}
          />
          {node.suffix ? (
            <span className="text-base text-muted-foreground">
              {node.suffix}
            </span>
          ) : null}
        </div>
        <ErrorNote message={shownError} id={`${inputId}-error`} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

/** Three-part month / day / year input that yields an ISO date (reuses the marketing dob helpers). */
export function DateParts({
  idPrefix,
  value,
  onChange,
  disabled,
  invalid,
}: {
  idPrefix: string;
  value: string;
  onChange: (
    iso: string,
    partial: { month: string; day: string; year: string },
  ) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [parts, setParts] = useState(() => parseIsoDateOfBirth(value));
  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    onChange(toIsoDateOfBirth(merged.month, merged.day, merged.year), merged);
  }
  const base = cn(FIELD_CLASS, "text-center tabular-nums");
  return (
    <div
      className="grid grid-cols-[1fr_1fr_1.6fr] gap-3"
      role="group"
      aria-label="Date"
    >
      <input
        id={`${idPrefix}-month`}
        aria-label="Month (MM)"
        placeholder="MM"
        inputMode="numeric"
        autoComplete="bday-month"
        className={base}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={parts.month}
        onChange={(e) => update({ month: sanitizeDobPart(e.target.value, 2) })}
      />
      <input
        id={`${idPrefix}-day`}
        aria-label="Day (DD)"
        placeholder="DD"
        inputMode="numeric"
        autoComplete="bday-day"
        className={base}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={parts.day}
        onChange={(e) => update({ day: sanitizeDobPart(e.target.value, 2) })}
      />
      <input
        id={`${idPrefix}-year`}
        aria-label="Year (YYYY)"
        placeholder="YYYY"
        inputMode="numeric"
        autoComplete="bday-year"
        className={base}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={parts.year}
        onChange={(e) => update({ year: sanitizeDobPart(e.target.value, 4) })}
      />
    </div>
  );
}

export function DateNode(props: NodeRendererProps) {
  const { node, previous, layout, busy } = props;
  const [iso, setIso] = useState(typeof previous === "string" ? previous : "");
  const { submit, shownError, clear } = useSubmit(
    () => validateDateNode(node, iso),
    props,
  );
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <DateParts
          idPrefix={`node-${node.id}`}
          value={iso}
          disabled={busy}
          invalid={Boolean(shownError)}
          onChange={(next) => {
            setIso(next);
            clear();
          }}
        />
        <ErrorNote message={shownError} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}
