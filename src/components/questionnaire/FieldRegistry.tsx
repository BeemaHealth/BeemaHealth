import type { ReactNode } from "react";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import {
  ChoiceCard,
  Field,
  YesNoField,
  inputCls,
} from "@/components/quiz/quiz-primitives";

export type FieldRenderContext = {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  preview?: boolean;
};

export function renderQuestionnaireField(
  field: QuestionnaireFieldSchema,
  ctx: FieldRenderContext,
): ReactNode {
  const { value, onChange, error, preview } = ctx;

  if (field.field_type === "single_choice") {
    const options = (field.options ?? []) as { value: string; label: string }[];
    return (
      <div className="space-y-3">
        {options.map((opt) => (
          <ChoiceCard
            key={opt.value}
            title={opt.label}
            selected={value === opt.value}
            onClick={() => !preview && onChange(opt.value)}
          />
        ))}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.field_type === "yes_no") {
    const boolValue =
      value === true || value === "yes"
        ? true
        : value === false || value === "no"
          ? false
          : null;
    return (
      <div>
        <YesNoField
          label={field.label}
          value={boolValue}
          onChange={(v) => !preview && onChange(v)}
          required={field.required}
        />
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <div>
        <Field label={field.label} required={field.required}>
          <textarea
            className={inputCls}
            value={String(value ?? "")}
            onChange={(e) => !preview && onChange(e.target.value)}
            disabled={preview}
            rows={4}
          />
        </Field>
        {error ? (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "plugin") {
    return (
      <p className="text-sm text-muted-foreground">
        Plugin field: {field.plugin_id || field.field_key}
        {preview ? " (preview)" : ""}
      </p>
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
            : field.field_type === "password"
              ? "password"
              : "text";

  return (
    <div>
      <Field label={field.label} required={field.required}>
        <input
          type={inputType}
          className={inputCls}
          value={String(value ?? "")}
          onChange={(e) => !preview && onChange(e.target.value)}
          disabled={preview}
        />
      </Field>
      {field.help_text ? (
        <p className="mt-1 text-xs text-muted-foreground">{field.help_text}</p>
      ) : null}
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
